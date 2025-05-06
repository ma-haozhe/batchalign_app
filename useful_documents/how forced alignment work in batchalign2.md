## Forced Alignment in Batchalign2: Overview

Forced alignment is a process that synchronizes spoken audio with its transcription at the word level, generating precise timestamps for each word. In the batchalign2 project, this is implemented as part of a larger pipeline for processing audio recordings of spoken language.

The project supports two main forced alignment engines:

1. **WhisperFAEngine** - Using OpenAI's Whisper model
2. **Wave2VecFAEngine** - Using Facebook's Wav2Vec model

## Core Components

### 1. Document Structure

The `Document` class in document.py contains the data structure that holds the audio, transcript, and all associated metadata. It defines several tasks including `Task.FORCED_ALIGNMENT`, which is used to identify the forced alignment task within the pipeline.

### 2. Pipeline Architecture

The forced alignment process fits into the larger batchalign2 pipeline system:

- `BatchalignPipeline` orchestrates the different processing engines
- `dispatch_pipeline` in dispatch.py creates pipelines with appropriate engines
- The forced alignment engines are defined in fa

### 3. Forced Alignment Engines

#### WhisperFAEngine

Located in whisper_fa.py, this engine:

1. Implements the `BatchalignEngine` interface with `tasks = [Task.FORCED_ALIGNMENT]`
2. Uses a `WhisperFAModel` from infer_fa.py
3. Takes audio segments and corresponding text and aligns them using Whisper

The core alignment process in `process()` method:
- Takes a document with audio and transcript
- Breaks the document into manageable segments
- Performs alignment on each segment
- Updates the document with precise timestamps for each word

#### Wave2VecFAEngine

Located in wave2vec_fa.py, this engine:

1. Also implements the `BatchalignEngine` interface with `tasks = [Task.FORCED_ALIGNMENT]`
2. Uses a `Wave2VecFAModel` from infer_fa.py
3. Aligns audio segments using Facebook's Wav2Vec model

### 4. Model Implementations

#### WhisperFAModel

This model in infer_fa.py:

1. Uses Hugging Face's implementation of the Whisper model
2. Performs alignment using cross-attention patterns from the model
3. Uses dynamic time warping (DTW) to create precise alignments

The alignment process:
```python
def __call__(self, audio, text, pauses=False):
    # Process audio and text to prepare for alignment
    features = self.__processor(audio=audio, text=text, sampling_rate=self.sample_rate, return_tensors='pt')
    tokens = features["labels"][0]
    
    # Run model inference to get cross-attention patterns
    output = self.__model(**features.to(DEVICE), output_attentions=True)
    
    # Get attention weights from alignment heads
    cross_attentions = torch.cat(output.cross_attentions).cpu()
    weights = torch.stack([cross_attentions[l][h] for l, h in self.__model.generation_config.alignment_heads])
    
    # Normalize and filter the attention weights
    std, mean = torch.std_mean(weights, dim=-2, keepdim=True, unbiased=False)
    weights = (weights - mean) / std
    weights = median_filter(weights, self.__model.config.median_filter_width)
    matrix = weights.mean(axis=0)
    
    # Use dynamic time warping to align text with audio
    text_idx, time_idx = dtw(-matrix)
    jumps = np.pad(np.diff(text_idx), (1, 0), constant_values=1).astype(bool)
    jump_times = time_idx[jumps] * 0.02
    
    # Return timestamped tokens
    timestamped_tokens = [(self.__processor.decode(i), j) for i, j in zip(tokens, jump_times)]
    return timestamped_tokens
```

#### Wave2VecFAModel

This model in infer_fa.py:

1. Uses torchaudio's MMS_FA pipeline with Wav2Vec
2. Creates character-level alignments and merges them into word-level alignments

The alignment process:
```python
def __call__(self, audio, text):
    # Move audio to device
    audio = audio.to(DEVICE)
    
    # Get emission matrix from model
    emission, _ = self.model(audio.unsqueeze(0))
    emission = emission.cpu().detach()
    
    # Prepare transcript tokens
    dictionary = bundle.get_dict()
    transcript = torch.tensor([dictionary.get(c, dictionary["*"]) 
                               for word in text
                               for c in word.lower()])
    
    # Run forced alignment
    path, scores = AF.forced_align(emission, transcript.unsqueeze(0))
    alignments, scores = path[0], scores[0]
    scores = scores.exp()
    
    # Merge repeated tokens and remove blanks
    path = AF.merge_tokens(alignments, scores)
    
    # Unflatten to get character-level alignments and convert to word-level
    word_spans = unflatten(path, [len(word) for word in text])
    ratio = audio.size(0)/emission.size(1)
    word_spans = [(int(((spans[0].start*ratio)/self.sample_rate)*1000),
                   int(((spans[-1].end*ratio)/self.sample_rate)*1000)) for spans in word_spans]
    
    return list(zip(text, word_spans))
```

### 5. String Alignment Utilities

Both engines use utilities from dp.py for aligning the produced timestamps with the original text:

- `align()` - Performs dynamic programming alignment between two sequences
- `PayloadTarget` and `ReferenceTarget` - Classes used to track alignment between word sequences
- String normalization and manipulation to ensure proper alignment

## Workflow in Detail

Here's the typical forced alignment workflow:

1. **Audio Preprocessing**:
   - Load and resample audio to 16kHz
   - Handle multi-channel audio by averaging to mono

2. **Segmentation**:
   - Break the document into manageable utterance segments (~15-20 seconds)
   - Group words within each utterance

3. **Alignment Process**:
   - For each segment:
     - Clean the text (remove punctuation, handle special characters)
     - Run the model to get word-level timestamps
     - Align the timestamps with the original words using dynamic programming
     - Update the document with precise timing information

4. **Post-processing**:
   - Correct timing boundaries (ensure word times don't overlap)
   - Add special markers to the text to indicate timing information

5. **Integration with Full Pipeline**:
   - The forced alignment task is often combined with ASR (Automatic Speech Recognition) and UTR (Utterance Timing Recovery)
   - In the CLI, the default configuration for English uses `wav2vec_fa` and for other languages uses `whisper_fa`

## Practical Differences Between the Engines

1. **WhisperFAEngine**:
   - More language support due to Whisper's multilingual capabilities
   - Uses attention patterns for alignment, which can be more robust for noisy audio
   - Handles longer context windows
   - More memory intensive

2. **Wave2VecFAEngine**:
   - Generally faster and more efficient
   - Better for clean audio in English and some Roman-script languages
   - Uses forced alignment specific models
   - More precise at the phoneme level
