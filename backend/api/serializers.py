from rest_framework import serializers
from .models import ImageData, NarrativeCache, JupyterLogs

class ImageDataSerializer(serializers.ModelSerializer):
  class Meta:
    model = ImageData
    fields = '__all__'
    
class NarrativeCacheSerializer(serializers.ModelSerializer):
  class Meta:
    model = NarrativeCache
    fields = '__all__'
    
class JupyterLogsSerializer(serializers.ModelSerializer):
  class Meta:
    model = JupyterLogs
    fields = '__all__'