from django.contrib import admin
from .models import ForcedAlignmentTask

@admin.register(ForcedAlignmentTask)
class ForcedAlignmentTaskAdmin(admin.ModelAdmin):
    list_display = ('original_transcript', 'status', 'engine_used', 'created_at', 'updated_at')
    list_filter = ('status', 'engine_used')
    search_fields = ('original_transcript__audio__title', 'error_message')
    readonly_fields = ('created_at', 'updated_at')
