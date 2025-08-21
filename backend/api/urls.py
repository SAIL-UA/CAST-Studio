from django.urls import path
from .views import (
    ImageDataView, UploadFigureView, DeleteFigureView, ServeImageView,
    UpdateImageDataView, GenerateNarrativeAsyncView, GetNarrativeCacheView,
    UpdateNarrativeCacheView, ClearNarrativeCacheView,
    GenerateDescriptionsView, GenerateNarrativeView,
    LogActionView, RefreshTokenView, UploadJupyterLogView,
    ExportJupyterLogsView
)

urlpatterns = [
    # Authentication
    path("auth/refresh/", RefreshTokenView.as_view(), name="auth-refresh"),

    # User Actions
    path("actions/log/", LogActionView.as_view(), name="log-action"),

    # Images
    path("images/", ImageDataView.as_view(), name="image-list"),                     # GET list or single via query param
    path("images/upload/", UploadFigureView.as_view(), name="image-upload"),
    path("images/<str:filename>/serve/", ServeImageView.as_view(), name="image-serve"),
    path("images/<uuid:image_id>/update/", UpdateImageDataView.as_view(), name="image-update"),
    path("images/<str:filename>/delete/", DeleteFigureView.as_view(), name="image-delete"),

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