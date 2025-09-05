# backend\users\serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
import time
from .models import PasswordResetCode



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
    
    # Clean up expired codes before generating new one
    PasswordResetCode.cleanup_expired()
    
    # Generate new reset code
    reset_code_obj = PasswordResetCode.generate_code(user)
    
    # Send email with code
    subject = "Password Reset Code - CAST Story Studio"
    message = f"""
Hello {user.first_name or user.username},

You requested a password reset for your CAST Story Studio account.

Your password reset code is: {reset_code_obj.code}

This code will expire in 15 minutes. If you didn't request this, you can safely ignore this email.

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

class PasswordResetCodeVerifySerializer(serializers.Serializer):
  email = serializers.EmailField()
  code = serializers.CharField(max_length=6, min_length=6)

  def validate(self, data):
    # Clean up expired codes first
    PasswordResetCode.cleanup_expired()
    
    email = data['email']
    code = data['code']
    
    try:
      user = User.objects.get(email=email)
      reset_code = PasswordResetCode.objects.get(user=user, code=code)
      
      if not reset_code.is_valid():
        raise serializers.ValidationError("Reset code has expired.")
        
      data['reset_code'] = reset_code
      data['user'] = user
      return data
      
    except User.DoesNotExist:
      raise serializers.ValidationError("Invalid or expired code.")
    except PasswordResetCode.DoesNotExist:
      raise serializers.ValidationError("Invalid or expired code.")

class PasswordResetConfirmSerializer(serializers.Serializer):
  email = serializers.EmailField()
  code = serializers.CharField(max_length=6, min_length=6)
  new_password = serializers.CharField(min_length=8, write_only=True)
  confirm_password = serializers.CharField(write_only=True)

  def validate(self, data):
    if data['new_password'] != data['confirm_password']:
      raise serializers.ValidationError("Passwords do not match.")
    
    # Clean up expired codes first
    PasswordResetCode.cleanup_expired()
    
    email = data['email']
    code = data['code']
    
    try:
      user = User.objects.get(email=email)
      reset_code = PasswordResetCode.objects.get(user=user, code=code)
      
      if not reset_code.is_valid():
        raise serializers.ValidationError("Reset code has expired.")
        
      data['reset_code'] = reset_code
      data['user'] = user
      return data
      
    except User.DoesNotExist:
      raise serializers.ValidationError("Invalid or expired code.")
    except PasswordResetCode.DoesNotExist:
      raise serializers.ValidationError("Invalid or expired code.")