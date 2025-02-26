from django.contrib import admin
from .models import AudioFile, Transcript, SpeakerMap

@admin.register(SpeakerMap)
class SpeakerMapAdmin(admin.ModelAdmin):
    list_display = ('original_id', 'chat_role')
    search_fields = ('original_id', 'chat_role')

@admin.register(AudioFile)
class AudioFileAdmin(admin.ModelAdmin):
    list_display = ('title', 'uploaded_at')
    search_fields = ('title',)

@admin.register(Transcript)
class TranscriptAdmin(admin.ModelAdmin):
    list_display = ('audio', 'created_at')
    filter_horizontal = ('speaker_mapping',)
