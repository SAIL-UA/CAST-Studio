from django.db import models
from users.models import Users
import uuid

class UserAction(models.Model):
  """
  User actions.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(Users, on_delete=models.CASCADE, db_column='user_id', related_name='user_actions')
  action = models.CharField(max_length=255)
  timestamp = models.DateTimeField(auto_now_add=True)
  
  def __str__(self):
    return f"{self.user.username} - {self.action} - {self.timestamp}"
  
  class Meta:
    db_table = 'user_actions'
    managed = True
    
  
class ImageData(models.Model):
  """
  Image data.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(Users, on_delete=models.CASCADE, db_column='user_id', related_name='image_data')
  image_full_path = models.CharField(max_length=255)
  short_desc = models.TextField(default="")
  long_desc = models.TextField(default="")
  source = models.TextField(default="")
  in_storyboard = models.BooleanField(default=False)
  x = models.IntegerField(default=0)
  y = models.IntegerField(default=0)
  has_order = models.BooleanField(default=False)
  order_num = models.IntegerField(default=0)
  last_saved = models.DateTimeField(auto_now_add=True)
  created_at = models.DateTimeField(auto_now_add=True)
  
  def __str__(self):
    return f"{self.user.username} - {self.image_full_path}"
  
  class Meta:
    db_table = 'image_data'
    managed = True
    
    
class NarrativeCache(models.Model):
  """
  Narrative cache.
  """
  user = models.OneToOneField(Users, on_delete=models.CASCADE, db_column='user_id', unique=True, related_name='narrative_cache')
  narrative = models.TextField(default="")
  order = models.JSONField(default=list)
  theme = models.TextField(default="")
  categories = models.JSONField(default=list)
  sequence_justification = models.TextField(default="")

  
  def __str__(self):
    return f"{self.user.username} - {self.narrative}"
  
  class Meta:
    db_table = 'narrative_cache'
    managed = True
  