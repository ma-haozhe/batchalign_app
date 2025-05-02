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
        displayChatContent(chatContent);
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
                const originalSpeaker = line.substring(1, colonIndex).trim();
                window.uniqueSpeakers.add(originalSpeaker);
                
                utteranceLine.dataset.speaker = originalSpeaker;
                
                // Extract text and timestamp
                let text = line.substring(colonIndex + 1).trim();
                console.log(`Processing line: "${text}"`);
                
                // Try multiple timestamp formats, from most common to least common
                let timestampFound = false;
                
                // Format 1: Check for standard format "word word word 12345_67890"
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
                        console.log(`Seeking to time: ${utteranceLine.dataset.start}ms`);
                        if (typeof window.seekToTime === 'function') {
                            window.seekToTime(parseInt(utteranceLine.dataset.start));
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
                
                // Create timestamp display
                if (utteranceLine.dataset.start) {
                    const timestamp = document.createElement('span');
                    timestamp.className = 'transcript-timestamp';
                    timestamp.textContent = formatTime(utteranceLine.dataset.start / 1000);
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
                    wordSpan.textContent = word + (i < textWords.length - 1 ? ' ' : '');
                    textContent.appendChild(wordSpan);
                });
                
                utteranceLine.appendChild(textContent);
                transcriptContainer.appendChild(utteranceLine);
                lastUtteranceLine = utteranceLine;
            }
        } else if (line.startsWith('%wor:')) {
            // Word-level timing line - just display as comment without parsing
            inHeader = false;
            const commentLine = document.createElement('div');
            commentLine.className = 'transcript-line comment-line';
            commentLine.textContent = line;
            transcriptContainer.appendChild(commentLine);
        } else if (line.startsWith('%')) {
            // Other comment line
            inHeader = false;
            const commentLine = document.createElement('div');
            commentLine.className = 'transcript-line comment-line';
            commentLine.textContent = line;
            transcriptContainer.appendChild(commentLine);
        } else if (!inHeader) {
            // Other content after header
            const contentLine = document.createElement('div');
            contentLine.className = 'transcript-line';
            contentLine.textContent = line;
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
        
    // Scan all transcript lines with time data to find the appropriate one
        transcriptLines.forEach(line => {
            // Skip lines without timing data
            if (!line.dataset.start) return;
            
        const start = parseInt(line.dataset.start);
        const end = line.dataset.end ? parseInt(line.dataset.end) : start + 10000; // Default 10sec if no end
            
            // Check if this line is active (current time is within its range)
        if (currentTimeMs >= start && currentTimeMs <= end) {
                line.classList.add('active');
                activeElement = line;
            }
            // Track closest past line for fallback
        else if (start < currentTimeMs) {
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
        });
        
        // If we found an active element, scroll to it if auto-scroll is enabled
        if (activeElement) {
        if (window.autoScroll) {
                scrollToElement(activeElement);
            }
        }
        // Otherwise, fallback to closest past line
        else if (closestPastLine) {
            closestPastLine.classList.add('active');
        if (window.autoScroll) {
                scrollToElement(closestPastLine);
            }
        }
        
        // If we have a "next up" line coming within 5 seconds, highlight it
        if (nextUpLine && nextUpDistance < 5000) {
            nextUpLine.classList.add('next-up');
        }
}

// Helper function to scroll the transcript to a specific element
function scrollToElement(element) {
    if (!element) return;
    
    // First check if auto-scroll is enabled
    if (window.autoScroll !== true) {
        return;
    }
    
    const container = document.getElementById('transcriptContainer');
    if (!container) {
        console.error("Transcript container not found for auto-scrolling");
        return;
    }
    
    try {
        // Get the position of the element relative to the container
        const elementTop = element.offsetTop;
        const containerHeight = container.clientHeight;
        const elementHeight = element.offsetHeight;
        
        // Calculate scroll position to center the element
        const scrollPosition = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        // Smoothly scroll to the position
        container.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
        
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

// Helper function to extract CHAT format timestamps from text with backslashes
function extractChatTimestamps(text) {
    // The format appears to be \u0015NUMBERS_NUMBERS\u0015
    // First, look for the pattern of backslash + digits with underscore + backslash
    const fullMatch = text.match(/\\u?0*15(\d+)_(\d+)\\u?0*15/);
    if (fullMatch && fullMatch.length >= 3) {
        return {
            start: parseInt(fullMatch[1]),
            end: parseInt(fullMatch[2])
        };
    }
    
    // Try alternate pattern with just one number
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
    console.log("Initializing timestamps post-load");
    const transcriptLines = document.querySelectorAll('.transcript-line:not([data-start])');
    let timestampsFound = 0;
    
    transcriptLines.forEach(line => {
        const text = line.textContent || '';
        
        // Try to find timestamps in the text content using our various extraction methods
        const timestamps = extractChatTimestamps(text);
        if (timestamps) {
            line.dataset.start = timestamps.start;
            line.dataset.end = timestamps.end;
            timestampsFound++;
            
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
    
    console.log(`Post-load initialization found ${timestampsFound} timestamps`);
    return timestampsFound;
}

// Call the initialization function after the transcript is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for transcript to load
    setTimeout(function() {
        initializeTimestampsPostLoad();
    }, 2000); // 2 second delay to ensure transcript is loaded
}); 