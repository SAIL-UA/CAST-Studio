from rest_framework import serializers
from .models import ImageData, NarrativeCache, JupyterLog

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
    model = JupyterLog
    fields = '__all__'