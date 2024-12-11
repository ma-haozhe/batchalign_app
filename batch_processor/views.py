#Haozhe Ma 2024-Dec-11
#____________________________

from django.shortcuts import render
from django.http import JsonResponse
from .models import AudioFile
from django.core.files.storage import FileSystemStorage
import os

def upload_audio(request):
    if request.method == "POST":
        # Single file upload
        if "audio_file" in request.FILES:
            audio_file = request.FILES["audio_file"]
            audio = AudioFile.objects.create(title=audio_file.name, audio_file=audio_file)
            return JsonResponse({"status": "success", "audio_id": audio.id})

        # Batch folder processing using folder upload
        elif request.FILES.getlist("input_folder"):
            files = request.FILES.getlist("input_folder")
            for file in files:
                if file.name.lower().endswith((".mp3", ".wav", ".mp4")):
                    audio = AudioFile.objects.create(title=file.name, audio_file=file)
            return JsonResponse({"status": "success", "message": "Batch upload completed."})
    
    return render(request, "batch_processor/upload.html")