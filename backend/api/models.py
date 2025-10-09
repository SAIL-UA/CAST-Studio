from django.db import models
from users.models import User
import uuid

class UserAction(models.Model):
  """
  User actions.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='user_actions')
  action = models.JSONField(default=dict)
  request_headers = models.JSONField(default=dict)
  timestamp = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"{self.user.username} - {self.action} - {self.timestamp}"

  class Meta:
    db_table = 'user_actions'
    managed = True

class Group(models.Model):
  """
  Group for organizing figures in storyboard.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='figure_groups')
  number = models.IntegerField()
  name = models.CharField(max_length=255)
  description = models.TextField(default="", blank=True)
  x = models.FloatField(default=0.0)
  y = models.FloatField(default=0.0)
  created_at = models.DateTimeField(auto_now_add=True)
  last_modified = models.DateTimeField(auto_now=True)

  def __str__(self):
    return f"{self.user.username} - {self.name}"

  class Meta:
    db_table = 'groups'
    managed = True
    ordering = ['number']
    
class JupyterLog(models.Model):
  """
  User-code execution logs from the JupyterHub server.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='jupyter_logs')
  cell_type = models.TextField(default="")
  source = models.TextField(default="")
  metadata = models.JSONField(default=dict)
  outputs = models.JSONField(default=list)
  execution_count = models.IntegerField(default=0)
  timestamp = models.DateTimeField(auto_now_add=True)
  request_headers = models.JSONField(default=dict)
  
  def __str__(self):
    return f"{self.user.username} - {self.cell_type} - {self.timestamp}"
  
  class Meta:
    db_table = 'jupyter_logs'
    managed = True
    
    
  
class ImageData(models.Model):
  """
  Image data.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='image_data')
  filepath = models.CharField(max_length=255)
  short_desc = models.TextField(default="")
  long_desc = models.TextField(default="")
  long_desc_generating = models.BooleanField(default=False)
  source = models.TextField(default="")
  in_storyboard = models.BooleanField(default=False)
  x = models.FloatField(default=0.0)
  y = models.FloatField(default=0.0)
  has_order = models.BooleanField(default=False)
  order_num = models.IntegerField(default=0)
  group = models.ForeignKey('Group', on_delete=models.SET_NULL, null=True, blank=True, related_name='images')
  last_saved = models.DateTimeField(auto_now_add=True)
  created_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"{self.user.username} - {self.filepath}"

  class Meta:
    db_table = 'image_data'
    managed = True
    
    
class NarrativeCache(models.Model):
  """
  Narrative cache.
  """
  user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id', unique=True, related_name='narrative_cache')
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
  
