#Haozhe Ma 2024-Dec-11
#____________________________

import os
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import AudioFile, Transcript
from django.core.files.storage import FileSystemStorage
import batchalign as ba

def home(request):
    return render(request, 'batch_processor/home.html')

def process_audio(audio_file_path, lang="eng"):
    try:
        # Initialize the Rev.ai ASR engine
        asr_engine = ba.RevEngine(lang=lang)
        
        # Create a Batchalign pipeline
        nlp = ba.BatchalignPipeline(asr_engine)
        
        # Process the audio file
        doc = nlp(audio_file_path)
        
        # Get the transcript with tiers for diarization
        transcript = doc.transcript(include_tiers=True, strip=False)
        
        # Extract diarization data if available
        diarization_data = doc.segments if hasattr(doc, "segments") else []
        
        return transcript, diarization_data
    except Exception as e:
        print(f"Batchalign processing error: {e}")
        return None, None

def upload_audio(request):
    if request.method == "POST":
        if "audio_file" in request.FILES:
            audio_file = request.FILES["audio_file"]
            
            # Check if file with same name already exists in database
            existing_audio = AudioFile.objects.filter(title=audio_file.name).first()
            if existing_audio and existing_audio.transcript:
                # Return existing transcript if we already have it
                return JsonResponse({
                    "status": "success", 
                    "transcript": existing_audio.transcript.content,
                    "message": "Retrieved existing transcript"
                })
            
            # If file doesn't exist or doesn't have transcript, process it
            fs = FileSystemStorage()
            filename = fs.save(audio_file.name, audio_file)
            file_path = fs.path(filename)

            # Process the file with Batchalign using Rev.ai
            transcript, diarization_data = process_audio(file_path)

            # Save results to the database
            if transcript:
                if existing_audio:
                    # Update existing record
                    existing_audio.audio_file = audio_file
                    existing_audio.save()
                    if hasattr(existing_audio, 'transcript'):
                        existing_audio.transcript.content = transcript
                        existing_audio.transcript.diarization_data = diarization_data
                        existing_audio.transcript.save()
                    else:
                        Transcript.objects.create(
                            audio=existing_audio, 
                            content=transcript, 
                            diarization_data=diarization_data
                        )
                else:
                    # Create new record
                    audio = AudioFile.objects.create(title=audio_file.name, audio_file=audio_file)
                    Transcript.objects.create(
                        audio=audio, 
                        content=transcript, 
                        diarization_data=diarization_data
                    )
                return JsonResponse({"status": "success", "transcript": transcript})
            else:
                return JsonResponse({
                    "status": "error", 
                    "message": "Audio processing failed. Please make sure your Rev.ai API key is set up correctly."
                })
        
        elif request.FILES.getlist("input_folder"):
            files = request.FILES.getlist("input_folder")
            results = []
            for file in files:
                # Check for existing file
                existing_audio = AudioFile.objects.filter(title=file.name).first()
                if existing_audio and existing_audio.transcript:
                    results.append({
                        "file": file.name, 
                        "status": "success",
                        "message": "Retrieved existing transcript"
                    })
                    continue

                fs = FileSystemStorage()
                filename = fs.save(file.name, file)
                file_path = fs.path(filename)
                
                # Process each file with Batchalign using Rev.ai
                transcript, diarization_data = process_audio(file_path)

                if transcript:
                    if existing_audio:
                        existing_audio.audio_file = file
                        existing_audio.save()
                        if hasattr(existing_audio, 'transcript'):
                            existing_audio.transcript.content = transcript
                            existing_audio.transcript.diarization_data = diarization_data
                            existing_audio.transcript.save()
                        else:
                            Transcript.objects.create(
                                audio=existing_audio, 
                                content=transcript, 
                                diarization_data=diarization_data
                            )
                    else:
                        audio = AudioFile.objects.create(title=file.name, audio_file=file)
                        Transcript.objects.create(
                            audio=audio, 
                            content=transcript, 
                            diarization_data=diarization_data
                        )
                    results.append({"file": file.name, "status": "success"})
                else:
                    results.append({"file": file.name, "status": "error"})
            return JsonResponse({"status": "batch_completed", "results": results})

    return render(request, "batch_processor/upload.html")