import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


def story_stream_group_name(user_id) -> str:
    """Canonical channel-group name for a user's story-stream. Both the consumer
    and the celery task producer must agree on this — export a helper so no one
    has to remember the format string."""
    return f'story_stream_{user_id}'


class StoryStreamConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer that streams generated-story chunks to the requesting user.

    The celery `generate_narrative_task` produces the story via OpenAI streaming
    and pushes each chunk to the user's channel group. The consumer relays those
    chunks to any tab that has this socket open.

    Group naming is per-user (see `story_stream_group_name`), so multiple tabs of
    the same user all receive the stream. Not intended for collaborator viewing —
    session-mode observers use the separate `/ws/session/…` socket.
    """

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        self.group_name = story_stream_group_name(self.user.id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"[WS] {self.user.username} connected to story-stream group {self.group_name}")

    async def disconnect(self, close_code):
        group_name = getattr(self, 'group_name', None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def story_event(self, event):
        """Relay a producer-side event to the client. Event shape:
            {'type': 'story.event', 'event': 'start'|'chunk'|'end'|'error',
             ...payload}
        The wrapper `type` is Channels routing plumbing; the client sees the
        inner `event` string plus the payload keys."""
        payload = {k: v for k, v in event.items() if k not in ('type', 'event')}
        payload['type'] = event.get('event', 'chunk')
        await self.send_json(payload)


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
        # Auto-return control if this user had it
        await self.auto_return_control()

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
        """Handle incoming messages from clients and broadcast to the group."""
        msg_type = content.get('type', '')
        logger.info(f"[WS] Received {msg_type} from {await self.get_username()}")

        if msg_type == 'panel_open':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'panel_open',
                    'panel': content.get('panel'),
                    'items': content.get('items'),
                    'sender': await self.get_username(),
                }
            )

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
        """Broadcast workspace changes to all clients."""
        await self.send_json(event)

    async def panel_open(self, event):
        """Broadcast panel open events to all clients."""
        await self.send_json({
            'type': 'panel_open',
            'panel': event.get('panel'),
            'items': event.get('items'),
            'sender': event.get('sender'),
        })

    async def control_changed(self, event):
        """Broadcast control changes to all clients."""
        await self.send_json({
            'type': 'control_changed',
            'controlled_by': event.get('controlled_by'),
            'controlled_by_name': event.get('controlled_by_name'),
        })

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

    @database_sync_to_async
    def _return_control_if_held(self):
        """Check if this user holds control and return it to host. Returns True if control was returned."""
        from api.models import SharedSession
        try:
            session = SharedSession.objects.get(share_token=self.share_token, is_active=True)
            if session.controlled_by and session.controlled_by == self.user:
                session.controlled_by = None
                session.save(update_fields=['controlled_by'])
                return True
        except SharedSession.DoesNotExist:
            pass
        return False

    async def auto_return_control(self):
        """Auto-return control to host when a participant disconnects."""
        try:
            returned = await self._return_control_if_held()
            if returned:
                username = await self.get_username()
                logger.info(f"[WS] Auto-returned control from {username} in session {self.share_token}")
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'control_changed',
                        'controlled_by': None,
                        'controlled_by_name': None,
                    }
                )
        except Exception as e:
            logger.error(f"[WS] Error auto-returning control: {e}")
