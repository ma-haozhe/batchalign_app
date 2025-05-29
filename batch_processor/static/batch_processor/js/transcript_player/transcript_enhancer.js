/**
 * Transcript Display Enhancer
 * Adds Unicode escape sequence handling capabilities to transcript player
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Transcript enhancer initialized");
    
    // Store original displayChatContent function if it exists
    if (typeof window.displayChatContent === 'undefined') {
        // Wait for it to be defined
        const checkInterval = setInterval(function() {
            if (typeof window.displayChatContent !== 'undefined') {
                enhanceTranscriptDisplay();
                clearInterval(checkInterval);
            }
        }, 100);
    } else {
        enhanceTranscriptDisplay();
    }
    
    // Function to enhance the transcript display with Unicode decoding
    function enhanceTranscriptDisplay() {
        console.log("Enhancing transcript display with Unicode escape sequence handling");
        
        // Store the original function
        const originalInitializeTranscriptDisplay = window.initializeTranscriptDisplay;
        
        // Override the initialization function with our enhanced version
        window.initializeTranscriptDisplay = function() {
            console.log("Running enhanced transcript initializer");
            
            // Get transcript content
            const chatContentElem = document.getElementById('chatContent');
            if (chatContentElem && chatContentElem.value) {
                // Apply Unicode decoding before passing to the original function
                const originalValue = chatContentElem.value;
                
                // Check if we need to decode
                if (originalValue.includes('\\u') || originalValue.includes('\\0')) {
                    console.log("Unicode escape sequences detected, decoding...");
                    try {
                        // Apply decoding
                        chatContentElem.value = window.decodeUnicodeEscapeSequences(originalValue);
                        console.log("Unicode escape sequences successfully decoded");
                    } catch (error) {
                        console.error("Error decoding Unicode escape sequences:", error);
                    }
                }
            }
            
            // Call the original function
            originalInitializeTranscriptDisplay();
        };
        
        // Also enhance the extractChatTimestamps function if available
        if (typeof window.extractChatTimestamps === 'function') {
            const originalExtractTimestamps = window.extractChatTimestamps;
            
            window.extractChatTimestamps = function(text) {
                // First try our enhanced extractor
                if (window.extractTimestampsFromNak) {
                    const timestamps = window.extractTimestampsFromNak(text);
                    if (timestamps) {
                        return timestamps;
                    }
                }
                
                // Fall back to original function
                return originalExtractTimestamps(text);
            };
        }
    }
});
