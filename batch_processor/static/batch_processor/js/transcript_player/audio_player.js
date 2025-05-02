/**
 * Audio Player functionality for the Transcript Player
 * COMPLETELY REWRITTEN for better browser compatibility and synchronization
 */

// Global audio player functions - Explicitly defined on window for global access
window.updateTranscriptHighlight = null; // This is defined in transcript_display.js
window.updateTranscriptTime = null; // This is defined in the main script
window.currentPlaybackRate = 1.0;
window.wavesurfer = null;
window.wavesurferInitializationAttempts = 0;

// Global functions for waveform zooming
window.currentZoomLevel = 1;

// Initialize the audio player with all required controls
window.initializeAudioPlayer = function() {
    console.log("Initializing audio player with direct DOM bindings");
    
    // Initialize the standard HTML5 audio player first
    if (!window.player) {
        window.player = document.getElementById('audioPlayer');
        if (!window.player) {
            console.error("Cannot find audio player element!");
            return;
        }
    }
    
    // Set initial playback rate
    player.playbackRate = window.currentPlaybackRate;
    
    // Critical: Direct function binding with named functions for better browser compatibility
    player.ontimeupdate = handleTimeUpdate;
    player.onplay = handlePlayStart; 
    player.onpause = handlePlayPause;
    player.onended = handlePlayEnd;
    player.onerror = handlePlayError;
    
    // Only proceed with WaveSurfer initialization if WaveSurfer is available
    if (typeof WaveSurfer !== 'undefined') {
        console.log("WaveSurfer is available, initializing visualization");
        // Initialize WaveSurfer
        initializeWaveSurfer();
    } else {
        console.error("WaveSurfer not available, using fallback audio player");
        // Show fallback player with notice
        enableFallbackPlayer("WaveSurfer library not available");
        
        // Try again after a delay, only if this is our first or second attempt
        if (window.wavesurferInitializationAttempts < 2) {
            window.wavesurferInitializationAttempts++;
            console.log(`Scheduling retry attempt ${window.wavesurferInitializationAttempts} in 1 second`);
            setTimeout(function() {
                console.log("Retrying WaveSurfer initialization...");
                if (typeof WaveSurfer !== 'undefined') {
                    initializeWaveSurfer();
            } else {
                    console.error("WaveSurfer still not available after retry");
                }
            }, 1000);
        }
    }
    
    // Bind control buttons regardless of WaveSurfer availability
    bindControlButtons();
}

// Event handler functions
function handleTimeUpdate() {
    const currentTimeMs = player.currentTime * 1000;
    const formattedTime = formatTime(player.currentTime);
    
    // Update time display
    document.getElementById('currentTime').textContent = formattedTime;
    
    // Call transcript highlight function if available 
    if (typeof window.updateTranscriptTime === 'function') {
        window.updateTranscriptTime(currentTimeMs);
    } else if (typeof window.updateTranscriptHighlight === 'function') {
        // Fallback to old method if new one isn't defined yet
        window.updateTranscriptHighlight(currentTimeMs);
    }
}

function handlePlayStart() {
    console.log("Audio playback started");
    // Update play button state
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.querySelector('i').classList.remove('bi-play-fill');
        playPauseBtn.querySelector('i').classList.add('bi-pause-fill');
    }
}

function handlePlayPause() {
    console.log("Audio playback paused");
    // Update play button state
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.querySelector('i').classList.remove('bi-pause-fill');
        playPauseBtn.querySelector('i').classList.add('bi-play-fill');
    }
}

function handlePlayEnd() {
    console.log("Audio playback ended");
    // Update play button state
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.querySelector('i').classList.remove('bi-pause-fill');
        playPauseBtn.querySelector('i').classList.add('bi-play-fill');
    }
}

function handlePlayError(e) {
    console.error("Audio player error:", e);
    document.getElementById('waveform').innerHTML += `
        <div class="alert alert-danger mt-2">
            <strong>Error:</strong> Could not load audio file. 
            Please check that the file exists and is accessible.
        </div>
    `;
}

