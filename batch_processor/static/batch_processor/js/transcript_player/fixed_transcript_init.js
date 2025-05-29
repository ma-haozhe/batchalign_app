/**
 * Fixed Transcript Display initialization for CHAT format
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Fixed transcript initialization loading");
    
    // Provide a global function to initialize the transcript display
    if (typeof window.initializeTranscriptDisplay !== 'function') {
        console.log("Installing proper transcript initialization function");
        
        window.initializeTranscriptDisplay = function() {
            console.log("Running clean transcript display initialization");
            
            // Get transcript content
            const chatContent = document.getElementById('chatContent');
            const diarizationData = document.getElementById('diarizationData');
            
            if (!chatContent && !diarizationData) {
                console.error("Required content elements not found in DOM");
                const transcriptContainer = document.getElementById('transcriptContainer');
                if (transcriptContainer) {
                    transcriptContainer.innerHTML = `
                        <div class="alert alert-danger">
                            <strong>Error:</strong> Required transcript content elements not found.
                        </div>
                    `;
                }
                return;
            }
            
            // Display transcript content based on format
            if (chatContent && chatContent.value && chatContent.value.trim() !== '') {
                console.log("Found CHAT content, displaying");
                
                try {
                    // Ensure Unicode decoding is applied first
                    const decodedChatContent = typeof window.decodeUnicodeEscapeSequences === 'function' 
                        ? window.decodeUnicodeEscapeSequences(chatContent.value)
                        : chatContent.value;
                        
                    // Display the content
                    displayChatContent(decodedChatContent);
                    
                    // After display, initialize timestamps
                    setTimeout(function() {
                        if (typeof window.initializeTimestampsPostLoad === 'function') {
                            console.log("Running post-load timestamp initialization");
                            window.initializeTimestampsPostLoad();
                        }
                    }, 1000);
                    
                } catch (error) {
                    console.error("Error displaying CHAT content:", error);
                    const transcriptContainer = document.getElementById('transcriptContainer');
                    if (transcriptContainer) {
                        transcriptContainer.innerHTML = `
                            <div class="alert alert-danger">
                                <strong>Error:</strong> Failed to display CHAT content: ${error.message}
                            </div>
                        `;
                    }
                }
                
            } else if (diarizationData && diarizationData.value && diarizationData.value.trim() !== '') {
                console.log("Found diarization data, displaying");
                
                try {
                    const segments = JSON.parse(diarizationData.value);
                    displaySegments(segments);
                } catch (error) {
                    console.error("Error parsing diarization data:", error);
                    const transcriptContainer = document.getElementById('transcriptContainer');
                    if (transcriptContainer) {
                        transcriptContainer.innerHTML = `
                            <div class="alert alert-danger">
                                <strong>Error:</strong> Could not parse diarization data: ${error.message}
                            </div>
                        `;
                    }
                }
                
            } else {
                console.warn("No transcript content available");
                const transcriptContainer = document.getElementById('transcriptContainer');
                if (transcriptContainer) {
                    transcriptContainer.innerHTML = `
                        <div class="alert alert-warning">
                            <strong>Warning:</strong> No transcript content available.
                        </div>
                    `;
                }
            }
            
            // Set up format tabs with direct event binding
            setupFormatTabs();
        };
        
        // Helper function to set up the format tabs
        function setupFormatTabs() {
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
                    
                    if (chatPane) chatPane.classList.remove('show', 'active');
                    if (rawPane) rawPane.classList.add('show', 'active');
                };
            }
            
            // Initialize the autoScroll toggle
            const autoScrollToggle = document.getElementById('autoScrollToggle');
            if (autoScrollToggle) {
                // Set default state
                window.autoScroll = autoScrollToggle.checked;
                
                // Add event listener
                autoScrollToggle.addEventListener('change', function() {
                    window.autoScroll = this.checked;
                    console.log(`Auto-scroll ${window.autoScroll ? 'enabled' : 'disabled'}`);
                });
            }
        }
        
        // Schedule the initialization during page load
        setTimeout(function() {
            if (typeof window.initializeTranscriptDisplay === 'function') {
                console.log("Running transcript display initialization");
                window.initializeTranscriptDisplay();
            }
        }, 1000);
    }
});
