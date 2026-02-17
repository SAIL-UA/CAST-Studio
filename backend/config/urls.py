from django.contrib import admin
from django.urls import path, include
from django_otp.admin import OTPAdminSite

admin.site.__class__ = OTPAdminSite

urlpatterns = [
  path('api/', include('api.urls')),
  path('users/', include('users.urls')),
  path('admin/', admin.site.urls),
]