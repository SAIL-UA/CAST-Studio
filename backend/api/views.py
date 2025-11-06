import os
import uuid
from openai import OpenAI
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import UserAction, ImageData, NarrativeCache, JupyterLog
from .serializers import ImageDataSerializer, NarrativeCacheSerializer, JupyterLogsSerializer
from users.models import User
from rest_framework.permissions import IsAuthenticated, AllowAny
from .tasks import generate_narrative_task
from django.http import FileResponse
from datetime import datetime, timezone
from django.core.exceptions import ObjectDoesNotExist
from io import StringIO, BytesIO
import csv
import json
from django.http import StreamingHttpResponse
from django.utils.timezone import now
from django.utils._os import safe_join
from rest_framework.throttling import UserRateThrottle
from .tasks import generate_description_task, generate_narrative_task
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem, Image as RLImage
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from .models import NarrativeCache
from .serializers import NarrativeCacheSerializer

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

class BurstRateThrottle(UserRateThrottle):
  rate = '10/min'
  
class LogsExportRateThrottle(UserRateThrottle):
  rate = '5/hr'


class RefreshTokenView(APIView):
  permission_classes = [AllowAny]
  
  def post(self, request):
    refresh = request.data.get("refresh")
    if not refresh:
      return Response({"detail": "No refresh token provided"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = TokenRefreshSerializer(data={"refresh": refresh})
    try:
      serializer.is_valid(raise_exception=True)
    except (TokenError, InvalidToken) as e:
      return Response({"detail": "Token is invalid or expired"}, status=status.HTTP_401_UNAUTHORIZED)

    # Returns {'access': '...'} and, if ROTATE_REFRESH_TOKENS=True, also {'refresh': '...'}
    return Response(serializer.validated_data, status=status.HTTP_200_OK)
    
    
    
class LogActionView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    headers = dict(request.headers)
    user_action = UserAction.objects.create(user=request.user, action=request.data, request_headers=headers)
    user_action.save()
    return Response({"message": "Action logged successfully"}, status=status.HTTP_200_OK)
  
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
      try:
        image_data = ImageData.objects.get(id=image_id, user=request.user)
        # Check if file exists for single image
        user_folder = os.path.join(os.getenv('DATA_PATH'), request.user.username, "workspace", "cache")
        filepath = os.path.join(user_folder, image_data.filepath)
        if not os.path.exists(filepath):
          return Response({"message": "Image file not found"}, status=status.HTTP_404_NOT_FOUND)
        serialized_image_data = ImageDataSerializer(image_data, many=False)
        return Response({"images": serialized_image_data.data}, status=status.HTTP_200_OK)
      except ImageData.DoesNotExist:
        return Response({"message": "Image data not found"}, status=status.HTTP_404_NOT_FOUND)
    else: # all images
      image_data = ImageData.objects.filter(user=request.user)
      
      # Filter out images where files don't exist
      user_folder = os.path.join(os.getenv('DATA_PATH'), request.user.username, "workspace", "cache")
      valid_images = []
      
      for img in image_data:
        filepath = os.path.join(user_folder, img.filepath)
        if os.path.exists(filepath):
          valid_images.append(img)
        # Optionally: delete orphaned DB records automatically
        else:
          img.delete()
      
      if not valid_images:
        return Response({"message": "No image data found"}, status=status.HTTP_204_NO_CONTENT)
        
      serialized_image_data = ImageDataSerializer(valid_images, many=True)
      
      return Response({"images": serialized_image_data.data}, status=status.HTTP_200_OK)
  
  
class UploadFigureView(APIView):
  permission_classes = [IsAuthenticated]
  parser_classes = [MultiPartParser, FormParser]
  def post(self, request):
    
    figure = request.FILES.get('figure')
    if not figure:
      return Response({"message": "No file part in the request"}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Reconstruct the user folder path
    username = request.user.username
    user_folder = os.path.join(os.getenv('DATA_PATH'), username, "workspace", "cache")
    os.makedirs(user_folder, exist_ok=True)

    # Build file path
    figure_id = str(uuid.uuid4())
    ext = os.path.splitext(figure.name)[1]
    figure_path = os.path.join(user_folder, f"{figure_id}{ext}")

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
      return Response({"message": "Figure uploaded successfully"}, status=status.HTTP_200_OK)
    else:
      return Response({"message": f"Figure upload failed: {serializer.errors}"}, status=status.HTTP_400_BAD_REQUEST)
  
class DeleteFigureView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request, filename=None):
    """
    Deletes the file and its corresponding DB record.
    Filename is taken from the URL pattern.
    """
    if not filename:
      return Response({"message": "No filename provided"}, status=status.HTTP_400_BAD_REQUEST)

    # Build user-specific cache folder (same as in upload)
    user_folder = os.path.join(os.getenv('DATA_PATH'), request.user.username, "workspace", "cache")

    try:
      filepath = safe_join(user_folder, filename)
    except ValueError:
      return Response({"message": "Invalid filename"}, status=status.HTTP_400_BAD_REQUEST)

    base_name, _ = os.path.splitext(filename)

    # Remove image file if it exists
    if os.path.exists(filepath):
      os.remove(filepath)

    # Remove DB record if it exists
    try:
      image_data = ImageData.objects.get(id=base_name)
      image_data.delete()
    except ImageData.DoesNotExist:
      pass

    return Response({"status": "success", "message": "Figure deleted successfully", "deleted_id": base_name, "deleted_filename": filename}, status=status.HTTP_200_OK)
  
  
class ServeImageView(APIView):
  permission_classes = [IsAuthenticated]
  def get(self, request, filename):
    
    user_folder = os.path.join(os.getenv('DATA_PATH'), request.user.username, "workspace", "cache")
    
    try:
      filepath = safe_join(user_folder, filename)
    except ValueError:
      return Response({"message": "Invalid filename"}, status=status.HTTP_400_BAD_REQUEST)
    
    if not os.path.exists(filepath):
      return Response({"message": f"File not found: {filepath}"}, status=status.HTTP_404_NOT_FOUND)
    
    response = FileResponse(open(filepath, 'rb'), content_type='image/png')
    response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    response["Access-Control-Allow-Credentials"] = "true"
    
    return response
    
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
        return Response({"message": "Image data updated successfully"}, status=status.HTTP_200_OK)
      else:
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
      return Response({"errors": e}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
  

class GenerateNarrativeAsyncView(APIView):
  permission_classes = [IsAuthenticated]
  throttle_classes = [BurstRateThrottle]

  def post(self, request):
    """Generate narrative asynchronously using Celery task"""
    try:
      # Get story structure ID from request if provided
      story_structure_id = request.data.get('story_structure_id') if request.data else None
      
      # Start the narrative generation task
      task = generate_narrative_task.delay(request.user.id, story_structure_id)
      
      return Response({
        "status": "success",
        "message": "Narrative generation started",
        "task_id": task.id,
        "story_structure_id": story_structure_id
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
        user_cache_dir = os.path.join(os.getenv('DATA_PATH') or '', request.user.username, 'workspace', 'cache')

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
            figure_path = os.path.join(user_cache_dir, filename)
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

