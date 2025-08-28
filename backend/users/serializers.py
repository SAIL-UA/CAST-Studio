# backend\users\serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.core.mail import send_mail
from django.conf import settings



User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
  password = serializers.CharField(write_only=True)

  class Meta:
    model = User
    fields = ('id', 'username', 'password', 'email', 'first_name', 'last_name')

  def create(self, validated_data):
    user = User.objects.create_user(
      username=validated_data['username'],
      password=validated_data['password'],
      email=validated_data.get('email', ''),
      first_name=validated_data.get('first_name', ''),
      last_name=validated_data.get('last_name', '')
    )
    return user

class PasswordResetRequestSerializer(serializers.Serializer):
  email = serializers.EmailField()

  def validate_email(self, value):
    return value

  def save(self):
    email = self.validated_data['email']
    try:
      user = User.objects.get(email=email)
    except User.DoesNotExist:
      time.sleep(3) # simulate work so it's not too obvious that the email doesn't exist
      return None
    except Exception as e:
      time.sleep(3) # simulate work so it's not too obvious that the email doesn't exist
      print(f"Unexpected error during password reset: {e}")
      return None
    
    # Generate token and UID
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    # Create reset URL
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
    
    # Send email
    subject = "Password Reset - CAST Story Studio"
    message = f"""
Hello {user.first_name or user.username},

You requested a password reset for your CAST Story Studio account.

Click the link below to reset your password:
{reset_url}

If you didn't request this, you can safely ignore this email.

Best regards,
CAST Story Studio Team
"""
    
    send_mail(
      subject,
      message,
      settings.DEFAULT_FROM_EMAIL,
      [email],
      fail_silently=False,
    )
    
    return user

class PasswordResetConfirmSerializer(serializers.Serializer):
  new_password = serializers.CharField(min_length=8, write_only=True)
  confirm_password = serializers.CharField(write_only=True)

  def validate(self, data):
    if data['new_password'] != data['confirm_password']:
      raise serializers.ValidationError("Passwords do not match.")
    return data