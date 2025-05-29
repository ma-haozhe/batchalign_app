/**
 * Debug Helper for Transcript Player
 * This script helps diagnose issues with transcript timestamp extraction
 */

// Execute after DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Debug script initialized");

    setTimeout(function() {
        console.log("Running diagnostic checks...");
        runDiagnostics();
    }, 3000); // Wait a bit for everything to initialize
});

// Function to run diagnostics on transcript display
function runDiagnostics() {
    console.log("=== DIAGNOSTIC INFORMATION ===");
    
    // Check if our timestamp extractors are available
    console.log("Timestamp extractors available:");
    console.log("- window.extractChatTimestamps:", typeof window.extractChatTimestamps === 'function');
    console.log("- window.extractTimestampsFromChat:", typeof window.extractTimestampsFromChat === 'function');
    
    // Check the content of the transcript container
    const transcriptContainer = document.getElementById('transcriptContainer');
    if (!transcriptContainer) {
        console.error("Transcript container not found!");
        return;
    }
    
    // Count lines with and without timestamps
    const transcriptLines = transcriptContainer.querySelectorAll('.transcript-line');
    console.log(`Total transcript lines: ${transcriptLines.length}`);
    
    let linesWithTimestamps = 0;
    let linesWithoutTimestamps = 0;
    
    transcriptLines.forEach((line, index) => {
        if (line.dataset.start) {
            linesWithTimestamps++;
        } else {
            linesWithoutTimestamps++;
            // Get line text and try to extract timestamp manually
            const lineText = line.textContent;
            console.log(`Line ${index} without timestamp: "${lineText}"`);
            
            // Try to manually extract timestamp with our function
            if (typeof window.extractTimestampsFromChat === 'function') {
                const timestamps = window.extractTimestampsFromChat(lineText);
                if (timestamps) {
                    console.log(`  - Manual extraction found timestamp: ${timestamps.start}-${timestamps.end}`);
                    
                    // Apply the timestamp and add click handler
                    line.dataset.start = timestamps.start;
                    line.dataset.end = timestamps.end;
                    
                    // Add timestamp display
                    if (!line.querySelector('.transcript-timestamp') && 
                        typeof window.formatTime === 'function') {
                        const timestamp = document.createElement('span');
                        timestamp.className = 'transcript-timestamp';
                        timestamp.textContent = window.formatTime(timestamps.start / 1000);
                        line.appendChild(timestamp);
                    }
                    
                    // Add click handler
                    line.addEventListener('click', function() {
                        if (typeof window.seekToTime === 'function') {
                            window.seekToTime(parseInt(line.dataset.start));
                        }
                    });
                    
                    console.log(`  - Applied timestamp to line ${index}`);
                } else {
                    console.log(`  - No timestamp found through manual extraction`);
                    // Try even more aggressively with direct pattern matching
                    const directMatch = lineText.match(/(\d{5})_(\d{5})/);
                    if (directMatch && directMatch.length >= 3) {
                        console.log(`  - Direct pattern found: ${directMatch[1]}_${directMatch[2]}`);
                        
                        // Apply the timestamps
                        line.dataset.start = parseInt(directMatch[1]);
                        line.dataset.end = parseInt(directMatch[2]);
                        
                        // Add timestamp display
                        if (!line.querySelector('.transcript-timestamp') && 
                            typeof window.formatTime === 'function') {
                            const timestamp = document.createElement('span');
                            timestamp.className = 'transcript-timestamp';
                            timestamp.textContent = window.formatTime(parseInt(directMatch[1]) / 1000);
                            line.appendChild(timestamp);
                        }
                        
                        // Add click handler
                        line.addEventListener('click', function() {
                            if (typeof window.seekToTime === 'function') {
                                window.seekToTime(parseInt(line.dataset.start));
                            }
                        });
                        
                        console.log(`  - Applied direct timestamp to line ${index}`);
                    }
                }
            }
        }
    });
    
    console.log(`Lines with timestamps: ${linesWithTimestamps}`);
    console.log(`Lines without timestamps: ${linesWithoutTimestamps}`);
    
    // Update the transcript highlight if we have timestamps now
    if (linesWithTimestamps > 0 && typeof window.updateTranscriptHighlight === 'function') {
        const currentTime = window.audio ? window.audio.currentTime * 1000 : 0;
        console.log(`Updating transcript highlight with current time: ${currentTime}ms`);
        window.updateTranscriptHighlight(currentTime);
    }
    
    console.log("=== END DIAGNOSTIC INFORMATION ===");
}

// Make diagnostics available globally
window.runTranscriptDiagnostics = runDiagnostics;
