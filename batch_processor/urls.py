from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('upload/', views.upload_audio, name='upload_audio'),
    path('download-chat/<int:file_id>/', views.download_chat, name='download_chat'),
    path('update-speaker-mapping/<int:transcript_id>/', views.update_speaker_mapping, name='update_speaker_mapping'),
    path('clear-cache/', views.clear_cache, name='clear_cache'),
    path('transcripts/', views.transcript_list, name='transcript_list'),
    path('transcript/<int:transcript_id>/', views.view_transcript, name='view_transcript'),
    path('transcript/<int:transcript_id>/run-pyannote/', views.run_pyannote_diarization, name='run_pyannote_diarization'),
    path('transcript/<int:transcript_id>/update-missing-segment/', views.update_missing_segment, name='update_missing_segment'),
    path('settings/', views.settings_view, name='settings'),
    path('download/<int:file_id>/', views.download_chat, name='download_file'),
    # Add API key setting endpoints
    path('set-hf-token/', views.set_hf_token, name='set_hf_token'),
    path('set-rev-api-key/', views.set_rev_api_key, name='set_rev_api_key'),
    path('get-api-keys/', views.get_api_keys, name='get_api_keys'),
]