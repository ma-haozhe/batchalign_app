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
            
            # Handle both formats: 'mappings' (from speaker_mapping.js) or 'speaker_mapping' (from transcript_player.html)
            mappings = data.get('mappings', {})
            if not mappings and 'speaker_mapping' in data:
                # Convert simple format to the detailed format
                for speaker, role in data['speaker_mapping'].items():
                    mappings[speaker] = {
                        'role': role,
                        'display_name': role
                    }
            
            if not mappings:
                raise ValueError("No speaker mappings provided in request")
                
            # Update or create speaker mappings
            transcript.speaker_mapping.all().delete()  # Remove old mappings
            
            # Collect all speakers for header
            participants = []
            for original_id, mapping in mappings.items():
                # Handle both object format and string format
                if isinstance(mapping, dict):
                    role = mapping.get('role', '')
                    display_name = mapping.get('display_name', role)
                else:
                    # If it's a simple string
                    role = mapping
                    display_name = mapping
                
                speaker_map = SpeakerMap.objects.create(
                    original_id=original_id,
                    chat_role=role
                )
                transcript.speaker_mapping.add(speaker_map)
                participants.append(f"{role} {display_name}")
            
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
                            # Handle both object format and string format
                            if isinstance(mapping, dict):
                                role = mapping.get('role', '')
                                display_name = mapping.get('display_name', role)
                            else:
                                role = mapping
                                display_name = mapping
                                
                            updated_lines.append(f"@ID:\teng|corpus_name|{role}|||||{display_name}|||")
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
        # Load API keys from environment or .env file
        import os
        from pathlib import Path
        
        # Create .env file path
        env_path = Path(settings.BASE_DIR) / '.env'
        
        # First check environment variables
        rev_api_key = os.environ.get('REV_API_KEY', '')
        hf_token = os.environ.get('HF_TOKEN', '')
        
        # Then check .env file if it exists
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    if line.strip().startswith('REV_API_KEY='):
                        rev_api_key = line.strip().split('=', 1)[1].strip('"\'')
                    elif line.strip().startswith('HF_TOKEN='):
                        hf_token = line.strip().split('=', 1)[1].strip('"\'')
        
        if not rev_api_key:
            logger.error("Rev.ai API key is not set. Please set it in the settings page.")
            return None, None, None, None
            
        # Temporarily set environment variables for this process
        os.environ['REV_API_KEY'] = rev_api_key
        if hf_token:
            os.environ['HF_TOKEN'] = hf_token
                
        # Initialize the Rev.ai ASR engine with explicit API key parameter
        asr_engine = ba.RevEngine(key=rev_api_key, lang=lang)
        
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

def transcript_list(request):
    """View to list all processed audio files and their transcripts"""
    audio_files = AudioFile.objects.all().order_by('-uploaded_at')
    return render(request, 'batch_processor/list_files.html', {'audio_files': audio_files})

