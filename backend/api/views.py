# General utilities
import os
import csv
import json
import uuid
from io import StringIO, BytesIO
from openai import OpenAI
from datetime import datetime, timezone

# Django
from django.core.exceptions import ObjectDoesNotExist
from django.http import FileResponse, StreamingHttpResponse
from django.utils.timezone import now
from django.utils._os import safe_join

# REST Framework
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import UserRateThrottle
from rest_framework.parsers import MultiPartParser, FormParser

# ReportLab exports
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem, Image as RLImage
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch

# Celery
from celery.result import AsyncResult
from config.celery import app as celery_app

# Models
from users.models import User
from .models import (
  UserAction, ImageData, NarrativeCache,
  JupyterLog, MousePositionLog, ScrollLog, GroupData
)

# Serializers
from .serializers import (
  ImageDataSerializer, NarrativeCacheSerializer,
  JupyterLogsSerializer, MousePositionLogSerializer,
  UserActionSerializer, ScrollLogSerializer, GroupDataSerializer
)

# Tasks
from .tasks import generate_description_task, generate_narrative_task, generate_feedback_task

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

class BurstRateThrottle(UserRateThrottle):
  rate = '10/min'
  
class LogsExportRateThrottle(UserRateThrottle):
  rate = '5/hr'    
    
