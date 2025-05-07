from django.db import models
from batch_processor.models import Transcript

class ForcedAlignmentTask(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    ENGINE_CHOICES = [
        ('WHISPER', 'WhisperFA'),
        ('WAV2VEC', 'Wave2VecFA'),
        ('AUTO', 'Auto'),
    ]

    # Direct file uploads
    audio_file = models.FileField(upload_to='forced_alignment/audio/', blank=True, null=True)
    cha_file = models.FileField(upload_to='forced_alignment/cha/', blank=True, null=True)
    
    # Optional link to an existing transcript (if the alignment uses an existing transcript)
    original_transcript = models.ForeignKey(Transcript, on_delete=models.SET_NULL, 
                                          related_name="alignment_tasks", 
                                          blank=True, null=True)
    
    # Title for the alignment task
    title = models.CharField(max_length=255, default="Untitled Alignment")
    
    # Stores the word-level timestamps
    word_timestamps = models.JSONField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    engine_used = models.CharField(max_length=20, choices=ENGINE_CHOICES, default='AUTO')
    
    # To store any error messages if the alignment fails
    error_message = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Alignment for {self.title} - {self.status}"
    
    @property
    def audio_url(self):
        """Return the URL for the audio file, either from direct upload or linked transcript"""
        if self.audio_file:
            return self.audio_file.url
        elif self.original_transcript:
            return self.original_transcript.audio.audio_file.url
        return None

    class Meta:
        ordering = ['-created_at']
