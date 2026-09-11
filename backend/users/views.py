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
      from api.models import Workspace
      from api.workspace_ops import EDITOR_WORKSPACE_NAME
      Workspace.objects.get_or_create(user=user, is_active=True, defaults={'name': EDITOR_WORKSPACE_NAME})
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

        from api.workspace_ops import get_or_create_active_workspace
        get_or_create_active_workspace(user)

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
    

class GuestLoginView(APIView):
  """
  Creates an ephemeral guest user with is_guest=True and no usable password,
  seeds a small preloaded dataset (2 sticky notes), and returns JWT tokens
  in the same shape as LoginView so the frontend can reuse its login flow.
  """
  permission_classes = [AllowAny]

  def post(self, request):
    import uuid
    from django.db import transaction
    from api.models import ImageData, ScaffoldData, Workspace
    from api.workspace_ops import EDITOR_WORKSPACE_NAME, get_or_create_media

    # Generate a unique guest username (retry a few times in case of collision)
    for _ in range(5):
      candidate = f"guest-{uuid.uuid4().hex[:8]}"
      if not User.objects.filter(username=candidate).exists():
        username = candidate
        break
    else:
      return Response(
        {"detail": "Failed to generate unique guest username"},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
      )

    try:
      with transaction.atomic():
        user = User.objects.create_user(
          email=f"{username}@guest.local",
          password=None,
          username=username,
          first_name="Guest",
          last_name="",
          is_guest=True,
        )

        ws = Workspace.objects.create(user=user, name=EDITOR_WORKSPACE_NAME, is_active=True)

        # Seed two sticky notes (ImageData rows with empty media).
        # The user's provided strings go in long_desc (note body/content);
        # short_desc holds the title.
        ImageData.objects.create(
          user=user, workspace=ws, media=None, index=0, x=400.0, y=200.0,
          short_desc="Note 1",
          long_desc="American public's opinions on opportunity to enroll in higher education, by political party",
        )
        ImageData.objects.create(
          user=user, workspace=ws, media=None, index=1, x=600.0, y=200.0,
          short_desc="Note 2",
          long_desc="Support services needed by college and university students",
        )

        # Seed three demo images. Copy each seed file into the same DATA_PATH
        # directory nginx serves images from, using a fresh UUID filename to
        # match the upload flow exactly.
        import shutil
        data_path = os.getenv('DATA_PATH')
        seed_dir = "/app/seed/guest_images"
        seed_images = [
          # (filename in seed_dir, x, y) -- row 2 (visuals)
          ("opportunity_to_enroll.png",   400.0, 340.0),
          ("opportunity_to_complete.png", 600.0, 340.0),
          ("support_needed.png",          800.0, 340.0),
        ]

        if data_path:
          os.makedirs(data_path, exist_ok=True)
          for i, (src_name, x, y) in enumerate(seed_images):
            src_path = os.path.join(seed_dir, src_name)
            if not os.path.exists(src_path):
              continue  # skip missing seeds silently; don't fail the whole login
            new_uuid = uuid.uuid4()
            _, ext = os.path.splitext(src_name)
            dest_name = f"{new_uuid}{ext}"
            shutil.copy(src_path, os.path.join(data_path, dest_name))
            # long_desc: filename without extension, underscores→spaces, capitalize
            readable = os.path.splitext(src_name)[0].replace('_', ' ').capitalize()
            media = get_or_create_media(user, dest_name)
            ImageData.objects.create(
              id=new_uuid,
              user=user,
              workspace=ws,
              media=media,
              index=2 + i,
              x=x, y=y,
              source="upload",
              short_desc="",
              long_desc=readable,
            )

        # Pre-seed a Linear narrative scaffold, positioned in the bottom-right
        # area of the workspace so the tutorial modal (centered) doesn't cover
        # it. Fields mirror what the frontend Linear component expects.
        ScaffoldData.objects.create(
          user=user,
          workspace=ws,
          name="Linear",
          number=10,
          valid_group_numbers=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          description="A straightforward beginning-to-end progression that builds understanding step by step.",
          x=1000.0, y=600.0,
        )

      update_last_login(None, user)
      refresh = RefreshToken.for_user(user)
      request.session['DATA_PATH'] = settings.DATA_PATH

      return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
      }, status=status.HTTP_201_CREATED)
    except Exception as e:
      print(f"Guest login failed: {e}")
      return Response(
        {"detail": "An error occurred during guest login."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
      )


class GuestCleanupView(APIView):
  """
  Called (typically via navigator.sendBeacon) when a guest closes their tab.
  Deletes the guest user identified by the JWT in the request body. Cascades
  remove their ImageData / ScaffoldData / etc.

  Safe by construction: only deletes users with is_guest=True. If a non-guest
  JWT is submitted, returns 403 and does nothing.
  """
  permission_classes = [AllowAny]

  def post(self, request):
    token_str = request.data.get('token')
    if not token_str:
      return Response({"detail": "Missing token"}, status=status.HTTP_400_BAD_REQUEST)

    try:
      from rest_framework_simplejwt.tokens import AccessToken
      access = AccessToken(token_str)
      user_id = access['user_id']
      user = User.objects.get(id=user_id)
    except Exception:
      return Response({"detail": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)

    if not user.is_guest:
      return Response({"detail": "Not a guest user"}, status=status.HTTP_403_FORBIDDEN)

    from api.workspace_ops import purge_user_media_files
    purge_user_media_files(user)
    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


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
      "user": request.user.username if request.user.is_authenticated else None,
      "user_id": str(request.user.id) if request.user.is_authenticated else None,
      "is_instructor": request.user.is_instructor if request.user.is_authenticated else False
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