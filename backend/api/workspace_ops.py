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
EDITOR_WORKSPACE_NAME = "Editor"
DEFAULT_WORKSPACE_NAME = EDITOR_WORKSPACE_NAME


def get_or_create_active_workspace(user):
    """Return the user's editor canvas, creating it if needed. Never promote a snapshot."""
    ws = Workspace.objects.filter(user=user, is_active=True).first()
    if ws:
        if ws.name != EDITOR_WORKSPACE_NAME:
            ws.name = EDITOR_WORKSPACE_NAME
            ws.save(update_fields=["name"])
        return ws
    return Workspace.objects.create(
        user=user, name=EDITOR_WORKSPACE_NAME, is_active=True
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


def save_snapshot(user, name, replace_id=None):
    """
    Copy the editor canvas into a named snapshot. The editor stays active
    and keeps its contents.

    Users may keep up to MAX_WORKSPACES_PER_USER snapshots (the editor does
    not count). At the cap, replace_id must be an existing snapshot.
    Raises ValueError with code name_required / workspace_limit / invalid_replace.
    """
    name = (name or "").strip()
    if not name:
        raise ValueError("name_required")
    with transaction.atomic():
        workspaces = list(Workspace.objects.select_for_update().filter(user=user))
        editor = next((w for w in workspaces if w.is_active), None)
        if not editor:
            editor = Workspace.objects.create(
                user=user, name=EDITOR_WORKSPACE_NAME, is_active=True
            )
            workspaces.append(editor)

        snapshots = [w for w in workspaces if not w.is_active]
        if len(snapshots) >= MAX_WORKSPACES_PER_USER:
            if not replace_id:
                raise ValueError("workspace_limit")
            dest = next((w for w in snapshots if str(w.id) == str(replace_id)), None)
            if not dest:
                raise ValueError("invalid_replace")
            old_media = clear_workspace_canvas(dest)
            dest.name = name[:100]
            dest.save(update_fields=["name", "last_modified"])
            clone_workspace_contents(editor, dest)
            purge_media_ids(old_media)
            return dest

        dest = Workspace.objects.create(user=user, name=name[:100], is_active=False)
        clone_workspace_contents(editor, dest)
        return dest


def create_workspace(user, name, replace_id=None):
    """Backward-compatible alias: save a snapshot of the editor."""
    return save_snapshot(user, name, replace_id=replace_id)


def restore_snapshot(user, workspace_id):
    """Replace the editor canvas with a copy of a snapshot. Stay on the editor."""
    with transaction.atomic():
        workspaces = list(Workspace.objects.select_for_update().filter(user=user))
        editor = next((w for w in workspaces if w.is_active), None)
        source = next((w for w in workspaces if str(w.id) == str(workspace_id)), None)
        if not source:
            return None
        if not editor:
            editor = Workspace.objects.create(
                user=user, name=EDITOR_WORKSPACE_NAME, is_active=True
            )
        if source.id == editor.id or source.is_active:
            return editor
        old_media = clear_workspace_canvas(editor)
        clone_workspace_contents(source, editor)
        purge_media_ids(old_media)
        return editor


def activate_workspace(user, workspace_id):
    """Backward-compatible alias: load a snapshot into the editor."""
    return restore_snapshot(user, workspace_id)


def delete_workspace(user, workspace_id):
    with transaction.atomic():
        workspaces = list(Workspace.objects.select_for_update().filter(user=user))
        target = next((w for w in workspaces if str(w.id) == str(workspace_id)), None)
        if not target:
            return None
        if target.is_active:
            raise ValueError("editor_workspace")
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
