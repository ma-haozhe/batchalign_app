/**
 * Transcript Display functionality for the Transcript Player
 */

// Global variables for transcript display
window.uniqueSpeakers = new Set();

// Make initialization function global
window.initializeTranscriptDisplay = function() {
    console.log("Initializing transcript display");
    
    // Get transcript content
    const chatContent = document.getElementById('chatContent').value;
    const diarizationData = document.getElementById('diarizationData').value;
    
    // Display transcript content based on format
    if (chatContent && chatContent.trim() !== '') {
        console.log("Displaying CHAT format content");
        // Ensure Unicode decoding is applied to the entire content first
        const decodedChatContent = typeof window.decodeUnicodeEscapeSequences === 'function' 
            ? window.decodeUnicodeEscapeSequences(chatContent)
            : chatContent;
        displayChatContent(decodedChatContent);
    } else if (diarizationData && diarizationData.trim() !== '') {
        console.log("Displaying diarization data");
        try {
            const segments = JSON.parse(diarizationData);
            displaySegments(segments);
        } catch (e) {
            console.error("Error parsing diarization data:", e);
            document.getElementById('transcriptContainer').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error:</strong> Could not parse diarization data.
                </div>
            `;
        }
    } else {
        console.warn("No transcript content available");
        document.getElementById('transcriptContainer').innerHTML = `
            <div class="alert alert-warning">
                <strong>Warning:</strong> No transcript content available.
            </div>
        `;
    }
    
    // Set up format tabs with direct event binding
    const chatTab = document.getElementById('chat-tab');
    const rawTab = document.getElementById('raw-tab');
    
    if (chatTab) {
        chatTab.onclick = function(e) {
            e.preventDefault();
            this.classList.add('active');
            if (rawTab) rawTab.classList.remove('active');
            
            const chatPane = document.getElementById('chat');
            const rawPane = document.getElementById('raw');
            
            if (chatPane) chatPane.classList.add('show', 'active');
            if (rawPane) rawPane.classList.remove('show', 'active');
        };
    }
    
    if (rawTab) {
        rawTab.onclick = function(e) {
            e.preventDefault();
            this.classList.add('active');
            if (chatTab) chatTab.classList.remove('active');
            
            const chatPane = document.getElementById('chat');
            const rawPane = document.getElementById('raw');
            
            if (rawPane) rawPane.classList.add('show', 'active');
            if (chatPane) chatPane.classList.remove('show', 'active');
        };
    }
    
    // Initialize the autoScroll toggle
    const autoScrollToggle = document.getElementById('autoScrollToggle');
    if (autoScrollToggle) {
        // Set global auto-scroll variable
        window.autoScroll = autoScrollToggle.checked;
        
        // Add event listener
        autoScrollToggle.addEventListener('change', function() {
            window.autoScroll = this.checked;
            console.log("Auto-scroll set to:", window.autoScroll);
        });
    }
    
    // Setup transcript highlighting function
    setupTranscriptHighlighting();
    
    console.log("Transcript display initialization complete");
}

// Setup transcript highlighting
function setupTranscriptHighlighting() {
    // Define global highlight function - this is the main entry point
    // that gets called from audio_player.js
    window.highlightTranscriptAtTime = function(currentTimeMs) {
        updateTranscriptHighlight(currentTimeMs);
    };
    
    // Make sure we don't overwrite the function in the main HTML file
    if (window.updateTranscriptHighlight === null) {
        // Only define this if it's not already defined
        window.updateTranscriptHighlight = function(currentTimeMs) {
            updateTranscriptHighlight(currentTimeMs);
        };
    }
}

// Display CHAT format content
function displayChatContent(content) {
    console.log("Displaying CHAT content");
    
    // Handle Unicode escape sequences like \u000A (newline) and \u0015 (NAK)
    content = decodeUnicodeEscapeSequences(content);
    
    const lines = content.split('\n');
    console.log(`CHAT content has ${lines.length} lines`);
    
    const headerContainer = document.getElementById('chatHeader');
    const transcriptContainer = document.getElementById('transcriptContainer');
    
    if (!headerContainer || !transcriptContainer) {
        console.error("Header or transcript container not found");
        return;
    }
    
    headerContainer.innerHTML = '';
    transcriptContainer.innerHTML = '';
    
    let inHeader = true;
    let lastUtteranceLine = null;
    let headerLinesCount = 0;
    let utteranceLinesCount = 0;
    
    lines.forEach((line, index) => {
        if (line.trim() === '') return;
        
        if (line.startsWith('@')) {
            // Header line
            headerLinesCount++;
            const headerLine = document.createElement('div');
            headerLine.className = 'header-line';
            // Apply Unicode decoding to ensure proper display
            headerLine.textContent = line;
            headerContainer.appendChild(headerLine);
        } else if (line.startsWith('*')) {
            // Utterance line
            utteranceLinesCount++;
            inHeader = false;
            const utteranceLine = document.createElement('div');
            utteranceLine.className = 'transcript-line';
            utteranceLine.dataset.line = index;
            
            // Extract speaker
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const originalSpeaker = decodeUnicodeEscapeSequences(line.substring(1, colonIndex).trim());
                window.uniqueSpeakers.add(originalSpeaker);
                
                utteranceLine.dataset.speaker = originalSpeaker;
                
                // Extract text and timestamp
                let text = line.substring(colonIndex + 1).trim();
                // Ensure any embedded Unicode escape sequences are properly interpreted
                text = decodeUnicodeEscapeSequences(text);
                console.log(`Processing line: "${text}"`);
                
                // Try multiple timestamp formats, from most common to least common
                let timestampFound = false;
                
                // First try using our specialized external timestamp extractor
                if (typeof window.extractTimestampsFromChat === 'function') {
                    const externalTimestamps = window.extractTimestampsFromChat(text);
                    if (externalTimestamps) {
                        utteranceLine.dataset.start = externalTimestamps.start;
                        utteranceLine.dataset.end = externalTimestamps.end;
                        console.log(`Found timestamp using external extractor: ${externalTimestamps.start}-${externalTimestamps.end}ms for line: "${text}"`);
                        
                        // Store the original text for display - DO NOT modify it to remove timestamps
                        // as this would alter the original CHAT format display
                        
                        timestampFound = true;
                    }
                }
                
                // If external extractor failed, try our built-in formats
                if (!timestampFound) {
                    // Format 1: Check for standard format "word word word 12345_67890"
                    // This is the format used in PETIT027_Mother_FreePlay_Audio_16kHz.mp3.cha
                    const words = text.split(' ');
                    const lastWord = words[words.length - 1];
                    
                    if (lastWord && lastWord.match(/^\d+_\d+$/)) {
                        // Found timestamp in format start_end
                        const times = lastWord.split('_');
                        const startTime = parseInt(times[0]);
                        const endTime = parseInt(times[1]);
                        
                        utteranceLine.dataset.start = startTime;
                        utteranceLine.dataset.end = endTime;
                        
                        // Remove timestamp from displayed text
                        words.pop();
                        text = words.join(' ');
                        
                        console.log(`Found timestamp Format 1: ${startTime}-${endTime}ms for line: "${text}"`);
                        timestampFound = true;
                    }
                }
                
                // Format 2: Check for [12345-67890] format
                if (!timestampFound) {
                    const timestampMatch = text.match(/\[(\d+)-(\d+)\]/);
                    if (timestampMatch && timestampMatch.length >= 3) {
                        const startTime = parseInt(timestampMatch[1]);
                        const endTime = parseInt(timestampMatch[2]);
                        
                        utteranceLine.dataset.start = startTime;
                        utteranceLine.dataset.end = endTime;
                        
                        // Remove timestamp from displayed text
                        text = text.replace(/\[\d+-\d+\]/, '');
                        
                        console.log(`Found timestamp Format 2: ${startTime}-${endTime}ms for line: "${text}"`);
                        timestampFound = true;
                    }
                }
                
                // Format 3: Check for text like "this \00152395_26885\0015"
                if (!timestampFound) {
                    // Look for the specific format seen in the screenshot with \0015NNNN\0015 pattern
                    const backslashTimestampMatch = text.match(/\\0*15(\d+)_(\d+)\\0*15/);
                    if (backslashTimestampMatch && backslashTimestampMatch.length >= 3) {
                        const startTime = parseInt(backslashTimestampMatch[1]);
                        const endTime = parseInt(backslashTimestampMatch[2]);
                        
                        utteranceLine.dataset.start = startTime;
                        utteranceLine.dataset.end = endTime;
                        
                        // Don't remove this from displayed text as it may be part of the transcript content
                        console.log(`Found timestamp Format 3: ${startTime}-${endTime}ms using backslash pattern`);
                        timestampFound = true;
                    }
                }
                
                // Try additional backslash format with just start time
                if (!timestampFound) {
                    const singleTimestampMatch = text.match(/\\0*15(\d+)\\0*15/);
                    if (singleTimestampMatch && singleTimestampMatch.length >= 2) {
                        const startTime = parseInt(singleTimestampMatch[1]);
                        const endTime = startTime + 5000; // Add 5 seconds as default
                        
                        utteranceLine.dataset.start = startTime;
                        utteranceLine.dataset.end = endTime;
                        
                        console.log(`Found timestamp Format 3b: ${startTime}-${endTime}ms using single number backslash pattern`);
                        timestampFound = true;
                    }
                }
                
                // Format 4: Look for timestamp in the line itself using regular expressions
                if (!timestampFound) {
                    // Look for any numbers that could be timestamps (5+ digit numbers)
                    const timeMatches = text.match(/\b(\d{5,})\b/g);
                    if (timeMatches && timeMatches.length >= 1) {
                        const startTime = parseInt(timeMatches[0]);
                        const endTime = timeMatches.length > 1 ? parseInt(timeMatches[1]) : startTime + 5000;
                        
                        utteranceLine.dataset.start = startTime;
                        utteranceLine.dataset.end = endTime;
                        
                        console.log(`Found timestamp Format 4: ${startTime}-${endTime}ms from numeric values in text`);
                        timestampFound = true;
                    }
                }
                
                // Debug if no timestamp was found
                if (!timestampFound) {
                    console.warn(`No timestamp found for line: "${text}"`);
                }
                
                // Set click handler if we have a timestamp
                if (utteranceLine.dataset.start) {
                    utteranceLine.addEventListener('click', function() {
                        const startTimeMs = parseInt(utteranceLine.dataset.start);
                        console.log(`Seeking to time: ${startTimeMs}ms (from data-start="${utteranceLine.dataset.start}")`);
                        
                        // Enhanced Edge browser fix: Multiple validation checks
                        if (isNaN(startTimeMs) || startTimeMs < 0) {
                            console.error(`Invalid timestamp detected: "${utteranceLine.dataset.start}" -> ${startTimeMs}`);
                            return;
                        }
                        
                        // Additional validation: check if timestamp is reasonable (not too large)
                        if (startTimeMs > 999999999) { // More than ~277 hours is unreasonable
                            console.error(`Timestamp too large: ${startTimeMs}ms`);
                            return;
                        }
                        
                        // Edge browser fix: Try multiple seeking methods with better error handling
                        let seekSuccess = false;
                        
                        // Method 1: Use custom seekToTime function
                        if (typeof window.seekToTime === 'function') {
                            try {
                                console.log(`Attempting to seek using window.seekToTime(${startTimeMs})`);
                                window.seekToTime(startTimeMs);
                                seekSuccess = true;
                            } catch (error) {
                                console.error("Error with window.seekToTime:", error);
                            }
                        }
                        
                        // Method 2: Direct wavesurfer seeking (fallback)
                        if (!seekSuccess && window.wavesurfer && window.wavesurfer.isReady) {
                            try {
                                const seconds = startTimeMs / 1000;
                                const duration = window.wavesurfer.getDuration();
                                console.log(`Wavesurfer fallback: seeking to ${seconds}s out of ${duration}s`);
                                
                                if (duration > 0 && seconds <= duration) {
                                    const seekRatio = seconds / duration;
                                    console.log(`Seeking to ratio: ${seekRatio}`);
                                    window.wavesurfer.seekTo(seekRatio);
                                    seekSuccess = true;
                                } else {
                                    console.error(`Invalid seek: ${seconds}s > duration ${duration}s`);
                                }
                            } catch (error) {
                                console.error("Error with wavesurfer direct seek:", error);
                            }
                        }
                        
                        // Method 3: HTML5 audio element seeking (last resort)
                        if (!seekSuccess) {
                            try {
                                const audioElement = document.querySelector('audio');
                                if (audioElement) {
                                    const seconds = startTimeMs / 1000;
                                    console.log(`HTML5 audio fallback: seeking to ${seconds}s`);
                                    audioElement.currentTime = seconds;
                                    seekSuccess = true;
                                }
                            } catch (error) {
                                console.error("Error with HTML5 audio seek:", error);
                            }
                        }
                        
                        if (!seekSuccess) {
                            console.error("All seeking methods failed");
                            alert(`Could not seek to timestamp: ${startTimeMs}ms. Please try refreshing the page.`);
                        }
                    });
                }
                
                // Get mapped speaker
                const mappedSpeaker = window.speakerMappings && window.speakerMappings[originalSpeaker] ? window.speakerMappings[originalSpeaker] : originalSpeaker;
                utteranceLine.dataset.mappedSpeaker = mappedSpeaker;
                
                // Create speaker label with mapped speaker
                const speakerLabel = document.createElement('span');
                speakerLabel.className = 'speaker-label';
                speakerLabel.textContent = `*${mappedSpeaker}:`;
                
                // Apply speaker color if available
                if (window.speakerColors && window.speakerColors[originalSpeaker]) {
                    speakerLabel.style.color = window.speakerColors[originalSpeaker];
                }
                
                utteranceLine.appendChild(speakerLabel);
                
                // Add special class for %wor lines so we can treat them differently
                if (line.startsWith('%wor:')) {
                    utteranceLine.classList.add('wordlevel-line');
                }
                
                // Create hidden timestamp display for CHAT format - only shown in certain views
                if (utteranceLine.dataset.start) {
                    const timestamp = document.createElement('span');
                    timestamp.className = 'transcript-timestamp chat-timestamp';
                    timestamp.textContent = formatTime(utteranceLine.dataset.start / 1000);
                    // Don't use inline style, rely on CSS classes for display control
                    utteranceLine.appendChild(timestamp);
                }
                
                // Create text content
                const textContent = document.createElement('span');
                textContent.className = 'utterance-text';
                
                // Split text into words for potential highlighting
                const textWords = text.split(' ');
                textWords.forEach((word, i) => {
                    if (word.trim() === '') return;
                    
                    const wordSpan = document.createElement('span');
                    wordSpan.className = 'transcript-word';
                    // Words are already decoded earlier when the text variable was processed
                    wordSpan.textContent = word + (i < textWords.length - 1 ? ' ' : '');
                    textContent.appendChild(wordSpan);
                });
                
                // Add content progress indicator
                const progressIndicator = document.createElement('div');
                progressIndicator.className = 'content-progress';
                progressIndicator.style.width = '0%';
                utteranceLine.appendChild(progressIndicator);
                
                utteranceLine.appendChild(textContent);
                transcriptContainer.appendChild(utteranceLine);
                lastUtteranceLine = utteranceLine;
            }
        } else if (line.startsWith('%wor:')) {
            // Word-level timing line - parse and display word-level timing
            inHeader = false;
            
            // Create a container for word-level timing
            const wordTimingLine = document.createElement('div');
            wordTimingLine.className = 'transcript-line word-timing-line';
            
            // Extract word timing information
            const worText = decodeUnicodeEscapeSequences(line.substring('%wor:'.length).trim());
            const worItems = worText.split(' ');
            
            // Keep track of the last utterance line to associate this with
            if (lastUtteranceLine) {
                wordTimingLine.dataset.parentLine = lastUtteranceLine.dataset.line;
            }
            
            const wordTimingContainer = document.createElement('div');
            wordTimingContainer.className = 'word-timing-container';
            
            // Process each word-timing item
            worItems.forEach(item => {
                // Check if this item has timing (in format "word 12345_67890")
                const parts = item.split('_');
                if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
                    const startTime = parseInt(parts[0]);
                    const endTime = parseInt(parts[1]);
                    
                    // If this is the first word with timing, set the start time for the parent line
                    if (lastUtteranceLine && (!lastUtteranceLine.dataset.start || parts[0] < lastUtteranceLine.dataset.start)) {
                        lastUtteranceLine.dataset.start = startTime;
                    }
                    
                    // Create a word span with timing data
                    const wordSpan = document.createElement('span');
                    wordSpan.className = 'word-with-timing';
                    // Decode any Unicode escapes in the word text and remove trailing timestamp part
                    wordSpan.textContent = decodeUnicodeEscapeSequences(item.replace(/_\d+$/, ''));
                    wordSpan.dataset.start = startTime;
                    wordSpan.dataset.end = endTime;
                    
                    wordTimingContainer.appendChild(wordSpan);
                } else {
                    // Just regular text without timing
                    const textNode = document.createTextNode(decodeUnicodeEscapeSequences(item) + ' ');
                    wordTimingContainer.appendChild(textNode);
                }
            });
            
            // Add a label to indicate this is word timing
            const label = document.createElement('span');
            label.className = 'timing-label';
            label.textContent = 'Word timing: ';
            wordTimingLine.appendChild(label);
            
            // Add the word timing container
            wordTimingLine.appendChild(wordTimingContainer);
            
            // Add word-level click handling for seeking
            const wordSpans = wordTimingContainer.querySelectorAll('.word-with-timing');
            wordSpans.forEach(wordSpan => {
                if (wordSpan.dataset.start) {
                    wordSpan.addEventListener('click', function() {
                        const startTimeMs = parseInt(wordSpan.dataset.start);
                        console.log(`Seeking to word time: ${startTimeMs}ms`);
                        
                        // Enhanced validation and seeking (same as line-level)
                        if (isNaN(startTimeMs) || startTimeMs < 0) {
                            console.error(`Invalid word timestamp: "${wordSpan.dataset.start}" -> ${startTimeMs}`);
                            return;
                        }
                        
                        if (startTimeMs > 999999999) {
                            console.error(`Word timestamp too large: ${startTimeMs}ms`);
                            return;
                        }
                        
                        let seekSuccess = false;
                        
                        // Try multiple seeking methods
                        if (typeof window.seekToTime === 'function') {
                            try {
                                window.seekToTime(startTimeMs);
                                seekSuccess = true;
                            } catch (error) {
                                console.error("Error with window.seekToTime for word:", error);
                            }
                        }
                        
                        if (!seekSuccess && window.wavesurfer && window.wavesurfer.isReady) {
                            try {
                                const seconds = startTimeMs / 1000;
                                const duration = window.wavesurfer.getDuration();
                                if (duration > 0 && seconds <= duration) {
                                    window.wavesurfer.seekTo(seconds / duration);
                                    seekSuccess = true;
                                }
                            } catch (error) {
                                console.error("Error with wavesurfer for word:", error);
                            }
                        }
                        
                        if (!seekSuccess) {
                            try {
                                const audioElement = document.querySelector('audio');
                                if (audioElement) {
                                    audioElement.currentTime = startTimeMs / 1000;
                                }
                            } catch (error) {
                                console.error("Error with HTML5 audio for word:", error);
                            }
                        }
                    });
                }
            });
            
            // Add to the transcript
            transcriptContainer.appendChild(wordTimingLine);
        } else if (line.startsWith('%')) {
            // Other comment line
            inHeader = false;
            const commentLine = document.createElement('div');
            commentLine.className = 'transcript-line comment-line';
            // Ensure any embedded Unicode escape sequences are properly interpreted
            commentLine.textContent = decodeUnicodeEscapeSequences(line);
            transcriptContainer.appendChild(commentLine);
        } else if (!inHeader) {
            // Other content after header
            const contentLine = document.createElement('div');
            contentLine.className = 'transcript-line';
            // Ensure any embedded Unicode escape sequences are properly interpreted
            contentLine.textContent = decodeUnicodeEscapeSequences(line);
            transcriptContainer.appendChild(contentLine);
        }
    });
    
    console.log(`Processed ${headerLinesCount} header lines and ${utteranceLinesCount} utterance lines`);
    
    // If no content was displayed, show an error message
    if (headerLinesCount === 0 && utteranceLinesCount === 0) {
        transcriptContainer.innerHTML = `
            <div class="alert alert-warning">
                <strong>Warning:</strong> No transcript content could be displayed. 
                The transcript may be empty or in an unsupported format.
            </div>
        `;
    }
}

// Display diarization segments
function displaySegments(segments) {
    console.log("Displaying segments:", segments.length);
    const transcriptContainer = document.getElementById('transcriptContainer');
    
    if (!transcriptContainer) {
        console.error("Transcript container not found");
        return;
    }
    
    // Clear existing content
    transcriptContainer.innerHTML = '';
    
    // Sort segments by start time
    segments.sort((a, b) => a.start - b.start);
    
    // Process segments
    segments.forEach((segment, index) => {
        if (!segment.speaker) return;
        
        const segmentElement = document.createElement('div');
        segmentElement.className = 'transcript-line';
        segmentElement.dataset.line = index;
        segmentElement.dataset.speaker = segment.speaker;
        segmentElement.dataset.start = segment.start;
        segmentElement.dataset.end = segment.end;
        
        // Add click handler for seeking
        segmentElement.addEventListener('click', function() {
            console.log(`Seeking to segment: ${segment.start}ms`);
            if (typeof window.seekToTime === 'function') {
                window.seekToTime(segment.start);
            }
        });
        
        // Get mapped speaker
        const mappedSpeaker = window.speakerMappings && window.speakerMappings[segment.speaker] ? 
            window.speakerMappings[segment.speaker] : segment.speaker;
        segmentElement.dataset.mappedSpeaker = mappedSpeaker;
        
        // Create speaker label
        const speakerLabel = document.createElement('span');
        speakerLabel.className = 'speaker-label';
        speakerLabel.textContent = mappedSpeaker;
        
        // Apply speaker color if available
        if (window.speakerColors && window.speakerColors[segment.speaker]) {
            speakerLabel.style.color = window.speakerColors[segment.speaker];
        }
        
        segmentElement.appendChild(speakerLabel);
            
            // Create timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'transcript-timestamp';
            timestamp.textContent = formatTime(segment.start / 1000);
        segmentElement.appendChild(timestamp);
            
            // Create text content
            const textContent = document.createElement('span');
        textContent.className = 'utterance-text';
        textContent.textContent = segment.text || '(no text)';
        segmentElement.appendChild(textContent);
        
        transcriptContainer.appendChild(segmentElement);
    });
    
    // If no segments were processed, show message
    if (segments.length === 0) {
        transcriptContainer.innerHTML = `
            <div class="alert alert-warning">
                <strong>Warning:</strong> No diarization segments found.
                </div>
            `;
    }
}

// Function to update transcript highlighting with proper auto-scroll integration
function updateTranscriptHighlight(currentTimeMs) {
    if (!currentTimeMs) {
        console.warn("No current time provided to updateTranscriptHighlight");
        return;
    }
    
    const transcriptLines = document.querySelectorAll('.transcript-line[data-start]');
    if (transcriptLines.length === 0) {
        console.debug("No transcript lines with timestamps found");
        return;
    }
    
    // First remove any existing active/next-up classes
    document.querySelectorAll('.transcript-line.active, .transcript-line.next-up').forEach(el => {
        el.classList.remove('active', 'next-up');
    });
    
    // Track state for our search
    let activeElement = null;
    let closestPastLine = null;
    let closestPastDistance = Infinity;
    let nextUpLine = null;
    let nextUpDistance = Infinity;
    
    // Sort transcript lines by start time for more reliable sequencing
    const sortedLines = Array.from(transcriptLines).sort((a, b) => {
        return parseInt(a.dataset.start) - parseInt(b.dataset.start);
    });
    
    // First pass: look for exact matches where current time falls within a segment
    for (const line of sortedLines) {
        // Skip lines without timing data
        if (!line.dataset.start) continue;
        
        const start = parseInt(line.dataset.start);
        const end = line.dataset.end ? parseInt(line.dataset.end) : start + 10000; // Default 10sec if no end
        
        // Check if this line is active (current time is within its range)
        if (currentTimeMs >= start && currentTimeMs <= end) {
            // Ignore %wor lines as active elements (they just provide word-level timing)
            const textContent = line.textContent || '';
            if (!textContent.trim().startsWith('%wor:')) {
                line.classList.add('active');
                activeElement = line;
                // Found an active line, no need to keep looking
                break;
            }
        }
    }
    
    // Second pass: If no active element found, find nearest lines
    if (!activeElement) {
        for (const line of sortedLines) {
            if (!line.dataset.start) continue;
            
            const start = parseInt(line.dataset.start);
            const end = line.dataset.end ? parseInt(line.dataset.end) : start + 10000;
            
            // Skip %wor lines for fallback too
            const textContent = line.textContent || '';
            if (textContent.trim().startsWith('%wor:')) continue;
            
            // Track closest past line for fallback
            if (start < currentTimeMs) {
                const distance = currentTimeMs - start;
                if (distance < closestPastDistance) {
                    closestPastDistance = distance;
                    closestPastLine = line;
                }
            }
            // Track upcoming line for "next up" indicator
            else if (start > currentTimeMs) {
                const distance = start - currentTimeMs;
                if (distance < nextUpDistance) {
                    nextUpDistance = distance;
                    nextUpLine = line;
                }
            }
        }
    }
    
    // If we found an active element, update its progress indicator and scroll to it if auto-scroll is enabled
    if (activeElement) {
        // Update the progress indicator
        const progressElem = activeElement.querySelector('.content-progress');
        if (progressElem) {
            // Calculate percentage progress through this segment
            const start = parseInt(activeElement.dataset.start);
            const end = activeElement.dataset.end ? parseInt(activeElement.dataset.end) : start + 10000;
            const duration = end - start;
            const elapsed = currentTimeMs - start;
            const percentage = Math.min(100, Math.max(0, (elapsed / duration) * 100));
            
            // Apply the width as a percentage
            progressElem.style.width = `${percentage}%`;
            
            console.log(`Progress indicator: ${percentage.toFixed(1)}% (${elapsed}ms / ${duration}ms)`);
        }
        
        if (window.autoScroll) {
            // Use the enhanced auto-scroll function if available
            if (typeof window.performAutoScroll === 'function') {
                window.performAutoScroll(activeElement);
            } else {
                // Fallback to local function
                scrollToElement(activeElement);
            }
        }
    }
    // Otherwise, fallback to closest past line
    else if (closestPastLine) {
        closestPastLine.classList.add('active');
        
        // Clear the progress indicator for past lines
        const progressElem = closestPastLine.querySelector('.content-progress');
        if (progressElem) {
            progressElem.style.width = '100%';
        }
        
        if (window.autoScroll) {
            // Use the enhanced auto-scroll function if available
            if (typeof window.performAutoScroll === 'function') {
                window.performAutoScroll(closestPastLine);
            } else {
                // Fallback to local function
                scrollToElement(closestPastLine);
            }
        }
    }
        
        // If we have a "next up" line coming within 5 seconds, highlight it
        if (nextUpLine && nextUpDistance < 5000) {
            nextUpLine.classList.add('next-up');
            
            // Clear progress indicator for upcoming lines
            const progressElem = nextUpLine.querySelector('.content-progress');
            if (progressElem) {
                progressElem.style.width = '0%';
            }
        }
}

// Helper function to scroll the transcript to a specific element
function scrollToElement(element) {
    if (!element) return;
    
    // First check if auto-scroll is enabled
    if (window.autoScroll !== true) {
        return;
    }
    
    // Bail early if we're currently scrolling manually
    if (window.isManualScrolling) {
        return;
    }
    
    const container = document.getElementById('transcriptContainer');
    if (!container) {
        console.error("Transcript container not found for auto-scrolling");
        return;
    }
    
    try {
        // Check if the element is already visible in the viewport
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // If the element is already fully visible, don't scroll
        const isFullyVisible = 
            elementRect.top >= containerRect.top && 
            elementRect.bottom <= containerRect.bottom;
        
        if (isFullyVisible) {
            console.log("Element already visible, not scrolling");
            return;
        }
        
        // Get the position of the element relative to the container
        const elementTop = element.offsetTop;
        const containerHeight = container.clientHeight;
        const elementHeight = element.offsetHeight;
        
        // Calculate scroll position to center the element
        const scrollPosition = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        // Mark that we're performing a programmatic scroll
        window.isProgrammaticScroll = true;
        
        // Smoothly scroll to the position
        container.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
        
        // After the scroll animation completes, reset the flag
        setTimeout(() => {
            window.isProgrammaticScroll = false;
        }, 300);
        
        // Add a subtle visual highlight pulse
        element.style.transition = 'background-color 0.3s ease';
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = 'rgba(0, 123, 255, 0.2)';
        
        // Reset the highlight after a moment
        setTimeout(() => {
            element.style.backgroundColor = originalBg;
        }, 1000);
    } catch (error) {
        console.error("Error scrolling to element:", error);
        // Fallback scrolling
        try {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        } catch (e) {
            console.error("Fallback scrolling also failed:", e);
        }
    }
}

// Helper function for formatting time - this is a backup in case the global one isn't available
function formatTime(seconds) {
    if (typeof window.formatTime === 'function') {
        return window.formatTime(seconds);
    }
    
    if (isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to extract CHAT format timestamps from text - this redirects to our external implementation
function extractChatTimestamps(text) {
    // If we have the external implementation available, use it for better detection
    if (typeof window.extractChatTimestamps === 'function' && window.extractChatTimestamps !== extractChatTimestamps) {
        const result = window.extractChatTimestamps(text);
        if (result) {
            console.log("Using external timestamp extractor:", result);
            return result;
        }
    }
    
    console.log("Using fallback timestamp extractor for:", text);
    
    // Check for standard CHAT format with timestamp at end: "word word 12345_67890"
    const endMatch = text.match(/\s(\d{4,5})_(\d{4,5})$/);
    if (endMatch && endMatch.length >= 3) {
        return {
            start: parseInt(endMatch[1]),
            end: parseInt(endMatch[2])
        };
    }
    
    // Check for timestamp after period: "word word. 12345_67890"
    const periodMatch = text.match(/\.\s+(\d{4,5})_(\d{4,5})/);
    if (periodMatch && periodMatch.length >= 3) {
        return {
            start: parseInt(periodMatch[1]),
            end: parseInt(periodMatch[2])
        };
    }
    
    // Try backslash format with NAK character: \u0015NUMBERS_NUMBERS\u0015
    const fullMatch = text.match(/\\u?0*15(\d+)_(\d+)\\u?0*15/);
    if (fullMatch && fullMatch.length >= 3) {
        return {
            start: parseInt(fullMatch[1]),
            end: parseInt(fullMatch[2])
        };
    }
    
    // Try alternate pattern with just one number: \u0015NUMBERS\u0015
    const singleMatch = text.match(/\\u?0*15(\d+)\\u?0*15/);
    if (singleMatch && singleMatch.length >= 2) {
        const startTime = parseInt(singleMatch[1]);
        return {
            start: startTime,
            end: startTime + 5000 // Approximate 5 seconds
        };
    }
    
    return null;
}

// Also add this to dynamically initialize timestamps if they weren't found on initial load
function initializeTimestampsPostLoad() {
    console.log("Initializing timestamps post-load with enhanced extraction");
    const transcriptLines = document.querySelectorAll('.transcript-line:not([data-start])');
    let timestampsFound = 0;
    
    transcriptLines.forEach(line => {
        const text = line.textContent || '';
        
        // Try different timestamp extraction methods in order of preference
        let timestamps = null;
        
        // 1. Try the dedicated external extractor first if available
        if (typeof window.extractTimestampsFromChat === 'function') {
            timestamps = window.extractTimestampsFromChat(text);
            if (timestamps) {
                console.log("Using dedicated extractor for line:", text);
            }
        }
        
        // 2. If that fails, try the local implementation
        if (!timestamps) {
            timestamps = extractChatTimestamps(text);
            if (timestamps) {
                console.log("Using local extractor for line:", text);
            }
        }
        
        // 3. If timestamp found, apply it to the element
        if (timestamps) {
            line.dataset.start = timestamps.start;
            line.dataset.end = timestamps.end;
            timestampsFound++;
            
            console.log(`Applied timestamp: ${timestamps.start}-${timestamps.end}ms to line:`, text);
            
            // Add timestamp display element if needed
            if (!line.querySelector('.transcript-timestamp')) {
                const timestamp = document.createElement('span');
                timestamp.className = 'transcript-timestamp';
                timestamp.textContent = formatTime(timestamps.start / 1000);
                line.appendChild(timestamp);
            }
            
            // Add click handler
            line.addEventListener('click', function() {
                console.log(`Seeking to time: ${line.dataset.start}ms`);
                if (typeof window.seekToTime === 'function') {
                    window.seekToTime(parseInt(line.dataset.start));
                }
            });
        }
    });
    
    console.log(`Post-load initialization found ${timestampsFound} timestamps out of ${transcriptLines.length} lines`);
    
    // If we found timestamps, trigger a highlight update to correctly position the transcript
    if (timestampsFound > 0 && typeof window.audio !== 'undefined' && window.audio) {
        const currentTime = window.audio.currentTime * 1000;
        if (typeof window.updateTranscriptHighlight === 'function') {
            console.log("Refreshing transcript highlight with current time:", currentTime);
            window.updateTranscriptHighlight(currentTime);
        }
    }
    
    return timestampsFound;
}

// Add scroll event handling to detect manual scrolling
function setupScrollHandling() {
    const container = document.getElementById('transcriptContainer');
    if (!container) return;
    
    // Add flags for tracking scroll state
    window.isManualScrolling = false;
    window.isProgrammaticScroll = false;
    let scrollTimeout;
    
    container.addEventListener('scroll', function() {
        // Skip if this is a programmatic scroll
        if (window.isProgrammaticScroll) return;
        
        // User is manually scrolling, set the manual scroll flag
        window.isManualScrolling = true;
        
        // Clear any existing timeout
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        // After 2 seconds of no scrolling, re-enable auto-scroll if it's turned on
        scrollTimeout = setTimeout(function() {
            window.isManualScrolling = false;
            console.log("Manual scroll ended, auto-scroll will resume if enabled");
        }, 2000);
    });
    
    console.log("Scroll handling initialized");
}

// CRITICAL: Force transcript container height constraints
// This function forcibly applies height constraints using JavaScript when CSS fails
window.forceTranscriptContainerConstraints = function() {
    console.log("🚨 ENFORCING TRANSCRIPT CONTAINER CONSTRAINTS 🚨");

    // Find the transcript container with multiple selector fallbacks
    const selectors = [
        '#transcriptContainer',
        '.transcript-container', 
        '#transcriptContainer.transcript-container',
        'div#transcriptContainer',
        '.tab-pane .transcript-container'
    ];
    
    let container = null;
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            container = element;
            console.log(`✅ Found container with selector: ${selector}`);
            break;
        }
    }
    
    if (!container) {
        console.error("❌ No transcript container found!");
        return false;
    }
    
    console.log("📊 BEFORE constraints:");
    console.log(`Height: ${container.offsetHeight}px`);
    console.log(`Computed height: ${getComputedStyle(container).height}`);
    console.log(`Max-height: ${getComputedStyle(container).maxHeight}`);
    console.log(`Overflow-Y: ${getComputedStyle(container).overflowY}`);
    
    // FORCE CONSTRAINTS with maximum priority - use JavaScript style override
    const forceStyles = {
        'height': '600px',
        'max-height': '600px', 
        'min-height': '600px',
        'overflow-y': 'auto',
        'overflow-x': 'hidden',
        'display': 'block',
        'position': 'relative',
        'border': '1px solid #e9ecef',
        'border-radius': '4px',
        'padding': '10px',
        'background-color': '#fff',
        'box-shadow': 'inset 0 1px 3px rgba(0,0,0,0.05)'
    };
    
    // Apply styles with maximum priority using setProperty with important
    for (const [property, value] of Object.entries(forceStyles)) {
        container.style.setProperty(property, value, 'important');
    }
    
    // Clear any conflicting styles from parent containers
    const parents = [container.parentElement, container.parentElement?.parentElement];
    parents.forEach((parent, index) => {
        if (parent) {
            console.log(`🔧 Clearing parent ${index + 1} constraints`);
            parent.style.setProperty('height', 'auto', 'important');
            parent.style.setProperty('max-height', 'none', 'important');
            parent.style.setProperty('overflow', 'visible', 'important');
        }
    });
    
    // Force a reflow to apply changes
    container.offsetHeight;
    
    console.log("📊 AFTER constraints:");
    console.log(`Height: ${container.offsetHeight}px`);
    console.log(`Computed height: ${getComputedStyle(container).height}`);
    console.log(`Max-height: ${getComputedStyle(container).maxHeight}`);
    console.log(`Overflow-Y: ${getComputedStyle(container).overflowY}`);
    
    // Verify the fix worked
    const isFixed = container.offsetHeight <= 650 && container.offsetHeight >= 550;
    
    if (isFixed) {
        console.log("✅ CONTAINER CONSTRAINTS SUCCESSFULLY APPLIED!");
        
        // Test if auto-scroll is now working
        if (typeof performAutoScroll === 'function') {
            console.log("🧪 Testing auto-scroll after constraint fix...");
            const lines = container.querySelectorAll('.transcript-line, [data-start-time]');
            if (lines.length > 10) {
                const testLine = lines[Math.floor(lines.length / 2)];
                const result = performAutoScroll(testLine);
                console.log(`Auto-scroll test result: ${result}`);
                
                if (container.scrollTop > 0) {
                    console.log("✅ Auto-scroll is now working!");
                } else {
                    console.log("⚠️ Auto-scroll still needs attention");
                }
            }
        }
    } else {
        console.log(`❌ CONSTRAINTS FAILED! Height is still ${container.offsetHeight}px`);
        console.log("🔍 Checking for inline styles or other interference...");
        
        // Log any inline styles that might be interfering
        if (container.style.cssText) {
            console.log("Inline styles found:", container.style.cssText);
        }
        
        // Check computed styles for unexpected values
        const computed = getComputedStyle(container);
        console.log("All computed height-related styles:", {
            height: computed.height,
            maxHeight: computed.maxHeight,
            minHeight: computed.minHeight,
            overflow: computed.overflow,
            overflowY: computed.overflowY,
            display: computed.display,
            position: computed.position
        });
    }
    
    return isFixed;
};

// Also expose a simpler version for manual debugging
window.fixTranscriptHeight = window.forceTranscriptContainerConstraints;

// Call the initialization functions after the transcript is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for transcript to load
    setTimeout(function() {
        const timestampsFound = initializeTimestampsPostLoad();
        setupScrollHandling();
        
        // If no timestamps were found on first try, attempt again with longer delay
        if (timestampsFound === 0) {
            console.log("No timestamps found on first pass, trying again after delay");
            setTimeout(function() {
                const secondAttempt = initializeTimestampsPostLoad();
                console.log(`Second attempt found ${secondAttempt} timestamps`);
                
                // If still no success, run with a more aggressive extraction approach
                if (secondAttempt === 0) {
                    console.log("Trying with more aggressive timestamp detection");
                    extractTimestampsFromAllText();
                }
            }, 2000);
        }
    }, 2000); // 2 second delay to ensure transcript is loaded
});

// Helper function for aggressive timestamp extraction from any text content
function extractTimestampsFromAllText() {
    console.log("Running aggressive timestamp extraction");
    const transcriptContainer = document.getElementById('transcriptContainer');
    if (!transcriptContainer) return 0;
    
    // Get all text content from the container
    const allText = transcriptContainer.textContent;
    
    // Extract all possible timestamp patterns
    const timestampPatterns = [
        /(\d{4,5})_(\d{4,5})/g,    // Format: 12345_67890
        /\[(\d+)-(\d+)\]/g,         // Format: [12345-67890]
        /\\u?0*15(\d+)_(\d+)\\u?0*15/g  // Format: \u001512345_67890\u0015
    ];
    
    const foundTimestamps = [];
    
    // Extract all timestamp patterns
    for (const pattern of timestampPatterns) {
        const matches = [...allText.matchAll(pattern)];
        if (matches.length > 0) {
            matches.forEach(match => {
                if (match.length >= 3) {
                    foundTimestamps.push({
                        start: parseInt(match[1]),
                        end: parseInt(match[2]),
                        text: match[0]
                    });
                }
            });
        }
    }
    
    console.log(`Found ${foundTimestamps.length} timestamps in text`);
    
    // Now try to associate timestamps with lines
    if (foundTimestamps.length > 0) {
        const lines = document.querySelectorAll('.transcript-line:not([data-start])');
        let timestampsApplied = 0;
        
        lines.forEach(line => {
            const lineText = line.textContent || '';
            
            // Find a timestamp that matches this line
            for (const timestamp of foundTimestamps) {
                if (lineText.includes(timestamp.text)) {
                    line.dataset.start = timestamp.start;
                    line.dataset.end = timestamp.end;
                    timestampsApplied++;
                    
                    // Add timestamp display element
                    if (!line.querySelector('.transcript-timestamp')) {
                        const timestampElement = document.createElement('span');
                        timestampElement.className = 'transcript-timestamp';
                        timestampElement.textContent = formatTime(timestamp.start / 1000);
                        line.appendChild(timestampElement);
                    }
                    
                    // Add click handler
                    line.addEventListener('click', function() {
                        console.log(`Seeking to time: ${line.dataset.start}ms`);
                        if (typeof window.seekToTime === 'function') {
                            window.seekToTime(parseInt(line.dataset.start));
                        }
                    });
                    
                    break;
                }
            }
        });
        
        console.log(`Aggressive extraction applied ${timestampsApplied} timestamps`);
        
        // Update highlighting if we found timestamps
        if (timestampsApplied > 0 && typeof window.updateTranscriptHighlight === 'function') {
            const currentTime = window.audio ? window.audio.currentTime * 1000 : 0;
            window.updateTranscriptHighlight(currentTime);
        }
        
        return timestampsApplied;
    }
    
    return 0;
}

// Helper function to decode Unicode escape sequences like \u000A (newline) and \u0015 (NAK)
function decodeUnicodeEscapeSequences(text) {
    if (!text) return text;
    
    // Handle both standard format \uXXXX and other forms like \u000A or \0015
    return text
        // Handle standard JavaScript Unicode escapes \uXXXX
        .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        })
        // Handle other backslash formats like \0015XXXX\0015 (CHAT format specific notation)
        .replace(/\\0*15(\d+(?:_\d+)?)\\0*15/g, (match, timestamps) => {
            return timestamps; // Keep the full timestamp part including underscore and end time
        })
        // Handle actual NAK characters (Unicode 0015) around timestamps
        .replace(/\u0015(\d+(?:_\d+)?)\u0015/g, (match, timestamps) => {
            return timestamps; // Keep the full timestamp part including underscore and end time
        })
        // Handle \1234 style escape sequences (octal notation)
        .replace(/\\([0-7]{3})/g, (match, oct) => {
            return String.fromCharCode(parseInt(oct, 8));
        })
        // Handle numeric escape codes like \15 or \015
        .replace(/\\0*([0-9]{1,3})/g, (match, num) => {
            return String.fromCharCode(parseInt(num, 10));
        });
}