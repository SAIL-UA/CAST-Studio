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
  JupyterLog, MousePositionLog, ScrollLog, GroupData, ScaffoldData, TaskProgress, FeatureFlags,
  SharedSession, SessionParticipant, ResearchQuestion
)

# Serializers
from .serializers import (
  ImageDataSerializer, NarrativeCacheSerializer,
  JupyterLogsSerializer, MousePositionLogSerializer,
  UserActionSerializer, ScrollLogSerializer, GroupDataSerializer, ScaffoldDataSerializer,
  ResearchQuestionSerializer
)

# Tasks
from .tasks import generate_description_task, generate_narrative_task, generate_feedback_task, group_with_ai_task
from .middleware import get_workspace_user, get_workspace_write_user

# Scaffold mappings (moved to pydandtic.py)
from .pydandtic import STORY_SCAFFOLDS

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

class BurstRateThrottle(UserRateThrottle):
  rate = '10/min'


def resolve_target_user(request):
  """
  If ?target_user=<id> is present, verify the requester has permission to view that user's data.
  Allowed if: requester is instructor, OR requester is a participant in an active session hosted by the target user.
  Otherwise return request.user.
  """
  target_id = request.query_params.get('target_user')
  if target_id:
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # Instructors can view any user
    if request.user.is_instructor:
      return User.objects.get(id=target_id)

    # Session participants can view the host's data
    is_participant = SessionParticipant.objects.filter(
      user=request.user,
      session__host_id=target_id,
      session__is_active=True
    ).exists()
    if is_participant:
      return User.objects.get(id=target_id)

    from rest_framework.exceptions import PermissionDenied
    raise PermissionDenied("Access denied")
  return request.user


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
    user = resolve_target_user(request)
    image_id = request.query_params.get("image_id")
    if image_id: # single image
      image_data = ImageData.objects.get(id=image_id)
    else: # all images
      image_data = ImageData.objects.filter(user=user)
    
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

    # Validate file type
    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
    ext = os.path.splitext(figure.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
      return Response({"message": f"Unsupported file type '{ext}'. Please upload PNG, JPG, JPEG, GIF, or WebP images."}, status=status.HTTP_400_BAD_REQUEST)

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
    
    # Find the first available index for workspace user's images
    workspace_user = get_workspace_user(request)
    user_images = ImageData.objects.filter(user=workspace_user)
    used_indices = set(user_images.values_list('index', flat=True))

    # Find first available index starting from 0
    first_available_index = 0
    while first_available_index in used_indices:
      first_available_index += 1

    serializer = ImageDataSerializer(data={
      "id": figure_id,
      "user": workspace_user.id,
      "filepath": f"{figure_id}{ext}",
      "short_desc": request.data.get('short_desc') or f"Visual {first_available_index + 1}",
      "long_desc": request.data.get('long_desc') or "",
      "source": request.data.get('source') or "",
      "in_storyboard": True,
      "x": 0,
      "y": 0,
      "has_order": False,
      "order_num": 0,
      "index": first_available_index,
      "created_at": now,
      "last_saved": now
    })

    if serializer.is_valid():
      serializer.save()
      fig_data = serializer.validated_data
      fig_data['user'] = workspace_user.id
      return Response({"message": "Figure uploaded successfully", "fig_data": fig_data }, status=status.HTTP_200_OK)
    else:
      return Response({"message": f"Figure upload failed: {serializer.errors}"}, status=status.HTTP_400_BAD_REQUEST)


class UploadSlidesView(APIView):
  permission_classes = [IsAuthenticated]
  parser_classes = [MultiPartParser, FormParser]

  MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
  MAX_SLIDES = 15

  def post(self, request):
    import subprocess
    import tempfile
    import glob as glob_module

    slides_file = request.FILES.get('slides')
    if not slides_file:
      return Response({"message": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

    # Validate file type
    if not slides_file.name.lower().endswith('.pptx'):
      return Response({"message": "Only .pptx files are supported"}, status=status.HTTP_400_BAD_REQUEST)

    # Validate file size
    if slides_file.size > self.MAX_FILE_SIZE:
      return Response({"message": f"File exceeds {self.MAX_FILE_SIZE // (1024*1024)}MB limit"}, status=status.HTTP_400_BAD_REQUEST)

    data_path = os.getenv('DATA_PATH')
    if not data_path:
      return Response({"message": "DATA_PATH not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    os.makedirs(data_path, exist_ok=True)
    workspace_user = get_workspace_user(request)

    try:
      # Save uploaded file to temp directory
      with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, 'input.pptx')
        with open(input_path, 'wb+') as f:
          for chunk in slides_file.chunks():
            f.write(chunk)

        # Step 1: Convert PPTX to PDF using LibreOffice
        output_dir = os.path.join(tmpdir, 'output')
        os.makedirs(output_dir, exist_ok=True)

        result = subprocess.run(
          ['libreoffice', '--headless', '--convert-to', 'pdf', '--outdir', output_dir, input_path],
          capture_output=True, text=True, timeout=120
        )

        if result.returncode != 0:
          return Response({"message": f"Slide conversion failed: {result.stderr[:200]}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Find the generated PDF
        pdf_files = glob_module.glob(os.path.join(output_dir, '*.pdf'))
        if not pdf_files:
          return Response({"message": "PDF conversion produced no output"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Step 2: Convert PDF pages to PNGs using pdftoppm
        png_dir = os.path.join(tmpdir, 'pngs')
        os.makedirs(png_dir, exist_ok=True)

        result2 = subprocess.run(
          ['pdftoppm', '-png', '-r', '200', pdf_files[0], os.path.join(png_dir, 'slide')],
          capture_output=True, text=True, timeout=120
        )

        if result2.returncode != 0:
          return Response({"message": f"Page extraction failed: {result2.stderr[:200]}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Find generated PNGs — pdftoppm names them slide-01.png, slide-02.png, etc.
        png_files = sorted(glob_module.glob(os.path.join(png_dir, '*.png')))

        if not png_files:
          return Response({"message": "No slides could be extracted from the file"}, status=status.HTTP_400_BAD_REQUEST)

        # Limit to MAX_SLIDES
        png_files = png_files[:self.MAX_SLIDES]

        now_str = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

        # Find first available index for this user's images
        user_images = ImageData.objects.filter(user=workspace_user)
        used_indices = set(user_images.values_list('index', flat=True))
        next_index = 0
        while next_index in used_indices:
          next_index += 1

        created_images = []

        for slide_num, png_path in enumerate(png_files, 1):
          figure_id = str(uuid.uuid4())
          ext = '.png'
          dest_path = os.path.join(data_path, f"{figure_id}{ext}")

          # Copy PNG to data path
          import shutil
          shutil.copy2(png_path, dest_path)

          # Find next available index
          while next_index in used_indices:
            next_index += 1

          serializer = ImageDataSerializer(data={
            "id": figure_id,
            "user": workspace_user.id,
            "filepath": f"{figure_id}{ext}",
            "short_desc": f"{slide_num}",
            "long_desc": "",
            "source": "pptx",
            "in_storyboard": True,
            "x": 0,
            "y": 0,
            "has_order": False,
            "order_num": 0,
            "index": next_index,
            "created_at": now_str,
            "last_saved": now_str,
          })

          if serializer.is_valid():
            serializer.save()
            created_images.append({
              "id": figure_id,
              "slide_number": slide_num,
              "filepath": f"{figure_id}{ext}",
            })
            used_indices.add(next_index)
            next_index += 1
          else:
            return Response({"message": f"Error creating slide {slide_num}: {serializer.errors}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
          "message": f"Successfully imported {len(created_images)} slides",
          "slides": created_images,
          "total_slides_in_file": len(glob_module.glob(os.path.join(output_dir, '*.png'))),
        }, status=status.HTTP_200_OK)

    except subprocess.TimeoutExpired:
      return Response({"message": "Slide conversion timed out"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
      return Response({"message": f"Error processing slides: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreateNoteView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request):
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    note_id = str(uuid.uuid4())

    # Use workspace_user (set by middleware for session controllers / instructors)
    # Also support explicit target_user in body for instructor feedback
    target_user_id = request.data.get('target_user')
    source = request.data.get('source', '')
    if target_user_id:
      if not request.user.is_instructor:
        return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
      owner_id = target_user_id
    else:
      owner_id = get_workspace_user(request).id

    # Find the first available index for the target user's images
    user_images = ImageData.objects.filter(user_id=owner_id)
    used_indices = set(user_images.values_list('index', flat=True))
    first_available_index = 0
    while first_available_index in used_indices:
      first_available_index += 1

    title = "Instructor Feedback" if source == 'instructor' else f"Note {first_available_index + 1}"

    serializer = ImageDataSerializer(data={
      "id": note_id,
      "user": owner_id,
      "filepath": "",
      "short_desc": title,
      "long_desc": "",
      "source": source,
      "in_storyboard": True,
      "x": 400,
      "y": 300,
      "has_order": False,
      "order_num": 0,
      "index": first_available_index,
      "created_at": now,
      "last_saved": now
    })

    if serializer.is_valid():
      serializer.save()
      return Response({"message": "Note created successfully", "note_data": serializer.data}, status=status.HTTP_200_OK)
    else:
      return Response({"message": f"Note creation failed: {serializer.errors}"}, status=status.HTTP_400_BAD_REQUEST)


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
    workspace_user = get_workspace_user(request)

    # Try to find the image record - first by ID (as UUID), then by filepath as fallback
    image_data = None
    try:
      # Convert base_name string to UUID object for database lookup
      image_id = uuid.UUID(base_name)
      image_data = ImageData.objects.get(id=image_id, user=workspace_user)
    except (ValueError, ImageData.DoesNotExist):
      # If UUID conversion fails or not found by ID, try filepath lookup
      try:
        image_data = ImageData.objects.get(filepath=filename, user=workspace_user)
      except ImageData.DoesNotExist:
        # Admin can delete instructor feedback notes on student accounts
        if request.user.is_instructor:
          try:
            image_id = uuid.UUID(base_name)
            image_data = ImageData.objects.get(id=image_id, source='instructor')
          except (ValueError, ImageData.DoesNotExist):
            pass
        if not image_data:
          # Check if it exists for another user (security check)
          other_user_image = ImageData.objects.filter(filepath=filename).exclude(user=workspace_user).first()
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
    user = resolve_target_user(request)
    group_id = request.query_params.get("group_id")
    if group_id: # single group
      group_data = GroupData.objects.get(id=group_id)
    else: # all groups
      group_data = GroupData.objects.filter(user=user)
    
    if not group_data:
      return Response({"message": "No group data found"}, status=status.HTTP_204_NO_CONTENT)
      
    serialized_group_data = GroupDataSerializer(group_data, many=False if group_id else True)
    
    return Response({"groups": serialized_group_data.data}, status=status.HTTP_200_OK)


class CreateGroupView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    try:
      group_data = request.data.get('data')
      group_data['user'] = get_workspace_user(request).id
      
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


class GetResearchQuestionView(APIView):
  permission_classes = [IsAuthenticated]
  def get(self, request):
    user = get_workspace_user(request)
    rq_id = request.query_params.get("rq_id")

    if rq_id:  # single question
      questions = ResearchQuestion.objects.filter(id=rq_id, user=user).first()
      if not questions:
        return Response({"message": "Research question not found"}, status=status.HTTP_404_NOT_FOUND)
    else:  # all questions for this workspace
      questions = ResearchQuestion.objects.filter(user=user)

    serialized = ResearchQuestionSerializer(questions, many=False if rq_id else True)
    return Response({"research_questions": serialized.data}, status=status.HTTP_200_OK)


class CreateResearchQuestionView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    # Outside the try: PermissionDenied must reach DRF's handler as a 403 rather than
    # being swallowed by the broad except below and reported as a 500.
    user = get_workspace_write_user(request)
    try:
      rq_data = request.data.get('data') or {}
      rq_data['user'] = user.id

      # New questions land at the bottom of the list.
      if 'order' not in rq_data:
        last = ResearchQuestion.objects.filter(user=user).order_by('-order').first()
        rq_data['order'] = (last.order + 1) if last else 0

      serializer = ResearchQuestionSerializer(data=rq_data)
      if serializer.is_valid():
        serializer.save()
        return Response({"message": "Research question created successfully", "research_question": serializer.data}, status=status.HTTP_201_CREATED)
      else:
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
      return Response({"errors": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateResearchQuestionView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request, rq_id=None):
    user = get_workspace_write_user(request)  # outside try so 403 isn't masked as 500
    try:
      rq_id = rq_id or request.data.get('rq_id')
      if not rq_id:
        return Response({"message": "No research question ID provided"}, status=status.HTTP_400_BAD_REQUEST)

      # Scoped by user so one workspace can't edit another's questions by guessing an id.
      existing = ResearchQuestion.objects.filter(id=rq_id, user=user).first()
      if not existing:
        return Response({"message": "Research question not found"}, status=status.HTTP_404_NOT_FOUND)

      serializer = ResearchQuestionSerializer(existing, data=request.data.get('data') or {}, partial=True)
      if serializer.is_valid():
        serializer.save()
        return Response({"message": "Research question updated successfully", "research_question": serializer.data}, status=status.HTTP_200_OK)
      else:
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
      return Response({"errors": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeleteResearchQuestionView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request, rq_id=None):
    """
    Expects rq_id from URL path or JSON body with { "rq_id": "<rq_id>" }.
    Deletes the research question; the M2M rows go with it, the cards do not.
    """
    user = get_workspace_write_user(request)  # outside try so 403 isn't masked as 500
    try:
      rq_id = rq_id or request.data.get('rq_id')
      if not rq_id:
        return Response({"message": "No research question ID provided"}, status=status.HTTP_400_BAD_REQUEST)

      question = ResearchQuestion.objects.filter(id=rq_id, user=user).first()
      if not question:
        return Response({"message": "Research question not found"}, status=status.HTTP_404_NOT_FOUND)

      question.delete()
      return Response({"message": "Research question deleted successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
      return Response({"errors": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateResearchQuestionLinksView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request, rq_id=None):
    """
    Replaces the set of cards linked to a question.
    Expects { "image_ids": [...], "group_ids": [...] } — either key may be omitted.

    Both id lists are filtered to the workspace's own cards before being set, so a
    caller can't attach another user's figures to their question.
    """
    user = get_workspace_write_user(request)  # outside try so 403 isn't masked as 500
    try:
      rq_id = rq_id or request.data.get('rq_id')
      if not rq_id:
        return Response({"message": "No research question ID provided"}, status=status.HTTP_400_BAD_REQUEST)

      question = ResearchQuestion.objects.filter(id=rq_id, user=user).first()
      if not question:
        return Response({"message": "Research question not found"}, status=status.HTTP_404_NOT_FOUND)

      if 'image_ids' in request.data:
        image_ids = request.data.get('image_ids') or []
        question.images.set(ImageData.objects.filter(id__in=image_ids, user=user))

      if 'group_ids' in request.data:
        group_ids = request.data.get('group_ids') or []
        question.groups.set(GroupData.objects.filter(id__in=group_ids, user=user))

      serializer = ResearchQuestionSerializer(question)
      return Response({"message": "Links updated successfully", "research_question": serializer.data}, status=status.HTTP_200_OK)
    except Exception as e:
      return Response({"errors": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIGroupView(APIView):
  permission_classes = [IsAuthenticated]
  throttle_classes = [BurstRateThrottle]

  def post(self, request):
    """Kick off AI grouping as a Celery task. Returns task_id for progress polling."""
    try:
      mode = request.data.get("mode", "ungrouped")
      if mode not in ("all", "ungrouped"):
        return Response({"message": "Invalid mode. Use 'all' or 'ungrouped'."}, status=status.HTTP_400_BAD_REQUEST)

      workspace_user = get_workspace_user(request)
      task = group_with_ai_task.delay(workspace_user.id, mode)

      return Response({
        "status": "success",
        "message": "AI grouping started",
        "task_id": task.id,
        "mode": mode,
      }, status=status.HTTP_202_ACCEPTED)

    except Exception as e:
      return Response({"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GenerateNarrativeAsyncView(APIView):
  permission_classes = [IsAuthenticated]
  throttle_classes = [BurstRateThrottle]

  def post(self, request):
    """Generate narrative asynchronously using Celery task"""
    try:
      # Get story structure ID and use_groups from request
      story_structure_id = request.data.get('story_structure_id') if request.data else None
      use_groups = request.data.get('use_groups', False) if request.data else False
      slot_order = request.data.get('slot_order', None) if request.data else None
      scaffold_id = request.data.get('scaffold_id', None) if request.data else None

      # Start the narrative generation task
      workspace_user = get_workspace_user(request)
      task = generate_narrative_task.delay(workspace_user.id, story_structure_id, use_groups, slot_order, scaffold_id)

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
    user = resolve_target_user(request)
    cache = NarrativeCache.objects.filter(user=user).first()
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


class TaskProgressView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    task_id = request.query_params.get('task_id')
    if not task_id:
      return Response({"error": "task_id required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
      progress = TaskProgress.objects.get(task_id=task_id, user=request.user)
      return Response({
        "current_stage": progress.current_stage,
        "total_stages": progress.total_stages,
        "stage_name": progress.stage_name,
        "substage": progress.substage,
        "error": progress.error,
      })
    except TaskProgress.DoesNotExist:
      return Response({
        "current_stage": 0,
        "total_stages": 1,
        "stage_name": "Starting...",
        "substage": None,
        "error": None,
      })


class GetFeatureFlagsView(APIView):
  permission_classes = [AllowAny]

  def get(self, request):
    flags = FeatureFlags.objects.first()
    if flags:
      return Response({
        "annotate_with_ai": flags.annotate_with_ai,
        "select_with_ai": flags.select_with_ai,
      })
    return Response({
      "annotate_with_ai": True,
      "select_with_ai": True,
    })


class UpdateFeatureFlagsView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request):
    if not request.user.is_instructor:
      return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

    flags, _ = FeatureFlags.objects.get_or_create(id=1)
    flags.annotate_with_ai = request.data.get('annotate_with_ai', flags.annotate_with_ai)
    flags.select_with_ai = request.data.get('select_with_ai', flags.select_with_ai)
    flags.save()

    return Response({
      "annotate_with_ai": flags.annotate_with_ai,
      "select_with_ai": flags.select_with_ai,
    })


class InstructorUsersView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    if not request.user.is_instructor:
      return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

    from django.contrib.auth import get_user_model
    from django.db.models import Max
    User = get_user_model()
    users = User.objects.annotate(
      last_image=Max('image_data__last_saved'),
      last_group=Max('group_data__last_modified'),
      last_scaffold=Max('scaffold_data__last_modified'),
    ).values('id', 'username', 'email', 'first_name', 'last_name', 'is_instructor', 'last_image', 'last_group', 'last_scaffold')

    result = []
    for user in users:
      timestamps = [t for t in [user['last_image'], user['last_group'], user['last_scaffold']] if t is not None]
      last_modified = max(timestamps).isoformat() if timestamps else None
      result.append({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'is_instructor': user['is_instructor'],
        'last_modified': last_modified,
      })

    return Response({"users": result})


class InstructorWorkspaceView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, student_id):
    if not request.user.is_instructor:
      return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
      student = User.objects.get(id=student_id)
      return Response({
        "id": str(student.id),
        "username": student.username,
        "first_name": student.first_name,
        "last_name": student.last_name,
      })
    except User.DoesNotExist:
      return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


class ExportWorkspaceReportView(APIView):
  permission_classes = [IsAuthenticated]

  # Category definitions: category_name -> list of log-id element values
  CATEGORIES = {
    'Uploads': ['import-from-jupyter', 'upload-submit-button'],
    'Notes': ['add-text-note'],
    'Groups': ['group-create-button'],
    'Editing': ['edit-figure-button', 'save-and-close-figure-button', 'visual-inline-title-save', 'visual-inline-desc-save', 'group-inline-name-input', 'group-save-changes-button'],
    'AI Descriptions': ['description-generated', 'annotate-visuals-ai-complete'],
    'Examples Viewed': ['narrative-examples-button'],
    'AI Narrative': ['select-narrative-ai-button'],
    'Scaffolds': ['scaffold-card-add', 'scaffold-card-remove', 'scaffold-group-add', 'scaffold-group-remove', 'scaffold-slot-add', 'scaffold-slot-remove', 'scaffold-close'],
    'Story Generation': ['craft-story-button'],
    'Story Review': ['data-stories-story-button', 'data-stories-narrative-button'],
    'Feedback': ['feedback-button'],
    'Export': ['export-pdf-button'],
    'Delete': ['delete-figure-button', 'move-figure-to-recycle-bin-button'],
  }

  def _gather_data(self):
    """Shared data gathering for both JSON and Excel formats."""
    from django.contrib.auth import get_user_model
    from django.db.models import Count, Max

    User = get_user_model()

    # Collect all tracked log-id values
    all_elements = []
    for elements in self.CATEGORIES.values():
      all_elements.extend(elements)

    # Query: count per user per element, filtered to click actions and tracked elements
    action_counts = (
      UserAction.objects
      .filter(action='click', element__in=all_elements)
      .values('user__id', 'user__username', 'user__first_name', 'user__last_name', 'user__email', 'element')
      .annotate(count=Count('id'))
    )

    # Also include drop actions for scaffold-group-add and scaffold-card-add
    drop_elements = ['scaffold-group-add', 'scaffold-card-add']
    drop_counts = (
      UserAction.objects
      .filter(action='drop', element__in=drop_elements)
      .values('user__id', 'user__username', 'user__first_name', 'user__last_name', 'user__email', 'element')
      .annotate(count=Count('id'))
    )

    # Build per-user data: { user_id: { element: count, ... } }
    user_data = {}
    all_users = User.objects.all().values('id', 'username', 'first_name', 'last_name', 'email', 'is_instructor')
    for u in all_users:
      user_data[u['id']] = {
        'username': u['username'],
        'first_name': u['first_name'],
        'last_name': u['last_name'],
        'email': u['email'],
        'is_instructor': u['is_instructor'],
        'elements': {},
      }

    for row in action_counts:
      uid = row['user__id']
      if uid in user_data:
        user_data[uid]['elements'][row['element']] = row['count']

    for row in drop_counts:
      uid = row['user__id']
      if uid in user_data:
        existing = user_data[uid]['elements'].get(row['element'], 0)
        user_data[uid]['elements'][row['element']] = existing + row['count']

    # Get last_modified per user
    user_timestamps = User.objects.annotate(
      last_image=Max('image_data__last_saved'),
      last_group=Max('group_data__last_modified'),
      last_scaffold=Max('scaffold_data__last_modified'),
    ).values('id', 'last_image', 'last_group', 'last_scaffold')

    for ut in user_timestamps:
      uid = ut['id']
      if uid in user_data:
        timestamps = [t for t in [ut['last_image'], ut['last_group'], ut['last_scaffold']] if t is not None]
        user_data[uid]['last_modified'] = max(timestamps) if timestamps else None

    # Sort users by last_name
    sorted_users = sorted(user_data.values(), key=lambda u: (u['last_name'] or '').lower())
    return sorted_users, all_elements

  def get(self, request):
    if not request.user.is_instructor:
      return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

    sorted_users, all_elements = self._gather_data()
    output_format = request.query_params.get('format', 'excel')

    # --- JSON format ---
    if output_format == 'json':
      result = []
      for u in sorted_users:
        row = {
          'username': u['username'],
          'first_name': u['first_name'],
          'last_name': u['last_name'],
          'email': u['email'],
          'is_instructor': u['is_instructor'],
          'last_modified': u.get('last_modified', None).isoformat() if u.get('last_modified') else None,
        }
        total = 0
        for cat_name, elements in self.CATEGORIES.items():
          cat_total = sum(u['elements'].get(el, 0) for el in elements)
          row[cat_name] = cat_total
          total += cat_total
        row['Total'] = total
        result.append(row)
      return Response({"users": result, "categories": list(self.CATEGORIES.keys())})

    # --- Excel format ---
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill

    wb = Workbook()

    # --- Sheet 1: Categories ---
    ws_cat = wb.active
    ws_cat.title = 'Categories'

    header_font = Font(bold=True)
    header_fill = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')

    cat_headers = ['Username', 'First Name', 'Last Name', 'Email', 'Role', 'Total'] + list(self.CATEGORIES.keys()) + ['Last Modified']
    for col, header in enumerate(cat_headers, 1):
      cell = ws_cat.cell(row=1, column=col, value=header)
      cell.font = header_font
      cell.fill = header_fill
      cell.alignment = Alignment(horizontal='center')

    for row_idx, u in enumerate(sorted_users, 2):
      ws_cat.cell(row=row_idx, column=1, value=u['username'])
      ws_cat.cell(row=row_idx, column=2, value=u['first_name'])
      ws_cat.cell(row=row_idx, column=3, value=u['last_name'])
      ws_cat.cell(row=row_idx, column=4, value=u['email'])
      ws_cat.cell(row=row_idx, column=5, value='Instructor' if u['is_instructor'] else 'Student')

      row_total = 0
      for cat_idx, (cat_name, elements) in enumerate(self.CATEGORIES.items(), 7):
        cat_total = sum(u['elements'].get(el, 0) for el in elements)
        ws_cat.cell(row=row_idx, column=cat_idx, value=cat_total)
        row_total += cat_total

      ws_cat.cell(row=row_idx, column=6, value=row_total)

      last_mod = u.get('last_modified')
      ws_cat.cell(row=row_idx, column=len(cat_headers), value=last_mod.strftime('%b %d %Y, %I:%M %p') if last_mod else '')

    # Auto-width columns
    for col in ws_cat.columns:
      max_len = max(len(str(cell.value or '')) for cell in col)
      ws_cat.column_dimensions[col[0].column_letter].width = min(max_len + 3, 30)

    # --- Sheet 2: Raw ---
    ws_raw = wb.create_sheet('Raw')

    raw_headers = ['Username', 'First Name', 'Last Name', 'Email', 'Role'] + sorted(all_elements) + ['Last Modified']
    for col, header in enumerate(raw_headers, 1):
      cell = ws_raw.cell(row=1, column=col, value=header)
      cell.font = header_font
      cell.fill = header_fill
      cell.alignment = Alignment(horizontal='center')

    for row_idx, u in enumerate(sorted_users, 2):
      ws_raw.cell(row=row_idx, column=1, value=u['username'])
      ws_raw.cell(row=row_idx, column=2, value=u['first_name'])
      ws_raw.cell(row=row_idx, column=3, value=u['last_name'])
      ws_raw.cell(row=row_idx, column=4, value=u['email'])
      ws_raw.cell(row=row_idx, column=5, value='Instructor' if u['is_instructor'] else 'Student')

      for el_idx, element in enumerate(sorted(all_elements), 6):
        ws_raw.cell(row=row_idx, column=el_idx, value=u['elements'].get(element, 0))

      last_mod = u.get('last_modified')
      ws_raw.cell(row=row_idx, column=len(raw_headers), value=last_mod.strftime('%b %d %Y, %I:%M %p') if last_mod else '')

    # Auto-width columns
    for col in ws_raw.columns:
      max_len = max(len(str(cell.value or '')) for cell in col)
      ws_raw.column_dimensions[col[0].column_letter].width = min(max_len + 3, 30)

    # --- Sheet 3: Definitions ---
    ws_def = wb.create_sheet('Definitions')

    def_headers = ['Category', 'Log IDs']
    for col, header in enumerate(def_headers, 1):
      cell = ws_def.cell(row=1, column=col, value=header)
      cell.font = header_font
      cell.fill = header_fill
      cell.alignment = Alignment(horizontal='center')

    for row_idx, (cat_name, elements) in enumerate(self.CATEGORIES.items(), 2):
      ws_def.cell(row=row_idx, column=1, value=cat_name)
      ws_def.cell(row=row_idx, column=2, value=', '.join(elements))

    for col in ws_def.columns:
      max_len = max(len(str(cell.value or '')) for cell in col)
      ws_def.column_dimensions[col[0].column_letter].width = min(max_len + 3, 80)

    # Return as downloadable file
    from django.http import HttpResponse
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    timestamp = now().strftime('%Y%m%dT%H%M%S')
    response['Content-Disposition'] = f'attachment; filename="workspace_report_{timestamp}.xlsx"'
    wb.save(response)
    return response


class HostSessionView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request):
    """Create a new session or return existing active session."""
    existing = SharedSession.objects.filter(host=request.user, is_active=True).first()
    if existing:
      participant_count = existing.participants.count()
      controlled_by_id = str(existing.controlled_by.id) if existing.controlled_by else None
      controlled_by_name = None
      if existing.controlled_by:
        controlled_by_name = f"{existing.controlled_by.first_name} {existing.controlled_by.last_name}".strip() or existing.controlled_by.username
      return Response({
        "share_token": str(existing.share_token),
        "is_active": existing.is_active,
        "participant_count": participant_count,
        "max_participants": existing.max_participants,
        "controlled_by": controlled_by_id,
        "controlled_by_name": controlled_by_name,
      })

    session = SharedSession.objects.create(host=request.user)
    return Response({
      "share_token": str(session.share_token),
      "is_active": session.is_active,
      "participant_count": 0,
      "max_participants": session.max_participants,
      "controlled_by": None,
      "controlled_by_name": None,
    }, status=status.HTTP_201_CREATED)


class CloseSessionView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request):
    """Close the user's active session."""
    session = SharedSession.objects.filter(host=request.user, is_active=True).first()
    if not session:
      return Response({"error": "No active session found"}, status=status.HTTP_404_NOT_FOUND)

    share_token = str(session.share_token)
    session.controlled_by = None
    session.is_active = False
    session.save(update_fields=['controlled_by', 'is_active'])

    # Broadcast control cleared and session closed
    try:
      from channels.layers import get_channel_layer
      from asgiref.sync import async_to_sync
      channel_layer = get_channel_layer()
      async_to_sync(channel_layer.group_send)(
        f'session_{share_token}',
        {
          'type': 'control_changed',
          'controlled_by': None,
          'controlled_by_name': None,
        }
      )
    except Exception:
      pass

    return Response({"message": "Session closed"})


class SessionStatusView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    """Get the user's active session status."""
    session = SharedSession.objects.filter(host=request.user, is_active=True).first()
    if not session:
      return Response(status=status.HTTP_204_NO_CONTENT)

    from django.utils import timezone
    participants = session.participants.select_related('user').all()
    now = timezone.now()
    online_count = sum(1 for p in participants if p.last_seen and (now - p.last_seen).total_seconds() < 15)
    controlled_by_id = str(session.controlled_by.id) if session.controlled_by else None
    controlled_by_name = None
    if session.controlled_by:
      controlled_by_name = f"{session.controlled_by.first_name} {session.controlled_by.last_name}".strip() or session.controlled_by.username
    return Response({
      "share_token": str(session.share_token),
      "is_active": session.is_active,
      "participant_count": participants.count(),
      "online_count": online_count,
      "max_participants": session.max_participants,
      "controlled_by": controlled_by_id,
      "controlled_by_name": controlled_by_name,
      "participants": [
        {
          "username": p.user.username,
          "first_name": p.user.first_name,
          "last_name": p.user.last_name,
          "is_online": (now - p.last_seen).total_seconds() < 15 if p.last_seen else False,
        }
        for p in participants
      ],
    })


class JoinSessionView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, share_token):
    """Join a session by share token."""
    try:
      session = SharedSession.objects.get(share_token=share_token)
    except SharedSession.DoesNotExist:
      return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

    if not session.is_active:
      return Response({"error": "This session has ended."}, status=status.HTTP_403_FORBIDDEN)

    if session.host == request.user:
      return Response({"error": "You cannot join your own session."}, status=status.HTTP_400_BAD_REQUEST)

    participant_count = session.participants.count()
    if participant_count >= session.max_participants:
      return Response({"error": "This session is full."}, status=status.HTTP_403_FORBIDDEN)

    # Add as participant if not already, and update last_seen
    from django.utils import timezone
    participant, created = SessionParticipant.objects.get_or_create(session=session, user=request.user)
    if not created:
      participant.last_seen = timezone.now()
      participant.save(update_fields=['last_seen'])

    participants = session.participants.select_related('user').all()
    host = session.host
    now = timezone.now()
    controlled_by_id = str(session.controlled_by.id) if session.controlled_by else None
    controlled_by_name = None
    if session.controlled_by:
      controlled_by_name = f"{session.controlled_by.first_name} {session.controlled_by.last_name}".strip() or session.controlled_by.username
    return Response({
      "host_id": str(host.id),
      "host_name": f"{host.first_name} {host.last_name}".strip() or host.username,
      "participants": [
        {
          "username": p.user.username,
          "first_name": p.user.first_name,
          "last_name": p.user.last_name,
          "is_online": (now - p.last_seen).total_seconds() < 15 if p.last_seen else False,
        }
        for p in participants
      ],
      "is_active": session.is_active,
      "controlled_by": controlled_by_id,
      "controlled_by_name": controlled_by_name,
    })


class TakeControlView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request):
    """Take control of a session's workspace."""
    from django.db import transaction

    share_token = request.data.get('share_token')
    if not share_token:
      return Response({"error": "share_token required"}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
      try:
        # Use select_for_update to prevent race conditions
        session = SharedSession.objects.select_for_update().get(share_token=share_token, is_active=True)
      except SharedSession.DoesNotExist:
        return Response({"error": "Session not found or inactive"}, status=status.HTTP_404_NOT_FOUND)

      # Host reclaims control by setting controlled_by to None
      if session.host == request.user:
        session.controlled_by = None
        session.save(update_fields=['controlled_by'])
      else:
        # Participant: must be a session participant
        is_participant = SessionParticipant.objects.filter(session=session, user=request.user).exists()
        if not is_participant:
          return Response({"error": "Not a participant in this session"}, status=status.HTTP_403_FORBIDDEN)

        session.controlled_by = request.user
        session.save(update_fields=['controlled_by'])

    # Broadcast control change via WebSocket (outside transaction)
    try:
      from channels.layers import get_channel_layer
      from asgiref.sync import async_to_sync
      channel_layer = get_channel_layer()
      controlled_by_id = str(session.controlled_by.id) if session.controlled_by else None
      controlled_by_name = None
      if session.controlled_by:
        controlled_by_name = f"{session.controlled_by.first_name} {session.controlled_by.last_name}".strip() or session.controlled_by.username
      async_to_sync(channel_layer.group_send)(
        f'session_{share_token}',
        {
          'type': 'control_changed',
          'controlled_by': controlled_by_id,
          'controlled_by_name': controlled_by_name,
        }
      )
    except Exception:
      pass  # Don't fail the request if broadcast fails

    controlled_by_id = str(session.controlled_by.id) if session.controlled_by else None
    controlled_by_name = None
    if session.controlled_by:
      controlled_by_name = f"{session.controlled_by.first_name} {session.controlled_by.last_name}".strip() or session.controlled_by.username

    return Response({
      "controlled_by": controlled_by_id,
      "controlled_by_name": controlled_by_name,
    })


class ReturnControlView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request):
    """Return control of a session back to the host."""
    from django.db import transaction

    share_token = request.data.get('share_token')
    if not share_token:
      return Response({"error": "share_token required"}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
      try:
        session = SharedSession.objects.select_for_update().get(share_token=share_token, is_active=True)
      except SharedSession.DoesNotExist:
        return Response({"error": "Session not found or inactive"}, status=status.HTTP_404_NOT_FOUND)

      # Only the user who has control can return it
      if session.controlled_by != request.user:
        return Response({"error": "You don't have control of this session"}, status=status.HTTP_403_FORBIDDEN)

      session.controlled_by = None
      session.save(update_fields=['controlled_by'])

    # Broadcast control change via WebSocket (outside transaction)
    try:
      from channels.layers import get_channel_layer
      from asgiref.sync import async_to_sync
      channel_layer = get_channel_layer()
      async_to_sync(channel_layer.group_send)(
        f'session_{share_token}',
        {
          'type': 'control_changed',
          'controlled_by': None,
          'controlled_by_name': None,
        }
      )
    except Exception:
      pass

    return Response({
      "controlled_by": None,
      "controlled_by_name": None,
    })


class UpdateNarrativeCacheView(APIView):
  permission_classes = [IsAuthenticated]

  # Only these NarrativeCache fields may be set by a client. Anything else in the
  # payload (notably 'user') is dropped so a caller cannot reassign ownership.
  ALLOWED_FIELDS = {
    'story_structure_id',
    'narrative',
    'order',
    'theme',
    'categories',
    'sequence_justification',
  }

  def post(self, request):
    cache_data = request.data.get('data')
    if not isinstance(cache_data, dict):
      return Response(
        {'status': 'error', 'message': 'Expected a JSON object in "data"'},
        status=status.HTTP_400_BAD_REQUEST,
      )

    # get_workspace_write_user, NOT get_workspace_user: the latter also resolves
    # ?target_user for plain read-only participants and instructors, any of whom could
    # then overwrite the host's story. Writes are limited to the owner or whoever
    # currently holds control of the owner's session. Raises PermissionDenied (403).
    workspace_user = get_workspace_write_user(request)

    try:
      cache = NarrativeCache.objects.get(user=workspace_user)
    except NarrativeCache.DoesNotExist:
      return Response({"status": "error", "message": "Cache not found"}, status=status.HTTP_404_NOT_FOUND)

    filtered = {k: v for k, v in cache_data.items() if k in self.ALLOWED_FIELDS}
    if not filtered:
      return Response(
        {'status': 'error', 'message': 'No updatable fields in "data"'},
        status=status.HTTP_400_BAD_REQUEST,
      )

    serializer = NarrativeCacheSerializer(cache, data=filtered, partial=True)
    if serializer.is_valid():
      serializer.save()
      return Response({"status": "success"}, status=status.HTTP_200_OK)
    else:
      return Response(
        {'status': 'error', 'message': 'Invalid data', 'errors': serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
      )


class ClearNarrativeCacheView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    # Same restriction as the update view: deleting someone's story is a mutation, so a
    # read-only participant must not be able to do it via ?target_user.
    try:
      cache = NarrativeCache.objects.get(user=get_workspace_write_user(request))
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
        if not image.in_storyboard:
          continue
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
      workspace_user = get_workspace_user(request)
      result = generate_narrative_task(workspace_user.id)

      # Get the updated narrative cache
      try:
        narrative_cache = NarrativeCache.objects.get(user=workspace_user)
        return Response({
          "status": "success",
          "story_structure_id": narrative_cache.story_structure_id,
          "narrative": narrative_cache.narrative,
          "recommended_order": narrative_cache.order,
          "theme": narrative_cache.theme,
          "categories": narrative_cache.categories,
          "sequence_justification": narrative_cache.sequence_justification,
          "sequence_summary": narrative_cache.sequence_summary,
          "rq_reasoning": narrative_cache.rq_reasoning,
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

      workspace_user = get_workspace_user(request)
      task = generate_feedback_task.delay(workspace_user.id, storyboard_id)
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
          # section is carried through so the panel can label the rubric area a note came from
          items = [
            {
              "title": str(it.get("title", "")),
              "text": str(it.get("text", "")),
              "section": str(it.get("section", "")),
            }
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
      body = request.data or {}
      payload = body.get('storyData') or {}
      export_format = (body.get('format') or 'pdf').lower()

      # If no payload provided, attempt to pull latest from NarrativeCache
      if not payload:
        cache = NarrativeCache.objects.filter(user=get_workspace_user(request)).first()
        if cache:
          payload = {
            "narrative": cache.narrative,
            "recommended_order": cache.order or [],
            "categorize_figures_response": None,
            "theme_response": cache.theme,
            "sequence_response": cache.sequence_justification,
          }

      # Build structured sections for rendering — story first, then reasoning on new page
      story_sections = []
      if payload.get('narrative'):
        story_sections.append(("Story", str(payload.get('narrative')).strip()))

      reasoning_sections = []
      if payload.get('theme_response'):
        reasoning_sections.append(("Theme & Objective", str(payload.get('theme_response')).strip()))
      if payload.get('sequence_response'):
        reasoning_sections.append(("Sequence Justification", str(payload.get('sequence_response')).strip()))

      timestamp = now().strftime("%Y%m%dT%H%M%SZ")

      # DOCX branch — mirrors the PDF walker but emits python-docx runs/paragraphs.
      # Kept separate from the PDF path to avoid regressing the existing export.
      if export_format == 'docx':
        import re
        from docx import Document
        from docx.shared import Inches
        from PIL import Image as PILImage

        data_path = os.getenv('DATA_PATH') or ''
        figure_pattern = re.compile(r"\[\s*FIGURE\s*[:：﹕]\s*([^\]]+?)\s*\]", re.IGNORECASE | re.UNICODE)
        # Tokenize inline **bold** and *italic* into (text, bold, italic) runs. Sequential regexes
        # like the PDF path can't work here because docx runs are flat (no HTML nesting), so we
        # walk the string left-to-right, emitting runs on delimiter transitions.
        def emit_runs(paragraph, text):
          i, n = 0, len(text)
          bold = italic = False
          buf = []
          def flush():
            if buf:
              run = paragraph.add_run(''.join(buf))
              run.bold = bold
              run.italic = italic
              buf.clear()
          while i < n:
            if text.startswith('**', i):
              flush(); bold = not bold; i += 2; continue
            if text[i] == '*':
              flush(); italic = not italic; i += 1; continue
            buf.append(text[i]); i += 1
          flush()

        # Cap image height so tall/portrait screenshots don't blow across pages.
        # Word preserves aspect ratio if only one dimension is set — we pick the smaller
        # dimension after reading actual pixel size via Pillow.
        MAX_IMG_W_IN = 6.0   # matches typical Letter content width
        MAX_IMG_H_IN = 5.5   # roughly half a Letter page
        def add_figure(doc, filename):
          fname = re.sub(r"[^A-Za-z0-9._-]", "", filename.strip())
          fpath = os.path.join(data_path, fname)
          if not os.path.exists(fpath):
            # Notes (and any other non-image [FIGURE:] leak) resolve to nothing on
            # disk. Silently drop rather than surface "[Missing image: …]" or a
            # Word broken-icon placeholder — the note's text is already in the prose.
            return
          try:
            with PILImage.open(fpath) as im:
              iw, ih = im.size
            if not iw or not ih:
              raise ValueError("zero dimensions")
            aspect = ih / iw
            # Fit into the max box, preserving aspect
            w_from_h = MAX_IMG_H_IN / aspect if aspect else MAX_IMG_W_IN
            width_in = min(MAX_IMG_W_IN, w_from_h)
            doc.add_picture(fpath, width=Inches(width_in))
          except Exception:
            # Unsupported format (WebP/SVG etc.) — same silence policy as missing.
            pass

        def render_section(doc, title, md_text):
          doc.add_heading(title, level=2)
          list_buffer = []
          def flush_list():
            for item in list_buffer:
              p = doc.add_paragraph(style='List Bullet')
              emit_runs(p, item)
            list_buffer.clear()

          for raw in md_text.splitlines():
            line = raw.rstrip()
            if not line.strip():
              flush_list()
              doc.add_paragraph()
              continue
            if line.lstrip().startswith(("- ", "* ")):
              content = line.lstrip()[2:].strip()
              if figure_pattern.search(content):
                # Bullet-with-figure: match PDF behavior — break list and render inline
                flush_list()
                line = content
              else:
                list_buffer.append(content)
                continue
            flush_list()

            # Split on figures; render text runs and images inline in order
            parts = []
            last = 0
            for m in figure_pattern.finditer(line):
              if m.start() > last:
                parts.append(('text', line[last:m.start()]))
              parts.append(('img', m.group(1)))
              last = m.end()
            if last < len(line):
              parts.append(('text', line[last:]))

            if any(p[0] == 'img' for p in parts):
              text_only = ''.join(t for k, t in parts if k == 'text').strip()
              if text_only:
                p = doc.add_paragraph()
                emit_runs(p, text_only)
              for kind, val in parts:
                if kind == 'img':
                  add_figure(doc, val)
            else:
              p = doc.add_paragraph()
              emit_runs(p, line)
          flush_list()

        doc = Document()
        doc.add_heading("Data Story", level=1)
        meta = doc.add_paragraph(f"Exported: {timestamp}")
        meta.runs[0].italic = True

        for title, content in story_sections:
          render_section(doc, title, content)

        if reasoning_sections:
          doc.add_page_break()
          doc.add_heading("Reasoning", level=1)
          for title, content in reasoning_sections:
            render_section(doc, title, content)

        if not story_sections and not reasoning_sections:
          doc.add_paragraph("No story content provided.")

        buf = BytesIO()
        doc.save(buf)
        docx_bytes = buf.getvalue()
        buf.close()

        response = FileResponse(
          BytesIO(docx_bytes),
          content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        response["Content-Disposition"] = f'attachment; filename="data-story-{timestamp}.docx"'
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Credentials"] = "true"
        return response

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

      from reportlab.platypus import PageBreak

      story = []
      # Title and metadata
      story.append(Paragraph("Data Story", ParagraphStyle(
        name="DocTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=16, leading=20)))
      story.append(Spacer(1, 6))
      story.append(Paragraph(f"Exported: {timestamp}", ParagraphStyle(
        name="Meta", parent=styles["Normal"], fontName="Helvetica", fontSize=9, textColor=colors.grey)))
      story.append(Spacer(1, 12))

      # Story sections
      for title, content in story_sections:
        story.append(Paragraph(title, heading_style))
        story.extend(md_to_flowables(content))
        story.append(Spacer(1, 10))

      # Reasoning sections on new page
      if reasoning_sections:
        story.append(PageBreak())
        story.append(Paragraph("Reasoning", ParagraphStyle(
          name="ReasoningTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=16, leading=20)))
        story.append(Spacer(1, 12))
        for title, content in reasoning_sections:
          story.append(Paragraph(title, heading_style))
          story.extend(md_to_flowables(content))
          story.append(Spacer(1, 10))

      if not story_sections and not reasoning_sections:
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


class CreateScaffoldView(APIView):
  permission_classes = [IsAuthenticated]
  
  def post(self, request):
    """
    Create a scaffold instance.
    Expected body: {
      "pattern": "cause_and_effect",
      "x": 0.0 (optional, defaults to 0.0),
      "y": 0.0 (optional, defaults to 0.0)
    }
    """
    try:
      workspace_user = get_workspace_user(request)

      # Get scaffold pattern from request
      scaffold_pattern = request.data.get('pattern', '')

      # Validate pattern
      if not scaffold_pattern:
        return Response({
          "error": "'pattern' field is required"
        }, status=status.HTTP_400_BAD_REQUEST)

      if scaffold_pattern not in STORY_SCAFFOLDS:
        return Response({
          "error": f"Invalid pattern '{scaffold_pattern}'. Must be one of: {', '.join(STORY_SCAFFOLDS.keys())}"
        }, status=status.HTTP_400_BAD_REQUEST)

      # Get scaffold info from mapping
      scaffold_info = STORY_SCAFFOLDS[scaffold_pattern]

      # Create new scaffold (multiple scaffolds per user are allowed)
      scaffold_data = {
        'user': workspace_user.id,
        'name': scaffold_info['name'],
        'number': scaffold_info['number'],
        'description': scaffold_info['description'],
        'valid_group_numbers': scaffold_info['valid_group_numbers'],  # Add this line
        'x': request.data.get('x', 0.0),
        'y': request.data.get('y', 0.0),
      }
      
      serializer = ScaffoldDataSerializer(data=scaffold_data)
      if serializer.is_valid():
        serializer.save()
        return Response({
          "message": "Scaffold created successfully",
          "scaffold": serializer.data
        }, status=status.HTTP_201_CREATED)
      else:
        return Response({
          "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
      return Response({
        "error": str(e)
      }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetScaffoldView(APIView):
  permission_classes = [IsAuthenticated]
  def get(self, request):
    user = resolve_target_user(request)
    scaffold_id = request.query_params.get("scaffold_id")
    if scaffold_id: # single scaffold
      scaffold_data = ScaffoldData.objects.get(id=scaffold_id, user=user)
    else: # all scaffolds for user
      scaffold_data = ScaffoldData.objects.filter(user=user)
    
    if not scaffold_data:
      return Response({"message": "No scaffold data found"}, status=status.HTTP_204_NO_CONTENT)
      
    serialized_scaffold_data = ScaffoldDataSerializer(scaffold_data, many=False if scaffold_id else True)
    
    return Response({"scaffolds": serialized_scaffold_data.data}, status=status.HTTP_200_OK)


class UpdateScaffoldView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request, scaffold_id=None):
    try:
      scaffold_id = scaffold_id or request.data.get('scaffold_id')
      if not scaffold_id:
        return Response({"message": "No scaffold ID provided"}, status=status.HTTP_400_BAD_REQUEST)
      
      update_data = request.data.get('data')
      
      existing_scaffold = ScaffoldData.objects.get(id=scaffold_id, user=get_workspace_user(request))
      
      serializer = ScaffoldDataSerializer(existing_scaffold, data=update_data, partial=True)
      
      if serializer.is_valid():
        serializer.save()
        return Response({"message": "Scaffold updated successfully", "scaffold": serializer.data}, status=status.HTTP_200_OK)
      else:
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    except ScaffoldData.DoesNotExist:
      return Response({"message": "Scaffold not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
      return Response({"errors": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeleteScaffoldView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    try:
      workspace_user = get_workspace_user(request)
      scaffold_id = request.data.get('scaffold_id')

      if scaffold_id:
        # Delete a specific scaffold
        try:
          scaffold = ScaffoldData.objects.get(id=scaffold_id, user=workspace_user)
        except ScaffoldData.DoesNotExist:
          return Response({"error": "Scaffold not found"}, status=status.HTTP_404_NOT_FOUND)

        # Clear associations for items in this scaffold only
        ImageData.objects.filter(user=workspace_user, scaffold_id=scaffold).update(scaffold_id=None, scaffold_group_number=None)
        GroupData.objects.filter(user=workspace_user, scaffold_id=scaffold).update(scaffold_id=None, scaffold_group_number=None)
        scaffold.delete()

        return Response({"message": "Scaffold deleted successfully"}, status=status.HTTP_200_OK)
      else:
        # Delete all scaffolds (backward compatible)
        scaffolds = ScaffoldData.objects.filter(user=workspace_user)
        for scaffold in scaffolds:
          scaffold.delete()

        ImageData.objects.filter(user=workspace_user, scaffold_id__isnull=False).update(scaffold_id=None, scaffold_group_number=None)
        GroupData.objects.filter(user=workspace_user, scaffold_id__isnull=False).update(scaffold_id=None, scaffold_group_number=None)

        return Response({"message": "All scaffolds deleted successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
      return Response({"errors": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
