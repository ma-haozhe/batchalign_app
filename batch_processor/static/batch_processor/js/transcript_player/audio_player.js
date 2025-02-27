/**
 * Audio Player functionality for the Transcript Player
 * COMPLETELY REWRITTEN for better browser compatibility and synchronization
 */

// Global audio player functions - Explicitly defined on window for global access
window.updateTranscriptHighlight = null; // Will be defined in transcript_display.js
window.currentPlaybackRate = 1.0;

// Initialize the audio player with all required controls
window.initializeAudioPlayer = function() {
    console.log("Initializing audio player with direct DOM bindings");
    
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
    
    // Set up the play/pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', function() {
            if (player.paused) {
                player.play();
                this.querySelector('i').classList.remove('bi-play-fill');
                this.querySelector('i').classList.add('bi-pause-fill');
            } else {
                player.pause();
                this.querySelector('i').classList.remove('bi-pause-fill');
                this.querySelector('i').classList.add('bi-play-fill');
            }
        });
    }
    
    // Direct DOM binding for all control buttons
    bindControlButtons();
    
    console.log("Audio player initialization complete");
}

// Event handler functions
function handleTimeUpdate() {
    if (typeof window.updateTranscriptHighlight === 'function') {
        window.updateTranscriptHighlight();
    }
}

function handlePlayStart() {
    console.log("Audio playback started");
}

function handlePlayPause() {
    console.log("Audio playback paused");
}

function handlePlayEnd() {
    console.log("Audio playback ended");
}

function handlePlayError(e) {
    console.error("Audio player error:", e);
    document.getElementById('audioPlayerContainer').innerHTML += `
        <div class="alert alert-danger mt-2">
            <strong>Error:</strong> Could not load audio file. 
            Please check that the file exists and is accessible.
        </div>
    `;
}

// Bind all control buttons directly
function bindControlButtons() {
    // Skip buttons
    const skipBack10 = document.getElementById('skip-back-10');
    if (skipBack10) skipBack10.onclick = function() { window.skipBackward(10); };
    
    const skipBack5 = document.getElementById('skip-back-5');
    if (skipBack5) skipBack5.onclick = function() { window.skipBackward(5); };
    
    const skipForward5 = document.getElementById('skip-forward-5');
    if (skipForward5) skipForward5.onclick = function() { window.skipForward(5); };
    
    const skipForward10 = document.getElementById('skip-forward-10');
    if (skipForward10) skipForward10.onclick = function() { window.skipForward(10); };
    
    // Playback rate buttons
    const rate75 = document.getElementById('rate-75');
    if (rate75) rate75.onclick = function() { window.adjustPlaybackRate(0.75); };
    
    const rate100 = document.getElementById('rate-100');
    if (rate100) rate100.onclick = function() { window.adjustPlaybackRate(1.0); };
    
    const rate125 = document.getElementById('rate-125');
    if (rate125) rate125.onclick = function() { window.adjustPlaybackRate(1.25); };
    
    const rate150 = document.getElementById('rate-150');
    if (rate150) rate150.onclick = function() { window.adjustPlaybackRate(1.5); };
    
    const rate200 = document.getElementById('rate-200');
    if (rate200) rate200.onclick = function() { window.adjustPlaybackRate(2.0); };
    
    console.log("All control buttons bound");
}

// Playback control functions - defined on window for global access
window.adjustPlaybackRate = function(rate) {
    console.log(`Adjusting playback rate to ${rate}x`);
    window.currentPlaybackRate = rate;
    player.playbackRate = rate;
    
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
    if (!player || isNaN(player.currentTime)) return;
    
    console.log(`Skipping backward ${seconds} seconds`);
    const newTime = Math.max(0, player.currentTime - seconds);
    player.currentTime = newTime;
    
    // Force transcript update after a short delay
    setTimeout(function() {
        if (typeof window.updateTranscriptHighlight === 'function') {
            window.updateTranscriptHighlight();
        }
    }, 50);
}

window.skipForward = function(seconds) {
    if (!player || isNaN(player.currentTime) || isNaN(player.duration)) return;
    
    console.log(`Skipping forward ${seconds} seconds`);
    const newTime = Math.min(player.duration, player.currentTime + seconds);
    player.currentTime = newTime;
    
    // Force transcript update after a short delay
    setTimeout(function() {
        if (typeof window.updateTranscriptHighlight === 'function') {
            window.updateTranscriptHighlight();
        }
    }, 50);
}

window.seekToTime = function(ms) {
    if (!player) return;
    
    console.log(`Seeking to: ${ms/1000} seconds`);
    // Convert from milliseconds to seconds
    player.currentTime = ms / 1000;
    
    // Force transcript update
    setTimeout(function() {
        if (typeof window.updateTranscriptHighlight === 'function') {
            window.updateTranscriptHighlight();
        }
    }, 50);
    
    // Try to play, but handle if browser blocks autoplay
    try {
        const playPromise = player.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Autoplay prevented by browser. User must click play.");
            });
        }
    } catch (e) {
        console.error("Error starting playback:", e);
    }
}

window.formatTime = function(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Add keyboard shortcuts - directly on document
document.addEventListener('keydown', function(e) {
    // Ignore if focused on input elements
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key) {
        case ' ':
            e.preventDefault();
            if (player.paused) player.play();
            else player.pause();
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