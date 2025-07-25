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

// Global unified play/pause function (MAIN CONTROLLER)
window.toggleGlobalPlayPause = function() {
    console.log("🎵 Global play/pause function called");
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const icon = playPauseBtn?.querySelector('i');
    
    // Priority 1: Try main WaveSurfer instance
    if (window.wavesurfer && window.wavesurfer.getDuration && window.wavesurfer.getDuration() > 0) {
        console.log("🎵 Using main WaveSurfer for playback control");
        try {
            if (window.wavesurfer.isPlaying()) {
                window.wavesurfer.pause();
                if (icon) {
                    icon.classList.remove('bi-pause-fill');
                    icon.classList.add('bi-play-fill');
                }
                console.log("⏸️ Main WaveSurfer paused");
            } else {
                window.wavesurfer.play();
                if (icon) {
                    icon.classList.remove('bi-play-fill');
                    icon.classList.add('bi-pause-fill');
                }
                console.log("▶️ Main WaveSurfer playing");
            }
            return;
        } catch (e) {
            console.error("❌ Main WaveSurfer error:", e);
        }
    }
    
    // Priority 2: Try basic WaveSurfer instance
    if (window.basicWaveSurfer && window.basicWaveSurfer.getDuration && window.basicWaveSurfer.getDuration() > 0) {
        console.log("🎵 Using basic WaveSurfer for playback control");
        try {
            if (window.basicWaveSurfer.isPlaying()) {
                window.basicWaveSurfer.pause();
                if (icon) {
                    icon.classList.remove('bi-pause-fill');
                    icon.classList.add('bi-play-fill');
                }
                console.log("⏸️ Basic WaveSurfer paused");
            } else {
                window.basicWaveSurfer.play();
                if (icon) {
                    icon.classList.remove('bi-play-fill');
                    icon.classList.add('bi-pause-fill');
                }
                console.log("▶️ Basic WaveSurfer playing");
            }
            return;
        } catch (e) {
            console.error("❌ Basic WaveSurfer error:", e);
        }
    }
    
    // Priority 3: Try HTML5 audio player
    const player = document.getElementById('audioPlayer');
    if (player && player.duration > 0) {
        console.log("🎵 Using HTML5 audio for playback control");
        try {
            if (player.paused) {
                player.play().then(() => {
                    if (icon) {
                        icon.classList.remove('bi-play-fill');
                        icon.classList.add('bi-pause-fill');
                    }
                    console.log("▶️ HTML5 audio playing");
                }).catch(err => {
                    console.error("❌ HTML5 audio play error:", err);
                });
            } else {
                player.pause();
                if (icon) {
                    icon.classList.remove('bi-pause-fill');
                    icon.classList.add('bi-play-fill');
                }
                console.log("⏸️ HTML5 audio paused");
            }
            return;
        } catch (e) {
            console.error("❌ HTML5 audio error:", e);
        }
    }
    
    // No audio player available
    console.warn("⚠️ No audio player available for playback control");
    console.log("Available players:", {
        mainWaveSurfer: !!window.wavesurfer,
        basicWaveSurfer: !!window.basicWaveSurfer,
        html5Audio: !!player
    });
};

// Wait for WaveSurfer to be available before initializing
window.waitForWaveSurfer = function(callback, maxAttempts = 10, attempt = 1) {
    if (typeof WaveSurfer !== 'undefined') {
        console.log("✅ WaveSurfer is available, proceeding with initialization");
        callback();
    } else if (attempt < maxAttempts) {
        console.log(`⏳ Waiting for WaveSurfer... (attempt ${attempt}/${maxAttempts})`);
        setTimeout(() => {
            window.waitForWaveSurfer(callback, maxAttempts, attempt + 1);
        }, 200); // Wait 200ms between attempts
    } else {
        console.error("❌ WaveSurfer failed to load after maximum attempts");
        enableFallbackPlayer("WaveSurfer library failed to load");
    }
};

