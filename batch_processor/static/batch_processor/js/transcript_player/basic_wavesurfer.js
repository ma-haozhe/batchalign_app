/**
 * Basic WaveSurfer implementation for getting audio visualization working
 * This is a simplified version to debug and fix the core issues
 */

// Global variable to hold our wavesurfer instance
window.basicWaveSurfer = null;

// Initialize basic WaveSurfer - called after DOM is ready
window.initializeBasicWaveSurfer = function() {
    console.log("🎵 Initializing Basic WaveSurfer...");
    
    // Check if WaveSurfer is available
    if (typeof WaveSurfer === 'undefined') {
        console.error("❌ WaveSurfer library not loaded");
        showWaveformError("WaveSurfer library not available");
        return false;
    }
    
    console.log("✅ WaveSurfer library loaded, version:", WaveSurfer.VERSION || "Unknown");
    
    // Check if container exists
    const container = document.getElementById('waveform');
    if (!container) {
        console.error("❌ Waveform container not found");
        return false;
    }
    
    console.log("✅ Waveform container found");
    
    // Get audio URL
    const audioUrl = getAudioUrl();
    if (!audioUrl) {
        console.error("❌ No audio URL found");
        showWaveformError("No audio file available");
        return false;
    }
    
    console.log("✅ Audio URL found:", audioUrl);
    
    // Show loading message
    container.innerHTML = `
        <div class="text-center p-3">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span class="ms-2">Loading waveform...</span>
        </div>
    `;
    
    try {
        // Create WaveSurfer instance with minimal options for v6
        window.basicWaveSurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#4F4A85',
            progressColor: '#383351',
            cursorColor: '#dc3545',
            height: 80,
            responsive: true,
            normalize: true,
            backend: 'MediaElement'
        });
        
        console.log("✅ WaveSurfer instance created");
        
        // Set up event listeners
        setupWaveSurferEvents();
        
        // Load the audio
        window.basicWaveSurfer.load(audioUrl);
        console.log("✅ Audio loading started");
        
        return true;
        
    } catch (error) {
        console.error("❌ Error creating WaveSurfer:", error);
        showWaveformError("Failed to create audio visualization: " + error.message);
        return false;
    }
};

// Set up WaveSurfer event listeners
function setupWaveSurferEvents() {
    const ws = window.basicWaveSurfer;
    
    ws.on('ready', function() {
        console.log("🎉 WaveSurfer ready! Duration:", ws.getDuration(), "seconds");
        
        // Update total time display
        const totalTimeEl = document.getElementById('totalTime');
        if (totalTimeEl) {
            totalTimeEl.textContent = formatTime(ws.getDuration());
        }
        
        // Enable controls
        enableAudioControls();
    });
    
    ws.on('audioprocess', function() {
        updateTimeDisplay();
    });
    
    ws.on('seek', function() {
        updateTimeDisplay();
    });
    
    ws.on('error', function(error) {
        console.error("❌ WaveSurfer error:", error);
        showWaveformError("Audio loading failed: " + error);
    });
    
    ws.on('loading', function(percent) {
        console.log("📥 Loading:", percent + "%");
    });
}

// Update time display
function updateTimeDisplay() {
    const ws = window.basicWaveSurfer;
    if (!ws) return;
    
    const currentTime = ws.getCurrentTime();
    const currentTimeEl = document.getElementById('currentTime');
    
    if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(currentTime);
    }
    
    // Update transcript highlighting if available
    if (typeof window.updateTranscriptTime === 'function') {
        window.updateTranscriptTime(currentTime * 1000);
    }
}

// Enable audio controls
function enableAudioControls() {
    console.log("🎛️ Enabling audio controls (except play/pause - handled by main controller)");
    
    // NOTE: Play/pause button is handled by the main audio_player.js controller
    // This prevents conflicts between multiple event handlers
    
    // Skip buttons
    const skipBack5 = document.getElementById('skip-back-5');
    const skipBack10 = document.getElementById('skip-back-10');
    const skipForward5 = document.getElementById('skip-forward-5');
    const skipForward10 = document.getElementById('skip-forward-10');
    
    if (skipBack5) skipBack5.onclick = () => skipTime(-5);
    if (skipBack10) skipBack10.onclick = () => skipTime(-10);
    if (skipForward5) skipForward5.onclick = () => skipTime(5);
    if (skipForward10) skipForward10.onclick = () => skipTime(10);
    
    console.log("✅ Skip controls enabled (play/pause handled by main controller)");
}

