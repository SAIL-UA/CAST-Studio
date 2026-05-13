from django.db import models
from users.models import User
import uuid

class UserAction(models.Model):
  """
  User actions.
  """
  class ActionType(models.TextChoices):
    CLICK = "click", "Click"
    HOVER = "hover", "Hover"
    DRAG = "drag", "Drag"
    DROP = "drop", "Drop"
  
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='user_actions')
  action = models.CharField(max_length=10, choices=ActionType.choices, default=ActionType.CLICK)
  state_info = models.JSONField(default=dict)
  element = models.TextField(default="")
  request_headers = models.JSONField(default=dict)
  timestamp = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"{self.user.username} - {self.action} - {self.timestamp}"

  class Meta:
    db_table = 'user_actions'
    managed = True

class ScrollLog(models.Model):
  """
  Logs scroll events.
  """
  log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='scroll_logs')
  scroll_batch = models.JSONField(default=list)  # List of scroll positions
  request_headers = models.JSONField(default=dict)
  timestamp = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = 'scroll_logs'
    managed = True


class MousePositionLog(models.Model):
  """
  Logs mouse position (normalized to window)
  """
  log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='storystudio_logs')
  mouse_pos_batch = models.JSONField(default=list)  # List of mouse positions
  request_headers = models.JSONField(default=dict)
  timestamp = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = 'mouse_position_logs'
    managed = True

   
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


class ScaffoldData(models.Model):
  """
  Scaffold data.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='scaffold_data')
  name = models.CharField(max_length=100, default="No Scaffold")
  number = models.IntegerField(default=0)
  valid_group_numbers = models.JSONField(default=list, help_text="List of valid group numbers for this scaffold (1=causes, 2=effects, etc.)")
  description = models.TextField(default="", null=True, blank=True)
  x = models.FloatField(default=0.0)
  y = models.FloatField(default=0.0)
  created_at = models.DateTimeField(auto_now_add=True)
  last_modified = models.DateTimeField(auto_now=True)
  
  def __str__(self):
    return f"{self.user.username} - {self.name}"
  
  class Meta:
    db_table = 'scaffold_data'
    managed = True


class GroupData(models.Model):
  """
  Group data.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='group_data')
  name = models.CharField(max_length=100, default="Untitled Group")
  number = models.IntegerField(default=0)
  description = models.TextField(default="", null=True, blank=True)
  x = models.FloatField(default=0.0)
  y = models.FloatField(default=0.0)
  scaffold_id = models.ForeignKey(ScaffoldData, on_delete=models.SET_NULL, db_column='scaffold_id', null=True, blank=True, related_name='groups')
  scaffold_group_number = models.IntegerField(null=True, blank=True, help_text="Group number within scaffold (1=causes, 2=effects, etc.)")
  created_at = models.DateTimeField(auto_now_add=True)
  last_modified = models.DateTimeField(auto_now=True)
  
  def __str__(self):
    return f"{self.user.username} - {self.name}"
  
  class Meta:
    db_table = 'group_data'
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
  in_storyboard = models.BooleanField(default=True)
  x = models.FloatField(default=0.0)
  y = models.FloatField(default=0.0)
  group_id = models.ForeignKey(GroupData, on_delete=models.SET_NULL, db_column='group_id', null=True, blank=True, related_name='images')
  scaffold_id = models.ForeignKey(ScaffoldData, on_delete=models.SET_NULL, db_column='scaffold_id', null=True, blank=True, related_name='images')
  scaffold_group_number = models.IntegerField(null=True, blank=True, help_text="Group number within scaffold (1=causes, 2=effects, etc.)")
  has_order = models.BooleanField(default=False)
  order_num = models.IntegerField(default=0)
  index = models.IntegerField(default=0)
  last_saved = models.DateTimeField(auto_now=True)
  created_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"{self.user.username} - {self.filepath}"

  class Meta:
    db_table = 'image_data'
    managed = True

    
class TaskProgress(models.Model):
  """
  Tracks progress of async Celery tasks (narrative generation, feedback, etc.)
  """
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='task_progress')
  task_type = models.CharField(max_length=64)
  task_id = models.CharField(max_length=255)
  current_stage = models.IntegerField(default=0)
  total_stages = models.IntegerField(default=1)
  stage_name = models.CharField(max_length=255, default="")
  substage = models.CharField(max_length=255, null=True, blank=True)
  error = models.TextField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"{self.user.username} - {self.task_type} - {self.task_id} - {self.current_stage}/{self.total_stages}"

  class Meta:
    db_table = 'task_progress'
    managed = True
    indexes = [
      models.Index(fields=['task_id']),
      models.Index(fields=['user', 'task_type']),
    ]


