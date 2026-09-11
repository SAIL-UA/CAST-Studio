"""Helpers for named workspaces, shared media, and file GC."""

import os
import uuid
from django.db import transaction
from django.utils._os import safe_join

from .models import (
    Workspace,
    MediaAsset,
    ImageData,
    GroupData,
    ScaffoldData,
    ResearchQuestion,
)

MAX_WORKSPACES_PER_USER = 3
DEFAULT_WORKSPACE_NAME = "Default"


def get_or_create_active_workspace(user):
    ws = Workspace.objects.filter(user=user, is_active=True).first()
    if ws:
        return ws
    existing = Workspace.objects.filter(user=user).order_by("-last_modified").first()
    if existing:
        existing.is_active = True
        existing.save(update_fields=["is_active"])
        return existing
    return Workspace.objects.create(
        user=user, name=DEFAULT_WORKSPACE_NAME, is_active=True
    )


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


def clear_workspace_canvas(workspace):
    """Drop canvas + RQ rows for a workspace; return media ids that were referenced."""
    media_ids = collect_workspace_media_ids(workspace)
    ResearchQuestion.objects.filter(workspace=workspace).delete()
    ImageData.objects.filter(workspace=workspace).delete()
    GroupData.objects.filter(workspace=workspace).delete()
    ScaffoldData.objects.filter(workspace=workspace).delete()
    return media_ids


def clone_workspace_contents(source, dest):
    """Copy scaffolds, groups, image placements, RQs from source into dest. Share media_id."""
    scaffold_map = {}
    for sc in ScaffoldData.objects.filter(workspace=source):
        new_id = uuid.uuid4()
        ScaffoldData.objects.create(
            id=new_id,
            user=dest.user,
            workspace=dest,
            name=sc.name,
            number=sc.number,
            valid_group_numbers=sc.valid_group_numbers,
            description=sc.description,
            x=sc.x,
            y=sc.y,
        )
        scaffold_map[sc.id] = new_id

    group_map = {}
    for g in GroupData.objects.filter(workspace=source):
        new_id = uuid.uuid4()
        GroupData.objects.create(
            id=new_id,
            user=dest.user,
            workspace=dest,
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
    for img in ImageData.objects.filter(workspace=source).select_related("media"):
        new_id = uuid.uuid4()
        ImageData.objects.create(
            id=new_id,
            user=dest.user,
            workspace=dest,
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

    for rq in ResearchQuestion.objects.filter(workspace=source).prefetch_related(
        "images", "groups"
    ):
        new_rq = ResearchQuestion.objects.create(
            user=dest.user,
            workspace=dest,
            text=rq.text,
            order=rq.order,
        )
        new_rq.images.set(
            [image_map[i.id] for i in rq.images.all() if i.id in image_map]
        )
        new_rq.groups.set(
            [group_map[g.id] for g in rq.groups.all() if g.id in group_map]
        )

    dest.save(update_fields=["last_modified"])
    return dest


def _activate(workspaces, dest):
    for w in workspaces:
        if w.is_active and w.id != dest.id:
            w.is_active = False
            w.save(update_fields=["is_active"])
    if not dest.is_active:
        dest.is_active = True
        dest.save(update_fields=["is_active", "last_modified"])
    return dest


def create_workspace(user, name, replace_id=None):
    """
    Create an empty workspace and make it the current one.

    Users may keep up to MAX_WORKSPACES_PER_USER workspaces. At the cap,
    replace_id must point at an existing workspace to clear and reuse.
    Raises ValueError with code workspace_limit / invalid_replace.
    """
    name = (name or "").strip() or DEFAULT_WORKSPACE_NAME
    with transaction.atomic():
        workspaces = list(Workspace.objects.select_for_update().filter(user=user))

        if len(workspaces) >= MAX_WORKSPACES_PER_USER:
            if not replace_id:
                raise ValueError("workspace_limit")
            dest = next((w for w in workspaces if str(w.id) == str(replace_id)), None)
            if not dest:
                raise ValueError("invalid_replace")
            old_media = clear_workspace_canvas(dest)
            dest.name = name[:100]
            dest.save(update_fields=["name", "last_modified"])
            _activate(workspaces, dest)
            purge_media_ids(old_media)
            return dest

        for w in workspaces:
            if w.is_active:
                w.is_active = False
                w.save(update_fields=["is_active"])
        return Workspace.objects.create(user=user, name=name[:100], is_active=True)


def activate_workspace(user, workspace_id):
    with transaction.atomic():
        workspaces = list(Workspace.objects.select_for_update().filter(user=user))
        target = next((w for w in workspaces if str(w.id) == str(workspace_id)), None)
        if not target:
            return None
        return _activate(workspaces, target)


def delete_workspace(user, workspace_id):
    with transaction.atomic():
        workspaces = list(Workspace.objects.select_for_update().filter(user=user))
        if len(workspaces) <= 1:
            raise ValueError("last_workspace")
        target = next((w for w in workspaces if str(w.id) == str(workspace_id)), None)
        if not target:
            return None
        others = [w for w in workspaces if w.id != target.id]
        if target.is_active:
            fallback = max(others, key=lambda w: w.last_modified)
            # Deactivate the current row first — one_active_workspace_per_user
            # forbids two True rows for the same user, even inside this transaction.
            _activate(workspaces, fallback)
        media_ids = collect_workspace_media_ids(target)
        target.delete()
        purge_media_ids(media_ids)
        return True


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