// Bind all audio control buttons with direct DOM event handlers
function bindControlButtons() {
    console.log("Binding audio control buttons");
    
    // Set up the play/pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', function() {
            if (window.wavesurfer && window.wavesurfer.isReady) {
                if (window.wavesurfer.isPlaying()) {
                    window.wavesurfer.pause();
                    this.querySelector('i').classList.remove('bi-pause-fill');
                    this.querySelector('i').classList.add('bi-play-fill');
                } else {
                    window.wavesurfer.play();
                    this.querySelector('i').classList.remove('bi-play-fill');
                    this.querySelector('i').classList.add('bi-pause-fill');
                }
            } else if (player) {
                if (player.paused) {
                    player.play();
                    this.querySelector('i').classList.remove('bi-play-fill');
                    this.querySelector('i').classList.add('bi-pause-fill');
                } else {
                    player.pause();
                    this.querySelector('i').classList.remove('bi-pause-fill');
                    this.querySelector('i').classList.add('bi-play-fill');
                }
            }
        });
    }

    // Bind all skip buttons
    document.getElementById('skip-back-10')?.addEventListener('click', function() {
        seekRelative(-10);
    });
    
    document.getElementById('skip-back-5')?.addEventListener('click', function() {
        seekRelative(-5);
    });
    
    document.getElementById('skip-forward-5')?.addEventListener('click', function() {
        seekRelative(5);
    });
    
    document.getElementById('skip-forward-10')?.addEventListener('click', function() {
        seekRelative(10);
    });
    
    // Bind all playback rate buttons
    document.getElementById('rate-75')?.addEventListener('click', function() {
        setPlaybackRate(0.75);
        highlightRateButton('rate-75');
    });
    
    document.getElementById('rate-100')?.addEventListener('click', function() {
        setPlaybackRate(1.0);
        highlightRateButton('rate-100');
    });
    
    document.getElementById('rate-125')?.addEventListener('click', function() {
        setPlaybackRate(1.25);
        highlightRateButton('rate-125');
    });
    
    document.getElementById('rate-150')?.addEventListener('click', function() {
        setPlaybackRate(1.5);
        highlightRateButton('rate-150');
    });
    
    document.getElementById('rate-200')?.addEventListener('click', function() {
        setPlaybackRate(2.0);
        highlightRateButton('rate-200');
    });
    
    // Zoom buttons
    const zoomIn = document.getElementById('zoomIn');
    if (zoomIn) zoomIn.onclick = function() { window.zoomWaveform(0.5); };
    
    const zoomOut = document.getElementById('zoomOut');
    if (zoomOut) zoomOut.onclick = function() { window.zoomWaveform(-0.5); };
    
    const resetZoom = document.getElementById('resetZoom');
    if (resetZoom) resetZoom.onclick = function() { window.resetWaveformZoom(); };
    
    console.log("All control buttons bound");
}

