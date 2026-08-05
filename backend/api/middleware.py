from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError


def get_workspace_user(request):
    """
    Return the effective workspace user for this request.
    Called at view time (after DRF authentication), so request.user is available.

    If ?target_user=<id> is present, validates that the requesting user is authorized:
      - User is instructor, OR
      - User currently controls a session where target is the host, OR
      - User is a participant in an active session hosted by the target
    Falls back to request.user.
    """
    target_user_id = request.query_params.get('target_user') if hasattr(request, 'query_params') else request.GET.get('target_user')
    if not target_user_id:
        return request.user

    User = get_user_model()

    try:
        target_user = User.objects.get(id=target_user_id)
    except User.DoesNotExist:
        return request.user

    # If it's themselves, no authorization needed
    if target_user == request.user:
        return target_user

    # Check authorization: instructor
    if getattr(request.user, 'is_instructor', False):
        return target_user

    # Check authorization: currently controls a session where target is host
    from api.models import SharedSession
    is_controller = SharedSession.objects.filter(
        host=target_user,
        controlled_by=request.user,
        is_active=True
    ).exists()
    if is_controller:
        return target_user

    # Check authorization: participant in active session (read-only access)
    from api.models import SessionParticipant
    is_participant = SessionParticipant.objects.filter(
        user=request.user,
        session__host=target_user,
        session__is_active=True
    ).exists()
    if is_participant:
        return target_user

    # Not authorized — fall back to request.user
    return request.user


def get_workspace_write_user(request):
    """
    Return the workspace user this request is allowed to MUTATE.

    Deliberately stricter than get_workspace_user, which also resolves ?target_user for
    plain (read-only) session participants and for instructors. Only two callers may write
    to someone else's workspace:
      - the owner themselves, or
      - the participant who currently holds control of the owner's active session.

    Because SharedSession.controlled_by is a single nullable FK guarded by select_for_update,
    at most one user holds control at a time. Combined with the host being locked out while
    control is delegated, that keeps exactly one writer per workspace.

    Raises PermissionDenied instead of silently falling back to request.user, so an
    unauthorized write fails loudly rather than mutating the wrong user's row.
    """
    from rest_framework.exceptions import PermissionDenied

    target_user_id = request.query_params.get('target_user') if hasattr(request, 'query_params') else request.GET.get('target_user')
    if not target_user_id:
        return request.user

    User = get_user_model()

    try:
        target_user = User.objects.get(id=target_user_id)
    except (User.DoesNotExist, ValueError, ValidationError):
        raise PermissionDenied("Target workspace not found")

    # Editing your own workspace never needs a session.
    if target_user == request.user:
        return target_user

    from api.models import SharedSession
    holds_control = SharedSession.objects.filter(
        host=target_user,
        controlled_by=request.user,
        is_active=True,
    ).exists()
    if holds_control:
        return target_user

    raise PermissionDenied("You do not currently have control of this workspace")
