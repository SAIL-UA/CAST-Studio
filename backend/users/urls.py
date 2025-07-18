from django.urls import path
from .views import LoginView, CurrentUserView, LogoutView

urlpatterns = [
  path("login/", LoginView.as_view(), name="login"),
  path("dashboard/", CurrentUserView.as_view(), name="current_user"),
  path("logout/", LogoutView.as_view(), name="logout"),
]