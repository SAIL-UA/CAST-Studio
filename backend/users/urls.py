from django.urls import path
from .views import LoginView, CurrentUserView, LogoutView, CheckAuthView, RegisterView

urlpatterns = [
  path("register/", RegisterView.as_view(), name="register"),
  path("login/", LoginView.as_view(), name="login"),
  path("logout/", LogoutView.as_view(), name="logout"),
  path("me/", CurrentUserView.as_view(), name="current_user"),
  path("check_auth/", CheckAuthView.as_view(), name="check_auth"),
]