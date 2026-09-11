from rest_framework import serializers
from .models import (
  ImageData, NarrativeCache, JupyterLog,
  UserAction, MousePositionLog, ScrollLog,
  GroupData, ScaffoldData, ResearchQuestion, Workspace
)

class UserActionSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAction
    fields = '__all__'

class WorkspaceSerializer(serializers.ModelSerializer):
  class Meta:
    model = Workspace
    fields = ('id', 'name', 'is_active', 'created_at', 'last_modified')
    read_only_fields = ('id', 'is_active', 'created_at', 'last_modified')


class GroupDataSerializer(serializers.ModelSerializer):
  class Meta:
    model = GroupData
    fields = '__all__'
    extra_kwargs = {
      'workspace': {'required': False},
    }

class ImageDataSerializer(serializers.ModelSerializer):
  short_desc = serializers.CharField(allow_blank=True, required=False)
  long_desc = serializers.CharField(allow_blank=True, required=False)
  filepath = serializers.SerializerMethodField()
  source = serializers.CharField(allow_blank=True, required=False)

  def get_filepath(self, obj):
    return obj.filepath

  class Meta:
    model = ImageData
    fields = '__all__'
    extra_kwargs = {
      'workspace': {'required': False},
      'media': {'required': False, 'allow_null': True},
    }

class NarrativeCacheSerializer(serializers.ModelSerializer):
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
    extra_kwargs = {
      'workspace': {'required': False},
    }

class ResearchQuestionSerializer(serializers.ModelSerializer):
  # M2M fields serialize to lists of ids, which is what the panel's checklist sends back.
  text = serializers.CharField(allow_blank=True, required=False)

  class Meta:
    model = ResearchQuestion
    fields = '__all__'
    extra_kwargs = {
      'workspace': {'required': False},
    }