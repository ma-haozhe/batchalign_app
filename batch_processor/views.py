#Haozhe Ma 2024-Dec-11
#____________________________

import os, logging
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from .models import AudioFile, Transcript, SpeakerMap
from django.core.files.storage import FileSystemStorage
import batchalign as ba
import json
from pathlib import Path
import shutil
from django.conf import settings
import mimetypes

logger = logging.getLogger('batch_processor')

def home(request):
    return render(request, 'batch_processor/home.html')

def ensure_media_dir():
    """Ensure media directory exists"""
    media_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
    os.makedirs(media_dir, exist_ok=True)
    return media_dir

def save_uploaded_file(uploaded_file):
    """Save uploaded file to MEDIA_ROOT/uploads and return the file path"""
    media_dir = ensure_media_dir()
    file_path = os.path.join(media_dir, uploaded_file.name)
    
    with open(file_path, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
    
    return file_path

def update_speaker_mapping(request, transcript_id):
    """Handle AJAX requests to update speaker mapping"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            transcript = Transcript.objects.get(id=transcript_id)
            mappings = data.get('mappings', {})
            
            # Update or create speaker mappings
            transcript.speaker_mapping.all().delete()  # Remove old mappings
            
            # Collect all speakers for header
            participants = []
            for original_id, mapping in mappings.items():
                speaker_map = SpeakerMap.objects.create(
                    original_id=original_id,
                    chat_role=mapping['role']
                )
                transcript.speaker_mapping.add(speaker_map)
                participants.append(f"{mapping['role']} {mapping.get('display_name', mapping['role'])}")
            
            # Update the header in chat_content
            lines = transcript.chat_content.split('\n')
            updated_lines = []
            header_updated = {'participants': False, 'ids': False}
            
            for line in lines:
                if line.startswith('@Participants:'):
                    updated_lines.append('@Participants:\t' + ', '.join(participants))
                    header_updated['participants'] = True
                elif line.startswith('@ID:'):
                    if not header_updated['ids']:
                        # Add @ID lines for all speakers
                        for original_id, mapping in mappings.items():
                            role = mapping['role']
                            updated_lines.append(f"@ID:\teng|corpus_name|{role}|||||{mapping.get('display_name', role)}|||")
                        header_updated['ids'] = True
                elif not (line.startswith('@ID:') and header_updated['ids']):
                    updated_lines.append(line)
            
            transcript.chat_content = '\n'.join(updated_lines)
            transcript.save()
            
            return JsonResponse({
                'status': 'success',
                'chat_content': transcript.get_chat_content()
            })
        except Exception as e:
            logger.error(f"Error updating speaker mapping: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)})
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def process_audio(audio_file_path, lang="eng"):
    try:
        # Initialize the Rev.ai ASR engine
        asr_engine = ba.RevEngine(lang=lang)
        
        # Create a Batchalign pipeline
        nlp = ba.BatchalignPipeline(asr_engine)
        
        # Process the audio file
        doc = nlp(audio_file_path)
        
        # Get both raw transcript and CHAT format
        raw_content = doc.transcript(include_tiers=True, strip=False)
        
        # Create CHAT file from the document
        chat_file = ba.CHATFile(doc=doc)
        chat_content = str(chat_file)
        
        # Extract speakers from CHAT content since it's properly formatted
        speakers = extract_speakers_from_raw(chat_content)
        if not speakers:  # Fallback to diarization data if no speakers found
            diarization_data = doc.segments if hasattr(doc, "segments") else []
            speakers = list(set(seg['speaker'] for seg in diarization_data)) if diarization_data else []
            
        logger.info(f"Extracted {len(speakers)} speakers from audio: {speakers}")
        
        return raw_content, chat_content, doc.segments if hasattr(doc, "segments") else None, speakers
    except Exception as e:
        logger.error(f"Batchalign processing error: {e}")
        return None, None, None, None

def download_chat(request, file_id):
    try:
        audio_file = AudioFile.objects.get(id=file_id)
        transcript = audio_file.transcript
        
        if not transcript or not transcript.chat_content:
            return JsonResponse({"status": "error", "message": "CHAT format not available"})
        
        # Create response with CHAT content
        chat_content = transcript.get_chat_content()  # Get mapped content
        response = HttpResponse(chat_content, content_type='text/plain')
        response['Content-Disposition'] = f'attachment; filename="{audio_file.title}.cha"'
        return response
    except AudioFile.DoesNotExist:
        return JsonResponse({"status": "error", "message": "File not found"})

def extract_speakers_from_raw(raw_content):
    """Extract speakers from raw transcript content"""
    speakers = set()
    lines = raw_content.split('\n')
    
    logger.debug(f"Extracting speakers from raw content starting with: {lines[:3]}")
    
    # First try to get speakers from @Participants line
    for line in lines:
        if line.startswith('@Participants:'):
            logger.debug(f"Found @Participants line: {line}")
            # Parse participants line (e.g. "@Participants: MOT Mother, CHI Child")
            parts = line.replace('@Participants:', '').strip().split(',')
            for part in parts:
                if part.strip():
                    speaker = part.strip().split()[0]  # Get first word (e.g. "MOT" from "MOT Mother")
                    speakers.add(speaker)
            if speakers:  # If we found speakers in @Participants, use those
                logger.info(f"Found speakers from @Participants: {list(speakers)}")
                return list(speakers)
    
    # If no @Participants line or no speakers found, try utterance lines
    for line in lines:
        if line.startswith('*'):
            speaker = line.split(':')[0].replace('*', '').strip()
            if speaker:
                speakers.add(speaker)
    
    logger.info(f"Found speakers from utterances: {list(speakers)}")
    return list(speakers)

def extract_speakers_from_chat(content):
    """Extract speakers and their roles from CHAT format content"""
    speakers_info = {}
    lines = content.split('\n')
    
    logger.debug(f"Extracting speakers from CHAT content starting with: {lines[:3]}")
    
    # First get the full participant information
    for line in lines:
        if line.startswith('@Participants:'):
            logger.debug(f"Found @Participants line: {line}")
            parts = line.replace('@Participants:', '').strip().split(',')
            for part in parts:
                if part.strip():
                    words = part.strip().split()
                    if len(words) >= 2:
                        speaker_id = words[0]
                        display_name = ' '.join(words[1:])
                        speakers_info[speaker_id] = {
                            'role': speaker_id,
                            'display_name': display_name
                        }
    
    # If no @Participants line, try to get speakers from utterance lines
    if not speakers_info:
        logger.debug("No @Participants line found, checking utterance lines")
        for line in lines:
            if line.startswith('*'):
                speaker = line.split(':')[0].replace('*', '').strip()
                if speaker and speaker not in speakers_info:
                    speakers_info[speaker] = {
                        'role': '',
                        'display_name': speaker
                    }
    
    logger.info(f"Extracted speakers info: {speakers_info}")
    return speakers_info

def get_existing_mappings(transcript):
    """Get existing speaker mappings for a transcript"""
    mappings = {}
    for mapping in transcript.speaker_mapping.all():
        mappings[mapping.original_id] = {
            'role': mapping.chat_role,
            'display_name': mapping.chat_role  # Use chat_role for backward compatibility
        }
    return mappings

def ensure_chat_content(transcript, doc=None):
    """Ensure transcript has CHAT format content"""
    if not transcript.chat_content and transcript.raw_content:
        try:
            if doc is None:
                # Create a new document from raw content
                doc = ba.Document()
                # Parse header information
                header_info = {'participants': {}, 'media': '', 'languages': ['eng']}
                lines = transcript.raw_content.split('\n')
                
                for line in lines:
                    if line.startswith('@Participants:'):
                        parts = line.replace('@Participants:', '').strip().split(',')
                        for part in parts:
                            if part.strip():
                                words = part.strip().split()
                                if len(words) >= 2:
                                    header_info['participants'][words[0]] = ' '.join(words[1:])
                    elif line.startswith('@Media:'):
                        header_info['media'] = line.replace('@Media:', '').strip().split(',')[0]
                    elif line.startswith('@Languages:'):
                        header_info['languages'] = [lang.strip() for lang in line.replace('@Languages:', '').strip().split(',')]
                
                # Add utterances
                for line in transcript.raw_content.split('\n'):
                    if line.startswith('*'):
                        speaker = line.split(':')[0].replace('*', '').strip()
                        text = ':'.join(line.split(':')[1:]).strip()
                        doc.add_utterance(ba.Utterance(
                            text=text,
                            speaker=speaker
                        ))
                
                # Update header information
                doc.metadata.update({
                    'languages': header_info['languages'],
                    'participants': header_info['participants'] or {},
                    'media_file': header_info['media'] or transcript.audio.title
                })
            
            # Generate CHAT format with updated header
            chat_file = ba.CHATFile(doc=doc)
            transcript.chat_content = str(chat_file)
            transcript.save()
        except Exception as e:
            logger.error(f"Error generating CHAT content: {e}")

def is_chat_file(file_obj):
    """Check if a file is a CHAT format text file"""
    try:
        # Try to detect by extension first
        if file_obj.name.lower().endswith('.cha'):
            logger.debug(f"File {file_obj.name} identified as CHAT file by extension")
            return True
            
        # Try to read as text and check content
        content_start = file_obj.read(1024).decode('utf-8')
        file_obj.seek(0)  # Reset file pointer
        is_chat = content_start.startswith('@UTF8') or '@Begin' in content_start.split('\n')[:3]
        logger.debug(f"File {file_obj.name} CHAT detection by content: {is_chat}")
        logger.debug(f"Content start: {content_start[:100]}")  # Show first 100 chars
        return is_chat
    except UnicodeDecodeError:
        logger.debug(f"File {file_obj.name} is not a text file (UnicodeDecodeError)")
        return False
    except Exception as e:
        logger.error(f"Error checking if {file_obj.name} is CHAT file: {e}")
        return False

def create_default_speaker_mapping(speaker):
    """Create a default speaker mapping entry"""
    if speaker.startswith('PAR'):  # If it's a PAR0, PAR1 style speaker
        num = speaker[3:]  # Get the number
        return {
            'role': '',  # Empty for user to fill
            'display_name': ''  # Using the same value as role
        }
    return {
        'role': '',
        'display_name': ''  # Using the same value as role
    }

def upload_audio(request):
    if request.method == "POST":
        if "audio_file" in request.FILES:
            audio_file = request.FILES["audio_file"]
            logger.info(f"Processing single file upload: {audio_file.name}")
            
            try:
                # Check if file with same name exists
                existing_audio = AudioFile.objects.filter(title=audio_file.name).first()
                if existing_audio and existing_audio.transcript:
                    logger.info(f"Found existing transcript for {audio_file.name}")
                    transcript = existing_audio.transcript
                    ensure_chat_content(transcript)
                    content_to_parse = transcript.chat_content if transcript.chat_content else transcript.raw_content
                    logger.debug(f"Content being parsed for speakers: {content_to_parse[:200]}")  # First 200 chars
                    speakers = extract_speakers_from_raw(content_to_parse)
                    logger.info(f"Extracted speakers from existing transcript: {speakers}")
                    existing_mappings = get_existing_mappings(transcript)
                    logger.debug(f"Existing speaker mappings: {existing_mappings}")
                    
                    return JsonResponse({
                        "status": "success", 
                        "raw_content": transcript.raw_content,
                        "chat_content": transcript.chat_content,
                        "speakers": speakers,
                        "existing_mappings": existing_mappings,
                        "transcript_id": transcript.id,
                        "message": "Retrieved existing transcript"
                    })

                # Check if it's a CHAT file
                is_chat = is_chat_file(audio_file)
                logger.debug(f"File {audio_file.name} is_chat_file: {is_chat}")

                if is_chat:
                    # Handle CHAT file upload
                    content = audio_file.read().decode('utf-8')
                    audio_file.seek(0)
                    speakers_info = extract_speakers_from_chat(content)
                    logger.info(f"Processing CHAT file with speakers: {list(speakers_info.keys())}")
                    
                    # Create new records
                    audio = AudioFile.objects.create(title=audio_file.name)
                    audio.audio_file.save(audio_file.name, audio_file, save=True)
                    
                    transcript = Transcript.objects.create(
                        audio=audio,
                        raw_content='',  # No raw content for CHAT files
                        chat_content=content,
                        diarization_data=None
                    )
                    
                    logger.debug(f"Created transcript with id {transcript.id}")
                    return JsonResponse({
                        "status": "success",
                        "raw_content": '',
                        "chat_content": content,
                        "speakers": list(speakers_info.keys()),
                        "existing_mappings": speakers_info,
                        "transcript_id": transcript.id
                    })
                else:
                    # Handle audio file upload
                    logger.info(f"Processing audio file: {audio_file.name}")
                    file_path = save_uploaded_file(audio_file)
                    raw_content, chat_content, diarization_data, speakers = process_audio(file_path)
                    
                    if raw_content and chat_content:
                        logger.info(f"Successfully processed audio with speakers: {speakers}")
                        logger.debug(f"Raw content preview: {raw_content[:200]}")
                        logger.debug(f"Chat content preview: {chat_content[:200]}")
                        
                        # Create default speaker mappings
                        speaker_mappings = {
                            speaker: create_default_speaker_mapping(speaker)
                            for speaker in (speakers or [])
                        }
                        logger.debug(f"Created default speaker mappings: {speaker_mappings}")
                        
                        if existing_audio:
                            existing_audio.audio_file.save(audio_file.name, audio_file, save=False)
                            existing_audio.save()
                            if hasattr(existing_audio, 'transcript'):
                                existing_audio.transcript.raw_content = raw_content
                                existing_audio.transcript.chat_content = chat_content
                                existing_audio.transcript.diarization_data = diarization_data
                                existing_audio.transcript.save()
                                transcript = existing_audio.transcript
                            else:
                                transcript = Transcript.objects.create(
                                    audio=existing_audio, 
                                    raw_content=raw_content,
                                    chat_content=chat_content,
                                    diarization_data=diarization_data
                                )
                        else:
                            audio = AudioFile.objects.create(title=audio_file.name)
                            audio.audio_file.save(audio_file.name, audio_file, save=True)
                            transcript = Transcript.objects.create(
                                audio=audio, 
                                raw_content=raw_content,
                                chat_content=chat_content,
                                diarization_data=diarization_data
                            )
                        
                        logger.debug(f"Created/updated transcript with id {transcript.id}")
                        return JsonResponse({
                            "status": "success", 
                            "raw_content": raw_content,
                            "chat_content": chat_content,
                            "speakers": speakers or [],  # Ensure we always send a list
                            "existing_mappings": speaker_mappings,
                            "transcript_id": transcript.id
                        })
                    else:
                        logger.error("Audio processing failed - no content generated")
                        return JsonResponse({
                            "status": "error", 
                            "message": "Audio processing failed. Please make sure your Rev.ai API key is set up correctly."
                        })
            except Exception as e:
                logger.exception(f"Error processing file {audio_file.name}: {str(e)}")
                return JsonResponse({
                    "status": "error",
                    "message": f"Error processing file: {str(e)}"
                })
        
        elif request.FILES.getlist("input_folder"):
            files = request.FILES.getlist("input_folder")
            logger.info(f"Processing batch upload of {len(files)} files")
            results = []
            for file in files:
                try:
                    # Check for existing file
                    existing_audio = AudioFile.objects.filter(title=file.name).first()
                    if existing_audio and existing_audio.transcript:
                        transcript = existing_audio.transcript
                        ensure_chat_content(transcript)
                        speakers = extract_speakers_from_raw(transcript.raw_content)
                        results.append({
                            "file": file.name, 
                            "status": "success",
                            "message": "Retrieved existing transcript",
                            "transcript_id": transcript.id,
                            "speakers": speakers,
                            "existing_mappings": get_existing_mappings(transcript)
                        })
                        continue
                    
                    # Save and process the file
                    file_path = save_uploaded_file(file)
                    raw_content, chat_content, diarization_data, speakers = process_audio(file_path)

                    if raw_content and chat_content:
                        if existing_audio:
                            existing_audio.audio_file.save(file.name, file, save=False)
                            existing_audio.save()
                            if hasattr(existing_audio, 'transcript'):
                                existing_audio.transcript.raw_content = raw_content
                                existing_audio.transcript.chat_content = chat_content
                                existing_audio.transcript.diarization_data = diarization_data
                                existing_audio.transcript.save()
                                transcript = existing_audio.transcript
                            else:
                                transcript = Transcript.objects.create(
                                    audio=existing_audio, 
                                    raw_content=raw_content,
                                    chat_content=chat_content,
                                    diarization_data=diarization_data
                                )
                        else:
                            audio = AudioFile.objects.create(title=file.name)
                            audio.audio_file.save(file.name, file, save=True)
                            transcript = Transcript.objects.create(
                                audio=audio, 
                                raw_content=raw_content,
                                chat_content=chat_content,
                                diarization_data=diarization_data
                            )
                        results.append({
                            "file": file.name, 
                            "status": "success",
                            "transcript_id": transcript.id,
                            "speakers": speakers
                        })
                    else:
                        results.append({
                            "file": file.name, 
                            "status": "error",
                            "message": "Processing failed"
                        })
                except Exception as e:
                    results.append({
                        "file": file.name,
                        "status": "error",
                        "message": str(e)
                    })
            
            return JsonResponse({"status": "batch_completed", "results": results})

    return render(request, "batch_processor/upload.html")

def clear_cache(request):
    """Clear all processed files and their data"""
    if request.method == "POST":
        try:
            # Delete all database records
            AudioFile.objects.all().delete()
            Transcript.objects.all().delete()
            SpeakerMap.objects.all().delete()
            
            # Clear media directory
            media_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
            if os.path.exists(media_dir):
                shutil.rmtree(media_dir)
                os.makedirs(media_dir)  # Recreate empty directory
            
            return JsonResponse({
                "status": "success",
                "message": "Successfully cleared all processed files and data"
            })
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": f"Error clearing cache: {str(e)}"
            })
    return JsonResponse({
        "status": "error",
        "message": "Invalid request method"
    })