class NarrativeCache(models.Model):
  """
  Narrative cache.
  """
  user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id', unique=True, related_name='narrative_cache')
  story_structure_id = models.CharField(max_length=64, default="")
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


class FeatureFlags(models.Model):
  """
  Single-row table for admin-controlled feature toggles.
  """
  annotate_with_ai = models.BooleanField(default=True)
  select_with_ai = models.BooleanField(default=True)

  def __str__(self):
    return f"annotate_with_ai={self.annotate_with_ai}, select_with_ai={self.select_with_ai}"

  class Meta:
    db_table = 'feature_flags'
    managed = True


class SharedSession(models.Model):
  """
  A collaboration session hosted by a user, shareable via a token link.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_sessions')
  share_token = models.CharField(max_length=255, unique=True, default=uuid.uuid4)
  is_active = models.BooleanField(default=True)
  max_participants = models.IntegerField(default=3)
  controlled_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='controlling_session')
  created_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"{self.host.username} - {self.share_token} - active={self.is_active}"

  class Meta:
    db_table = 'shared_sessions'
    managed = True


class SessionParticipant(models.Model):
  """
  A user who has joined a shared collaboration session.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  session = models.ForeignKey(SharedSession, on_delete=models.CASCADE, related_name='participants')
  user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='session_participations')
  joined_at = models.DateTimeField(auto_now_add=True)
  last_seen = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'session_participants'
    managed = True
    unique_together = ('session', 'user')

  def __str__(self):
    return f"{self.user.username} in {self.session.share_token}"


class Study(models.Model):
  """
  A research study managed by an instructor. Users who sign up with one of the
  study's referral codes inherit the study's feature toggles, overriding the
  global FeatureFlags for their account.

  Flag semantics:
  - annotate_with_ai: AI-assisted image descriptions (annotate visuals).
  - select_with_ai: AI-assisted narrative *selection* (e.g. AI Assistance pattern,
    AI grouping). Does not block Generate Story once the user has chosen a
    structure manually or via scaffold.
  - ai_feedback: AI-generated feedback on the storyboard.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  name = models.CharField(max_length=200)
  created_by = models.ForeignKey(
    User,
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name='created_studies',
    db_column='created_by_id',
  )
  is_active = models.BooleanField(default=True)

  annotate_with_ai = models.BooleanField(default=True)
  select_with_ai = models.BooleanField(default=True)
  ai_feedback = models.BooleanField(default=True)

  created_at = models.DateTimeField(auto_now_add=True)
  last_modified = models.DateTimeField(auto_now=True)

  def __str__(self):
    return f"{self.name} (active={self.is_active})"

  class Meta:
    db_table = 'studies'
    managed = True
    ordering = ['-created_at']


class StudyReferralCode(models.Model):
  """
  A referral code that grants signup access into a Study. Codes are unique
  and normalized to upper-case on save. Each code may optionally expire and/or
  have a max number of redemptions.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  study = models.ForeignKey(
    Study,
    on_delete=models.CASCADE,
    related_name='referral_codes',
    db_column='study_id',
  )
  code = models.CharField(max_length=64, unique=True)
  is_active = models.BooleanField(default=True)
  max_uses = models.PositiveIntegerField(null=True, blank=True, help_text='Null means unlimited uses')
  uses_count = models.PositiveIntegerField(default=0)
  expires_at = models.DateTimeField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)
  last_modified = models.DateTimeField(auto_now=True)

  def save(self, *args, **kwargs):
    if self.code:
      self.code = self.code.strip().upper()
    super().save(*args, **kwargs)

  def is_redeemable(self):
    from django.utils import timezone
    if not self.is_active or not self.study.is_active:
      return False
    if self.expires_at is not None and self.expires_at <= timezone.now():
      return False
    if self.max_uses is not None and self.uses_count >= self.max_uses:
      return False
    return True

  def __str__(self):
    return f"{self.code} -> {self.study.name}"

  class Meta:
    db_table = 'study_referral_codes'
    managed = True
    ordering = ['-created_at']
