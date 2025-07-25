from django.urls import path
from .views import GetUserDataView, UploadFigureView, DeleteFigureView, ServeImageView, UpdateImageDataView, RunScriptView, GetNarrativeCacheView, UpdateNarrativeCacheView, ClearNarrativeCacheView, GenerateLongDescriptionsView, GenerateSingleLongDescriptionView, GenerateNarrativeView, LogActionView

urlpatterns = [
  path("get_user_data/", GetUserDataView.as_view(), name="get_user_data"),
  path("upload_figure/", UploadFigureView.as_view(), name="upload_figure"),
  path("delete_figure/", DeleteFigureView.as_view(), name="delete_figure"),
  path("serve_image/<str:filename>/", ServeImageView.as_view(), name="serve_image"),
  path("update_image_data/", UpdateImageDataView.as_view(), name="update_image_data"),
  path("run_script/", RunScriptView.as_view(), name="run_script"),
  path("get_narrative_cache/", GetNarrativeCacheView.as_view(), name="get_narrative_cache"),
  path("update_narrative_cache/", UpdateNarrativeCacheView.as_view(), name="update_narrative_cache"),
  path("clear_narrative_cache/", ClearNarrativeCacheView.as_view(), name="clear_narrative_cache"),
  path("generate_long_descriptions/", GenerateLongDescriptionsView.as_view(), name="generate_long_descriptions"),
  path("generate_single_long_description/", GenerateSingleLongDescriptionView.as_view(), name="generate_single_long_description"),
  path("generate_narrative/", GenerateNarrativeView.as_view(), name="generate_narrative"),
  path("log_action/", LogActionView.as_view(), name="log_action"),
]