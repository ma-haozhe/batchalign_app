def process_with_pyannote(audio_path, hf_token, transcript):
    """Process audio file with Pyannote for diarization using direct approach without pipeline"""
    try:
        import os
        import torch
        import uuid
        import numpy as np
        import torchaudio
        from pyannote.audio import Audio
        from pyannote.core import Segment
        from pyannote.audio.pipelines.speaker_verification import PretrainedSpeakerEmbedding
        from sklearn.cluster import AgglomerativeClustering
        
        # Set HF_TOKEN for Pyannote to use
        os.environ['HF_TOKEN'] = hf_token
        
        # Check if CUDA is available
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device for Pyannote: {device}")
        
        # Load audio file
        logger.info(f"Loading audio file: {audio_path}")
        waveform, sample_rate = torchaudio.load(audio_path)
        
        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)
        
        # Initialize audio processor
        audio = Audio(sample_rate=sample_rate)
        
        # Create embedding model
        try:
            logger.info("Loading embedding model")
            embedding_model = PretrainedSpeakerEmbedding(
                "speechbrain/spkrec-ecapa-voxceleb",
                device=device
            )
        except Exception as e:
            logger.error(f"Error loading embedding model: {e}")
            raise ValueError(
                "Could not load speaker embedding model. Please ensure you:\n"
                "1. Have a valid Hugging Face token\n"
                "2. Have accepted the user agreement for speechbrain/spkrec-ecapa-voxceleb\n"
                "3. Have entered the token correctly in the settings page"
            )
        
        # Perform voice activity detection
        logger.info("Performing voice activity detection")
        
        # Use a simple energy-based VAD as a fallback
        energy = torch.norm(waveform, dim=0)
        threshold = 0.05 * torch.max(energy)
        speech_frames = energy > threshold
        
        # Create segments from contiguous speech frames
        segments = []
        duration = waveform.shape[1] / sample_rate
        segment_length = 3.0  # seconds
        
        # Create overlapping segments
        for start in torch.arange(0, duration - segment_length/2, segment_length/2):
            end = start + segment_length
            if end > duration:
                end = duration
            
            start_frame = int(start * sample_rate)
            end_frame = int(end * sample_rate)
            
            # Check if there's speech in this segment
            segment_speech = speech_frames[start_frame:end_frame]
            if segment_speech.numel() > 0 and torch.sum(segment_speech) > 0.2 * segment_speech.numel():
                segments.append({
                    'segment': Segment(float(start), float(end)),
                    'start': float(start),
                    'end': float(end)
                })
        
        logger.info(f"Found {len(segments)} speech segments")
        
        # If no segments found, create some default ones
        if len(segments) == 0:
            step = 3.0
            for start in np.arange(0, duration, step):
                end = start + step
                if end > duration:
                    end = duration
                segments.append({
                    'segment': Segment(start, end),
                    'start': start,
                    'end': end
                })
            logger.info(f"Created {len(segments)} default segments")
        
        # Extract embeddings from segments
        embeddings = []
        valid_segments = []
        
        for segment_info in segments:
            segment = segment_info['segment']
            try:
                segment_waveform = audio.crop(audio_path, segment)
                embedding = embedding_model(segment_waveform)
                embeddings.append(embedding)
                valid_segments.append(segment_info)
            except Exception as e:
                logger.error(f"Error extracting embedding for segment {segment}: {e}")
                # Skip problematic segments
        
        if len(embeddings) == 0:
            raise ValueError("No valid speech segments found in the audio")
            
        # Stack embeddings for clustering
        embeddings = np.vstack(embeddings)
        
        # Estimate number of speakers (use min of 2, max of 5)
        num_speakers = min(max(2, int(len(valid_segments) / 15)), 5)
        logger.info(f"Estimating {num_speakers} speakers")
        
        # Cluster the embeddings
        clustering = AgglomerativeClustering(
            n_clusters=num_speakers,
            affinity="cosine",
            linkage="average"
        )
        labels = clustering.fit_predict(embeddings)
        
        # Create diarization data
        diarization_data = []
        
        for i, (segment_info, label) in enumerate(zip(valid_segments, labels)):
            start_ms = int(segment_info['start'] * 1000)
            end_ms = int(segment_info['end'] * 1000)
            
            diarization_data.append({
                'start': start_ms,
                'end': end_ms,
                'speaker': f"SPEAKER_{label}",
                'text': ''  # Will be filled in next step
            })
        
        # Sort segments by start time
        diarization_data.sort(key=lambda x: x['start'])
        
        # Get ASR transcript data
        asr_segments = []
        if transcript.diarization_data:
            for segment in transcript.diarization_data:
                if 'text' in segment and segment['text'].strip():
                    asr_segments.append({
                        'start': segment['start'],
                        'end': segment['end'],
                        'text': segment['text'],
                        'speaker': segment.get('speaker', '')
                    })
        
        # Find missing segments (diarization segments with no matching ASR text)
        missing_segments = []
        
        for dia_segment in diarization_data:
            # Check if this segment has a corresponding ASR segment
            start_time = dia_segment['start']
            end_time = dia_segment['end']
            has_match = False
            
            # Find if any ASR segment overlaps significantly with this diarization segment
            for asr_segment in asr_segments:
                asr_start = asr_segment['start']
                asr_end = asr_segment['end']
                
                # Calculate overlap
                overlap_start = max(start_time, asr_start)
                overlap_end = min(end_time, asr_end)
                overlap = max(0, overlap_end - overlap_start)
                
                # Segment duration
                segment_duration = end_time - start_time
                
                # If significant overlap (more than 50%), consider it a match
                if overlap > 0 and (overlap / segment_duration) > 0.5:
                    has_match = True
                    # Copy ASR text to diarization segment
                    if 'text' in asr_segment and asr_segment['text'].strip():
                        dia_segment['text'] = asr_segment['text']
                    break
            
            # If no match, add to missing segments
            if not has_match:
                missing_segments.append({
                    'id': str(uuid.uuid4()),
                    'start': start_time,
                    'end': end_time,
                    'speaker': dia_segment['speaker'],
                    'text': ''  # Empty text that can be filled by user
                })
        
        logger.info(f"Processed {len(diarization_data)} segments, found {len(missing_segments)} missing segments")
        return diarization_data, missing_segments
    
    except Exception as e:
        logger.exception(f"Error in Pyannote processing: {e}")
        return None, None
