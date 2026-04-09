from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import NarrativeCache
from .figure_refs import sync_in_output_flags_for_user


@receiver(post_save, sender=NarrativeCache)
def narrative_cache_sync_image_in_output(sender, instance, **kwargs):
    sync_in_output_flags_for_user(instance.user)
