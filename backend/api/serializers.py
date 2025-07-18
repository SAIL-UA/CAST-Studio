from rest_framework import serializers
from .models import ImageData, NarrativeCache

class ImageDataSerializer(serializers.ModelSerializer):
  class Meta:
    model = ImageData
    fields = '__all__'
    
class NarrativeCacheSerializer(serializers.ModelSerializer):
  class Meta:
    model = NarrativeCache
    fields = '__all__'