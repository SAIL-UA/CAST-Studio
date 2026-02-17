#Backend/users/views.py
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth.models import update_last_login
from .serializers import UserSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer, PasswordResetCodeVerifySerializer
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
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
        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        request.session['DATA_PATH'] = settings.DATA_PATH
        os.makedirs(os.path.join(settings.USER_DIR, user.username, "workspace"), exist_ok=True)

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
          "detail": f"An error occurred while sending the reset email. {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetCodeVerifyView(APIView):
  permission_classes = [AllowAny]
  
  def post(self, request):
    serializer = PasswordResetCodeVerifySerializer(data=request.data)
    if serializer.is_valid():
      return Response({
        "detail": "Code verified successfully."
      }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
  permission_classes = [AllowAny]
  
  def post(self, request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
      try:
        # Get the validated data
        user = serializer.validated_data['user']
        reset_code = serializer.validated_data['reset_code']
        new_password = serializer.validated_data['new_password']
        
        # Reset the password
        user.set_password(new_password)
        user.save()
        
        # Delete the used reset code
        reset_code.use_code()
        
        return Response({
          "detail": "Password has been reset successfully."
        }, status=status.HTTP_200_OK)
        
      except Exception as e:
        return Response({
          "detail": "An error occurred while resetting your password."
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
      
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)