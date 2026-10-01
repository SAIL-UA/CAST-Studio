"""Helpers for the live editor workspace, immutable submissions, shared media, and file GC."""

import os
import uuid
from django.db import transaction
from django.utils._os import safe_join

from .models import (
    Workspace,
    Submission,
    MediaAsset,
    ImageData,
    GroupData,
    ScaffoldData,
    ResearchQuestion,
    NarrativeCache,
)

MAX_SUBMISSIONS_PER_USER = 3
# Backward-compatible alias used by older call sites / responses.
MAX_WORKSPACES_PER_USER = MAX_SUBMISSIONS_PER_USER
EDITOR_WORKSPACE_NAME = "Editor"
DEFAULT_WORKSPACE_NAME = EDITOR_WORKSPACE_NAME


def get_or_create_workspace(user):
    """Return the user's sole live editor canvas, creating it if needed."""
    ws = Workspace.objects.filter(user=user).first()
    if ws:
        if ws.name != EDITOR_WORKSPACE_NAME:
            ws.name = EDITOR_WORKSPACE_NAME
            ws.save(update_fields=["name"])
        return ws
    return Workspace.objects.create(user=user, name=EDITOR_WORKSPACE_NAME)


def get_or_create_active_workspace(user):
    """Backward-compatible alias for get_or_create_workspace."""
    return get_or_create_workspace(user)


def get_or_create_media(user, filename):
    media, _ = MediaAsset.objects.get_or_create(user=user, filepath=filename)
    return media