def view_transcript(request, transcript_id):
    """View to display a transcript with audio player"""
    try:
        transcript = Transcript.objects.get(id=transcript_id)
        audio_file = transcript.audio
        
        # Get speaker mappings - use a more detailed format compatible with the JS
        speaker_mappings = {sm.original_id: {"role": sm.chat_role, "display_name": sm.chat_role} for sm in transcript.speaker_mapping.all()}
        speaker_mappings_json = json.dumps(speaker_mappings)
        
        # Get all available speakers from various sources
        speakers = set()
        
        # 1. Get speakers from diarization data
        if transcript.diarization_data:
            speakers.update(seg['speaker'] for seg in transcript.diarization_data if seg.get('speaker'))
        
        # 2. Get speakers from existing speaker mappings
        speakers.update(sm.original_id for sm in transcript.speaker_mapping.all())
            
        # 3. Extract speakers from transcript content
        if transcript.chat_content:
            # Look for lines like "*MOT:" in the CHAT format
            for line in transcript.chat_content.split('\n'):
                if line.startswith('*') and ':' in line:
                    speaker = line[1:line.index(':')].strip()
                    if speaker:
                        speakers.add(speaker)
        
        # Convert to sorted list and create JSON
        speakers_list = sorted(list(speakers))
        speakers_json = json.dumps(speakers_list)
        
        # Get audio URL - Fix the audio URL path
        audio_url = None
        if audio_file and audio_file.audio_file:
            audio_url = audio_file.audio_file.url
            logger.debug(f"Audio URL for transcript {transcript_id}: {audio_url}")
            
            # Debug media file path - check if the file exists
            import os
            from django.conf import settings
            
            # Construct the actual file path on the server
            file_path = os.path.join(settings.MEDIA_ROOT, str(audio_file.audio_file))
            file_exists = os.path.isfile(file_path)
            file_size = os.path.getsize(file_path) if file_exists else 'N/A'
            logger.debug(f"Audio file path: {file_path}, exists: {file_exists}, size: {file_size}")
            
            # Add MIME type detection
            import mimetypes
            content_type = mimetypes.guess_type(file_path)[0]
            logger.debug(f"Audio file MIME type: {content_type}")
            
            # Extract file extension
            file_ext = os.path.splitext(file_path)[1].lower()
            
            # Ensure proper MIME type mapping
            if file_ext == '.mp3' and not content_type:
                logger.debug("Adding explicit MP3 MIME type")
                content_type = 'audio/mpeg'
            elif file_ext == '.wav' and not content_type:
                logger.debug("Adding explicit WAV MIME type")
                content_type = 'audio/wav'
            
            # Make sure the audio URL is absolute
            if not audio_url.startswith('http') and not audio_url.startswith('/'):
                audio_url = '/' + audio_url
                
            # Serve a direct file response if requested
            if request.GET.get('direct') == '1':
                logger.debug(f"Serving direct file: {file_path}")
                from django.http import FileResponse
                response = FileResponse(open(file_path, 'rb'), content_type=content_type)
                response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
                return response
        
        # Prepare diarization data in correct format
        diarization_data = []
        if transcript.diarization_data:
            for segment in transcript.diarization_data:
                diarization_data.append({
                    'start': segment.get('start', 0),
                    'end': segment.get('end', 0),
                    'speaker': segment.get('speaker', ''),
                    'text': segment.get('text', ''),
                    'confidence': segment.get('confidence', 1.0)
                })
        diarization_data_json = json.dumps(diarization_data)
        
        # Prepare missing segments JSON if available
        missing_segments = transcript.missing_segments or []
        missing_segments_json = json.dumps(missing_segments)
        
        # Debug information
        logger.debug(f"Transcript {transcript_id} content length: {len(transcript.chat_content) if transcript.chat_content else 0}")
        logger.debug(f"Found {len(missing_segments)} missing segments")
        logger.debug(f"Diarization processed: {transcript.pyannote_processed}")
        
        # Add more debug logs to help diagnose issues
        if transcript.chat_content:
            logger.debug(f"CHAT content first 100 chars: {transcript.chat_content[:100]}")
        else:
            logger.debug("CHAT content is empty")
            
        if audio_url:
            logger.debug(f"Audio URL: {audio_url}")
        else:
            logger.debug("Audio URL is empty")
        
        # Ensure transcript format is set
        if not transcript.format:
            transcript.format = 'CHAT'
            transcript.save()
        
        context = {
            'transcript': transcript,
            'audio_file': audio_file,
            'speaker_mappings': speaker_mappings_json,
            'speakers_json': speakers_json,
            'audio_url': audio_url,
            'diarization_data': diarization_data_json,
            'missing_segments': missing_segments_json,
            'chat_content': transcript.chat_content,
            'raw_content': transcript.raw_content
        }
        
        return render(request, 'batch_processor/transcript_player.html', context)
    except Transcript.DoesNotExist:
        return redirect('transcript_list')

def settings_view(request):
    """View to display and update API settings"""
    # Check if API keys are set, either in environment or settings file
    import os
    from pathlib import Path
    
    # Create .env file path
    env_path = Path(settings.BASE_DIR) / '.env'
    
    # First check environment variables
    hf_token = os.environ.get('HF_TOKEN', '')
    rev_api_key = os.environ.get('REV_API_KEY', '')
    
    # Then check .env file if it exists
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip().startswith('HF_TOKEN='):
                    hf_token = line.strip().split('=', 1)[1].strip('"\'')
                elif line.strip().startswith('REV_API_KEY='):
                    rev_api_key = line.strip().split('=', 1)[1].strip('"\'')
    
    # Mask the keys for display if they exist
    masked_hf_token = mask_key(hf_token) if hf_token else ''
    masked_rev_api_key = mask_key(rev_api_key) if rev_api_key else ''
    
    context = {
        'hf_token_set': bool(hf_token),
        'rev_api_key_set': bool(rev_api_key),
        'masked_hf_token': masked_hf_token,
        'masked_rev_api_key': masked_rev_api_key
    }
    
    return render(request, 'batch_processor/settings.html', context)