// Initialize WaveSurfer for audio visualization
function initializeWaveSurfer() {
    console.log("Initializing WaveSurfer");
    
    try {
        // Check if waveform container exists
        const waveformContainer = document.getElementById('waveform');
        if (!waveformContainer) {
            console.error("Waveform container element not found");
            enableFallbackPlayer("Waveform container not found");
            return;
        }
        
        // Hide the default audio player while WaveSurfer is active
        const simplePlayer = document.getElementById('simple-audio-player');
        if (simplePlayer) {
            simplePlayer.style.display = 'none';
        }
        
        // Get audio element and check if it exists
        const audioElement = document.getElementById('audioPlayer');
        if (!audioElement) {
            console.error("Audio element not found");
            enableFallbackPlayer("Audio element not found");
            return;
        }
        
        // Check if there's a source element or direct src attribute
        let audioUrl = '';
        const sourceElement = audioElement.querySelector('source');
        
        if (sourceElement && sourceElement.src) {
            audioUrl = sourceElement.src;
        } else {
            // Try to get from the audio element directly
            audioUrl = audioElement.src;
        }
        
        if (!audioUrl) {
            console.error("Audio URL is empty");
            enableFallbackPlayer("Audio URL is missing");
            return;
        }
        
        // Log the full audio URL for debugging
        console.log("Creating WaveSurfer with audio URL:", audioUrl);
        
        // Show a loading message
        document.getElementById('waveform').innerHTML = `
            <div class="text-center p-3">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Loading audio visualization...</span>
                </div>
                <span class="ms-2">Loading audio visualization...</span>
            </div>
        `;
        
        // Create WaveSurfer instance with more config options
        try {
            window.wavesurfer = WaveSurfer.create({
                container: '#waveform',
                waveColor: 'rgba(0, 123, 255, 0.3)',
                progressColor: 'rgba(0, 123, 255, 0.8)',
                cursorColor: '#dc3545',
                cursorWidth: 2,
                height: 80,
                barWidth: 2,
                barGap: 1,
                responsive: true,
                hideScrollbar: true,
                backend: 'MediaElement',  // Use MediaElement backend for better compatibility
                mediaControls: false,     // We'll use our own controls
                normalize: true,          // Normalize audio waveform
                plugins: []
            });
            
            console.log("WaveSurfer instance created successfully");
        } catch (e) {
            console.error("Error creating WaveSurfer instance:", e);
            enableFallbackPlayer("Error creating audio visualization: " + e.message);
            return;
        }
        
        // Load the audio file
        try {
            window.wavesurfer.load(audioUrl);
            console.log("Audio URL loaded in WaveSurfer:", audioUrl);
        } catch (e) {
            console.error("Error loading audio in WaveSurfer:", e);
            enableFallbackPlayer("Error loading audio: " + e.message);
            return;
        }
        
        // Set up WaveSurfer event listeners
        window.wavesurfer.on('ready', function() {
            console.log('WaveSurfer is ready');
            document.getElementById('totalTime').textContent = formatTime(window.wavesurfer.getDuration());
            
            // Sync playback rate with HTML5 audio element
            window.wavesurfer.setPlaybackRate(window.currentPlaybackRate);
            
            // Enable zoom controls
            document.getElementById('zoomIn').disabled = false;
            document.getElementById('zoomOut').disabled = false;
            document.getElementById('resetZoom').disabled = false;
            
            // Draw waveform
            window.wavesurfer.drawBuffer();
            
            // Setup speaker timeline if available
            if (typeof window.setupSpeakerTimeline === 'function') {
                window.setupSpeakerTimeline();
            }
        });
        
        window.wavesurfer.on('audioprocess', function() {
            const currentTime = window.wavesurfer.getCurrentTime();
            document.getElementById('currentTime').textContent = formatTime(currentTime);
            
            if (typeof window.updateTranscriptHighlight === 'function') {
                window.updateTranscriptHighlight(currentTime * 1000);
            }
        });
        
        window.wavesurfer.on('seek', function() {
            const currentTime = window.wavesurfer.getCurrentTime();
            document.getElementById('currentTime').textContent = formatTime(currentTime);
            
            if (typeof window.updateTranscriptHighlight === 'function') {
                window.updateTranscriptHighlight(currentTime * 1000);
            }
        });
        
        window.wavesurfer.on('error', function(err) {
            console.error('WaveSurfer error:', err);
            enableFallbackPlayer();
        });
        
        // Disable zoom controls until audio is loaded
        document.getElementById('zoomIn').disabled = true;
        document.getElementById('zoomOut').disabled = true;
        document.getElementById('resetZoom').disabled = true;
        
        // Set a timeout to check if WaveSurfer loaded successfully
        setTimeout(function() {
            if (!window.wavesurfer.isReady) {
                console.warn("WaveSurfer still not ready after 5 seconds - enabling fallback");
                enableFallbackPlayer();
            }
        }, 5000);
    } catch (error) {
        console.error("Error initializing WaveSurfer:", error);
        enableFallbackPlayer(error.message);
    }
}

// Helper function to enable fallback player when WaveSurfer fails
function enableFallbackPlayer(errorMessage = "Failed to initialize audio visualization") {
    document.getElementById('waveform').innerHTML = `
        <div class="alert alert-warning">
            <strong>Notice:</strong> ${errorMessage}. Using standard audio player.
        </div>
    `;
    
    // Show the simple audio player container
    const simplePlayerContainer = document.getElementById('simple-audio-player');
    if (simplePlayerContainer) {
        simplePlayerContainer.style.display = 'block';
    }
    
    // Show the standard audio player
    const audioPlayer = document.getElementById('audioPlayer');
    if (audioPlayer) {
        // Make sure controls are visible and the player isn't hidden
        audioPlayer.controls = true;
        
        // Try to force load the audio source if it exists in URL but not loaded
        if (!audioPlayer.src && audioPlayer.querySelector('source')?.src) {
            audioPlayer.src = audioPlayer.querySelector('source').src;
        }
        
        // Show audio URL for debugging
        console.log("Audio player source:", audioPlayer.src);
        
        // Set up events for the standard player
        audioPlayer.addEventListener('timeupdate', function() {
            document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
            
            if (typeof window.updateTranscriptHighlight === 'function') {
                window.updateTranscriptHighlight(audioPlayer.currentTime * 1000);
            }
        });
        
        audioPlayer.addEventListener('loadedmetadata', function() {
            document.getElementById('totalTime').textContent = formatTime(audioPlayer.duration);
            console.log("Audio duration loaded:", audioPlayer.duration);
        });
    }
}

