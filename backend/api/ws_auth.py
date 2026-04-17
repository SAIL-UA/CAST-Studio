"""
JWT authentication middleware for Django Channels WebSocket connections.
Reads the access token from the query string: ws://host/ws/path/?access_token=xxx
"""
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_str):
    """Validate a JWT access token and return the corresponding user."""
    User = get_user_model()
    try:
        token = AccessToken(token_str)
        user_id = token['user_id']
        return User.objects.get(id=user_id)
    except Exception as e:
        logger.warning(f"[WS Auth] Invalid token: {e}")
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Extracts JWT access token from WebSocket query string and sets scope['user'].
    """

    async def __call__(self, scope, receive, send):
        # Parse query string for access_token
        query_string = scope.get('query_string', b'').decode()
        params = dict(
            param.split('=', 1) for param in query_string.split('&') if '=' in param
        )
        token = params.get('access_token', '')

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