class LogActionView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    try:
      action_type = request.data.get('action_type')
      
      if action_type not in ["click", "hover", "drag", "drop"]:
        return Response({
        "error": f"Action type {action_type} not recognized."
        }, status=status.HTTP_400_BAD_REQUEST)

      # Create UserAction directly
      user_action = UserAction.objects.create(
        user=request.user,
        action=action_type,
        state_info=request.data.get('state_info', {}),
        element=request.data.get('element_id', ''),
        request_headers=dict(request.headers)
      )
      
      return Response({
        "message": "Action logged successfully",
        "action_id": user_action.id
      }, status=status.HTTP_200_OK)

    except KeyError as e:
      return Response({
        "error": f"Missing required field: {str(e)}"
      }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
      return Response({
        "error": f"Failed to log action: {str(e)}"
      }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
  
class LogMousePositionView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    try:
      log_data = {
        'log_id': str(uuid.uuid4()),
        'user': request.user.id,
        'mouse_pos_batch': request.data['pos_batch'],  # list of {"x": ..., "y": ..., "timestamp": ...}
        'request_headers': dict(request.headers),
        'timestamp': request.data['timestamp']
      }

      log_serializer = MousePositionLogSerializer(data=log_data)
      if log_serializer.is_valid():
        log_serializer.save()
        return Response({
          "message": "Mouse positions logged successfully",
        }, status=status.HTTP_200_OK)
      else:
        return Response({
          "error": f"Unable to serialize mouse position logs: {log_serializer.errors}"
        }, status=status.HTTP_400_BAD_REQUEST)
    except KeyError as e:
      return Response({
        "error": f"Missing required field: {str(e)}"
      }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
      return Response({
        "error": f"Failed to log mouse positions: {str(e)}"
      }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

class LogScrollView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    try:
      # New optimized structure: sessions with batched events per element
      sessions = request.data.get('sessions', [])

      log_data = {
        'log_id': str(uuid.uuid4()),
        'user': request.user.id,
        'scroll_batch': sessions,  # Store the optimized sessions structure
        'request_headers': dict(request.headers),
        'timestamp': request.data.get('timestamp')
      }

      scroll_serializer = ScrollLogSerializer(data=log_data)
      if scroll_serializer.is_valid():
        scroll_serializer.save()

        # Count total events across all sessions for logging
        total_events = sum(len(session.get('events', [])) for session in sessions)

        return Response({
          "message": f"Scroll log saved successfully ({total_events} events across {len(sessions)} element(s))",
        }, status=status.HTTP_200_OK)
      else:
        return Response({
          "error": f"Unable to serialize scroll log: {scroll_serializer.errors}"
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
      return Response({
        "error": f"Failed to log scroll data: {str(e)}"
      }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class UploadJupyterLogView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    log_data = request.data
    log_data['user'] = User.objects.get(username=request.user.username).id
    serializer = JupyterLogsSerializer(data=log_data)
    if serializer.is_valid():
      serializer.save()
      return Response({"message": "Jupyter log uploaded successfully"}, status=status.HTTP_200_OK)
    else:
      return Response({"message": "Jupyter log upload failed", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
class ExportJupyterLogsView(APIView):
  permission_classes = [IsAuthenticated]
  throttle_classes = [LogsExportRateThrottle]

  def get(self, request):
    fmt = (request.query_params.get("format") or "jsonl").lower()
    
    # Pull all logs
    logs_qs = JupyterLog.objects.all()

    if not logs_qs.exists():
      return Response({"message": "No Jupyter logs found"}, status=status.HTTP_204_NO_CONTENT)

    # Serialize so we don't rely on model internals / related fields
    serializer = JupyterLogsSerializer(logs_qs, many=True)
    data_list = serializer.data

    timestamp = now().strftime("%Y%m%dT%H%M%SZ")
    username = request.user.username

    if fmt == "csv":
      # Stream CSV so we don’t build a huge string in memory
      def row_stream():
        # Build a union of all keys to make a consistent header
        fieldnames = sorted({k for item in data_list for k in item.keys()})
        sio = StringIO()
        writer = csv.DictWriter(sio, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        yield sio.getvalue(); sio.seek(0); sio.truncate(0)
        for item in data_list:
          writer.writerow(item)
          yield sio.getvalue(); sio.seek(0); sio.truncate(0)

      response = StreamingHttpResponse(row_stream(), content_type="text/csv")
      filename = f"jupyter-logs-{timestamp}.csv"

    else:
      # Default to newline-delimited JSON (NDJSON / JSONL)
      def line_stream():
        for item in data_list:
          yield json.dumps(item, ensure_ascii=False) + "\n"

      response = StreamingHttpResponse(line_stream(), content_type="application/x-ndjson")
      filename = f"jupyter-logs-{timestamp}.jsonl"

    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    response["Access-Control-Allow-Credentials"] = "true"
    return response

  
  
class ImageDataView(APIView):
  permission_classes = [IsAuthenticated]
  def get(self, request):
    image_id = request.query_params.get("image_id")
    if image_id: # single image
      image_data = ImageData.objects.get(id=image_id)
    else: # all images
      image_data = ImageData.objects.filter(user=request.user)
    
    if not image_data:
      return Response({"message": "No image data found"}, status=status.HTTP_204_NO_CONTENT)
      
    serialized_image_data = ImageDataSerializer(image_data, many=False if image_id else True)
    
    return Response({"images": serialized_image_data.data}, status=status.HTTP_200_OK)
  
  
class UploadFigureView(APIView):
  permission_classes = [IsAuthenticated]
  parser_classes = [MultiPartParser, FormParser]
  def post(self, request):
    
    figure = request.FILES.get('figure')
    if not figure:
      return Response({"message": "No file part in the request"}, status=status.HTTP_400_BAD_REQUEST)

    # Build file path - save directly to DATA_PATH root to match nginx serving location
    data_path = os.getenv('DATA_PATH')
    if not data_path:
      return Response({"message": "DATA_PATH not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Ensure DATA_PATH directory exists
    os.makedirs(data_path, exist_ok=True)

    # Build file path
    figure_id = str(uuid.uuid4())
    ext = os.path.splitext(figure.name)[1]
    figure_path = os.path.join(data_path, f"{figure_id}{ext}")

    # Save file
    with open(figure_path, 'wb+') as destination:
      for chunk in figure.chunks():
        destination.write(chunk)
    
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    
    serializer = ImageDataSerializer(data={
      "id": figure_id,
      "user": request.user.id,
      "filepath": f"{figure_id}{ext}",
      "short_desc": request.data.get('short_desc') or "",
      "long_desc": request.data.get('long_desc') or "Placeholder long description.",
      "source": request.data.get('source') or "",
      "in_storyboard": True,
      "x": 0,
      "y": 0,
      "has_order": False,
      "order_num": 0,
      "created_at": now,
      "last_saved": now
    })

    if serializer.is_valid():
      serializer.save()
      fig_data = serializer.validated_data
      fig_data['user'] = request.user.id
      return Response({"message": "Figure uploaded successfully", "fig_data": fig_data }, status=status.HTTP_200_OK)
    else:
      return Response({"message": f"Figure upload failed: {serializer.errors}"}, status=status.HTTP_400_BAD_REQUEST)


class DeleteFigureView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request, **kwargs):
    """
    Deletes the file and its corresponding DB record.
    Filename is taken from the URL pattern.
    """
    filename = kwargs.get('filename')
    if not filename:
      return Response({"message": "No filename provided"}, status=status.HTTP_400_BAD_REQUEST)

    # Build file path - use DATA_PATH root to match upload location and nginx serving
    data_path = os.getenv('DATA_PATH')
    if not data_path:
      return Response({"message": "DATA_PATH not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
      filepath = safe_join(data_path, filename)
    except ValueError:
      return Response({"message": "Invalid filename"}, status=status.HTTP_400_BAD_REQUEST)

    base_name, _ = os.path.splitext(filename)

    # Try to find the image record - first by ID (as UUID), then by filepath as fallback
    image_data = None
    try:
      # Convert base_name string to UUID object for database lookup
      image_id = uuid.UUID(base_name)
      image_data = ImageData.objects.get(id=image_id, user=request.user)
    except (ValueError, ImageData.DoesNotExist):
      # If UUID conversion fails or not found by ID, try filepath lookup
      try:
        image_data = ImageData.objects.get(filepath=filename, user=request.user)
      except ImageData.DoesNotExist:
        # Check if it exists for another user (security check)
        other_user_image = ImageData.objects.filter(filepath=filename).exclude(user=request.user).first()
        if other_user_image:
          return Response({"status": "error", "message": "Image belongs to another user"}, status=status.HTTP_403_FORBIDDEN)

    # Remove image file if it exists
    file_deleted = False
    if os.path.exists(filepath):
      try:
        os.remove(filepath)
        file_deleted = True
      except Exception as e:
        return Response({"status": "error", "message": f"Failed to delete file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
      # Log warning but don't fail - file might have been manually deleted
      print(f"Warning: File not found at {filepath}")

    # Remove DB record if it exists
    if image_data:
      try:
        image_data.delete()
        return Response({"status": "success", "message": "Figure deleted successfully", "deleted_id": str(image_data.id), "deleted_filename": filename}, status=status.HTTP_200_OK)
      except Exception as e:
        return Response({"status": "error", "message": f"Failed to delete database record: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
      # If file was deleted but DB record doesn't exist, that's okay
      if file_deleted:
        return Response({"status": "success", "message": "File deleted but database record not found", "deleted_filename": filename}, status=status.HTTP_200_OK)
      else:
        return Response({"status": "error", "message": f"Image record not found for filename: {filename} (base_name: {base_name})"}, status=status.HTTP_404_NOT_FOUND)

class UpdateImageDataView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request, image_id=None):
    try:
      image_id = image_id or request.data.get('image_id')
      if not image_id:
        return Response({"message": "No image ID provided"}, status=status.HTTP_400_BAD_REQUEST)
      
      
      update_data = request.data.get('data')
      
      existing_image_data = ImageData.objects.get(id=image_id)
      
      if not existing_image_data:
        return Response({"message": "Image data not found"}, status=status.HTTP_404_NOT_FOUND)
      
      serializer = ImageDataSerializer(existing_image_data, data=update_data, partial=True)
      
      if serializer.is_valid():
        serializer.save()
        return Response({"message": "Image data updated successfully", "image_data": serializer.data}, status=status.HTTP_200_OK)
      else:
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
      return Response({"errors": e}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
  

class GetGroupView(APIView): 
  permission_classes = [IsAuthenticated]
  def get(self, request):
    group_id = request.query_params.get("group_id")
    if group_id: # single group
      group_data = GroupData.objects.get(id=group_id)
    else: # all groups
      group_data = GroupData.objects.filter(user=request.user)
    
    if not group_data:
      return Response({"message": "No group data found"}, status=status.HTTP_204_NO_CONTENT)
      
    serialized_group_data = GroupDataSerializer(group_data, many=False if group_id else True)
    
    return Response({"groups": serialized_group_data.data}, status=status.HTTP_200_OK)

class CreateGroupView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    try:
      group_data = request.data.get('data')
      group_data['user'] = request.user.id
      
      serializer = GroupDataSerializer(data=group_data)
      if serializer.is_valid():
        serializer.save()
        return Response({"message": "Group created successfully", "group": serializer.data}, status=status.HTTP_201_CREATED)
      else:
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
      return Response({"errors": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
class UpdateGroupView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request, group_id=None):
    try:
      group_id = group_id or request.data.get('group_id')
      if not group_id:
        return Response({"message": "No group ID provided"}, status=status.HTTP_400_BAD_REQUEST)
      
      update_data = request.data.get('data')
      
      existing_group = GroupData.objects.get(id=group_id)
      
      if not existing_group:
        return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)
      
      serializer = GroupDataSerializer(existing_group, data=update_data, partial=True)
      
      if serializer.is_valid():
        serializer.save()
        return Response({"message": "Group updated successfully", "group": serializer.data}, status=status.HTTP_200_OK)
      else:
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
      return Response({"errors": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

class DeleteGroupView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request, group_id=None):
    """
    Expects group_id from URL path or JSON body with { "group_id": "<group_id>" }
    Deletes the group data.
    """
    group_id = group_id or request.data.get('group_id')

    if not group_id:
      return Response({"message": "No group ID provided"}, status=status.HTTP_400_BAD_REQUEST)

    try:
      group = GroupData.objects.get(id=group_id)
      group.delete()
      return Response({"message": "Group deleted successfully"}, status=status.HTTP_200_OK)
    except GroupData.DoesNotExist:
      return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)
    



class GenerateNarrativeAsyncView(APIView):
  permission_classes = [IsAuthenticated]
  throttle_classes = [BurstRateThrottle]

  def post(self, request):
    """Generate narrative asynchronously using Celery task"""
    try:
      # Get story structure ID and use_groups from request
      story_structure_id = request.data.get('story_structure_id') if request.data else None
      use_groups = request.data.get('use_groups', False) if request.data else False

      # Start the narrative generation task
      task = generate_narrative_task.delay(request.user.id, story_structure_id, use_groups)

      return Response({
        "status": "success",
        "message": "Narrative generation started",
        "task_id": task.id,
        "story_structure_id": story_structure_id,
        "use_groups": use_groups
      }, status=status.HTTP_202_ACCEPTED)

    except Exception as e:
      return Response({"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    

class GetNarrativeCacheView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    cache = NarrativeCache.objects.filter(user=request.user).first()
    if cache is None:
      return Response(status=status.HTTP_204_NO_CONTENT)

    data = NarrativeCacheSerializer(cache).data
    
    # Convert JSON fields to strings for frontend compatibility
    if 'order' in data and isinstance(data['order'], list):
      data['order'] = [str(item) for item in data['order']]
    
    if 'categories' in data and isinstance(data['categories'], list):
      # Convert array of objects to string representation
      categories_str = "\n".join([
        f"[FIGURE: {item['filename']}]: {item['category']}" 
        for item in data['categories']
        if isinstance(item, dict) and 'filename' in item and 'category' in item
      ])
      data['categories'] = categories_str
    
    return Response({"status": "success", "data": data}, status=status.HTTP_200_OK)

  
class UpdateNarrativeCacheView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    cache_data = request.data.get('data')
    
    cache = NarrativeCache.objects.get(user=request.user)
    if not cache:
      return Response({"status": "error", "message": "Cache not found"}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = NarrativeCacheSerializer(cache, data={'data': cache_data}, partial=True)
    if serializer.is_valid():
      serializer.save()
      return Response({"status": "success"}, status=status.HTTP_200_OK)
    else:
      return Response({'status': 'error', 'message': 'Invalid data'}, status=status.HTTP_400_BAD_REQUEST)
  
class ClearNarrativeCacheView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    try:
      cache = NarrativeCache.objects.get(user=request.user)
      cache.delete()
    except ObjectDoesNotExist:
      pass
    return Response({"status": "success"}, status=status.HTTP_200_OK)
  
class GenerateDescriptionsView(APIView):
  permission_classes = [IsAuthenticated]
  throttle_classes = [BurstRateThrottle]
  
  def post(self, request):
    image_id = request.query_params.get("image_id")

    if image_id:
      # Handle single image case
      image = ImageData.objects.get(id=image_id)
      image.long_desc_generating = True
      image.save()
      generate_description_task.delay(image_id)

      return Response(
        {"message": "Began generating description for image."},
        status=status.HTTP_202_ACCEPTED,
      )
    else:
      # Handle all images
      images = ImageData.objects.all()

      for image in images:
        image.long_desc_generating = True
        image.save()
        generate_description_task.delay(image.id)

      return Response(
        {"message": f"Began generating descriptions for {len(images)} images"},
        status=status.HTTP_202_ACCEPTED,
      )
  
class GenerateNarrativeView(APIView):
  permission_classes = [IsAuthenticated]
  throttle_classes = [BurstRateThrottle]

  def post(self, request):
    """Generate narrative synchronously (blocking) using Celery task"""
    try:
      # Run the narrative generation task synchronously
      result = generate_narrative_task(request.user.id)

      # Get the updated narrative cache
      try:
        narrative_cache = NarrativeCache.objects.get(user=request.user)
        return Response({
          "status": "success",
          "narrative": narrative_cache.narrative,
          "recommended_order": narrative_cache.order,
          "theme": narrative_cache.theme,
          "categories": narrative_cache.categories,
          "sequence_justification": narrative_cache.sequence_justification
        }, status=status.HTTP_200_OK)
      except NarrativeCache.DoesNotExist:
        return Response({
          "status": "error",
          "message": "Narrative generation completed but cache not found"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
      return Response({"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RequestFeedbackView(APIView):
  permission_classes = [IsAuthenticated]
  throttle_classes = [BurstRateThrottle]

  def post(self, request):
    """
    Start feedback generation for the user's current storyboard.
    Body optional: { "storyboard_id": string }
    Returns 202 with { task_id }.
    """
    try:
      storyboard_id = None
      if isinstance(request.data, dict):
        storyboard_id = request.data.get('storyboard_id')

      task = generate_feedback_task.delay(request.user.id, storyboard_id)
      return Response({"status": "accepted", "task_id": task.id}, status=status.HTTP_202_ACCEPTED)
    except Exception as e:
      return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

  def get(self, request):
    """
    Poll for feedback completion using query param task_id.
    - While running: 202 { status }
    - When done: 200 with items array [{title, text}, ...]
    - On failure: 500 with error
    """
    try:
      task_id = request.query_params.get('task_id')
      if not task_id:
        return Response({"status": "error", "message": "task_id is required"}, status=status.HTTP_400_BAD_REQUEST)

      res = AsyncResult(task_id, app=celery_app)
      if res.state in ("PENDING", "RECEIVED", "STARTED", "RETRY"):
        return Response({"status": res.state.lower()}, status=status.HTTP_202_ACCEPTED)
      if res.state == "SUCCESS":
        data = res.result
        if isinstance(data, list):
          items = [
            {"title": str(it.get("title", "")), "text": str(it.get("text", ""))}
            for it in data if isinstance(it, dict)
          ]
        else:
          items = []
          if isinstance(data, dict):
            summary = data.get("summary")
            suggestions = data.get("suggestions") or []
            if summary:
              items.append({"title": "Summary", "text": str(summary)})
            for s in suggestions:
              items.append({"title": "Suggestion", "text": str(s)})
        return Response(items, status=status.HTTP_200_OK)
      return Response({"status": res.state.lower(), "error": str(res.result)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
      return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExportStoryView(APIView):
  permission_classes = [IsAuthenticated]
  throttle_classes = [BurstRateThrottle]

  def post(self, request):
    try:
      payload = (request.data or {}).get('storyData') or {}

      # If no payload provided, attempt to pull latest from NarrativeCache
      if not payload:
        cache = NarrativeCache.objects.filter(user=request.user).first()
        if cache:
          payload = {
            "narrative": cache.narrative,
            "recommended_order": cache.order or [],
            "categorize_figures_response": None,
            "theme_response": cache.theme,
            "sequence_response": cache.sequence_justification,
          }

      # Build structured sections for rendering
      sections = []
      if payload.get('theme_response'):
        sections.append(("Theme & Objective", str(payload.get('theme_response')).strip()))
      if payload.get('categorize_figures_response'):
        sections.append(("Figure Categories", str(payload.get('categorize_figures_response')).strip()))
      if payload.get('sequence_response'):
        sections.append(("Sequence Justification", str(payload.get('sequence_response')).strip()))
      if payload.get('narrative'):
        sections.append(("Story", str(payload.get('narrative')).strip()))
      rec = payload.get('recommended_order') or []
      if isinstance(rec, list) and rec:
        rec_text = "\n".join([f"- {str(f)}" for f in rec])
        sections.append(("Recommended Order", rec_text))

      timestamp = now().strftime("%Y%m%dT%H%M%SZ")

      # Compose PDF with platypus
      buffer = BytesIO()
      # Consistent margins used both for doc and image sizing
      margin_left = 0.75 * inch
      margin_right = 0.75 * inch
      margin_top = 0.75 * inch
      margin_bottom = 0.75 * inch
      page_width, page_height = letter
      max_content_width = page_width - margin_left - margin_right
      max_content_height = page_height - margin_top - margin_bottom
      # Do not constrain figure height; only constrain by available width

      doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=margin_left,
        rightMargin=margin_right,
        topMargin=margin_top,
        bottomMargin=margin_bottom,
      )

      styles = getSampleStyleSheet()
      heading_style = ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        spaceBefore=6,
        spaceAfter=6,
        textColor=colors.black,
        alignment=TA_LEFT,
      )
      body_style = ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=11,
        leading=14,
        spaceAfter=6,
      )

      # Minimal markdown to Paragraph markup
      import re
      def md_inline_to_html(text: str) -> str:
        text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        # code
        text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
        # bold then italics
        text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
        text = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", text)
        return text

      def md_to_flowables(md_text: str):
        lines = md_text.splitlines()
        flow = []
        list_buffer = []

        def flush_list():
          nonlocal list_buffer
          if list_buffer:
            items = [ListItem(Paragraph(md_inline_to_html(i), body_style)) for i in list_buffer]
            flow.append(ListFlowable(items, bulletType="bullet", leftIndent=14))
            list_buffer = []

        # Add images referenced by [FIGURE: filename] inline; replace placeholders with inline <img/>
        figure_pattern = re.compile(r"\[\s*FIGURE\s*[:：﹕]\s*([^\]]+?)\s*\]", re.IGNORECASE | re.UNICODE)
        data_path = os.getenv('DATA_PATH')
        if not data_path:
          data_path = ''  # Fallback to empty string if not configured

        for raw in lines:
          line = raw.rstrip()
          if not line.strip():
            flush_list()
            flow.append(Spacer(1, 6))
            continue

          if line.lstrip().startswith(("- ", "* ")):
            content = line.lstrip()[2:].strip()
            # If bullet contains a figure placeholder, treat it as normal content for image handling
            if figure_pattern.search(content):
              flush_list()
              line = content
            else:
              list_buffer.append(content)
              continue

          flush_list()

          # Build block image flowables for each figure and replace placeholders
          img_flowables = []
          def build_img_flowable(filename: str):
            # Images are stored directly in DATA_PATH root, matching upload/delete/nginx serving location
            figure_path = os.path.join(data_path, filename)
            if not os.path.exists(figure_path):
              return None
            try:
              ir = ImageReader(figure_path)
              iw, ih = ir.getSize()
              if not iw or not ih:
                return None
              # Target height: 25% of full page height (not just usable content)
              target_h = float(page_height) * 0.25
              # Primary scale by height
              scale_h = target_h / float(ih)
              target_w = float(iw) * scale_h
              # If width would exceed content width, scale down to fit
              if target_w > float(max_content_width):
                scale_w = float(max_content_width) / target_w
                target_w = float(max_content_width)
                target_h = target_h * scale_w
              return RLImage(figure_path, width=target_w, height=target_h)
            except Exception:
              return None

          # Replace each [FIGURE:...] with a token, then later swap with img tag
          tokens = []
          def token_replacer(m):
            fname = m.group(1).strip()
            # Remove any zero-width or non-filename characters that may sneak in
            fname = re.sub(r"[^A-Za-z0-9._-]", "", fname)
            flowable = build_img_flowable(fname)
            tokens.append(flowable)
            return f"[[[FIGIMG_{len(tokens)-1}]]]"  # placeholder token

          tokenized = figure_pattern.sub(token_replacer, line)
          if tokens:
            # If there is surrounding text (excluding tokens), render it as its own paragraph
            import re as _re
            text_without_tokens = _re.sub(r"\[\[\[FIGIMG_\d+\]\]\]", "", tokenized)
            if text_without_tokens.strip():
              flow.append(Paragraph(md_inline_to_html(text_without_tokens), body_style))
              flow.append(Spacer(1, 6))
            # Add each image as a block-level element at full content width
            for fl in tokens:
              if fl is not None:
                flow.append(fl)
                flow.append(Spacer(1, 10))
          else:
            # No images on this line; render as normal paragraph
            flow.append(Paragraph(md_inline_to_html(tokenized), body_style))

        flush_list()
        return flow

      story = []
      # Title and metadata
      story.append(Paragraph("Data Story", ParagraphStyle(
        name="DocTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=16, leading=20)))
      story.append(Spacer(1, 6))
      story.append(Paragraph(f"Exported: {timestamp}", ParagraphStyle(
        name="Meta", parent=styles["Normal"], fontName="Helvetica", fontSize=9, textColor=colors.grey)))
      story.append(Spacer(1, 12))

      # Sections
      for title, content in sections:
        story.append(Paragraph(title, heading_style))
        story.extend(md_to_flowables(content))
        story.append(Spacer(1, 10))

      if not sections:
        story.append(Paragraph("No story content provided.", body_style))

      doc.build(story)

      pdf_bytes = buffer.getvalue()
      buffer.close()

      response = FileResponse(BytesIO(pdf_bytes), content_type="application/pdf")
      response["Content-Disposition"] = f'attachment; filename="data-story-{timestamp}.pdf"'
      response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
      response["Access-Control-Allow-Credentials"] = "true"
      return response
    except Exception as e:
      return Response({"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)