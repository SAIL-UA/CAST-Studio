from django.urls import path
from .views import (
    ImageDataView, UploadFigureView, DeleteFigureView,
    UpdateImageDataView, GenerateNarrativeAsyncView, GetNarrativeCacheView,
    UpdateNarrativeCacheView, ClearNarrativeCacheView,
    GenerateDescriptionsView, GenerateNarrativeView,
    LogActionView, RefreshTokenView, UploadJupyterLogView,
    ExportJupyterLogsView, RequestFeedbackView,
    CreateGroupView, GetGroupView, UpdateGroupView, DeleteGroupView,
    LogMousePositionView, LogScrollView
)

urlpatterns = [
    # User Actions
    path("log/user-action/", LogActionView.as_view(), name="log-action"),
    path("log/mouse-batch/", LogMousePositionView.as_view(), name="log-mouse-position"),
    path("log/scroll-batch/", LogScrollView.as_view(), name="log-scroll-position"),
    path("actions/requestfeedback/", RequestFeedbackView.as_view(), name="request-feedback"),

    # Images
    path("images/", ImageDataView.as_view(), name="image-list"),  # GET list or single via query param
    path("images/upload/", UploadFigureView.as_view(), name="image-upload"),
    path("images/<uuid:image_id>/update/", UpdateImageDataView.as_view(), name="image-update"),
    path("images/<str:filename>/delete/", DeleteFigureView.as_view(), name="image-delete"),

    # Groups
    path("groups/", GetGroupView.as_view(), name="group-list"),  # GET list or single via query param
    path("groups/create/", CreateGroupView.as_view(), name="group-create"),
    path("groups/<uuid:group_id>/update/", UpdateGroupView.as_view(), name="group-update"),
    path("groups/<uuid:group_id>/delete/", DeleteGroupView.as_view(), name="group-delete"),

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