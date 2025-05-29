/**
 * Transcript Display Fix Helper
 * A patch script to expose internal functions for our enhancer script
 */

document.addEventListener('DOMContentLoaded', function() {
    // Wait for transcript_display.js to load and expose the functions
    setTimeout(function() {
        // Try to expose the displayChatContent function 
        if (typeof displayChatContent === 'function' && typeof window.displayChatContent === 'undefined') {
            window.displayChatContent = displayChatContent;
            console.log("Exposed displayChatContent function for enhancer");
        }
        
        // Try to expose the extractChatTimestamps function
        if (typeof extractChatTimestamps === 'function' && typeof window.extractChatTimestamps === 'undefined') {
            window.extractChatTimestamps = extractChatTimestamps;
            console.log("Exposed extractChatTimestamps function for enhancer");
        }
    }, 500);  // Delay to ensure main script has loaded
});