// Initialize the audio player with all required controls
window.initializeAudioPlayer = function() {
    console.log("🎵 Initializing audio player with WaveSurfer check...");
    
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
    
    // Wait for WaveSurfer to be available before proceeding
    window.waitForWaveSurfer(function() {
        console.log("🎵 WaveSurfer is ready, initializing visualization");
        initializeWaveSurfer();
    });
    
    // Fallback check if WaveSurfer never loads
    setTimeout(function() {
        if (!window.wavesurfer && window.wavesurferInitializationAttempts < 2) {
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
    }, 2000); // Wait 2 seconds before fallback check
    
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
    
    // Set up the unified play/pause button handler (MAIN CONTROLLER)
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        console.log("🎛️ Setting up unified play/pause button controller");
        
        // Clear any existing handlers to prevent conflicts
        playPauseBtn.onclick = null;
        const newBtn = playPauseBtn.cloneNode(true);
        playPauseBtn.parentNode.replaceChild(newBtn, playPauseBtn);
        
        // Add our unified handler
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("🎵 Unified play/pause button clicked");
            
            // Call the global play/pause function
            if (typeof window.toggleGlobalPlayPause === 'function') {
                window.toggleGlobalPlayPause();
            } else {
                console.error("❌ Global play/pause function not available");
            }
        });
        
        console.log("✅ Unified play/pause button handler installed");
    } else {
        console.error("❌ Play/pause button not found!");
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
        
        // Show a loading message initially
        waveformContainer.innerHTML = `
            <div id="wavesurfer-loading" class="text-center p-3">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Loading audio visualization...</span>
                </div>
                <span class="ms-2">Loading audio visualization...</span>
            </div>
        `;
        
        // Create WaveSurfer instance with v6 compatible options
        try {
            // Create a separate container for WaveSurfer that's initially hidden
            const wavesurferDiv = document.createElement('div');
            wavesurferDiv.id = 'wavesurfer-container';
            wavesurferDiv.style.display = 'none'; // Hide until ready
            waveformContainer.appendChild(wavesurferDiv);
            
            window.wavesurfer = WaveSurfer.create({
                container: wavesurferDiv, // Use the separate container
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
                normalize: true           // Normalize audio waveform
            });
            
            console.log("WaveSurfer v6 instance created successfully");
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
            console.log('✅ WaveSurfer is ready');
            
            // Hide the loading message and show the waveform
            const loadingDiv = document.getElementById('wavesurfer-loading');
            const wavesurferDiv = document.getElementById('wavesurfer-container');
            
            if (loadingDiv) {
                console.log('🧹 Hiding loading message');
                loadingDiv.style.display = 'none';
            }
            
            if (wavesurferDiv) {
                console.log('🎨 Showing WaveSurfer visualization');
                wavesurferDiv.style.display = 'block';
            }
            
            document.getElementById('totalTime').textContent = formatTime(window.wavesurfer.getDuration());
            
            // Sync playback rate with HTML5 audio element
            window.wavesurfer.setPlaybackRate(window.currentPlaybackRate);
            
            // Enable zoom controls
            const zoomInBtn = document.getElementById('zoomIn');
            const zoomOutBtn = document.getElementById('zoomOut');
            const resetZoomBtn = document.getElementById('resetZoom');
            
            if (zoomInBtn) zoomInBtn.disabled = false;
            if (zoomOutBtn) zoomOutBtn.disabled = false;
            if (resetZoomBtn) resetZoomBtn.disabled = false;
            
            // Setup speaker timeline if available
            if (typeof window.setupSpeakerTimeline === 'function') {
                console.log('🎤 Setting up speaker timeline');
                window.setupSpeakerTimeline();
            } else {
                console.log('ℹ️ No speaker timeline function available');
            }
            
            // Clear any loading timeout since we're now ready
            if (window.wavesurferLoadingTimeout) {
                clearTimeout(window.wavesurferLoadingTimeout);
                window.wavesurferLoadingTimeout = null;
            }
        });
        
        window.wavesurfer.on('loading', function(progress) {
            console.log('📊 WaveSurfer loading progress:', progress + '%');
            const loadingDiv = document.getElementById('wavesurfer-loading');
            if (loadingDiv) {
                // Update loading message with progress
                loadingDiv.innerHTML = `
                    <div class="text-center p-3">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Loading audio visualization...</span>
                        </div>
                        <span class="ms-2">Loading audio visualization... ${progress}%</span>
                    </div>
                `;
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
            console.error('❌ WaveSurfer error:', err);
            
            // Clear loading message and show error
            const waveformDiv = document.getElementById('waveform');
            if (waveformDiv) {
                waveformDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Error:</strong> Could not load audio visualization. 
                        Using fallback audio player. (${err})
                    </div>
                `;
            }
            
            enableFallbackPlayer("WaveSurfer error: " + err);
        });
        
        // Add load error handler
        window.wavesurfer.on('load-error', function(err) {
            console.error('❌ WaveSurfer load error:', err);
            
            // Clear loading message and show error
            const waveformDiv = document.getElementById('waveform');
            if (waveformDiv) {
                waveformDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Error:</strong> Could not load audio file for visualization. 
                        Please check that the audio file is accessible.
                    </div>
                `;
            }
            
            enableFallbackPlayer("Audio file load error: " + err);
        });
        
        // Disable zoom controls until audio is loaded
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const resetZoomBtn = document.getElementById('resetZoom');
        
        if (zoomInBtn) zoomInBtn.disabled = true;
        if (zoomOutBtn) zoomOutBtn.disabled = true;
        if (resetZoomBtn) resetZoomBtn.disabled = true;
        
        // Set a timeout to check if WaveSurfer loaded successfully
        window.wavesurferLoadingTimeout = setTimeout(function() {
            if (!window.wavesurfer || !window.wavesurfer.getDuration || window.wavesurfer.getDuration() === 0) {
                console.warn("⚠️ WaveSurfer still not ready after 8 seconds - enabling fallback");
                
                // Clear loading message and show fallback
                const waveformDiv = document.getElementById('waveform');
                if (waveformDiv) {
                    waveformDiv.innerHTML = `
                        <div class="alert alert-warning">
                            <strong>Note:</strong> Audio visualization is taking longer than expected. 
                            Falling back to basic audio player.
                        </div>
                    `;
                }
                
                enableFallbackPlayer("Audio visualization loading timeout (8 seconds)");
            } else {
                console.log("✅ WaveSurfer loaded successfully within timeout");
            }
        }, 8000); // Increased to 8 seconds for slower connections
    } catch (error) {
        console.error("Error initializing WaveSurfer:", error);
        enableFallbackPlayer(error.message);
    }
}