// Playback control functions - defined on window for global access
window.adjustPlaybackRate = function(rate) {
    console.log(`Adjusting playback rate to ${rate}x`);
    window.currentPlaybackRate = rate;
    
    // Apply to HTML5 audio element
    if (window.player) {
        window.player.playbackRate = rate;
    }
    
    // Apply to WaveSurfer if available
    if (window.wavesurfer && window.wavesurfer.isReady) {
        window.wavesurfer.setPlaybackRate(rate);
    }
    
    // Update active button state
    document.querySelectorAll('.btn-group button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Select the button by ID that matches the rate
    const rateId = `rate-${String(rate * 100).replace('.', '')}`;
    const rateButton = document.getElementById(rateId);
    if (rateButton) {
        rateButton.classList.add('active');
    }
}

window.skipBackward = function(seconds) {
    if (window.wavesurfer && window.wavesurfer.isReady) {
    console.log(`Skipping backward ${seconds} seconds`);
        const currentTime = window.wavesurfer.getCurrentTime();
        const newTime = Math.max(0, currentTime - seconds);
        window.wavesurfer.setCurrentTime(newTime);
    } else if (window.player && !isNaN(window.player.currentTime)) {
        console.log(`Skipping backward ${seconds} seconds using HTML5 audio`);
        const newTime = Math.max(0, window.player.currentTime - seconds);
        window.player.currentTime = newTime;
    }
    
    // Force transcript update after a short delay
    setTimeout(function() {
        if (typeof window.updateTranscriptHighlight === 'function') {
            window.updateTranscriptHighlight();
        }
    }, 50);
}

window.skipForward = function(seconds) {
    if (window.wavesurfer && window.wavesurfer.isReady) {
    console.log(`Skipping forward ${seconds} seconds`);
        const currentTime = window.wavesurfer.getCurrentTime();
        const duration = window.wavesurfer.getDuration();
        const newTime = Math.min(duration, currentTime + seconds);
        window.wavesurfer.setCurrentTime(newTime);
    } else if (window.player && !isNaN(window.player.currentTime) && !isNaN(window.player.duration)) {
        console.log(`Skipping forward ${seconds} seconds using HTML5 audio`);
        const newTime = Math.min(window.player.duration, window.player.currentTime + seconds);
        window.player.currentTime = newTime;
    }
    
    // Force transcript update after a short delay
    setTimeout(function() {
        if (typeof window.updateTranscriptHighlight === 'function') {
            window.updateTranscriptHighlight();
        }
    }, 50);
}

// Global function to seek to a specific time in milliseconds
window.seekToTime = function(timeMs) {
    if (!timeMs && timeMs !== 0) {
        console.error("Invalid time provided to seekToTime:", timeMs);
        return;
    }
    
    const timeInSeconds = timeMs / 1000;
    console.log(`Seeking to ${timeInSeconds} seconds (${timeMs} ms)`);
    
    // Use WaveSurfer if it's available and ready
    if (window.wavesurfer && window.wavesurfer.isReady) {
        window.wavesurfer.seekTo(timeInSeconds / window.wavesurfer.getDuration());
        
        // If paused, show a visual indicator for the position change
        if (!window.wavesurfer.isPlaying()) {
            const progressElem = document.querySelector('.transcript-line.active .content-progress');
            if (progressElem) {
                progressElem.style.width = "0%";
            }
        }
    } 
    // Otherwise fall back to the HTML5 audio player
    else if (window.player) {
        window.player.currentTime = timeInSeconds;
        
        // Update the display manually
        const formattedTime = formatTime(timeInSeconds);
        document.getElementById('currentTime').textContent = formattedTime;
        
        // Also update transcript highlighting
        if (typeof window.updateTranscriptTime === 'function') {
            window.updateTranscriptTime(timeMs);
        } else if (typeof window.updateTranscriptHighlight === 'function') {
            window.updateTranscriptHighlight(timeMs);
        }
    }
};

// Helper function to seek relatively (forward/backward by seconds)
function seekRelative(seconds) {
    if (!seconds) return;
    
    console.log(`Seeking relatively by ${seconds} seconds`);
    
    // Use WaveSurfer if it's available
    if (window.wavesurfer && window.wavesurfer.isReady) {
        const currentTime = window.wavesurfer.getCurrentTime();
        const newTime = Math.max(0, currentTime + seconds);
        window.wavesurfer.seekTo(newTime / window.wavesurfer.getDuration());
    } 
    // Fall back to HTML5 audio player
    else if (window.player) {
        const currentTime = window.player.currentTime;
        const newTime = Math.max(0, currentTime + seconds);
        window.player.currentTime = newTime;
    }
}

// Waveform zoom controls
window.zoomWaveform = function(amount) {
    if (!window.wavesurfer || !window.wavesurfer.isReady) {
        console.warn("WaveSurfer not ready, cannot zoom");
        return;
    }
    
    if (!amount) return;
    
    // Calculate new zoom level
    const newZoom = window.currentZoomLevel + amount;
    
    // Limit to reasonable bounds
    if (newZoom < 0.5) return; // Minimum zoom
    if (newZoom > 50) return;  // Maximum zoom
    
    // Apply zoom
    try {
        window.currentZoomLevel = newZoom;
        console.log(`Zooming to ${newZoom}x`);
        
        // Apply zoom based on WaveSurfer version
        if (typeof window.wavesurfer.zoom === 'function') {
            // WaveSurfer v4+
            window.wavesurfer.zoom(newZoom * 100);
        } else {
            // Legacy versions
            window.wavesurfer.params.minPxPerSec = newZoom * 50;
            window.wavesurfer.drawBuffer();
        }
    } catch (e) {
        console.error("Error applying zoom:", e);
    }
};

window.resetWaveformZoom = function() {
    window.currentZoomLevel = 1;
    
    if (!window.wavesurfer || !window.wavesurfer.isReady) return;
    
    try {
        // Apply zoom based on WaveSurfer version
        if (typeof window.wavesurfer.zoom === 'function') {
            // WaveSurfer v4+
            window.wavesurfer.zoom(100);
        } else {
            // Legacy versions
            window.wavesurfer.params.minPxPerSec = 50;
            window.wavesurfer.drawBuffer();
        }
    } catch (e) {
        console.error("Error resetting zoom:", e);
    }
};

window.formatTime = function(seconds) {
    if (isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Add keyboard shortcuts - directly on document
document.addEventListener('keydown', function(e) {
    // Ignore if focused on input elements
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key) {
        case ' ':
            e.preventDefault();
            if (window.wavesurfer && window.wavesurfer.isReady) {
                if (window.wavesurfer.isPlaying()) {
                    window.wavesurfer.pause();
                } else {
                    window.wavesurfer.play();
                }
            } else if (window.player) {
                if (window.player.paused) window.player.play();
                else window.player.pause();
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            window.skipBackward(5);
            break;
        case 'ArrowRight':
            e.preventDefault();
            window.skipForward(5);
            break;
        case '1':
            window.adjustPlaybackRate(1.0);
            break;
        case '2':
            window.adjustPlaybackRate(1.25);
            break;
        case '3':
            window.adjustPlaybackRate(1.5);
            break;
        case '4':
            window.adjustPlaybackRate(0.75);
            break;
    }
}); 

// Function to set playback rate for both WaveSurfer and HTML5 audio
function setPlaybackRate(rate) {
    if (!rate || isNaN(rate)) return;
    
    console.log(`Setting playback rate to ${rate}x`);
    window.currentPlaybackRate = rate;
    
    // Update WaveSurfer if it's ready
    if (window.wavesurfer && window.wavesurfer.isReady) {
        window.wavesurfer.setPlaybackRate(rate);
    }
    
    // Also update HTML5 audio element
    if (window.player) {
        window.player.playbackRate = rate;
    }
}

// Helper to highlight the active rate button
function highlightRateButton(activeId) {
    // Remove active class from all rate buttons
    document.querySelectorAll('[id^="rate-"]').forEach(button => {
        button.classList.remove('active');
    });
    
    // Add active class to selected button
    const activeButton = document.getElementById(activeId);
    if (activeButton) {
        activeButton.classList.add('active');
    }
} 