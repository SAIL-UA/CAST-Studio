import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


class SessionConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for collaboration sessions.
    Participants connect to /ws/session/{share_token}/ and join a Channels group.
    Messages sent to the group are broadcast to all connected participants.
    """

    async def connect(self):
        self.share_token = self.scope['url_route']['kwargs']['share_token']
        self.group_name = f'session_{self.share_token}'
        self.user = self.scope.get('user')

        # Validate session and participant
        is_valid = await self.validate_session()
        if not is_valid:
            await self.close()
            return

        # Join the Channels group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Notify the group that someone connected
        username = await self.get_username()
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'participant_joined',
                'username': username,
            }
        )

        logger.info(f"[WS] {username} connected to session {self.share_token}")

    async def disconnect(self, close_code):
        # Leave the Channels group
        username = await self.get_username()
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

        # Notify the group that someone disconnected
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'participant_left',
                'username': username,
            }
        )

        logger.info(f"[WS] {username} disconnected from session {self.share_token}")

    async def receive_json(self, content):
        """Handle incoming messages from clients (future use for Stage 3+)."""
        msg_type = content.get('type', '')
        logger.info(f"[WS] Received {msg_type} from {await self.get_username()}")

    # --- Group message handlers ---

    async def participant_joined(self, event):
        """Broadcast to all clients when someone joins."""
        await self.send_json({
            'type': 'participant_joined',
            'username': event['username'],
        })

    async def participant_left(self, event):
        """Broadcast to all clients when someone leaves."""
        await self.send_json({
            'type': 'participant_left',
            'username': event['username'],
        })

    async def workspace_update(self, event):
        """Broadcast workspace changes to all clients (Stage 3)."""
        await self.send_json(event)

    # --- Helpers ---

    @database_sync_to_async
    def validate_session(self):
        """Check that the session exists, is active, and the user is a valid participant."""
        from api.models import SharedSession, SessionParticipant

        try:
            session = SharedSession.objects.get(share_token=self.share_token, is_active=True)
        except SharedSession.DoesNotExist:
            logger.warning(f"[WS] Session {self.share_token} not found or inactive")
            return False

        if not self.user or self.user.is_anonymous:
            logger.warning(f"[WS] Anonymous user tried to connect to session {self.share_token}")
            return False

        # Allow the host to connect too
        if session.host_id == self.user.id:
            return True

        # Check if user is a participant
        is_participant = SessionParticipant.objects.filter(
            session=session, user=self.user
        ).exists()

        if not is_participant:
            logger.warning(f"[WS] User {self.user.username} is not a participant in session {self.share_token}")
            return False

        return True

    @database_sync_to_async
    def get_username(self):
        if self.user and not self.user.is_anonymous:
            return self.user.username
        return 'anonymous'
