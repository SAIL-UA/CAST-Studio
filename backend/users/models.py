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
    extra_fields.setdefault("is_instructor", True)
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
  is_instructor = models.BooleanField(default=False)
  study = models.ForeignKey(
    'api.Study',
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name='participants',
    db_column='study_id',
  )

  objects = CustomUserManager()

  def __str__(self):
    return f"{self.first_name} {self.last_name}"

  def get_effective_flags(self):
    """
    Compute the effective feature flags for this user.

    Combines the global FeatureFlags (instructor-controlled) with the user's
    Study (if any) by taking the logical AND of each flag. Instructors are
    not subject to study restrictions and always see every feature.

    Returns a dict: {annotate_with_ai, select_with_ai, ai_feedback, study}
    where 'study' is None or a small dict describing the user's study.
    """
    if getattr(self, 'is_instructor', False):
      return {
        'annotate_with_ai': True,
        'select_with_ai': True,
        'ai_feedback': True,
        'study': None,
      }

    from api.models import FeatureFlags  # local import: avoid circular import

    global_flags = FeatureFlags.objects.first()
    annotate = True if global_flags is None else global_flags.annotate_with_ai
    select = True if global_flags is None else global_flags.select_with_ai
    feedback = True  # no global toggle yet, defaults to allowed

    study = getattr(self, 'study', None)
    if study is not None and study.is_active:
      annotate = annotate and study.annotate_with_ai
      select = select and study.select_with_ai
      feedback = feedback and study.ai_feedback

    return {
      'annotate_with_ai': annotate,
      'select_with_ai': select,
      'ai_feedback': feedback,
      'study': None if study is None else {
        'id': str(study.id),
        'name': study.name,
        'is_active': study.is_active,
      },
    }

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