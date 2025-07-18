#Backend/users/views.py
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer
import os
from datetime import datetime


class LoginView(APIView):
  def post(self, request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
      user = serializer.save()
      
      # create user folder if it doesn't already exist
      data_path = os.getenv("DATA_PATH")
      user_folder = os.path.join(data_path, user.username, 'workspace/cache')
      os.makedirs(user_folder, exist_ok=True)
      
      request.session['user_folder'] = user_folder
      
      return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CurrentUserView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    print(f"User: {request.user}, Authenticated: {request.user.is_authenticated}")
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
    
class LogoutView(APIView):
  def post(self, request):        
    # Flush the session data to clear any stored info.
    request.session.flush()
    
    # Clear the JWT cookies.
    response = Response({"detail": "Successfully logged out."})
    response.delete_cookie(settings.JWT_ACCESS_COOKIE)
    response.delete_cookie(settings.JWT_REFRESH_COOKIE)
    
    return response