// Helper function to enable fallback player when WaveSurfer fails
function enableFallbackPlayer(errorMessage = "Failed to initialize audio visualization") {
    console.log("🔄 Enabling fallback player due to:", errorMessage);
    
    // First, try our basic WaveSurfer implementation before falling back to HTML5
    if (typeof window.initializeBasicWaveSurfer === 'function') {
        console.log("🧪 Trying basic WaveSurfer as fallback...");
        const basicSuccess = window.initializeBasicWaveSurfer();
        
        if (basicSuccess) {
            console.log("✅ Basic WaveSurfer fallback successful!");
            return; // Success! No need to continue with HTML5 fallback
        } else {
            console.log("❌ Basic WaveSurfer fallback also failed, using HTML5 player");
        }
    } else {
        console.log("⚠️ Basic WaveSurfer function not available, using HTML5 player");
    }
    
    // If basic WaveSurfer failed, show error and use HTML5 player
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

// Global function to seek to a specific time in milliseconds - Enhanced for Edge/Chromium
window.seekToTime = function(timeMs) {
    if (!timeMs && timeMs !== 0) {
        console.error("Invalid time provided to seekToTime:", timeMs);
        return false;
    }
    
    const timeInSeconds = timeMs / 1000;
    console.log(`🎯 Edge-Enhanced Seeking to ${timeInSeconds} seconds (${timeMs} ms)`);
    
    let seekSuccess = false;
    let errorMessages = [];
    
    // Method 1: Enhanced WaveSurfer seeking with Edge-specific validation
    if (window.wavesurfer) {
        try {
            console.log('🔍 Checking WaveSurfer status:', {
                exists: !!window.wavesurfer,
                isReady: window.wavesurfer.isReady,
                isDestroyed: window.wavesurfer.isDestroyed,
                hasDuration: !!(window.wavesurfer.getDuration),
                duration: window.wavesurfer.getDuration ? window.wavesurfer.getDuration() : 'unknown'
            });
            
            // Enhanced readiness check specifically for Edge/Chromium
            const isWaveSurferReady = window.wavesurfer.isReady && 
                                     !window.wavesurfer.isDestroyed && 
                                     window.wavesurfer.getDuration && 
                                     window.wavesurfer.getDuration() > 0 &&
                                     window.wavesurfer.seekTo; // Ensure seekTo method exists
            
            if (isWaveSurferReady) {
                const duration = window.wavesurfer.getDuration();
                console.log(`✅ WaveSurfer ready - Duration: ${duration}s, seeking to: ${timeInSeconds}s`);
                
                if (timeInSeconds <= duration && timeInSeconds >= 0) {
                    const seekRatio = timeInSeconds / duration;
                    console.log(`📍 Seeking to WaveSurfer ratio: ${seekRatio}`);
                    
                    // Edge-specific: Use a small delay before seeking
                    setTimeout(() => {
                        try {
                            window.wavesurfer.seekTo(seekRatio);
                            console.log('✅ WaveSurfer seek command sent');
                            
                            // Verify the seek worked by checking position after a brief delay
                            setTimeout(() => {
                                const actualTime = window.wavesurfer.getCurrentTime();
                                console.log(`🔍 Verification: Expected ${timeInSeconds}s, actual ${actualTime}s`);
                                
                                const tolerance = 0.5; // Allow 0.5 second tolerance
                                if (Math.abs(actualTime - timeInSeconds) <= tolerance) {
                                    console.log('✅ WaveSurfer seek verified successful');
                                } else {
                                    console.warn('⚠️ WaveSurfer seek position mismatch, forcing HTML5 update');
                                    // Force HTML5 audio to sync
                                    if (window.player && window.player.currentTime !== actualTime) {
                                        window.player.currentTime = actualTime;
                                    }
                                }
                            }, 100);
                            
                        } catch (seekError) {
                            console.error('❌ WaveSurfer seekTo failed:', seekError);
                            errorMessages.push(`WaveSurfer seek: ${seekError.message}`);
                        }
                    }, 10); // Small delay for Edge
                    
                    seekSuccess = true;
                } else {
                    const msg = `WaveSurfer seek out of bounds: ${timeInSeconds}s not in [0, ${duration}s]`;
                    console.error('❌', msg);
                    errorMessages.push(msg);
                }
            } else {
                const msg = 'WaveSurfer not ready for seeking';
                console.warn('⚠️', msg);
                errorMessages.push(msg);
            }
        } catch (error) {
            const msg = `WaveSurfer seeking error: ${error.message}`;
            console.error('❌', msg);
            errorMessages.push(msg);
        }
    }
    
    // Method 2: Enhanced HTML5 audio fallback (critical for Edge/Chromium)
    if (!seekSuccess && window.player) {
        try {
            console.log('🔄 Falling back to HTML5 audio player');
            
            // Wait for audio to be ready
            const waitForAudioReady = () => {
                return new Promise((resolve, reject) => {
                    let attempts = 0;
                    const maxAttempts = 20;
                    
                    const checkReady = () => {
                        attempts++;
                        
                        if (window.player.duration && !isNaN(window.player.duration) && window.player.duration > 0) {
                            resolve();
                        } else if (attempts >= maxAttempts) {
                            reject(new Error('Audio duration never became available'));
                        } else {
                            setTimeout(checkReady, 50);
                        }
                    };
                    
                    checkReady();
                });
            };
            
            waitForAudioReady().then(() => {
                console.log(`✅ HTML5 audio ready - Duration: ${window.player.duration}s`);
                
                if (timeInSeconds <= window.player.duration && timeInSeconds >= 0) {
                    const oldTime = window.player.currentTime;
                    
                    // Edge-specific: Set up event listener to verify seek
                    const verifySeeking = () => {
                        console.log(`📍 HTML5 audio seek: ${oldTime}s -> ${window.player.currentTime}s (target: ${timeInSeconds}s)`);
                        window.player.removeEventListener('seeked', verifySeeking);
                    };
                    
                    window.player.addEventListener('seeked', verifySeeking);
                    window.player.currentTime = timeInSeconds;
                    
                    seekSuccess = true;
                    console.log('✅ HTML5 audio seek initiated');
                    
                    // Update the display manually
                    const formattedTime = formatTime(timeInSeconds);
                    const currentTimeElem = document.getElementById('currentTime');
                    if (currentTimeElem) {
                        currentTimeElem.textContent = formattedTime;
                    }
                    
                    // Force transcript update with multiple attempts for Edge
                    const forceTranscriptUpdate = (attempts = 0) => {
                        if (attempts >= 3) return;
                        
                        setTimeout(() => {
                            console.log(`🔄 Forcing transcript update attempt ${attempts + 1}`);
                            
                            if (typeof window.updateTranscriptTime === 'function') {
                                window.updateTranscriptTime(timeMs);
                            } else if (typeof window.updateTranscriptHighlight === 'function') {
                                window.updateTranscriptHighlight(timeMs);
                            } else if (typeof window.highlightCurrentTranscript === 'function') {
                                window.highlightCurrentTranscript(timeMs);
                            }
                            
                            // Try again if the first attempt didn't work
                            if (attempts === 0) {
                                forceTranscriptUpdate(attempts + 1);
                            }
                        }, 50 + (attempts * 50));
                    };
                    
                    forceTranscriptUpdate();
                    
                } else {
                    const msg = `HTML5 audio seek out of bounds: ${timeInSeconds}s not in [0, ${window.player.duration}s]`;
                    console.error('❌', msg);
                    errorMessages.push(msg);
                }
            }).catch(error => {
                const msg = `HTML5 audio not ready: ${error.message}`;
                console.error('❌', msg);
                errorMessages.push(msg);
            });
            
        } catch (error) {
            const msg = `HTML5 audio seeking error: ${error.message}`;
            console.error('❌', msg);
            errorMessages.push(msg);
        }
    }
    
    // Method 3: Last resort - direct audio element manipulation with Edge enhancements
    if (!seekSuccess) {
        try {
            console.log('🆘 Last resort: trying direct audio element access');
            const audioElements = document.querySelectorAll('audio');
            
            for (let i = 0; i < audioElements.length; i++) {
                const audio = audioElements[i];
                console.log(`🔍 Checking audio element ${i}:`, {
                    duration: audio.duration,
                    readyState: audio.readyState,
                    networkState: audio.networkState
                });
                
                if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
                    console.log(`✅ Found usable audio element ${i} with duration: ${audio.duration}s`);
                    
                    if (timeInSeconds <= audio.duration && timeInSeconds >= 0) {
                        const oldTime = audio.currentTime;
                        audio.currentTime = timeInSeconds;
                        seekSuccess = true;
                        console.log(`✅ Direct audio seek successful: ${oldTime}s -> ${timeInSeconds}s`);
                        break;
                    }
                }
            }
        } catch (error) {
            const msg = `Direct audio element error: ${error.message}`;
            console.error('❌', msg);
            errorMessages.push(msg);
        }
    }
    
    // Final result logging
    if (seekSuccess) {
        console.log(`✅ SEEK SUCCESSFUL: Moved to ${timeInSeconds}s (${timeMs}ms)`);
        return true;
    } else {
        console.error(`❌ ALL SEEKING METHODS FAILED for time: ${timeMs}ms`);
        console.error('💥 Error summary:', errorMessages);
        console.error('🔍 Audio state:', {
            wavesurfer: !!window.wavesurfer,
            wavesurferReady: !!(window.wavesurfer && window.wavesurfer.isReady),
            player: !!window.player,
            playerDuration: window.player ? window.player.duration : 'no player',
            audioElements: document.querySelectorAll('audio').length
        });
        return false;
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