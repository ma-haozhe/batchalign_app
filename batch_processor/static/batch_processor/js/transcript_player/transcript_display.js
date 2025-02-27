/**
 * Transcript Display functionality for the Transcript Player
 */

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
    
    // Setup transcript highlighting function
    setupTranscriptHighlighting();
    
    console.log("Transcript display initialization complete");
}

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
                uniqueSpeakers.add(originalSpeaker);
                
                utteranceLine.dataset.speaker = originalSpeaker;
                
                // Extract text and timestamp
                let text = line.substring(colonIndex + 1).trim();
                
                // Look for timestamp at the end (format: 18805_22745)
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
                    
                    console.log(`Found timestamp: ${startTime}-${endTime}ms for line: ${text}`);
                } else {
                    // Try to find [start-end] format
                    const timestampMatch = text.match(/\[(\d+)-(\d+)\]/);
                    if (timestampMatch && timestampMatch.length >= 3) {
                        const startTime = parseInt(timestampMatch[1]);
                        const endTime = parseInt(timestampMatch[2]);
                        
                        utteranceLine.dataset.start = startTime;
                        utteranceLine.dataset.end = endTime;
                        
                        // Remove timestamp from displayed text
                        text = text.replace(/\[\d+-\d+\]/, '');
                        
                        console.log(`Found timestamp: ${startTime}-${endTime}ms for line: ${text}`);
                    }
                }
                
                // Set click handler if we have a timestamp
                if (utteranceLine.dataset.start) {
                    utteranceLine.addEventListener('click', function() {
                        console.log(`Seeking to time: ${utteranceLine.dataset.start}ms`);
                        seekToTime(utteranceLine.dataset.start);
                    });
                }
                
                // Get mapped speaker
                const mappedSpeaker = speakerMappings[originalSpeaker] || originalSpeaker;
                utteranceLine.dataset.mappedSpeaker = mappedSpeaker;
                
                // Create speaker label with mapped speaker
                const speakerLabel = document.createElement('span');
                speakerLabel.className = 'speaker-label';
                speakerLabel.textContent = `*${mappedSpeaker}:`;
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
                textContent.textContent = text;
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

function parseWordTimings(worLine) {
    const wordTimings = [];
    const parts = worLine.split(' ');
    
    for (let i = 0; i < parts.length; i++) {
        // Look for timing pattern like "word 1234_5678"
        if (i < parts.length - 1 && parts[i+1] && parts[i+1].match(/^\d+_\d+$/)) {
            const word = parts[i];
            const timing = parts[i+1];
            const times = timing.split('_');
            
            if (times.length === 2 && !isNaN(times[0]) && !isNaN(times[1])) {
                wordTimings.push({
                    word: word,
                    start: parseInt(times[0]),
                    end: parseInt(times[1])
                });
            }
            i++; // Skip the timing part
        }
    }
    
    return wordTimings;
}

