# backend/api/admin.py
from django.contrib import admin
import json, csv
from io import StringIO
from django.http import StreamingHttpResponse
from django.utils.timezone import now
from django.utils.html import format_html
from .models import ImageData, NarrativeCache, UserAction, JupyterLog, User



### Image Data ###
@admin.register(ImageData)
class ImageDataAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "short_desc", "in_storyboard", "has_order", "order_num", "created_at", "last_saved")
    list_filter = ("in_storyboard", "has_order", "created_at")
    search_fields = ("id", "short_desc", "long_desc", "source", "user__username")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("user",)
    
    
### Jupyter Logs ###
@admin.register(JupyterLog)
class JupyterLogsAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "cell_type", "timestamp")
    list_filter = ("cell_type", "timestamp")
    search_fields = ("user__username", "cell_type", "source")
    ordering = ("-timestamp",)
    date_hierarchy = "timestamp"
    list_select_related = ("user",)
    readonly_fields = ("pretty_metadata", "pretty_outputs", "pretty_request_headers")

    def pretty_metadata(self, obj):
        try:
            body = json.dumps(obj.metadata, indent=2, ensure_ascii=False)
        except Exception:
            body = str(obj.metadata)
        return format_html("<pre style='white-space:pre-wrap;margin:0'>{}</pre>", body)
    pretty_metadata.short_description = "Metadata (pretty)"
    
    def pretty_request_headers(self, obj):
        try:
            body = json.dumps(obj.request_headers, indent=2, ensure_ascii=False)
        except Exception:
            body = str(obj.request_headers)
        return format_html("<pre style='white-space:pre-wrap;margin:0'>{}</pre>", body)
    pretty_request_headers.short_description = "Request Headers (pretty)"

    def pretty_outputs(self, obj):
        try:
            body = json.dumps(obj.outputs, indent=2, ensure_ascii=False)
        except Exception:
            body = str(obj.outputs)
        return format_html("<pre style='white-space:pre-wrap;margin:0'>{}</pre>", body)
    pretty_outputs.short_description = "Outputs (pretty)"

    # Optional: make logs view-only for non-superusers
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser  # viewable but not editable for staff

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user=request.user)  # staff only sees their own logs
    

    def export_logs_ndjson(modeladmin, request, queryset):
        """Export the selected logs as NDJSON."""
        ts = now().strftime("%Y%m%dT%H%M%SZ")

        def line_stream():
            fields = ["id","user_id","cell_type","source","metadata","outputs","execution_count","timestamp","request_headers"]
            for obj in queryset.iterator(chunk_size=1000):
                row = {f: getattr(obj, f, None) for f in fields}
                yield json.dumps(row, ensure_ascii=False, default=str) + "\n"

        resp = StreamingHttpResponse(line_stream(), content_type="application/x-ndjson")
        resp["Content-Disposition"] = f'attachment; filename="jupyter-logs-{request.user.username}-{ts}.jsonl"'
        return resp
    export_logs_ndjson.short_description = "Export logs (JSONL)"
    
    actions = [export_logs_ndjson]

### User Actions ###
@admin.register(UserAction)
class UserActionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "timestamp")
    date_hierarchy = "timestamp"
    search_fields = ("user__username",)
    readonly_fields = ("pretty_action",)
    
    def pretty_action(self, obj):
        try:
            body = json.dumps(obj.action, indent=2, ensure_ascii=False)
        except Exception:
            body = str(obj.action)
        return format_html("<pre style='white-space:pre-wrap;margin:0'>{}</pre>", body)
    pretty_action.short_description = "Action (pretty)"

### Narrative Cache ###
@admin.register(NarrativeCache)
class NarrativeCacheAdmin(admin.ModelAdmin):
    list_display = ("user", "theme")
    search_fields = ("user__username", "theme", "narrative")
    list_select_related = ("user",)
    readonly_fields = ("pretty_order", "pretty_categories")
    
    def pretty_order(self, obj):
        try:
            body = json.dumps(obj.order, indent=2, ensure_ascii=False)
        except Exception:
            body = str(obj.order)
        return format_html("<pre style='white-space:pre-wrap;margin:0'>{}</pre>", body)
    pretty_order.short_description = "Order (pretty)"
    
    def pretty_categories(self, obj):
        try:
            body = json.dumps(obj.categories, indent=2, ensure_ascii=False)
        except Exception:
            body = str(obj.categories)
        return format_html("<pre style='white-space:pre-wrap;margin:0'>{}</pre>", body)
    pretty_categories.short_description = "Categories (pretty)"

### Users ###
# Optional: show a user's images inline on the Users admin page
class ImageDataInline(admin.TabularInline):
    model = ImageData
    extra = 0
    fields = ("id", "short_desc", "in_storyboard", "created_at")
    readonly_fields = ("id", "created_at")

@admin.register(User)
class UsersAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "is_staff", "is_superuser")
    search_fields = ("username", "email")
    inlines = [ImageDataInline]