def purge_media_if_unreferenced(media_id):
    """Delete media_assets + disk file only if no image_data placement remains."""
    if not media_id:
        return False
    if ImageData.objects.filter(media_id=media_id).exists():
        return False
    try:
        media = MediaAsset.objects.get(id=media_id)
    except MediaAsset.DoesNotExist:
        return False
    filename = media.filepath
    media.delete()
    data_path = os.getenv("DATA_PATH")
    if data_path and filename:
        try:
            filepath = safe_join(data_path, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
        except (ValueError, OSError):
            pass
    return True


def purge_media_ids(media_ids):
    for mid in set(filter(None, media_ids)):
        purge_media_if_unreferenced(mid)


def collect_workspace_media_ids(workspace):
    return list(
        ImageData.objects.filter(
            workspace=workspace, media_id__isnull=False
        ).values_list("media_id", flat=True)
    )


def collect_submission_media_ids(submission):
    return list(
        ImageData.objects.filter(
            submission=submission, media_id__isnull=False
        ).values_list("media_id", flat=True)
    )


def clear_workspace_canvas(workspace):
    """Drop canvas + RQ rows for a workspace; return media ids that were referenced."""
    media_ids = collect_workspace_media_ids(workspace)
    ResearchQuestion.objects.filter(workspace=workspace).delete()
    ImageData.objects.filter(workspace=workspace).delete()
    GroupData.objects.filter(workspace=workspace).delete()
    ScaffoldData.objects.filter(workspace=workspace).delete()
    return media_ids


def narrative_snapshot_from_cache(user):
    """Build the frozen story payload from the user's live NarrativeCache."""
    cache = NarrativeCache.objects.filter(user=user).first()
    if not cache:
        return {
            "story_structure_id": "",
            "narrative": "",
            "order": [],
            "theme": "",
            "categories": [],
            "sequence_justification": "",
            "sequence_summary": [],
            "rq_reasoning": [],
        }
    return {
        "story_structure_id": cache.story_structure_id or "",
        "narrative": cache.narrative or "",
        "order": cache.order or [],
        "theme": cache.theme or "",
        "categories": cache.categories or [],
        "sequence_justification": cache.sequence_justification or "",
        "sequence_summary": cache.sequence_summary or [],
        "rq_reasoning": cache.rq_reasoning or [],
    }


def clone_workspace_to_submission(source_workspace, submission):
    """Copy scaffolds, groups, image placements, RQs from editor workspace into a submission."""
    scaffold_map = {}
    for sc in ScaffoldData.objects.filter(workspace=source_workspace):
        new_id = uuid.uuid4()
        ScaffoldData.objects.create(
            id=new_id,
            user=submission.user,
            workspace=None,
            submission=submission,
            name=sc.name,
            number=sc.number,
            valid_group_numbers=sc.valid_group_numbers,
            description=sc.description,
            x=sc.x,
            y=sc.y,
        )
        scaffold_map[sc.id] = new_id

    group_map = {}
    for g in GroupData.objects.filter(workspace=source_workspace):
        new_id = uuid.uuid4()
        GroupData.objects.create(
            id=new_id,
            user=submission.user,
            workspace=None,
            submission=submission,
            name=g.name,
            number=g.number,
            description=g.description,
            x=g.x,
            y=g.y,
            scaffold_id_id=(
                scaffold_map.get(g.scaffold_id_id) if g.scaffold_id_id else None
            ),
            scaffold_group_number=g.scaffold_group_number,
        )
        group_map[g.id] = new_id

    image_map = {}
    for img in ImageData.objects.filter(workspace=source_workspace).select_related(
        "media"
    ):
        new_id = uuid.uuid4()
        ImageData.objects.create(
            id=new_id,
            user=submission.user,
            workspace=None,
            submission=submission,
            media=img.media,
            short_desc=img.short_desc,
            long_desc=img.long_desc,
            long_desc_generating=False,
            source=img.source,
            in_storyboard=img.in_storyboard,
            x=img.x,
            y=img.y,
            group_id_id=group_map.get(img.group_id_id) if img.group_id_id else None,
            scaffold_id_id=(
                scaffold_map.get(img.scaffold_id_id) if img.scaffold_id_id else None
            ),
            scaffold_group_number=img.scaffold_group_number,
            has_order=img.has_order,
            order_num=img.order_num,
            index=img.index,
        )
        image_map[img.id] = new_id

    for rq in ResearchQuestion.objects.filter(
        workspace=source_workspace
    ).prefetch_related("images", "groups"):
        new_rq = ResearchQuestion.objects.create(
            user=submission.user,
            workspace=None,
            submission=submission,
            text=rq.text,
            order=rq.order,
        )
        new_rq.images.set(
            [image_map[i.id] for i in rq.images.all() if i.id in image_map]
        )
        new_rq.groups.set(
            [group_map[g.id] for g in rq.groups.all() if g.id in group_map]
        )

    return submission


def create_submission(user):
    """
    Freeze the editor canvas + narrative into an immutable submission.
    Raises ValueError('submission_limit') when the user already has
    MAX_SUBMISSIONS_PER_USER submissions.
    """
    with transaction.atomic():
        used = Submission.objects.select_for_update().filter(user=user).count()
        if used >= MAX_SUBMISSIONS_PER_USER:
            raise ValueError("submission_limit")

        editor = get_or_create_workspace(user)
        # Lock editor row while cloning
        Workspace.objects.select_for_update().filter(id=editor.id).first()

        n = used + 1
        submission = Submission.objects.create(
            user=user,
            name=f"Submission {n}"[:100],
            points=0,
            assignment_id=None,
            narrative_snapshot=narrative_snapshot_from_cache(user),
        )
        clone_workspace_to_submission(editor, submission)
        return submission


def submission_attempt_meta(user):
    used = Submission.objects.filter(user=user).count()
    return {
        "used": used,
        "limit": MAX_SUBMISSIONS_PER_USER,
        "remaining": max(0, MAX_SUBMISSIONS_PER_USER - used),
    }


def purge_user_media_files(user):
    """Remove disk files for a user's media before cascading user delete."""
    data_path = os.getenv("DATA_PATH")
    if not data_path:
        return
    for media in MediaAsset.objects.filter(user=user):
        try:
            filepath = safe_join(data_path, media.filepath)
            if os.path.exists(filepath):
                os.remove(filepath)
        except (ValueError, OSError):
            pass
