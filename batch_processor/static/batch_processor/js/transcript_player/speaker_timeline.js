/**
 * Speaker Timeline Visualization for the Transcript Player
 * This module provides visualization of speaker segments similar to Pyannote,
 * showing who is speaking at what time with colored segments for each speaker.
 */

// Global timeline variables
window.timelineCanvas = null;
window.timelineCtx = null;
window.timelineDuration = 0;
window.timelineSegments = [];
window.timelineCurrentTime = 0;
window.timelineColors = {};

// Initialize speaker timeline visualization
window.setupSpeakerTimeline = function() {
    console.log("Setting up speaker timeline visualization");
    
    const timelineContainer = document.getElementById('speakerTimeline');
    if (!timelineContainer) {
        console.error("Speaker timeline container not found");
        return;
    }
    
    // Clear any previous content
    timelineContainer.innerHTML = '';
    
    // Get transcript information
    const transcriptId = document.getElementById('transcriptId')?.value;
    if (!transcriptId) {
        console.warn("No transcript ID found, cannot load timeline data");
        showTimelineError(timelineContainer, "Cannot load timeline: Missing transcript ID");
        return;
    }
    
    // Get diarization data
    const diarizationData = document.getElementById('diarizationData')?.value;
    if (!diarizationData || diarizationData === '[]') {
        console.warn("No diarization data available");
        showTimelineError(timelineContainer, "No speaker diarization data available");
        return;
    }
    
    try {
        // Parse the diarization data
        const segments = JSON.parse(diarizationData);
        if (!segments || segments.length === 0) {
            console.warn("Empty diarization data");
            showTimelineError(timelineContainer, "Speaker diarization data is empty");
            return;
        }
        
        // Calculate total duration
        let maxEndTime = 0;
        segments.forEach(segment => {
            if (segment.end > maxEndTime) {
                maxEndTime = segment.end;
            }
        });
        
        window.timelineDuration = maxEndTime;
        window.timelineSegments = segments;
        
        // Create canvas for visualization
        createTimelineCanvas(timelineContainer);
        
        // Get all unique speakers and assign colors if not already assigned
        const speakers = new Set();
        segments.forEach(segment => {
            if (segment.speaker) {
                speakers.add(segment.speaker);
            }
        });
        
        // Use existing color mapping if available
        Array.from(speakers).forEach(speaker => {
            if (!window.timelineColors[speaker] && window.speakerColors && window.speakerColors[speaker]) {
                window.timelineColors[speaker] = window.speakerColors[speaker];
            }
        });
        
        // Draw the timeline
        drawSpeakerTimeline();
        
        // Add playhead position update listener
        setupTimelinePlayhead();
        
        // Add a legend for speakers
        createSpeakerLegend(timelineContainer, speakers);
        
    } catch (error) {
        console.error("Error setting up speaker timeline:", error);
        showTimelineError(timelineContainer, "Error processing diarization data");
    }
};

// Helper function to create the canvas element
function createTimelineCanvas(container) {
    // Create a wrapper for the timeline with fixed height
    const timelineWrapper = document.createElement('div');
    timelineWrapper.className = 'speaker-timeline-wrapper';
    timelineWrapper.style.position = 'relative';
    timelineWrapper.style.height = '100px';
    timelineWrapper.style.width = '100%';
    timelineWrapper.style.overflow = 'hidden';
    timelineWrapper.style.border = '1px solid #e0e0e0';
    timelineWrapper.style.borderRadius = '4px';
    timelineWrapper.style.backgroundColor = '#f8f9fa';
    
    // Create the canvas element
    window.timelineCanvas = document.createElement('canvas');
    window.timelineCanvas.id = 'timelineCanvas';
    window.timelineCanvas.width = container.clientWidth * 2; // Higher resolution
    window.timelineCanvas.height = 100 * 2; // Higher resolution
    window.timelineCanvas.style.width = '100%';
    window.timelineCanvas.style.height = '100%';
    
    // Get the canvas context
    window.timelineCtx = window.timelineCanvas.getContext('2d');
    
    // Add the canvas to the container
    timelineWrapper.appendChild(window.timelineCanvas);
    
    // Create the playhead element
    const playhead = document.createElement('div');
    playhead.id = 'timelinePlayhead';
    playhead.style.position = 'absolute';
    playhead.style.top = '0';
    playhead.style.left = '0';
    playhead.style.width = '2px';
    playhead.style.height = '100%';
    playhead.style.backgroundColor = '#dc3545';
    playhead.style.pointerEvents = 'none';
    playhead.style.zIndex = '10';
    playhead.style.opacity = '0.8';
    
    // Add the playhead to the wrapper
    timelineWrapper.appendChild(playhead);
    
    // Add click event on the wrapper for seeking
    timelineWrapper.addEventListener('click', handleTimelineClick);
    
    // Add the wrapper to the container
    container.appendChild(timelineWrapper);
}

