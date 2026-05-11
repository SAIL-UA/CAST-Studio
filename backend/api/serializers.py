from rest_framework import serializers
from .models import (
  ImageData, NarrativeCache, JupyterLog,
  UserAction, MousePositionLog, ScrollLog,
  GroupData, ScaffoldData,
  Study, StudyReferralCode,
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


class StudyReferralCodeSerializer(serializers.ModelSerializer):
  is_redeemable = serializers.SerializerMethodField()

  class Meta:
    model = StudyReferralCode
    fields = (
      'id', 'study', 'code', 'is_active',
      'max_uses', 'uses_count', 'expires_at',
      'created_at', 'last_modified', 'is_redeemable',
    )
    read_only_fields = ('id', 'study', 'uses_count', 'created_at', 'last_modified', 'is_redeemable')

  def get_is_redeemable(self, obj):
    return obj.is_redeemable()


class StudyParticipantSerializer(serializers.Serializer):
  id = serializers.UUIDField()
  username = serializers.CharField()
  email = serializers.CharField()
  first_name = serializers.CharField()
  last_name = serializers.CharField()
  is_instructor = serializers.BooleanField()
  date_joined = serializers.DateTimeField(allow_null=True)


class StudySerializer(serializers.ModelSerializer):
  referral_codes = StudyReferralCodeSerializer(many=True, read_only=True)
  participants_count = serializers.SerializerMethodField()
  participants = serializers.SerializerMethodField()
  created_by_username = serializers.SerializerMethodField()

  class Meta:
    model = Study
    fields = (
      'id', 'name', 'is_active',
      'annotate_with_ai', 'select_with_ai', 'ai_feedback',
      'created_by', 'created_by_username',
      'created_at', 'last_modified',
      'referral_codes', 'participants_count', 'participants',
    )
    read_only_fields = (
      'id', 'created_by', 'created_by_username',
      'created_at', 'last_modified',
      'referral_codes', 'participants_count', 'participants',
    )

  def get_participants_count(self, obj):
    return obj.participants.count()

  def get_participants(self, obj):
    qs = obj.participants.all().only(
      'id', 'username', 'email', 'first_name', 'last_name', 'is_instructor', 'date_joined'
    ).order_by('-date_joined')
    return StudyParticipantSerializer(qs, many=True).data

  def get_created_by_username(self, obj):
    return obj.created_by.username if obj.created_by else None