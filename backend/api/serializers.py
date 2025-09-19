from rest_framework import serializers
from .models import ImageData, NarrativeCache, JupyterLog, Group, UserAction

class UserActionSerializer(serializers.ModelSerializer):
  class Meta:
    model = UserAction
    fields = '__all__'

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

class PackedUInt14FieldSerilizer(serializers.Field):

    def to_representation(self, value: int):
        x = (value >> 14) & (0x3fff)
        y = value & (0x3fff)

        return { "x": x, "y": y }

    def to_internal_value(self, data):
        if not isinstance(data, dict) or "x" not in data or "y" not in data:
            raise serializers.ValidationError("Expected object with 'x' and 'y' fields.")

        x, y = int(data["x"]), int(data["y"])

        if not (-8192 <= x < 8192) or not (-8192 <= y < 8192):
            raise serializers.ValidationError("x and y must fit in signed 14-bit range (-8192..+8191 or <=u16383).")

        return (x,y)