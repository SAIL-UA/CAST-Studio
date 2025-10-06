from rest_framework import serializers
from .models import ImageData, NarrativeCache, JupyterLog, Group

class ImageDataSerializer(serializers.ModelSerializer):
  class Meta:
    model = ImageData
    fields = '__all__'

class GroupSerializer(serializers.ModelSerializer):
  images = ImageDataSerializer(many=True, read_only=True)

  class Meta:
    model = Group
    fields = '__all__'
    read_only_fields = ['created_at', 'last_modified']

class NarrativeCacheSerializer(serializers.ModelSerializer):
  class Meta:
    model = NarrativeCache
    fields = '__all__'

class JupyterLogsSerializer(serializers.ModelSerializer):
  class Meta:
    model = JupyterLog
    fields = '__all__'