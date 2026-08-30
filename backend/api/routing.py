from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/session/(?P<share_token>[^/]+)/$', consumers.SessionConsumer.as_asgi()),
    re_path(r'ws/story-stream/$', consumers.StoryStreamConsumer.as_asgi()),
]