// Draw the speaker timeline visualization
function drawSpeakerTimeline() {
    if (!window.timelineCtx || !window.timelineCanvas || !window.timelineSegments || window.timelineSegments.length === 0) {
        console.error("Cannot draw timeline: missing required elements");
        return;
    }
    
    const ctx = window.timelineCtx;
    const canvas = window.timelineCanvas;
    const segments = window.timelineSegments;
    const duration = window.timelineDuration;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Define the layout
    const speakerRows = {};
    const uniqueSpeakers = Array.from(new Set(segments.map(segment => segment.speaker)));
    const rowHeight = Math.floor(canvas.height / (uniqueSpeakers.length + 1)); // +1 for confidence row
    
    // Assign vertical positions to each speaker
    uniqueSpeakers.forEach((speaker, index) => {
        speakerRows[speaker] = (index + 1) * rowHeight;
        
        // If we don't already have a color for this speaker, assign one
        if (!window.timelineColors[speaker]) {
            const colorIndex = index % window.colorPalette.length;
            window.timelineColors[speaker] = window.colorPalette[colorIndex];
        }
    });
    
    // Draw confidence indicator at the top (like Pyannote)
    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.fillRect(0, 0, canvas.width, rowHeight);
    
    // Draw labels on the right side
    ctx.font = `${Math.round(rowHeight * 0.5)}px Arial`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // Draw confidence label
    ctx.fillStyle = '#888';
    ctx.fillText('Confidence', canvas.width - 10, rowHeight / 2);
    
    // Draw speaker labels and backgrounds
    uniqueSpeakers.forEach(speaker => {
        const y = speakerRows[speaker];
        
        // Draw label background
        ctx.fillStyle = 'rgba(248, 249, 250, 0.7)';
        ctx.fillRect(canvas.width - 120, y - rowHeight / 2, 120, rowHeight);
        
        // Draw speaker label
        ctx.fillStyle = window.timelineColors[speaker] || '#333';
        
        // Use mapped speaker name if available
        const mappedSpeaker = window.speakerMappings && 
                             window.speakerMappings[speaker] ? 
                             (typeof window.speakerMappings[speaker] === 'string' ? 
                              window.speakerMappings[speaker] : 
                              window.speakerMappings[speaker].role || speaker) : 
                             speaker;
                             
        ctx.fillText(mappedSpeaker, canvas.width - 10, y);
    });
    
    // Prepare to draw segments
    const timeScale = canvas.width / duration;
    
    // Draw speaker segments
    segments.forEach(segment => {
        if (!segment.speaker) return;
        
        const speaker = segment.speaker;
        const startX = segment.start * timeScale;
        const endX = segment.end * timeScale;
        const y = speakerRows[speaker];
        const segmentWidth = Math.max(endX - startX, 2); // Ensure at least 2px width for visibility
        
        // Draw segment
        ctx.fillStyle = window.timelineColors[speaker] || '#333';
        ctx.fillRect(startX, y - rowHeight * 0.4, segmentWidth, rowHeight * 0.8);
    });
    
    // Draw time markers at the bottom
    drawTimeMarkers(ctx, canvas, duration);
}

// Draw time markers on the timeline
function drawTimeMarkers(ctx, canvas, duration) {
    const timeScale = canvas.width / duration;
    const markerInterval = getOptimalTimeInterval(duration);
    const totalMarkers = Math.ceil(duration / markerInterval);
    
    ctx.fillStyle = '#6c757d';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i <= totalMarkers; i++) {
        const time = i * markerInterval;
        const x = time * timeScale;
        
        // Draw marker line
        ctx.strokeStyle = 'rgba(108, 117, 125, 0.5)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        
        // Draw time label
        if (x + 50 < canvas.width) {  // Don't draw labels too close to the right edge
            ctx.fillText(formatTime(time / 1000), x, canvas.height - 15);
        }
    }
}

