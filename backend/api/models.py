from django.db import models
from users.models import User
import uuid


class Workspace(models.Model):
  """
  Named canvas snapshot. Each user has one active workspace; others are saved copies.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='workspaces')
  name = models.CharField(max_length=100, default="Untitled")
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  last_modified = models.DateTimeField(auto_now=True)

  def __str__(self):
    return f"{self.user.username} - {self.name}{' *' if self.is_active else ''}"

  class Meta:
    db_table = 'workspaces'
    managed = True
    indexes = [
      models.Index(fields=['user', 'last_modified']),
    ]
    constraints = [
      models.UniqueConstraint(
        fields=['user'],
        condition=models.Q(is_active=True),
        name='one_active_workspace_per_user',
      ),
    ]


class MediaAsset(models.Model):
  """Shared on-disk image identity. Canvas placements reference this; files are not copied per workspace."""
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='media_assets')
  filepath = models.CharField(max_length=255)
  created_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"{self.user.username} - {self.filepath}"

  class Meta:
    db_table = 'media_assets'
    managed = True
    constraints = [
      models.UniqueConstraint(fields=['user', 'filepath'], name='uniq_user_media_filepath'),
    ]

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
  workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, db_column='workspace_id', related_name='scaffolds')
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
    indexes = [
      models.Index(fields=['workspace']),
    ]


class GroupData(models.Model):
  """
  Group data.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='group_data')
  workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, db_column='workspace_id', related_name='groups')
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
    indexes = [
      models.Index(fields=['workspace']),
    ]
    
    
class ImageData(models.Model):
  """
  Image / note placement in a workspace. File bytes live on MediaAsset (shared across workspaces).
  Notes have media=None.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='image_data')
  workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, db_column='workspace_id', related_name='images')
  media = models.ForeignKey(
    MediaAsset, on_delete=models.RESTRICT, db_column='media_id',
    null=True, blank=True, related_name='placements',
  )
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

  @property
  def filepath(self):
    if self.media_id:
      return self.media.filepath
    return ""

  def __str__(self):
    return f"{self.user.username} - {self.filepath or self.id}"

  class Meta:
    db_table = 'image_data'
    managed = True
    indexes = [
      models.Index(fields=['workspace']),
      models.Index(fields=['media']),
    ]
    constraints = [
      models.UniqueConstraint(
        fields=['workspace', 'media'],
        condition=models.Q(media__isnull=False),
        name='uniq_workspace_media_placement',
      ),
    ]

    
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
  # Display-ready bullet list for the Reasoning tab's Sequence Justification section.
  # Shape: [{"label": "Note 1", "why": "..."}, ...] — one bullet per workspace item
  # that made it into the sequence, ≤15 words each. Populated by a dedicated
  # post-story LLM call; empty list when that call failed or hasn't run.
  sequence_summary = models.JSONField(default=list, blank=True)
  # [{"label": "Q1", "how_informed": "..."}, ...] — how each research question
  # shaped the final story. Populated after story-build in a separate LLM call.
  # Empty list when the user wrote no RQs.
  rq_reasoning = models.JSONField(default=list, blank=True)

  
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


class ResearchQuestion(models.Model):
  """
  A research question belonging to a user's workspace.

  Scoped to the user rather than to a SharedSession, so questions persist across
  sessions the same way ImageData and GroupData do. Collaborators reach them
  through the usual ?target_user= workspace resolution.

  Cards are linked many-to-many: one question can span several cards, and one
  card can answer several questions. Visuals and notes are both ImageData
  (a note is ImageData with an empty filepath), so there are two link targets.
  """
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='research_questions')
  workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, db_column='workspace_id', related_name='research_questions')
  text = models.TextField(default="")
  order = models.IntegerField(default=0)
  images = models.ManyToManyField(ImageData, blank=True, related_name='research_questions')
  groups = models.ManyToManyField(GroupData, blank=True, related_name='research_questions')
  created_at = models.DateTimeField(auto_now_add=True)
  last_modified = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'research_questions'
    managed = True
    ordering = ['order', 'created_at']
    indexes = [
      models.Index(fields=['workspace']),
    ]

  def __str__(self):
    return f"{self.user.username}: {self.text[:50]}"