def mask_key(key):
    """Mask an API key for display, showing only first 4 and last 4 characters"""
    if not key or len(key) < 8:
        return '****'
    
    return key[:4] + '****' + key[-4:]

def set_hf_token(request):
    """Handle AJAX requests to set Hugging Face token"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            token = data.get('token', '')
            
            if not token:
                return JsonResponse({'status': 'error', 'message': 'Token is required'})
            
            # Save to .env file
            save_to_env_file('HF_TOKEN', token)
            
            # Also set in current environment
            os.environ['HF_TOKEN'] = token
            
            return JsonResponse({'status': 'success'})
        except Exception as e:
            logger.error(f"Error setting HF token: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def set_rev_api_key(request):
    """Handle AJAX requests to set Rev.ai API key"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            api_key = data.get('api_key', '')
            
            if not api_key:
                return JsonResponse({'status': 'error', 'message': 'API key is required'})
            
            # Save to .env file
            save_to_env_file('REV_API_KEY', api_key)
            
            # Also set in current environment
            os.environ['REV_API_KEY'] = api_key
            
            return JsonResponse({'status': 'success'})
        except Exception as e:
            logger.error(f"Error setting Rev.ai API key: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def get_api_keys(request):
    """Return masked API keys for display"""
    if request.method == 'GET':
        try:
            import os
            from pathlib import Path
            
            # Create .env file path
            env_path = Path(settings.BASE_DIR) / '.env'
            
            # First check environment variables
            hf_token = os.environ.get('HF_TOKEN', '')
            rev_api_key = os.environ.get('REV_API_KEY', '')
            
            # Then check .env file if it exists
            if env_path.exists():
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.strip().startswith('HF_TOKEN='):
                            hf_token = line.strip().split('=', 1)[1].strip('"\'')
                        elif line.strip().startswith('REV_API_KEY='):
                            rev_api_key = line.strip().split('=', 1)[1].strip('"\'')
            
            # Mask the keys for display
            masked_hf_token = mask_key(hf_token) if hf_token else ''
            masked_rev_api_key = mask_key(rev_api_key) if rev_api_key else ''
            
            return JsonResponse({
                'status': 'success',
                'hf_token': masked_hf_token,
                'rev_api_key': masked_rev_api_key,
                'hf_token_set': bool(hf_token),
                'rev_api_key_set': bool(rev_api_key)
            })
        except Exception as e:
            logger.error(f"Error getting API keys: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def save_to_env_file(key, value):
    """Save key-value pair to .env file"""
    from pathlib import Path
    
    env_path = Path(settings.BASE_DIR) / '.env'
    
    # Read existing content
    lines = []
    key_exists = False
    
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip().startswith(f'{key}='):
                    lines.append(f'{key}="{value}"\n')
                    key_exists = True
                else:
                    lines.append(line)
    
    # Add new key if not exists
    if not key_exists:
        lines.append(f'{key}="{value}"\n')
    
    # Write back to file
    with open(env_path, 'w') as f:
        f.writelines(lines)
    
    logger.info(f"Saved {key} to .env file")
    
# Direct media access view
def direct_media_access(request, file_path):
    """Serve media files directly with proper content type"""
    import os
    from django.http import FileResponse, Http404
    import mimetypes
    
    # Construct the full path to the media file
    full_path = os.path.join(settings.MEDIA_ROOT, file_path)
    
    # Security check - ensure the path is within MEDIA_ROOT
    if not full_path.startswith(settings.MEDIA_ROOT):
        logger.error(f"Security violation: attempted access to {full_path}")
        raise Http404("File not found")
    
    # Check if the file exists
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        logger.error(f"File not found: {full_path}")
        raise Http404("File not found")
    
    # Determine the content type
    content_type = mimetypes.guess_type(full_path)[0]
    
    # For audio files, ensure proper content type
    ext = os.path.splitext(full_path)[1].lower()
    if ext == '.mp3' and not content_type:
        content_type = 'audio/mpeg'
    elif ext == '.wav' and not content_type:
        content_type = 'audio/wav'
    elif ext == '.m4a' and not content_type:
        content_type = 'audio/mp4'
    
    # Log the file access
    logger.debug(f"Serving media file: {full_path} with content-type: {content_type}")
    
    # Serve the file with proper content type
    try:
        response = FileResponse(open(full_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(full_path)}"'
        return response
    except Exception as e:
        logger.error(f"Error serving file {full_path}: {e}")
        raise Http404("Error accessing file")
def run_pyannote_diarization(request, transcript_id):
    """Process audio file with Pyannote for speaker diarization"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Only POST method is allowed'})
    
    try:
        from .views_pyannote import process_with_pyannote
        
        transcript = Transcript.objects.get(id=transcript_id)
        audio_file = transcript.audio
        
        # Check if audio file exists
        if not audio_file or not audio_file.audio_file:
            return JsonResponse({'success': False, 'message': 'Audio file not found'})
        
        # Get audio file path
        audio_path = audio_file.audio_file.path
        
        # Check if Hugging Face token is set
        hf_token = get_hf_token()
        if not hf_token:
            return JsonResponse({
                'success': False, 
                'message': 'Hugging Face token is not set. Please set it in settings.'
            })
        
        # Run Pyannote
        diarization_data, missing_segments = process_with_pyannote(audio_path, hf_token, transcript)
        
        if diarization_data is None:
            return JsonResponse({
                'success': False, 
                'message': 'Failed to process audio with Pyannote. Check logs for details.'
            })
        
        # Update transcript with diarization data
        transcript.diarization_data = diarization_data
        transcript.missing_segments = missing_segments
        transcript.pyannote_processed = True
        transcript.save()
        
        return JsonResponse({
            'success': True, 
            'message': 'Speaker diarization completed successfully',
            'diarization_count': len(diarization_data),
            'missing_segments_count': len(missing_segments)
        })
        
    except Transcript.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Transcript not found'})
    except Exception as e:
        logger.exception(f"Error processing audio with Pyannote: {e}")
        return JsonResponse({'success': False, 'message': str(e)})

def get_hf_token():
    """Get Hugging Face token from environment or .env file"""
    import os
    from pathlib import Path
    
    # First check environment variables
    hf_token = os.environ.get('HF_TOKEN', '')
    
    # Then check .env file if token not in environment
    if not hf_token:
        env_path = Path(settings.BASE_DIR) / '.env'
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    if line.strip().startswith('HF_TOKEN='):
                        hf_token = line.strip().split('=', 1)[1].strip('"\'')
                        break
    
    return hf_token

def update_missing_segment(request, transcript_id):
    """Update the text for a missing segment"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Only POST method is allowed'})
    
    try:
        data = json.loads(request.body)
        segment_id = data.get('segment_id')
        text = data.get('text', '')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        speaker = data.get('speaker', '')
        
        if not segment_id or not text:
            return JsonResponse({'success': False, 'message': 'Missing required parameters'})
        
        transcript = Transcript.objects.get(id=transcript_id)
        
        # Get current missing segments
        missing_segments = transcript.missing_segments or []
        
        # Find and update the segment
        segment_found = False
        for segment in missing_segments:
            if segment.get('id') == segment_id:
                segment['text'] = text
                segment_found = True
                break
        
        # If not found by ID, try to find by time and speaker
        if not segment_found and start_time and end_time:
            for segment in missing_segments:
                if (str(segment.get('start')) == str(start_time) and 
                    str(segment.get('end')) == str(end_time) and
                    segment.get('speaker') == speaker):
                    segment['text'] = text
                    segment['id'] = segment_id  # Add ID for future reference
                    segment_found = True
                    break
        
        # If still not found, add as new segment
        if not segment_found and start_time and end_time:
            missing_segments.append({
                'id': segment_id,
                'start': int(start_time),
                'end': int(end_time),
                'speaker': speaker,
                'text': text
            })
        
        # Update the transcript
        transcript.missing_segments = missing_segments
        transcript.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Segment updated successfully',
            'speaker': speaker
        })
        
    except Transcript.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Transcript not found'})
    except Exception as e:
        logger.exception(f"Error updating missing segment: {e}")
        return JsonResponse({'success': False, 'message': str(e)})