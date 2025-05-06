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

    # Link to the original transcript that was aligned
    original_transcript = models.ForeignKey(Transcript, on_delete=models.CASCADE, related_name="alignment_tasks")
    
    # Stores the word-level timestamps
    word_timestamps = models.JSONField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    engine_used = models.CharField(max_length=20, choices=ENGINE_CHOICES, default='AUTO')
    
    # To store any error messages if the alignment fails
    error_message = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Alignment for {self.original_transcript.audio.title} - {self.status}"

    class Meta:
        ordering = ['-created_at']
