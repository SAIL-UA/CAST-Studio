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
from io import StringIO
import csv
import json
from django.http import StreamingHttpResponse
from django.utils.timezone import now
from django.utils._os import safe_join
from rest_framework.throttling import UserRateThrottle
from .tasks import generate_description_task, generate_narrative_task
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

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
      image_data = ImageData.objects.get(id=image_id)
    else: # all images
      image_data = ImageData.objects.filter(user=request.user)
    
    if not image_data:
      return Response({"message": "No image data found"}, status=status.HTTP_204_NO_CONTENT)
      
    serialized_image_data = ImageDataSerializer(image_data, many=False if image_id else True)
    
    return Response({"images": serialized_image_data.data}, status=status.HTTP_200_OK)
  
  
class UploadFigureView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    
    figure = request.FILES.get('figure')
    if not figure:
      return Response({"message": "No file part in the request"}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Reconstruct the user folder path
    username = request.user.username
    user_folder = os.path.join(os.getenv('DATA_PATH'), username, "workspace", "cache")
    os.makedirs(user_folder, exist_ok=True)

    # ✅ Build file path
    figure_id = str(uuid.uuid4())
    ext = os.path.splitext(figure.name)[1]
    figure_path = os.path.join(user_folder, f"{figure_id}{ext}")

    # ✅ Save file
    with open(figure_path, 'wb+') as destination:
      for chunk in figure.chunks():
        destination.write(chunk)
    
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    
    
    
    serializer = ImageDataSerializer(data={
      "id": figure_id,
      "user": request.user.id,
      "filepath": f"{figure_id}{ext}",
      "short_desc": request.data.get('short_desc'),
      "long_desc": request.data.get('long_desc') or "Placeholder long description.",
      "source": request.data.get('source'),
      "in_storyboard": False,
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
  def post(self, request):
    """
    Expects JSON body with { "filename": "<image_filename>" }
    Deletes the file and its corresponding JSON.
    """
    filename = request.data.get('filename')

    if not filename:
      return Response({"message": "No filename provided"}, status=status.HTTP_400_BAD_REQUEST)

    user_folder = request.session.get('user_folder')
    file_path = os.path.join(user_folder, filename)
    base_name, ext = os.path.splitext(filename)
    
    # Remove image file if it exists
    if os.path.exists(file_path):
      os.remove(file_path)


    image_data = ImageData.objects.get(id=base_name)
    if image_data:
      image_data.delete()

    return Response({"message": "Figure deleted successfully"}, status=status.HTTP_200_OK)
  
  
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
      # Start the narrative generation task
      task = generate_narrative_task.delay(request.user.id)
      
      return Response({
        "status": "success",
        "message": "Narrative generation started",
        "task_id": task.id
      }, status=status.HTTP_202_ACCEPTED)

    except Exception as e:
      return Response({"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import NarrativeCache
from .serializers import NarrativeCacheSerializer

class GetNarrativeCacheView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    cache = NarrativeCache.objects.filter(user=request.user).first()
    if cache is None:
      return Response(status=status.HTTP_204_NO_CONTENT)

    data = NarrativeCacheSerializer(cache).data
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
