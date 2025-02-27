# Haozhe Ma 2024-Dec-11
#____________________________

# Core functionality for the Batchalign web application.

# Steps:
# 1. Define models for storing audio files and transcripts.
# 2. Create views to handle file uploads and processing.
# 3. Integrate Batchalign for transcription and diarization.
# 4. Add test cases for each functionality to ensure correctness.

# This code will evolve as we build the application step by step.

from django.db import models

# Step 1: Define models

class SpeakerMap(models.Model):
    original_id = models.CharField(max_length=10)  # e.g. PAR0, PAR1
    chat_role = models.CharField(max_length=50)    # e.g. MOT, CHI
    
    def __str__(self):
        return f"{self.original_id} → {self.chat_role}"

class AudioFile(models.Model):
    title = models.CharField(max_length=200)
    audio_file = models.FileField(upload_to='uploads/', blank=True, null=True)
    input_folder = models.CharField(max_length=500, blank=True, null=True)  # Renamed for clarity
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    def is_batch_upload(self):
        return bool(self.input_folder)

class Transcript(models.Model):
    audio = models.OneToOneField(AudioFile, on_delete=models.CASCADE, related_name='transcript')
    raw_content = models.TextField(blank=True, null=True)  # Original Rev.ai output
    chat_content = models.TextField(blank=True, default='')  # CHAT format with default empty string
    diarization_data = models.JSONField(blank=True, null=True)  # Pyannote diarization output
    missing_segments = models.JSONField(blank=True, null=True)  # Segments with no ASR text
    speaker_mapping = models.ManyToManyField(SpeakerMap, blank=True)  # Link to speaker mappings
    created_at = models.DateTimeField(auto_now_add=True)
    pyannote_processed = models.BooleanField(default=False)  # Track if Pyannote has processed this file
    format = models.CharField(max_length=20, default='CHAT')  # Format of the transcript (CHAT, JSON, etc.)
    
    def __str__(self):
        return f"Transcript for {self.audio.title}"

    def get_chat_content(self):
        """Returns the CHAT format content with proper speaker mappings"""
        content = self.chat_content
        for speaker in self.speaker_mapping.all():
            content = content.replace(f"*{speaker.original_id}:", f"*{speaker.chat_role}:")
        return content
    
    def get_missing_segments(self):
        """Returns a list of time segments where there is diarization but no ASR text"""
        if not self.missing_segments:
            return []
        return self.missing_segments
    
    def get_diarization_timeline(self):
        """Returns the diarization timeline with mapped speaker labels"""
        if not self.diarization_data:
            return []
            
        timeline = []
        speaker_map = {sm.original_id: sm.chat_role for sm in self.speaker_mapping.all()}
        
        for segment in self.diarization_data:
            mapped_speaker = speaker_map.get(segment['speaker'], segment['speaker'])
            timeline.append({
                'start': segment['start'],
                'end': segment['end'],
                'speaker': mapped_speaker,
                'has_text': not any(ms['start'] == segment['start'] and ms['end'] == segment['end'] 
                                  for ms in (self.missing_segments or []))
            })
        
        return timeline
        
    def get_segments(self):
        """
        Returns a list of all segments in the transcript, including missing segments.
        Each segment will have the following attributes:
        - id: A unique identifier for the segment
        - text: The text content of the segment
        - start_ms: The start time in milliseconds
        - end_ms: The end time in milliseconds
        - speaker: The speaker label (if available)
        - is_missing: Whether this is a missing segment
        - is_comment: Whether this is a comment line
        - word_timings: Word-level timings (if available)
        """
        import json
        import uuid
        
        segments = []
        
        if self.format == 'CHAT':
            # For CHAT format, we have structured data
            if isinstance(self.raw_content, list):
                # Process regular segments
                for segment in self.raw_content:
                    if not isinstance(segment, dict):
                        continue
                        
                    # Skip segments without required fields
                    if 'text' not in segment or 'start_ms' not in segment or 'end_ms' not in segment:
                        continue
                    
                    # Check if this is a comment
                    is_comment = segment.get('is_comment', False)
                    
                    segments.append({
                        'id': segment.get('id', str(uuid.uuid4())),
                        'text': segment['text'],
                        'start_ms': segment['start_ms'],
                        'end_ms': segment['end_ms'],
                        'speaker': segment.get('speaker', ''),
                        'is_missing': False,
                        'is_comment': is_comment,
                        'word_timings': json.dumps(segment.get('word_timings', [])) if segment.get('word_timings') else None
                    })
                
                # Add missing segments
                if self.missing_segments:
                    for segment in self.missing_segments:
                        if not isinstance(segment, dict):
                            continue
                            
                        # Skip segments without required fields
                        if 'start_ms' not in segment or 'end_ms' not in segment:
                            continue
                        
                        segments.append({
                            'id': segment.get('id', str(uuid.uuid4())),
                            'text': segment.get('text', ''),
                            'start_ms': segment['start_ms'],
                            'end_ms': segment['end_ms'],
                            'speaker': segment.get('speaker', ''),
                            'is_missing': True,
                            'is_comment': False,
                            'word_timings': None
                        })
            
            # Sort segments by start time
            segments.sort(key=lambda x: x['start_ms'])
        else:
            # For other formats, we'll need to implement a different approach
            pass
        
        return segments

# Step 2: Set up views and forms to handle single file and batch uploads (next steps).
# Step 3: Create test cases for models.

# Tests for the models.
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

class AudioFileModelTest(TestCase):
    def test_single_file_upload(self):
        audio = AudioFile.objects.create(title="Test Audio", audio_file=SimpleUploadedFile("test.mp3", b"audio data"))
        self.assertEqual(audio.title, "Test Audio")
        self.assertFalse(audio.is_batch_upload())

    def test_batch_upload(self):
        audio = AudioFile.objects.create(title="Batch Upload", input_folder="/path/to/folder")
        self.assertEqual(audio.title, "Batch Upload")
        self.assertTrue(audio.is_batch_upload())

class TranscriptModelTest(TestCase):
    def test_transcript_creation(self):
        audio = AudioFile.objects.create(title="Test Audio", audio_file=SimpleUploadedFile("test.mp3", b"audio data"))
        transcript = Transcript.objects.create(audio=audio, chat_content="Sample Transcript")
        self.assertEqual(transcript.audio.title, "Test Audio")
        self.assertEqual(transcript.chat_content, "Sample Transcript")

# Next Steps: Implement views for file upload and allow folder selection for batch uploads.