function displaySegments(segments) {
    console.log("Displaying segments data");
    const transcriptContainer = document.getElementById('transcriptContainer');
    transcriptContainer.innerHTML = '';
    
    // Sort segments by start time
    segments.sort((a, b) => a.start - b.start);
    
    // Get missing segments if available
    let missingSegmentsData = document.getElementById('missingSegmentsData');
    let missingSegmentsContent = missingSegmentsData ? missingSegmentsData.value : '[]';
    let missingSegments = [];
    
    if (missingSegmentsContent && missingSegmentsContent.trim() !== "") {
        try {
            missingSegments = JSON.parse(missingSegmentsContent);
            console.log(`Found ${missingSegments.length} missing segments`);
        } catch (e) {
            console.error("Error parsing missing segments JSON:", e);
        }
    }
    
    // Merge regular segments and missing segments in chronological order
    const allSegments = [...segments];
    
    missingSegments.forEach(segment => {
        allSegments.push({
            ...segment,
            isMissing: true
        });
    });
    
    // Sort all segments by start time
    allSegments.sort((a, b) => a.start - b.start);
    
    // Display all segments
    allSegments.forEach(segment => {
        if (segment.isMissing) {
            // Create missing segment element
            const missingLine = document.createElement('div');
            missingLine.className = 'missing-segment';
            missingLine.dataset.start = segment.start;
            missingLine.dataset.end = segment.end;
            missingLine.dataset.speaker = segment.speaker;
            
            // Add click handler for seeking
            missingLine.addEventListener('click', function(e) {
                // Don't trigger if clicking on the edit button
                if (e.target.tagName === 'BUTTON') return;
                
                console.log(`Seeking to time: ${segment.start}ms`);
                seekToTime(segment.start);
            });
            
            // Add double-click handler for editing
            missingLine.addEventListener('dblclick', function() {
                toggleMissingSegmentEdit(missingLine);
            });
            
            // Create timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'transcript-timestamp';
            timestamp.textContent = formatTime(segment.start / 1000);
            
            // Create icon
            const icon = document.createElement('span');
            icon.className = 'missing-segment-icon';
            icon.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i>';
            
            // Create text content
            const textContent = document.createElement('span');
            textContent.className = 'missing-segment-text';
            textContent.textContent = `Missing content (${segment.speaker})`;
            
            // Create edit button
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-outline-primary ms-2';
            editButton.innerHTML = '<i class="bi bi-pencil"></i>';
            editButton.addEventListener('click', function() {
                toggleMissingSegmentEdit(missingLine);
            });
            
            // Create edit form
            const editForm = document.createElement('div');
            editForm.className = 'missing-segment-edit';
            editForm.innerHTML = `
                <div class="input-group">
                    <input type="text" class="form-control" placeholder="Enter missing content...">
                    <button class="btn btn-primary save-missing" type="button">Save</button>
                    <button class="btn btn-secondary cancel-missing" type="button">Cancel</button>
                </div>
            `;
            
            // Add event listeners to edit form buttons
            editForm.querySelector('.save-missing').addEventListener('click', function() {
                saveMissingSegment(missingLine);
            });
            
            editForm.querySelector('.cancel-missing').addEventListener('click', function() {
                toggleMissingSegmentEdit(missingLine);
            });
            
            // Assemble the missing segment element
            missingLine.appendChild(timestamp);
            missingLine.appendChild(icon);
            missingLine.appendChild(textContent);
            missingLine.appendChild(editButton);
            missingLine.appendChild(editForm);
            
            transcriptContainer.appendChild(missingLine);
        } else {
            // Regular segment
            const line = document.createElement('div');
            line.className = 'transcript-line';
            line.dataset.start = segment.start;
            line.dataset.end = segment.end;
            
            // Use addEventListener instead of onclick
            line.addEventListener('click', function() {
                console.log(`Seeking to time: ${segment.start}ms`);
                seekToTime(segment.start);
            });
            
            // Add speaker to unique speakers set
            if (segment.speaker) {
                uniqueSpeakers.add(segment.speaker);
            }
            
            const timestamp = document.createElement('span');
            timestamp.className = 'transcript-timestamp';
            timestamp.textContent = formatTime(segment.start / 1000);
            
            // Apply speaker mapping if available
            const originalSpeaker = segment.speaker;
            const mappedSpeaker = speakerMappings[originalSpeaker] || originalSpeaker;
            
            line.dataset.speaker = originalSpeaker;
            line.dataset.mappedSpeaker = mappedSpeaker;
            
            const speaker = document.createElement('span');
            speaker.className = 'speaker-label';
            speaker.textContent = mappedSpeaker;
            
            const text = document.createElement('span');
            text.className = 'utterance-text';
            text.textContent = segment.text || '';
            
            line.appendChild(timestamp);
            line.appendChild(speaker);
            line.appendChild(text);
            
            transcriptContainer.appendChild(line);
        }
    });
}

