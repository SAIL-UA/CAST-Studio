from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
import uuid

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