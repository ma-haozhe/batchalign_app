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
    diarization_data = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    speaker_mapping = models.ManyToManyField(SpeakerMap, blank=True)  # Link to speaker mappings

    def __str__(self):
        return f"Transcript for {self.audio.title}"

    def get_chat_content(self):
        """Returns the CHAT format content with proper speaker mappings"""
        content = self.chat_content
        for speaker in self.speaker_mapping.all():
            content = content.replace(f"*{speaker.original_id}:", f"*{speaker.chat_role}:")
        return content

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
