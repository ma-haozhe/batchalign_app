from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('upload/', views.upload_audio, name='upload'),
    path('download-chat/<int:file_id>/', views.download_chat, name='download_chat'),
    path('update-speaker-mapping/<int:transcript_id>/', views.update_speaker_mapping, name='update_speaker_mapping'),
    path('clear-cache/', views.clear_cache, name='clear_cache'),
]