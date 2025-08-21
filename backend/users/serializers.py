# backend\users\serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model



User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
  password = serializers.CharField(write_only=True)

  class Meta:
    model = User
    fields = ('id', 'username', 'password', 'email', 'first_name', 'last_name')

  def create(self, validated_data):
    user = User.objects.create_user(
      username=validated_data['username'],
      password=validated_data['password'],
      email=validated_data.get('email', ''),
      first_name=validated_data.get('first_name', ''),
      last_name=validated_data.get('last_name', '')
    )
    return user