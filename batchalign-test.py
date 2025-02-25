import batchalign as ba

def test_batchalign(file_path, lang="eng", use_whisper=False):
    try:
        # Initialize the appropriate ASR engine
        if use_whisper:
            asr_engine = ba.WhisperEngine(lang=lang)
        else:
            asr_engine = ba.RevEngine(lang=lang)
        
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