// Get optimal interval for time markers based on duration
function getOptimalTimeInterval(durationMs) {
    const durationSeconds = durationMs / 1000;
    
    if (durationSeconds <= 30) return 5000;  // 5 second intervals for short clips
    if (durationSeconds <= 60) return 10000; // 10 second intervals for up to 1 minute
    if (durationSeconds <= 300) return 30000; // 30 second intervals for up to 5 minutes
    if (durationSeconds <= 600) return 60000; // 1 minute intervals for up to 10 minutes
    return 120000; // 2 minute intervals for longer content
}

// Handle clicks on the timeline for seeking
function handleTimelineClick(event) {
    const rect = window.timelineCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;
    
    // Calculate time position
    const seekTime = ratio * window.timelineDuration;
    
    // Seek to that position
    if (typeof window.seekToTime === 'function') {
        window.seekToTime(seekTime);
    }
}

// Setup playhead tracking for current position
function setupTimelinePlayhead() {
    // Update the playhead position based on current time
    const updatePlayhead = function(currentTimeMs) {
        if (!window.timelineDuration) return;
        
        const playhead = document.getElementById('timelinePlayhead');
        if (!playhead) return;
        
        const ratio = currentTimeMs / window.timelineDuration;
        const position = `${ratio * 100}%`;
        playhead.style.left = position;
    };
    
    // Listen for time updates
    const originalUpdateFunction = window.updateTranscriptTime;
    window.updateTranscriptTime = function(currentTimeMs) {
        if (originalUpdateFunction) {
            originalUpdateFunction(currentTimeMs);
        }
        window.timelineCurrentTime = currentTimeMs;
        updatePlayhead(currentTimeMs);
    };
    
    // Also listen for wavesurfer events
    if (window.wavesurfer && window.wavesurfer.isReady) {
        window.wavesurfer.on('audioprocess', function() {
            const currentTime = window.wavesurfer.getCurrentTime() * 1000;
            updatePlayhead(currentTime);
        });
        
        window.wavesurfer.on('seek', function() {
            const currentTime = window.wavesurfer.getCurrentTime() * 1000;
            updatePlayhead(currentTime);
        });
    }
}

// Create a legend for speakers below the timeline
function createSpeakerLegend(container, speakers) {
    const legend = document.createElement('div');
    legend.className = 'speaker-legend d-flex flex-wrap justify-content-center';
    legend.style.marginTop = '8px';
    legend.style.fontSize = '12px';
    
    Array.from(speakers).forEach(speaker => {
        const speakerName = window.speakerMappings && 
                           window.speakerMappings[speaker] ? 
                           (typeof window.speakerMappings[speaker] === 'string' ? 
                            window.speakerMappings[speaker] : 
                            window.speakerMappings[speaker].role || speaker) : 
                           speaker;
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item me-3 mb-1';
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        
        const colorBox = document.createElement('span');
        colorBox.className = 'color-box me-1';
        colorBox.style.display = 'inline-block';
        colorBox.style.width = '12px';
        colorBox.style.height = '12px';
        colorBox.style.backgroundColor = window.timelineColors[speaker] || '#ccc';
        colorBox.style.borderRadius = '2px';
        
        const speakerLabel = document.createElement('span');
        speakerLabel.textContent = speakerName;
        speakerLabel.style.color = '#555';
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(speakerLabel);
        legend.appendChild(legendItem);
    });
    
    container.appendChild(legend);
}

// Show error message in the timeline container
function showTimelineError(container, message) {
    container.innerHTML = `
        <div class="alert alert-warning py-2">
            <small><strong>Speaker timeline:</strong> ${message}</small>
        </div>
    `;
}

// Format milliseconds to MM:SS
function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Handle window resize to redraw the timeline
window.addEventListener('resize', function() {
    if (window.timelineCanvas && window.timelineCtx) {
        window.timelineCanvas.width = window.timelineCanvas.parentElement.clientWidth * 2;
        drawSpeakerTimeline();
    }
});

// When DOM content is loaded, try setting up the timeline
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit longer to ensure all data is loaded
    setTimeout(function() {
        if (typeof window.setupSpeakerTimeline === 'function') {
            window.setupSpeakerTimeline();
        }
    }, 500);
});
