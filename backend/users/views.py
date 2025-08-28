#Backend/users/views.py
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
import os

User = get_user_model()

class RegisterView(APIView):
  permission_classes = [AllowAny]
  def post(self, request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
      user = serializer.save()
      return Response({'detail': 'User created'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
  permission_classes = [AllowAny]

  def post(self, request):
    try:
      username = request.data.get("username")
      password = request.data.get("password")
      user = authenticate(request, username=username, password=password)

      if user is not None:
        refresh = RefreshToken.for_user(user)
        request.session['user_folder'] = os.path.join(settings.DATA_PATH, user.username, "workspace", "cache")
        os.makedirs(request.session['user_folder'], exist_ok=True)

        return Response({
          "access": str(refresh.access_token),
          "refresh": str(refresh),
          "user": UserSerializer(user).data
        })
      else:
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
      print(e)
      return Response({"detail": "An error occurred during login."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LogoutView(APIView):
  def post(self, request):
    request.session.flush()
    return Response({"detail": "Logged out"})

class CurrentUserView(APIView):
  def get(self, request):
    user = request.user
    return Response(UserSerializer(user).data)

class CheckAuthView(APIView):
  def get(self, request):
    return Response({
      "authenticated": request.user.is_authenticated,
      "user": request.user.username if request.user.is_authenticated else None
    })

class PasswordResetRequestView(APIView):
  permission_classes = [AllowAny]
  
  def post(self, request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
      try:
        serializer.save()
        return Response({
          "detail": "If an account with this email exists, a password reset link has been sent."
        }, status=status.HTTP_200_OK)
      except Exception as e:
        return Response({
          "detail": "An error occurred while sending the reset email."
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
  permission_classes = [AllowAny]
  
  def post(self, request, uid, token):
    try:
      # Decode the user ID
      user_id = force_str(urlsafe_base64_decode(uid))
      user = User.objects.get(pk=user_id)
      
      # Check if the token is valid
      if not default_token_generator.check_token(user, token):
        return Response({
          "detail": "Invalid or expired reset link."
        }, status=status.HTTP_400_BAD_REQUEST)
      
      # Validate the new password
      serializer = PasswordResetConfirmSerializer(data=request.data)
      if serializer.is_valid():
        # Reset the password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
          "detail": "Password has been reset successfully."
        }, status=status.HTTP_200_OK)
      
      return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
      
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
      return Response({
        "detail": "Invalid reset link."
      }, status=status.HTTP_400_BAD_REQUEST)