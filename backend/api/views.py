import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import UserAction, ImageData, NarrativeCache
from .serializers import ImageDataSerializer, NarrativeCacheSerializer
from rest_framework.permissions import IsAuthenticated
from prompts.load_prompts import categorize_figs_prompt, theme_objective_prompt, sequence_figs_prompt, build_story_prompt, generate_desc_prompt
from scripts.generate_narrative import generate_story, merge_narrative_cache
from scripts.generate_description import update_json_files, update_single_json_file
import json
import uuid
from datetime import datetime, timezone

class LogActionView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    user_action = UserAction.objects.create(user=request.user, action=request.data.get('action'))
    user_action.save()
    return Response({"message": "Action logged successfully"}, status=status.HTTP_200_OK)
  
class GetUserDataView(APIView):
  permission_classes = [IsAuthenticated]
  def get(self, request):
    
    user_folder = request.session.get('user_folder')
    
    image_files = [f for f in os.listdir(user_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff'))]
    
    images_data = []
    for image_file in image_files:
      image_id = os.path.splitext(image_file)[0]
      json_filename = image_id + '.json'
      json_filepath = os.path.join(user_folder, json_filename)
      
      # ensure json file exists
      if not os.path.exists(json_filepath):
        continue
      
      with open(json_filepath, 'r') as f:
        image_data = json.load(f)
      image_data['id'] = image_id
      image_data['filename'] = image_file
      images_data.append(image_data)
      
    return Response({"images": images_data}, status=status.HTTP_200_OK)
  
class UploadFigureView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    
    figure = request.FILES.get('figure')
    if not figure:
      return Response({"message": "No file part in the request"}, status=status.HTTP_400_BAD_REQUEST)
    
    user_folder = request.session.get('user_folder')
    
    # generate a unique base name for the file
    figure_id = str(uuid.uuid4())
    
    # extract the original extension
    ext = os.path.splitext(figure.name)[1]
    
    figure_path = f"{user_folder}/{figure_id}{ext}"
    
    figure.save(figure_path)
    
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    
    serializer = ImageDataSerializer(data={
      "id": figure_id,
      "user": request.user.id,
      "image_full_path": figure_path,
      "short_desc": "",
      "long_desc": "",
      "source": "",
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
      return Response({"message": "Figure upload failed"}, status=status.HTTP_400_BAD_REQUEST)
  
class DeleteFigureView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    """
    Expects JSON body with { "filename": "<image_filename>" }
    Deletes the file and its corresponding JSON.
    """
    data = request.get_json()
    filename = data.get('filename')

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
    
    user_folder = request.session.get('user_folder')
    filepath = os.path.join(user_folder, filename)
    
    if not os.path.exists(filepath):
      return Response({"message": "File not found"}, status=status.HTTP_404_NOT_FOUND)
    
    return Response(open(filepath, 'rb').read(), content_type='image/png')
    
class UpdateImageDataView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    data = request.get_json()
    image_id = data.get('id')
    
    if not image_id:
      return Response({"message": "No image ID provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    existing_image_data = ImageData.objects.get(id=image_id)
    
    if not existing_image_data:
      return Response({"message": "Image data not found"}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = ImageDataSerializer(existing_image_data, data=data, partial=True)
    
    if serializer.is_valid():
      serializer.save()
      return Response({"message": "Image data updated successfully"}, status=status.HTTP_200_OK)
    else:
      return Response({"message": "Image data update failed"}, status=status.HTTP_400_BAD_REQUEST)
  
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
    cache = NarrativeCache.objects.get(user=request.user)
    if not cache: 
      return Response({"status": "error", "message": "Cache not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response({"status": "success", "data": cache.data}, status=status.HTTP_200_OK)  
  
class UpdateNarrativeCacheView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    data = request.get_json()
    
    cache = NarrativeCache.objects.get(user=request.user)
    if not cache:
      return Response({"status": "error", "message": "Cache not found"}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = NarrativeCacheSerializer(cache, data=data, partial=True)
    if serializer.is_valid():
      serializer.save()
      return Response({"status": "success"}, status=status.HTTP_200_OK)
    else:
      return Response({'status': 'error', 'message': 'Invalid data'}, status=status.HTTP_400_BAD_REQUEST)
  
class ClearNarrativeCacheView(APIView):
  permission_classes = [IsAuthenticated]
  def post(self, request):
    user_folder = request.session.get('user_folder')
    cache_file = os.path.join(user_folder, 'narrative_cache.json')
    if os.path.exists(cache_file):
      os.remove(cache_file)
    return Response({"status": "success"}, status=status.HTTP_200_OK)
  
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
    user_folder = request.session.get('user_folder')
    image_id = request.data.get('id')
    long_desc = update_single_json_file(user_folder, image_id)
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
