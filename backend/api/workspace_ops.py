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


def get_or_create_active_workspace(user):
    ws = Workspace.objects.filter(user=user, is_active=True).first()
    if ws:
        return ws
    existing = Workspace.objects.filter(user=user).order_by("-last_modified").first()
    if existing:
        existing.is_active = True
        existing.save(update_fields=["is_active"])
        return existing
    return Workspace.objects.create(user=user, name="Untitled", is_active=True)


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


def save_as_workspace(user, name, replace_id=None):
    """
    Clone the active workspace into a new inactive one, or overwrite replace_id.
    Raises ValueError with code workspace_limit / invalid_replace / no_active.
    """
    name = (name or "").strip() or "Untitled"
    with transaction.atomic():
        workspaces = list(Workspace.objects.select_for_update().filter(user=user))
        source = next((w for w in workspaces if w.is_active), None)
        if not source:
            source = get_or_create_active_workspace(user)
            workspaces = list(Workspace.objects.select_for_update().filter(user=user))

        if replace_id:
            dest = next((w for w in workspaces if str(w.id) == str(replace_id)), None)
            if not dest or dest.id == source.id:
                raise ValueError("invalid_replace")
            old_media = clear_workspace_canvas(dest)
            dest.name = name
            dest.is_active = False
            dest.save(update_fields=["name", "is_active", "last_modified"])
            clone_workspace_contents(source, dest)
            purge_media_ids(old_media)
            return dest

        if len(workspaces) >= MAX_WORKSPACES_PER_USER:
            raise ValueError("workspace_limit")

        dest = Workspace.objects.create(user=user, name=name, is_active=False)
        clone_workspace_contents(source, dest)
        return dest


def activate_workspace(user, workspace_id):
    with transaction.atomic():
        workspaces = list(Workspace.objects.select_for_update().filter(user=user))
        target = next((w for w in workspaces if str(w.id) == str(workspace_id)), None)
        if not target:
            return None
        for w in workspaces:
            if w.is_active and w.id != target.id:
                w.is_active = False
                w.save(update_fields=["is_active"])
        if not target.is_active:
            target.is_active = True
            target.save(update_fields=["is_active", "last_modified"])
        return target


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
            fallback.is_active = True
            fallback.save(update_fields=["is_active"])
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
