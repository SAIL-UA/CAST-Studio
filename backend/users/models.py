from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
import uuid
import random

class CustomUserManager(BaseUserManager):
  """
  Custom manager for the Users model where email is the unique identifier.
  """
  def create_user(self, email, password=None, **extra_fields):
    if not email:
      raise ValueError("The Email field must be set")
    email = self.normalize_email(email)
    user = self.model(email=email, **extra_fields)
    if password:
      # For traditional registration (if needed), set the password
      user.set_password(password)
    user.save(using=self._db)
    return user

  def create_superuser(self, email, password=None, **extra_fields):
    extra_fields.setdefault("is_staff", True)
    extra_fields.setdefault("is_superuser", True)
    if extra_fields.get("is_staff") is not True:
      raise ValueError("Superuser must have is_staff=True.")
    if extra_fields.get("is_superuser") is not True:
      raise ValueError("Superuser must have is_superuser=True.")
    return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
  """
  Custom user model that uses email as the unique identifier.
  Each user is linked to one Faculty profile.
  With Microsoft OAuth SSO, users are created without a local password.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  username = models.CharField(max_length=150, unique=True)
  email = models.EmailField(max_length=320, unique=True)
  first_name = models.CharField(max_length=32)
  last_name = models.CharField(max_length=64)

  objects = CustomUserManager()

  def __str__(self):
    return f"{self.first_name} {self.last_name}"

  class Meta:
    db_table = 'users'
    managed = True


class PasswordResetCode(models.Model):
  """
  Model to store password reset codes for users
  """
  user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')
  code = models.CharField(max_length=6)
  created_at = models.DateTimeField(auto_now_add=True)
  
  @classmethod
  def generate_code(cls, user):
    """Generate a new 6-digit code for the user and delete old ones"""
    # Delete any existing codes for this user
    cls.objects.filter(user=user).delete()
    
    # Generate new 6-digit code
    code = str(random.randint(100000, 999999))
    
    # Create new reset code
    reset_code = cls.objects.create(user=user, code=code)
    return reset_code
  
  def is_valid(self):
    """Check if code is still valid (within 15 minutes)"""
    # Code expires after 15 minutes
    expiry_time = self.created_at + timezone.timedelta(minutes=15)
    return timezone.now() < expiry_time
  
  def use_code(self):
    """Delete code after use"""
    self.delete()
  
  @classmethod
  def cleanup_expired(cls):
    """Delete all expired codes"""
    expiry_threshold = timezone.now() - timezone.timedelta(minutes=15)
    expired_codes = cls.objects.filter(created_at__lt=expiry_threshold)
    count = expired_codes.count()
    expired_codes.delete()
    return count
  
  class Meta:
    db_table = 'password_reset_codes'
    ordering = ['-created_at']