// Setup the transcript highlighting functionality
function setupTranscriptHighlighting() {
    // Define the global transcript highlight function
    window.updateTranscriptHighlight = function() {
        if (!window.player || isNaN(window.player.currentTime)) {
            console.warn("Player not ready for transcript highlighting");
            return;
        }
        
        const currentTime = window.player.currentTime * 1000; // Convert to milliseconds
        
        // Find all possible timestamp-containing lines
        const transcriptLines = document.querySelectorAll('.transcript-line:not(.comment-line)');
        if (transcriptLines.length === 0) return;
        
        // First remove any existing active/next-up classes
        document.querySelectorAll('.active, .next-up').forEach(el => {
            el.classList.remove('active', 'next-up');
        });
        
        // Simple state tracking for our search
        let activeElement = null;
        let closestPastLine = null;
        let closestPastDistance = Infinity;
        let nextUpLine = null;
        let nextUpDistance = Infinity;
        
        // Scan all transcript lines to find the appropriate one
        transcriptLines.forEach(line => {
            // Skip lines without timing data
            if (!line.dataset.start) return;
            
            const start = parseFloat(line.dataset.start);
            const end = line.dataset.end ? parseFloat(line.dataset.end) : start + 10000; // Default 10sec if no end
            
            // Check if this line is active (current time is within its range)
            if (currentTime >= start && currentTime <= end) {
                line.classList.add('active');
                activeElement = line;
            }
            // Track closest past line for fallback
            else if (start < currentTime) {
                const distance = currentTime - start;
                if (distance < closestPastDistance) {
                    closestPastDistance = distance;
                    closestPastLine = line;
                }
            }
            // Track upcoming line for "next up" indicator
            else if (start > currentTime) {
                const distance = start - currentTime;
                if (distance < nextUpDistance) {
                    nextUpDistance = distance;
                    nextUpLine = line;
                }
            }
        });
        
        // If we found an active element, scroll to it
        if (activeElement) {
            scrollToElement(activeElement);
        }
        // Otherwise, fallback to closest past line
        else if (closestPastLine) {
            closestPastLine.classList.add('active');
            scrollToElement(closestPastLine);
        }
        
        // If we have a "next up" line coming within 5 seconds, highlight it
        if (nextUpLine && nextUpDistance < 5000) {
            nextUpLine.classList.add('next-up');
        }
    };
    
    // Do an initial highlighting pass
    window.updateTranscriptHighlight();
}

// Helper function to scroll the transcript to a specific element
function scrollToElement(element) {
    if (!element) return;
    
    try {
        const container = document.getElementById('transcriptContainer');
        if (!container) return;
        
        // Simple approach - scroll element into center view
        const elementTop = element.offsetTop;
        const containerHeight = container.clientHeight;
        
        // Center the element
        container.scrollTop = elementTop - (containerHeight / 2) + (element.offsetHeight / 2);
    } catch (error) {
        console.error("Error scrolling to element:", error);
        // Fallback
        try {
            element.scrollIntoView({block: 'center'});
        } catch (e) {
            // Ignore if this fails too
        }
    }
}

// Add a new function to highlight individual words based on timing
function highlightWords(lineElement, wordTimings, currentTime) {
    // Get the text content element
    const textElement = lineElement.querySelector('.utterance-text');
    if (!textElement) return;
    
    // If this is the first time highlighting, save the original text
    if (!lineElement.dataset.originalText) {
        lineElement.dataset.originalText = textElement.textContent;
    }
    
    // Create a new HTML content with highlighted words
    let newHtml = '';
    let anyHighlighted = false;
    
    // Sort word timings by start time to ensure correct order
    const sortedTimings = [...wordTimings].sort((a, b) => a.start - b.start);
    
    for (const wordTiming of sortedTimings) {
        const { word, start, end } = wordTiming;
        
        // Determine if this word should be highlighted
        const isActive = currentTime >= start && currentTime <= end;
        const className = isActive ? 'highlighted-word' : '';
        
        if (isActive) anyHighlighted = true;
        
        newHtml += `<span class="${className}">${word} </span>`;
    }
    
    // Update the text content with the new HTML only if we have word timings
    // and at least one word is highlighted
    if (newHtml && anyHighlighted) {
        textElement.innerHTML = newHtml;
    } else if (lineElement.dataset.originalText && !anyHighlighted) {
        // Restore original text if no words are highlighted
        textElement.textContent = lineElement.dataset.originalText;
    }
} 