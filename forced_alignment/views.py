import os
import json
import logging
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.contrib import messages

from batch_processor.models import Transcript
from .models import ForcedAlignmentTask

# Configure logging
logger = logging.getLogger(__name__)

def index(request):
    """
    Main page for forced alignment feature.
    Shows a list of transcripts that can be force-aligned and existing alignment tasks.
    """
    # Get all transcripts that are available for alignment
    transcripts = Transcript.objects.all()
    
    # Get all alignment tasks
    alignment_tasks = ForcedAlignmentTask.objects.all()
    
    context = {
        'transcripts': transcripts,
        'alignment_tasks': alignment_tasks
    }
    
    return render(request, 'forced_alignment/index.html', context)

def alignment_detail(request, task_id):
    """
    Detail view for a specific alignment task.
    Shows the results of the alignment with word-level timestamps.
    """
    task = get_object_or_404(ForcedAlignmentTask, id=task_id)
    
    context = {
        'task': task
    }
    
    return render(request, 'forced_alignment/detail.html', context)

@csrf_exempt
def start_alignment(request):
    """
    API endpoint to start a forced alignment task.
    Takes a transcript ID and alignment engine as input.
    Returns the ID of the created task.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            transcript_id = data.get('transcript_id')
            engine = data.get('engine', 'AUTO')
            
            if not transcript_id:
                return JsonResponse({'status': 'error', 'message': 'Transcript ID is required'})
            
            # Get the transcript
            transcript = get_object_or_404(Transcript, id=transcript_id)
            
            # Create a new alignment task
            task = ForcedAlignmentTask.objects.create(
                original_transcript=transcript,
                engine_used=engine,
                status='PENDING'
            )
            
            # In a production environment, we would queue this task with Celery
            # For now, we'll just submit it directly and handle it in the view
            # Submit the task to align_transcript function
            # align_transcript.delay(task.id)  # Using Celery
            
            # For now, let's just mark it as processing (in a real implementation, this would be async)
            task.status = 'PROCESSING'
            task.save()
            
            # Call the function that will handle the alignment (this should be async in production)
            # We'll implement this function next
            try:
                # This would be a Celery task in production
                process_alignment_task(task.id)
            except Exception as e:
                logger.error(f"Error in alignment process: {e}")
                task.status = 'FAILED'
                task.error_message = str(e)
                task.save()
                
            return JsonResponse({'status': 'success', 'task_id': task.id})
        except Exception as e:
            logger.error(f"Error starting alignment task: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def check_alignment_status(request, task_id):
    """
    API endpoint to check the status of an alignment task.
    """
    task = get_object_or_404(ForcedAlignmentTask, id=task_id)
    
    response = {
        'status': task.status,
        'created_at': task.created_at,
        'updated_at': task.updated_at
    }
    
    if task.status == 'FAILED' and task.error_message:
        response['error_message'] = task.error_message
    
    return JsonResponse(response)

def process_alignment_task(task_id):
    """
    Process a forced alignment task.
    This function should be called asynchronously (e.g., by Celery).
    """
    # Get the task
    task = ForcedAlignmentTask.objects.get(id=task_id)
    
    try:
        # Update task status
        task.status = 'PROCESSING'
        task.save()
        
        # Get the transcript
        transcript = task.original_transcript
        
        # Ensure audio file exists
        if not transcript.audio or not transcript.audio.audio_file:
            raise ValueError("No audio file associated with this transcript")
        
        audio_file_path = transcript.audio.audio_file.path
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found at path: {audio_file_path}")
        
        # Get the transcript text to align and handle different formats
        # For CHAT files, we'll need to load it properly for batchalign
        transcript_format = transcript.format
        transcript_text = transcript.get_segments()
        
        # Get the API keys
        rev_api_key = os.environ.get('REV_API_KEY', '')
        if not rev_api_key:
            # Try to get from .env file
            env_path = os.path.join(settings.BASE_DIR, '.env')
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.strip().startswith('REV_API_KEY='):
                            rev_api_key = line.strip().split('=', 1)[1].strip('"\'')
        
        if not rev_api_key:
            raise Exception("REV_API_KEY is not set. Please set it in the Settings page.")
            
        # Here we'll use the batchalign package to perform the forced alignment
        
        # Import batchalign here to avoid loading issues
        from batchalign.document import Document, Task, Utterance
        from batchalign.pipelines.dispatch import dispatch_pipeline
        from batchalign.formats import CHATFile  # Import CHATFile for processing .cha files
        
        # Configure batchalign with the Rev.ai API key
        os.environ['REV_API_KEY'] = rev_api_key
        
        # Handle different transcript formats
        if transcript.format == 'CHAT':
            # For CHAT format, we want to extract the text content for forced alignment
            texts = []
            for segment in transcript_text:
                if not segment.get('is_missing', False) and segment.get('text', '').strip():
                    # Strip any speaker markers (like *ABC:) from the lines
                    text = segment.get('text', '').strip()
                    if text.startswith('*') and ':' in text:
                        text = text.split(':', 1)[1].strip()
                    texts.append(text)
            
            # Create the document with audio and text
            document = Document.new(text=texts, media_path=audio_file_path)
            
            # Check for .cha files - both direct or with the same name as audio
            cha_path = audio_file_path + '.cha'
            # Also check for .cha files in the root directory with the same base name
            base_cha_path = os.path.join(settings.BASE_DIR, os.path.basename(audio_file_path).split('.')[0] + '.cha')
            
            if os.path.exists(cha_path):
                # Use CHATFile to load the .cha file and get a Document
                chatfile = CHATFile(path=cha_path)
                document = chatfile.doc
                # Update the media path since we need to explicitly set it
                document.media.url = audio_file_path
                logger.info(f"Loaded .cha file from {cha_path}")
            elif os.path.exists(base_cha_path):
                # Use CHATFile to load the .cha file from the root directory
                chatfile = CHATFile(path=base_cha_path)
                document = chatfile.doc
                # Update the media path since we need to explicitly set it
                document.media.url = audio_file_path
                logger.info(f"Loaded .cha file from {base_cha_path}")
            else:
                logger.info("No corresponding .cha file found, using transcript text")
        else:
            # For other formats (like raw transcripts), just use the text as-is
            texts = []
            for segment in transcript_text:
                if not segment.get('is_missing', False) and segment.get('text', '').strip():
                    texts.append(segment.get('text', ''))
            
            # Create the document with audio and text
            document = Document.new(text=texts, media_path=audio_file_path)
        
        # Choose the appropriate engine based on task.engine_used
        engine = task.engine_used
        pipeline_str = "fa"  # Base pipeline string for forced alignment
        lang = "eng"  # Default to English
        
        # Set up engine override if needed
        fa_override = None
        
        if engine == 'AUTO':
            # Default behavior is to use the dispatch_pipeline defaults
            # which is typically wav2vec for English, whisper for others
            logger.info("Using AUTO engine selection for forced alignment")
        elif engine == 'WHISPER':
            # Explicitly use Whisper for forced alignment
            fa_override = "whisper_fa"
            logger.info("Using Whisper engine for forced alignment")
        elif engine == 'WAV2VEC':
            # Explicitly use Wav2Vec for forced alignment
            fa_override = "wav2vec_fa"
            logger.info("Using Wav2Vec engine for forced alignment")
        else:
            # Default fallback
            fa_override = "wav2vec_fa"
            logger.info(f"Unknown engine type '{engine}', falling back to Wav2Vec")
        
        try:
            # Dispatch the pipeline
            # The dispatch_pipeline function takes a pipeline string and language
            if fa_override:
                pipeline = dispatch_pipeline(pipeline_str, lang, fa=fa_override)
            else:
                pipeline = dispatch_pipeline(pipeline_str, lang)
            
            logger.info(f"Processing document with {pipeline_str} pipeline")
            
            # Process the document
            aligned_document = pipeline.process(document)
            logger.info("Document processing complete")
        except Exception as e:
            logger.error(f"Error in pipeline processing: {str(e)}")
            raise Exception(f"Batchalign pipeline error: {str(e)}")
        
        # Extract the word-level timestamps from the aligned document
        word_timestamps = []
        aligned_words_count = 0
        utterance_count = 0
        
        # Iterate through each utterance in the aligned document
        for utterance in aligned_document.content:
            # Skip non-utterance items
            if not isinstance(utterance, Utterance):
                continue
                
            utterance_count += 1
            
            # Check if the utterance has tokens
            if not hasattr(utterance, 'tokens') or not utterance.tokens:
                logger.warning(f"Utterance found with no tokens: '{utterance}'")
                continue
            
            # Track utterance start time for relative positioning
            utterance_start_ms = None
            if hasattr(utterance, 'start_ms') and utterance.start_ms is not None:
                utterance_start_ms = utterance.start_ms
            
            # Process each token in the utterance
            for token in utterance.tokens:
                # Skip tokens without timing information
                if not hasattr(token, 'start_ms') or not hasattr(token, 'end_ms'):
                    continue
                
                # Handle potential None values or missing attributes
                if token.start_ms is None or token.end_ms is None:
                    continue
                
                # Skip punctuation and empty tokens
                if not token.text or token.text.strip() in ".,;:!?\"'()[]{}":
                    continue
                    
                # Convert milliseconds to seconds for the UI
                start_sec = token.start_ms / 1000.0
                end_sec = token.end_ms / 1000.0
                
                # Validate the timing (end should be after start)
                if end_sec <= start_sec:
                    # Fix invalid timing by adding a small duration
                    end_sec = start_sec + 0.1
                
                # Add to our results
                word_timestamps.append({
                    "word": token.text,
                    "start": start_sec,
                    "end": end_sec,
                    "utterance_id": utterance_count  # Track which utterance this belongs to
                })
                
                aligned_words_count += 1
                
        # Sort by start time to ensure chronological order
        word_timestamps.sort(key=lambda x: x['start'])
                
        # Log the results
        logger.info(f"Successfully aligned {aligned_words_count} words across {utterance_count} utterances")
        
        # Update the task with the results
        task.word_timestamps = word_timestamps
        task.status = 'COMPLETED'
        task.save()
        
        return True
        
    except Exception as e:
        logger.error(f"Error in process_alignment_task: {e}")
        task.status = 'FAILED'
        task.error_message = str(e)
        task.save()
        return False
