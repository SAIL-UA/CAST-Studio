"""
Django signals that broadcast workspace changes to collaboration session participants.
When ImageData, GroupData, or ScaffoldData is saved or deleted, if the owner has an
active SharedSession, a 'workspace_update' message is sent to the Channels group.
"""

import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


def broadcast_workspace_update(user_id):
    """
    If the user has an active session, broadcast a refresh signal to all participants.
    """
    from api.models import SharedSession

    try:
        session = SharedSession.objects.filter(host_id=user_id, is_active=True).first()
        if not session:
            return

        channel_layer = get_channel_layer()
        group_name = f"session_{session.share_token}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "workspace_update",
                "action": "refresh",
            },
        )
    except Exception as e:
        # Never let signal errors propagate to the caller
        logger.error(f"[Signal] Error broadcasting workspace update: {e}")


@receiver(post_save, sender="api.ImageData")
def image_data_saved(sender, instance, **kwargs):
    if instance.user_id:
        broadcast_workspace_update(instance.user_id)


@receiver(post_delete, sender="api.ImageData")
def image_data_deleted(sender, instance, **kwargs):
    if instance.user_id:
        broadcast_workspace_update(instance.user_id)


@receiver(post_save, sender="api.GroupData")
def group_data_saved(sender, instance, **kwargs):
    if instance.user_id:
        broadcast_workspace_update(instance.user_id)


@receiver(post_delete, sender="api.GroupData")
def group_data_deleted(sender, instance, **kwargs):
    if instance.user_id:
        broadcast_workspace_update(instance.user_id)


@receiver(post_save, sender="api.ScaffoldData")
def scaffold_data_saved(sender, instance, **kwargs):
    if instance.user_id:
        broadcast_workspace_update(instance.user_id)


@receiver(post_delete, sender="api.ScaffoldData")
def scaffold_data_deleted(sender, instance, **kwargs):
    if instance.user_id:
        broadcast_workspace_update(instance.user_id)


@receiver(post_save, sender="api.NarrativeCache")
def narrative_cache_saved(sender, instance, **kwargs):
    if instance.user_id:
        broadcast_workspace_update(instance.user_id)


@receiver(post_save, sender="api.Workspace")
def workspace_saved(sender, instance, **kwargs):
    if instance.user_id and instance.is_active:
        broadcast_workspace_update(instance.user_id)
