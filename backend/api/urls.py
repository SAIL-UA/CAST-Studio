from django.urls import path
from .views import ImageDataView, UploadFigureView, DeleteFigureView, ServeImageView, UpdateImageDataView, RunScriptView, GetNarrativeCacheView, UpdateNarrativeCacheView, ClearNarrativeCacheView, GenerateDescriptionsView, GenerateNarrativeView, LogActionView, RefreshTokenView, UploadJupyterLogView

urlpatterns = [
  path("image_data/", ImageDataView.as_view(), name="image_data"),
  path("upload_figure/", UploadFigureView.as_view(), name="upload_figure"),
  path("delete_figure/", DeleteFigureView.as_view(), name="delete_figure"),
  path("serve_image/<str:filename>/", ServeImageView.as_view(), name="serve_image"),
  path("update_image_data/", UpdateImageDataView.as_view(), name="update_image_data"),
  path("run_script/", RunScriptView.as_view(), name="run_script"),
  path("get_narrative_cache/", GetNarrativeCacheView.as_view(), name="get_narrative_cache"),
  path("update_narrative_cache/", UpdateNarrativeCacheView.as_view(), name="update_narrative_cache"),
  path("clear_narrative_cache/", ClearNarrativeCacheView.as_view(), name="clear_narrative_cache"),
  path("generate_descriptions/", GenerateDescriptionsView.as_view(), name="generate_descriptions"),
  path("generate_narrative/", GenerateNarrativeView.as_view(), name="generate_narrative"),
  path("log_action/", LogActionView.as_view(), name="log_action"),
  path("refresh_token/", RefreshTokenView.as_view(), name="refresh_token"),
  path("upload_jupyter_log/", UploadJupyterLogView.as_view(), name="upload_jupyter_log"),
]