# backend\users\serializers.py
from rest_framework import serializers
from .models import Users
from django.contrib.auth import get_user_model


class UserSerializer(serializers.ModelSerializer):
    
  class Meta:
    model = Users
    fields = ('id', 'email', 'password', 'first_name', 'last_name', 'is_staff', "is_superuser")