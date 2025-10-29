from django.urls import path
from .views import (
    ImageDataView, UploadFigureView, DeleteFigureView, ServeImageView,
    UpdateImageDataView, GenerateNarrativeAsyncView, GetNarrativeCacheView,
    UpdateNarrativeCacheView, ClearNarrativeCacheView,
    GenerateDescriptionsView, GenerateNarrativeView,
    LogActionView, RefreshTokenView, UploadJupyterLogView,
    ExportJupyterLogsView, RequestFeedbackView,
    CreateGroupView, GetGroupsView, UpdateGroupView, DeleteGroupView,
    AddImageToGroupView, RemoveImageFromGroupView
)

urlpatterns = [
    # Authentication
    path("auth/refresh/", RefreshTokenView.as_view(), name="auth-refresh"),

    # User Actions
    path("actions/log/", LogActionView.as_view(), name="log-action"),
    path("actions/requestfeedback/", RequestFeedbackView.as_view(), name="request-feedback"),

    # Images
    path("images/", ImageDataView.as_view(), name="image-list"),                     # GET list or single via query param
    path("images/upload/", UploadFigureView.as_view(), name="image-upload"),
    path("images/<str:filename>/serve/", ServeImageView.as_view(), name="image-serve"),
    path("images/<uuid:image_id>/update/", UpdateImageDataView.as_view(), name="image-update"),
    path("images/<str:filename>/delete/", DeleteFigureView.as_view(), name="image-delete"),

    # Groups
    path("groups/", GetGroupsView.as_view(), name="group-list"),
    path("groups/create/", CreateGroupView.as_view(), name="group-create"),
    path("groups/<uuid:group_id>/update/", UpdateGroupView.as_view(), name="group-update"),
    path("groups/<uuid:group_id>/delete/", DeleteGroupView.as_view(), name="group-delete"),
    path("groups/images/add/", AddImageToGroupView.as_view(), name="group-image-add"),
    path("groups/images/remove/", RemoveImageFromGroupView.as_view(), name="group-image-remove"),

    # Narrative
    path("narrative/generate/async/", GenerateNarrativeAsyncView.as_view(), name="narrative-generate-async"),
    path("narrative/cache/", GetNarrativeCacheView.as_view(), name="narrative-cache-get"),
    path("narrative/cache/update/", UpdateNarrativeCacheView.as_view(), name="narrative-cache-update"),
    path("narrative/cache/clear/", ClearNarrativeCacheView.as_view(), name="narrative-cache-clear"),
    path("narrative/generate/", GenerateNarrativeView.as_view(), name="narrative-generate"),

    # AI Descriptions
    path("descriptions/generate/", GenerateDescriptionsView.as_view(), name="descriptions-generate"),

    # Jupyter Logs
    path("jupyter/logs/upload/", UploadJupyterLogView.as_view(), name="jupyter-log-upload"),
    path("jupyter/logs/export/", ExportJupyterLogsView.as_view(), name="jupyter-log-export"),
]