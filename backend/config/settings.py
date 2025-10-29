import os
from pathlib import Path
import environ
import sys

# Initialize environment variables
env = environ.Env(
  DJANGO_DEBUG=(bool, False),
  CORS_ORIGIN_ALLOW_ALL=(bool, False),
  CORS_ALLOWED_ORIGINS=(list, []),
  CSRF_TRUSTED_ORIGINS=(list, []),
  DJANGO_ALLOWED_HOSTS=(list, []),
)

LOGGING = {
  'version': 1,
  'disable_existing_loggers': False,
  'handlers': {
    'console': {
      'class': 'logging.StreamHandler',
      'stream': sys.stdout,
    },
  },
  'root': {
    'handlers': ['console'],
    'level': 'DEBUG',
  },
}
# Set the project base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # Adjusted to point to root



# Read the .env file located at the root directory
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

DATA_PATH = env('DATA_PATH')#, default="/data/CAST_ext/users")
# Celery Configuration
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/1")


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('DJANGO_SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env('DJANGO_DEBUG')

ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS')

# Static files (CSS, JavaScript, Images)
STATIC_URL = env('STATIC_URL', default='/backend_static/')
STATIC_ROOT = os.path.join(BASE_DIR, env('STATIC_ROOT', default='staticfiles'))

# Application definition

INSTALLED_APPS = [
  'django.contrib.admin',
  'django.contrib.auth',
  'django.contrib.contenttypes',
  'django.contrib.sessions',
  'django.contrib.messages',
  'django.contrib.staticfiles',
  'corsheaders',
  'rest_framework',
  'users',
  'api',
  'rest_framework_simplejwt',
]

MIDDLEWARE = [
  'corsheaders.middleware.CorsMiddleware',  # CORS middleware should be placed above 'django.middleware.common.CommonMiddleware'
  'django.middleware.security.SecurityMiddleware',
  'django.contrib.sessions.middleware.SessionMiddleware',
  'django.middleware.common.CommonMiddleware',
  'django.middleware.csrf.CsrfViewMiddleware',
  'django.contrib.auth.middleware.AuthenticationMiddleware',
  'django.contrib.messages.middleware.MessageMiddleware',
  'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS Configuration
CORS_ORIGIN_ALLOW_ALL = env('CORS_ORIGIN_ALLOW_ALL')
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS')  
CORS_ALLOW_CREDENTIALS = True  # Allows cookies/sessions
CORS_ALLOW_HEADERS = [
  'accept',
  'accept-encoding',
  'authorization',
  'content-type',  
  'dnt',
  'origin',
  'user-agent',
  'x-csrftoken',
  'x-requested-with',
]
CSRF_TRUSTED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS')  

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
  {
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],  # Add your templates directory if you have one
    'APP_DIRS': True,
    'OPTIONS': {
      'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',  # Required by admin
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
      ],
    },
  },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database Configuration
DATABASES = {
  'default': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': env('POSTGRES_DB'),
    'USER': env('POSTGRES_USER'),
    'PASSWORD': env('POSTGRES_PASSWORD'),
    'HOST': env('POSTGRES_HOST'),
    'PORT': env('POSTGRES_PORT'),
    'OPTIONS': {
      'connect_timeout': 30,
    },
  }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
  {
    'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    'OPTIONS': {
      'min_length': 8,  # Optional: Set minimum password length
    }
  },
]

# Internationalization
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

SESSION_ENGINE = 'django.contrib.sessions.backends.db'  # Stores sessions in the database
SESSION_COOKIE_AGE = 900  # 15 minutes (adjust as needed)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # Optional: Session expires when browser is closed

USE_X_FORWARDED_HOST = True
# Treats http requests from behind proxy as secure
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


# settings.py
REST_FRAMEWORK = {
  'DEFAULT_AUTHENTICATION_CLASSES': (
    'users.cookie_jwt_auth.CookieJWTAuthentication',  # Replace DRF tokens
  ),
}

from datetime import timedelta

SIMPLE_JWT = {
  'ACCESS_TOKEN_LIFETIME': timedelta(minutes=20),
  'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
  'ROTATE_REFRESH_TOKENS': True,
  'BLACKLIST_AFTER_ROTATION': True,
  'USER_ID_FIELD': 'id',  # Explicitly set user ID field
  'USER_ID_CLAIM': 'user_id',
  'TOKEN_OBTAIN_SERIALIZER': 'users.token_serializer.CustomTokenObtainPairSerializer',
}

# Custom JWT cookie settings
JWT_ACCESS_COOKIE = env('JWT_ACCESS_COOKIE', default='access')
JWT_REFRESH_COOKIE = env('JWT_REFRESH_COOKIE', default='refresh')
JWT_COOKIE_SECURE = env.bool('JWT_COOKIE_SECURE', default=not DEBUG)
JWT_COOKIE_SAMESITE = env('JWT_COOKIE_SAMESITE', default='Lax')

# Email Configuration for Password Reset
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='localhost')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL')

# Frontend URL for password reset links
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:8075')
