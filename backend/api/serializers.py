from rest_framework import serializers
from .models import (
  ImageData, NarrativeCache, JupyterLog,
  UserAction, MousePositionLog, ScrollLog,
  GroupData, ScaffoldData, ResearchQuestion
)

class UserActionSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAction
    fields = '__all__'

class GroupDataSerializer(serializers.ModelSerializer):
  class Meta:
    model = GroupData
    fields = '__all__'

class ImageDataSerializer(serializers.ModelSerializer):
  short_desc = serializers.CharField(allow_blank=True, required=False)
  long_desc = serializers.CharField(allow_blank=True, required=False)
  filepath = serializers.CharField(allow_blank=True, required=False)
  source = serializers.CharField(allow_blank=True, required=False)

  class Meta:
    model = ImageData
    fields = '__all__'

class NarrativeCacheSerializer(serializers.ModelSerializer):
  # Model fields default to "" but DRF's auto-generated CharField/TextField
  # rejects blank strings by default — breaking hand-typed drafts that never
  # went through Generate Story (all the generation-only fields stay blank).
  # Override with allow_blank=True + required=False so the same partial payload
  # works whether generation has populated these fields or not.
  story_structure_id = serializers.CharField(allow_blank=True, required=False)
  narrative = serializers.CharField(allow_blank=True, required=False)
  theme = serializers.CharField(allow_blank=True, required=False)
  sequence_justification = serializers.CharField(allow_blank=True, required=False)

  class Meta:
    model = NarrativeCache
    fields = '__all__'

class MousePositionLogSerializer(serializers.ModelSerializer):
  class Meta:
    model = MousePositionLog
    fields = '__all__'

class ScrollLogSerializer(serializers.ModelSerializer):
  class Meta:
    model = ScrollLog
    fields = '__all__'

class JupyterLogsSerializer(serializers.ModelSerializer):
  class Meta:
    model = JupyterLog
    fields = '__all__'

class ScaffoldDataSerializer(serializers.ModelSerializer):
  class Meta:
    model = ScaffoldData
    fields = '__all__'

class ResearchQuestionSerializer(serializers.ModelSerializer):
  # M2M fields serialize to lists of ids, which is what the panel's checklist sends back.
  text = serializers.CharField(allow_blank=True, required=False)

  class Meta:
    model = ResearchQuestion
    fields = '__all__'