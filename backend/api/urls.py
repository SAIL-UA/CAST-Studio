from django.urls import path
from .views import (
    ImageDataView, UploadFigureView, CreateNoteView, DeleteFigureView,
    UpdateImageDataView, GenerateNarrativeAsyncView, GetNarrativeCacheView,
    UpdateNarrativeCacheView, ClearNarrativeCacheView,
    GenerateDescriptionsView, GenerateNarrativeView,
    LogActionView, UploadJupyterLogView,
    ExportJupyterLogsView, RequestFeedbackView,
    CreateGroupView, GetGroupView, UpdateGroupView, DeleteGroupView,
    LogMousePositionView, LogScrollView,
    ExportStoryView, CreateScaffoldView, GetScaffoldView, UpdateScaffoldView, DeleteScaffoldView,
    TaskProgressView, GetFeatureFlagsView, UpdateFeatureFlagsView, InstructorUsersView, InstructorWorkspaceView,
    HostSessionView, CloseSessionView, SessionStatusView, JoinSessionView,
    TakeControlView, ReturnControlView, ExportWorkspaceReportView
)

urlpatterns = [
    # User Actions
    path("log/user-action/", LogActionView.as_view(), name="log-action"),
    path("log/mouse-batch/", LogMousePositionView.as_view(), name="log-mouse-position"),
    path("log/scroll-batch/", LogScrollView.as_view(), name="log-scroll-position"),
    path("actions/requestfeedback/", RequestFeedbackView.as_view(), name="request-feedback"),
    path("task/progress/", TaskProgressView.as_view(), name="task-progress"),

    # Instructor
    path("instructor/features/", GetFeatureFlagsView.as_view(), name="instructor-features-get"),
    path("instructor/features/update/", UpdateFeatureFlagsView.as_view(), name="instructor-features-update"),
    path("instructor/users/", InstructorUsersView.as_view(), name="instructor-users"),
    path("instructor/workspace/<uuid:student_id>/", InstructorWorkspaceView.as_view(), name="instructor-workspace"),
    path("instructor/report/export/", ExportWorkspaceReportView.as_view(), name="instructor-report-export"),

    # Collaborate
    path("collaborate/host/", HostSessionView.as_view(), name="collaborate-host"),
    path("collaborate/host/close/", CloseSessionView.as_view(), name="collaborate-close"),
    path("collaborate/host/status/", SessionStatusView.as_view(), name="collaborate-status"),
    path("collaborate/session/<str:share_token>/", JoinSessionView.as_view(), name="collaborate-join"),
    path("collaborate/control/take/", TakeControlView.as_view(), name="collaborate-take-control"),
    path("collaborate/control/return/", ReturnControlView.as_view(), name="collaborate-return-control"),

    # Images
    path("images/", ImageDataView.as_view(), name="image-list"),  # GET list or single via query param
    path("images/upload/", UploadFigureView.as_view(), name="image-upload"),
    path("notes/create/", CreateNoteView.as_view(), name="note-create"),
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

    # Export Story
    path("export/", ExportStoryView.as_view(), name="export-story"),

    # Scaffolds
    path("scaffolds/", GetScaffoldView.as_view(), name="scaffold-list"),
    path("scaffolds/create/", CreateScaffoldView.as_view(), name="scaffold-create"),
    path("scaffolds/<uuid:scaffold_id>/update/", UpdateScaffoldView.as_view(), name="scaffold-update"),
    path("scaffolds/delete/", DeleteScaffoldView.as_view(), name="scaffold-delete"),
]