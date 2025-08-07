import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import UserAction, ImageData, NarrativeCache
from .serializers import ImageDataSerializer, NarrativeCacheSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from prompts.load_prompts import categorize_figs_prompt, theme_objective_prompt, sequence_figs_prompt, build_story_prompt, generate_desc_prompt
from scripts.generate_narrative import generate_story, merge_narrative_cache
from scripts.generate_description import update_json_files, update_single_json_file
from django.http import FileResponse
import json
import uuid
from datetime import datetime, timezone
from django.core.exceptions import ObjectDoesNotExist
from django.utils._os import safe_join
import base64
from openai import OpenAI
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
from rest_framework.throttling import UserRateThrottle

class BurstRateThrottle(UserRateThrottle):
  rate = '5/min'

class LogActionView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    user_action = UserAction.objects.create(user=request.user, action=request.data)
    user_action.save()
    return Response({"message": "Action logged successfully"}, status=status.HTTP_200_OK)
  
class GetUserDataView(APIView):
  permission_classes = [IsAuthenticated]
  def get(self, request):
    image_data = ImageData.objects.filter(user=request.user)
    
    if not image_data:
      return Response({"message": "No image data found"}, status=status.HTTP_204_NO_CONTENT)
    
    serialized_image_data = ImageDataSerializer(image_data, many=True)
    
    
    
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
  def post(self, request):
    try: 
      image_id = request.data.get('image_id')
      update_data = request.data.get('data')
      
      if not image_id:
        return Response({"message": "No image ID provided"}, status=status.HTTP_400_BAD_REQUEST)
      
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
  
class RunScriptView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    """
    Generate a narrative story, recommended order, and return intermediate GPT outputs.
    Also automatically update the narrative cache with theme, categories, etc.
    """
    try:
      username = request.user.username
      user_folder = request.session.get('user_folder')
          
      narrative, recommended_order, categorize_response, theme_response, sequence_response = generate_story(
        username,
        categorize_figs_prompt,
        theme_objective_prompt,
        sequence_figs_prompt,
        build_story_prompt
      )
      
      NarrativeCache.objects.create_or_update(
        user=request.user,
        narrative=narrative,
        order=recommended_order,
        theme=theme_response,
        categories=categorize_response,
        sequence_justification=sequence_response
      )
      
      return Response({
        "status": "success",
        "narrative": narrative,
        "recommended_order": recommended_order,
        "categorize_figures_response": categorize_response,
        "theme_response": theme_response,
        "sequence_response": sequence_response
      })
      
    except Exception as e:
      return Response({"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

class GetNarrativeCacheView(APIView):
  permission_classes = [IsAuthenticated]
  def get(self, request):
    try:
      print(request.user)
      cache = NarrativeCache.objects.get(user=request.user)
    except ObjectDoesNotExist:
      return Response({"status": "success", "message": "Cache not found"}, status=status.HTTP_204_NO_CONTENT)

    return Response({"status": "success", "data": cache.data}, status=status.HTTP_200_OK)  
  
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
      long_desc = self.__generate_description(image)

      image.long_desc = long_desc
      image.save()

      serializer = ImageDataSerializer(image)
      return Response(
        {"message": "Description generated for one image", "image": serializer.data},
        status=status.HTTP_200_OK,
      )
    else:
      # Handle all images
      images = ImageData.objects.all()
      updated_images = []

      for image in images:
          long_desc = self.__generate_description(image)
          image.long_desc = long_desc
          image.save()
          updated_images.append(image)

      serializer = ImageDataSerializer(updated_images, many=True)
      return Response(
        {"message": f"Descriptions generated for {len(updated_images)} images", "images": serializer.data},
        status=status.HTTP_200_OK,
      )
      
  def __generate_description(self, image):
    """
    Send the encoded image to GPT-4o to obtain a description.
    """
    image_path = os.path.join(os.getenv('DATA_PATH'), image.user.username, "workspace", "cache", image.filepath)
    with open(image_path, "rb") as image_file:
      base64_image = base64.b64encode(image_file.read()).decode("utf-8")
    response = client.chat.completions.create(
      model="gpt-4o",
      temperature=0.1,
      messages=[
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": "generate the description into the paragraph(s) based on this image",
            },
            {
              "type": "image_url",
              "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
            },
          ],
        }
      ],
    )
    return response.choices[0].message.content
  
class GenerateLongDescriptionsView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    # TODO: refactor this to use the new image data model
    user_folder = request.session.get('user_folder')
    update_json_files(user_folder)
    return Response({"status": "success"}, status=status.HTTP_200_OK)
  

  
class GenerateSingleLongDescriptionView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    image_id = request.data.get('image_id')
    image_data = ImageData.objects.get(id=image_id)
    long_desc = update_single_json_file(image_data.filepath, image_id)
    return Response({"status": "success", "long_desc": long_desc}, status=status.HTTP_200_OK)

class GenerateNarrativeView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    username = request.user.username
    narrative, recommended_order, _, _, _ = generate_story(
      username,
      categorize_figs_prompt,
      theme_objective_prompt,
      sequence_figs_prompt, build_story_prompt)
    return Response({"status": "success", "narrative": narrative, "recommended_order": recommended_order}, status=status.HTTP_200_OK)
