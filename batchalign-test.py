import batchalign as ba

def test_batchalign(file_path, lang="eng", use_whisper=False):
    try:
        # Get the Rev API key from environment or .env file
        import os
        from pathlib import Path
        
        # Try to get key from environment
        rev_api_key = os.environ.get('REV_API_KEY', '')
        
        # Check .env file if it exists
        env_path = Path(__file__).parent / '.env'
        if env_path.exists() and not rev_api_key:
            with open(env_path, 'r') as f:
                for line in f:
                    if line.strip().startswith('REV_API_KEY='):
                        rev_api_key = line.strip().split('=', 1)[1].strip('"\'')
        
        # Initialize the appropriate ASR engine
        if use_whisper:
            asr_engine = ba.WhisperEngine(lang=lang)
        else:
            # Pass the API key explicitly
            asr_engine = ba.RevEngine(key=rev_api_key, lang=lang)
        
        # Create a Batchalign pipeline with the selected ASR engine
        nlp = ba.BatchalignPipeline(asr_engine)
        
        # Process the audio file
        doc = nlp(file_path)
        
        # Generate the transcript
        transcript = doc.transcript(include_tiers=True, strip=False)
        print("Generated Transcript with Tiers:\n", transcript)
        
        # Check for diarization or segmentation information
        if hasattr(doc, "segments"):
            print("Segments (speaker diarization):\n", doc.segments)
        else:
            print("Segments attribute not available.")
    
    except Exception as e:
        print(f"Error during Batchalign processing: {e}")

# Path to the audio file for testing
test_file_path = "/Users/haozhema/batchalign_app/M010.mp3"

# Run tests
print("Testing Batchalign with Rev.ai:")
test_batchalign(test_file_path, lang="eng", use_whisper=False)

print("\nTesting Batchalign with Whisper:")
test_batchalign(test_file_path, lang="eng", use_whisper=True)