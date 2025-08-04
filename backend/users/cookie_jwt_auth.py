# users/cookie_jwt_auth.py
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication

class CookieJWTAuthentication(JWTAuthentication):
  def authenticate(self, request):
    # First, try to get the token from the header
    header = self.get_header(request)
    if header is None:
      # If no header, try to get it from the cookies
      raw_token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE)
      if raw_token is None:
        return None
    else:
      raw_token = self.get_raw_token(header)
    
    if raw_token is None:
      return None
    
    try:
      validated_token = self.get_validated_token(raw_token)
    except Exception:
      return None
    
    return self.get_user(validated_token), validated_token