// Toggle play/pause (called by global controller)
function togglePlayPause() {
    console.log("🎵 Basic WaveSurfer togglePlayPause called");
    const ws = window.basicWaveSurfer;
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    if (!ws || !playPauseBtn) {
        console.log("⚠️ Basic WaveSurfer or button not available");
        return false;
    }
    
    try {
        if (ws.isPlaying()) {
            ws.pause();
            playPauseBtn.querySelector('i').classList.remove('bi-pause-fill');
            playPauseBtn.querySelector('i').classList.add('bi-play-fill');
            console.log("⏸️ Basic WaveSurfer paused");
        } else {
            ws.play();
            playPauseBtn.querySelector('i').classList.remove('bi-play-fill');
            playPauseBtn.querySelector('i').classList.add('bi-pause-fill');
            console.log("▶️ Basic WaveSurfer playing");
        }
        return true;
    } catch (e) {
        console.error("❌ Basic WaveSurfer toggle error:", e);
        return false;
    }
}

// Skip time
function skipTime(seconds) {
    const ws = window.basicWaveSurfer;
    if (!ws) return;
    
    const currentTime = ws.getCurrentTime();
    const newTime = Math.max(0, Math.min(currentTime + seconds, ws.getDuration()));
    ws.seekTo(newTime / ws.getDuration());
}

// Get audio URL from various sources
function getAudioUrl() {
    // Try to get from audio element
    const audioElement = document.getElementById('audioPlayer');
    if (audioElement) {
        // Check source element first
        const sourceElement = audioElement.querySelector('source');
        if (sourceElement && sourceElement.src) {
            return sourceElement.src;
        }
        
        // Check audio element src
        if (audioElement.src) {
            return audioElement.src;
        }
    }
    
    // Try to get from data attributes or other sources
    const audioUrl = document.querySelector('[data-audio-url]')?.getAttribute('data-audio-url');
    if (audioUrl) {
        return audioUrl;
    }
    
    return null;
}

// Show error message in waveform container
function showWaveformError(message) {
    const container = document.getElementById('waveform');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i>
                <strong>Audio Visualization:</strong> ${message}
            </div>
        `;
    }
}

// Format time helper
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// Test function
window.testBasicWaveSurfer = function() {
    console.log("🧪 Testing Basic WaveSurfer...");
    
    const tests = [
        { name: "WaveSurfer library", test: () => typeof WaveSurfer !== 'undefined' },
        { name: "Waveform container", test: () => document.getElementById('waveform') !== null },
        { name: "Audio element", test: () => document.getElementById('audioPlayer') !== null },
        { name: "Audio URL", test: () => getAudioUrl() !== null },
        { name: "WaveSurfer instance", test: () => window.basicWaveSurfer !== null }
    ];
    
    tests.forEach(test => {
        const result = test.test();
        console.log(result ? "✅" : "❌", test.name + ":", result);
    });
    
    if (window.basicWaveSurfer) {
        console.log("🎵 WaveSurfer status:");
        console.log("- Duration:", window.basicWaveSurfer.getDuration());
        console.log("- Current time:", window.basicWaveSurfer.getCurrentTime());
        console.log("- Is playing:", window.basicWaveSurfer.isPlaying());
    }
};

// Quick manual test function for console use
window.quickTestAudio = function() {
    console.clear();
    console.log("🔧 Quick Audio Test Starting...");
    
    // Environment check
    console.log("\n🌍 Environment:");
    console.log("  WaveSurfer available:", typeof WaveSurfer !== 'undefined');
    console.log("  Version:", WaveSurfer?.VERSION || "Unknown");
    
    // DOM check
    console.log("\n🏗️ DOM Elements:");
    const waveform = document.getElementById('waveform');
    const audioPlayer = document.getElementById('audioPlayer');
    console.log("  Waveform container:", !!waveform);
    console.log("  Audio player:", !!audioPlayer);
    
    if (audioPlayer) {
        console.log("  Audio src:", audioPlayer.src || "None");
        console.log("  Audio ready state:", audioPlayer.readyState);
    }
    
    // WaveSurfer instances
    console.log("\n🎵 WaveSurfer Instances:");
    console.log("  Main wavesurfer:", !!window.wavesurfer);
    console.log("  Basic wavesurfer:", !!window.basicWaveSurfer);
    
    if (window.basicWaveSurfer) {
        console.log("  Basic WS duration:", window.basicWaveSurfer.getDuration?.() || "No duration");
        console.log("  Basic WS ready:", window.basicWaveSurfer.getDuration?.() > 0);
    }
    
    // Try manual initialization
    console.log("\n🧪 Manual Test:");
    if (typeof window.initializeBasicWaveSurfer === 'function') {
        console.log("  Attempting basic WaveSurfer initialization...");
        try {
            const result = window.initializeBasicWaveSurfer();
            console.log("  Result:", result ? "✅ SUCCESS" : "❌ FAILED");
        } catch (error) {
            console.log("  Error:", "❌", error.message);
        }
    } else {
        console.log("  ❌ initializeBasicWaveSurfer not available");
    }
    
    console.log("\n✅ Quick test completed!");
};

console.log("📦 Basic WaveSurfer module loaded");
