/**
 * Enhanced Transcript Initialization
 * This script ensures proper Unicode handling and initialization
 */

// When the DOM is fully loaded, check if transcript initialization is working
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - checking transcript initialization");
    
    // Wait a short time to see if the normal initialization happens
    setTimeout(function() {
        const transcriptContainer = document.getElementById('transcriptContainer');
        
        if (!transcriptContainer) {
            console.error("Transcript container not found in DOM");
            return;
        }
        
        // If the transcript container is empty, the normal initialization failed
        if (transcriptContainer.childElementCount === 0) {
            console.warn("Transcript container empty - initializing with fallback method");
            initializeTranscriptWithFallback();
        } else {
            console.log("Transcript already initialized, checking for timestamps");
            // Check if we have any timestamps
            const timestampedLines = document.querySelectorAll('.transcript-line[data-start]');
            if (timestampedLines.length === 0) {
                console.warn("No timestamped lines found - initializing timestamps with fallback");
                initializeTimestampsWithFallback();
            }
        }
    }, 3000); // Wait 3 seconds to see if normal initialization completes
});

// Function to initialize transcript with fallback method
function initializeTranscriptWithFallback() {
    console.log("Running transcript initialization fallback");
    
    // Get content
    const chatContent = document.getElementById('chatContent');
    if (!chatContent || !chatContent.value) {
        console.error("No CHAT content available");
        return;
    }
    
    // First make sure we have the Unicode decoder
    if (typeof window.decodeUnicodeEscapeSequences !== 'function') {
        // Define a basic decoder if not available
        window.decodeUnicodeEscapeSequences = function(text) {
            if (!text) return text;
            
            return text
                .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
                    return String.fromCharCode(parseInt(hex, 16));
                })
                .replace(/\\0*15(\d+)(?:_\d+)?\\0*15/g, (match, num) => {
                    return num;
                })
                .replace(/\\0*([0-9]{1,3})/g, (match, num) => {
                    return String.fromCharCode(parseInt(num, 10));
                });
        };
    }
    
    // Decode content
    const decodedContent = window.decodeUnicodeEscapeSequences(chatContent.value);
    
    // Try to call the display function
    if (typeof displayChatContent === 'function') {
        displayChatContent(decodedContent);
    } else {
        // Fallback if no display function is available
        displayChatContentFallback(decodedContent);
    }
    
    // After displaying, initialize timestamps
    setTimeout(initializeTimestampsWithFallback, 1000);
}

// Fallback display function for CHAT content
function displayChatContentFallback(content) {
    console.log("Using fallback display function for CHAT content");
    
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
    
    lines.forEach((line, index) => {
        if (line.trim() === '') return;
        
        if (line.startsWith('@')) {
            // Header line
            const headerLine = document.createElement('div');
            headerLine.className = 'header-line';
            headerLine.textContent = line;
            headerContainer.appendChild(headerLine);
        } else if (line.startsWith('*')) {
            // Utterance line
            inHeader = false;
            const utteranceLine = document.createElement('div');
            utteranceLine.className = 'transcript-line';
            utteranceLine.dataset.line = index;
            
            // Extract speaker
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const speaker = line.substring(1, colonIndex).trim();
                utteranceLine.dataset.speaker = speaker;
                
                // Create speaker label
                const speakerLabel = document.createElement('span');
                speakerLabel.className = 'speaker-label';
                speakerLabel.textContent = `*${speaker}:`;
                utteranceLine.appendChild(speakerLabel);
                
                // Create text content
                const textContent = document.createElement('span');
                textContent.className = 'utterance-text';
                textContent.textContent = line.substring(colonIndex + 1).trim();
                utteranceLine.appendChild(textContent);
                
                // Add content progress indicator
                const progressIndicator = document.createElement('div');
                progressIndicator.className = 'content-progress';
                progressIndicator.style.width = '0%';
                utteranceLine.appendChild(progressIndicator);
                
                transcriptContainer.appendChild(utteranceLine);
            }
        } else if (line.startsWith('%')) {
            // Comment line
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
    
    console.log("Fallback display completed");
}

// Function to initialize timestamps with fallback method
function initializeTimestampsWithFallback() {
    console.log("Running timestamp initialization fallback");
    
    // Define timestamp patterns to look for
    const patterns = [
        /(\d{5})_(\d{5})$/,                    // Direct pattern for CHAT format with 5-digit timestamps
        /\.\s+(\d{4,6})_(\d{4,6})/,            // Pattern for timestamps after periods
        /\\u?0*15(\d{4,6})_(\d{4,6})\\u?0*15/, // NAK enclosed timestamps
        /\u0015(\d{4,6})_(\d{4,6})\u0015/      // Already decoded NAK timestamps
    ];
    
    // Get all transcript lines without timestamps
    const transcriptLines = document.querySelectorAll('.transcript-line:not([data-start])');
    let timestampsFound = 0;
    
    // Process each line
    transcriptLines.forEach(line => {
        const text = line.textContent || '';
        
        // Try each pattern
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match.length >= 3) {
                const start = parseInt(match[1]);
                const end = parseInt(match[2]);
                
                // Apply timestamp to the line
                line.dataset.start = start;
                line.dataset.end = end;
                timestampsFound++;
                
                // Add timestamp display
                if (!line.querySelector('.transcript-timestamp')) {
                    const timestamp = document.createElement('span');
                    timestamp.className = 'transcript-timestamp chat-timestamp';
                    timestamp.textContent = formatTimeFallback(start / 1000);
                    line.appendChild(timestamp);
                }
                
                // Add click handler
                line.addEventListener('click', function() {
                    console.log(`Seeking to time: ${start}ms`);
                    if (typeof window.seekToTime === 'function') {
                        window.seekToTime(start);
                    }
                });
                
                // Break out of pattern loop once we find a match
                break;
            }
        }
    });
    
    console.log(`Fallback timestamp initialization found ${timestampsFound} timestamps`);
    
    // If we found timestamps, attempt to highlight the current position
    if (timestampsFound > 0) {
        updateAutoScrollState();
        
        // Try to update the transcript highlight
        let currentTime = 0;
        if (typeof window.wavesurfer !== 'undefined' && window.wavesurfer) {
            currentTime = window.wavesurfer.getCurrentTime() * 1000;
        } else if (typeof window.audio !== 'undefined' && window.audio) {
            currentTime = window.audio.currentTime * 1000;
        }
        
        if (typeof window.updateTranscriptHighlight === 'function') {
            window.updateTranscriptHighlight(currentTime);
        } else if (typeof updateTranscriptHighlight === 'function') {
            updateTranscriptHighlight(currentTime);
        }
    }
    
    return timestampsFound;
}

// Format time as MM:SS for timestamp display
function formatTimeFallback(seconds) {
    if (typeof window.formatTime === 'function') {
        return window.formatTime(seconds);
    }
    
    if (isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Make sure auto-scroll is properly initialized
function updateAutoScrollState() {
    const autoScrollToggle = document.getElementById('autoScrollToggle');
    if (autoScrollToggle) {
        window.autoScroll = autoScrollToggle.checked;
        console.log("Auto-scroll set to:", window.autoScroll);
    } else {
        window.autoScroll = true;
        console.log("Auto-scroll toggle not found, defaulting to enabled");
    }
}
