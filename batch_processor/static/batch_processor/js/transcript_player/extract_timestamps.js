/**
 * CHAT Format Timestamp Extractor
 * Specialized in extracting timestamps from CHAT format files
 */

// Ensure this module loads early and integrates properly with the rest of the code
console.log("Initializing improved CHAT timestamp extractor");

// Store any existing implementation to avoid conflicts
const existingExtractor = window.extractChatTimestamps;

// Main function to extract timestamps from CHAT format lines
function extractChatTimestamps(text) {
    if (!text) return null;
    
    // Clean up the text first - this is important for correct pattern matching
    const cleanText = typeof window.decodeUnicodeEscapeSequences === 'function' 
        ? window.decodeUnicodeEscapeSequences(text) 
        : text;

    console.log("Attempting to extract timestamp from:", cleanText);
    
    // Direct pattern for CHAT format observed in transcript: check for "NNNNN_NNNNN" at end of line
    // Example: "to put his legs down first Thomas push his legs down . 18805_22745"
    // Look specifically for 5-6 digit numbers which is what appears in the file
    const directPattern = /(\d{5,6})_(\d{5,6})$/;
    const directMatch = cleanText.match(directPattern);
    if (directMatch && directMatch.length >= 3) {
        const startTime = parseInt(directMatch[1]);
        const endTime = parseInt(directMatch[2]);
        console.log(`DIRECT MATCH: Extracted timestamp from end of line: ${startTime}_${endTime}`);
        return { start: startTime, end: endTime };
    }
    
    // Pattern 1: Check for any timestamp at the end of line (more flexible)
    const endTimestampPattern = /\s(\d{4,6})_(\d{4,6})$/;
    const endMatch = cleanText.match(endTimestampPattern);
    if (endMatch && endMatch.length >= 3) {
        const startTime = parseInt(endMatch[1]);
        const endTime = parseInt(endMatch[2]);
        console.log(`Extracted timestamp from end of line: ${startTime}_${endTime}`);
        return { start: startTime, end: endTime };
    }
    
    // Pattern 2: CHAT format with timestamp after period with space
    // Example: "to put his legs down . 18805_22745"
    const periodTimestampPattern = /\.\s+(\d{4,6})_(\d{4,6})/;
    const periodMatch = cleanText.match(periodTimestampPattern);
    if (periodMatch && periodMatch.length >= 3) {
        const startTime = parseInt(periodMatch[1]);
        const endTime = parseInt(periodMatch[2]);
        console.log(`Extracted timestamp after period: ${startTime}_${endTime}`);
        return { start: startTime, end: endTime };
    }
    
    // Pattern 3: Special case for %wor lines (word-level timestamps)
    if (cleanText.startsWith('%wor:')) {
        // This is a word-level line, extract the first and last timestamp
        const wordLevelPattern = /(\d{5,6})_(\d{5,6})/g;
        const matches = [...cleanText.matchAll(wordLevelPattern)];
        if (matches.length > 0) {
            // Get the first and last timestamps
            const firstMatch = matches[0];
            const lastMatch = matches[matches.length - 1];
            
            const startTime = parseInt(firstMatch[1]);
            const endTime = parseInt(lastMatch[2]);
            console.log(`Extracted timestamp range from %wor line: ${startTime}_${endTime}`);
            return { start: startTime, end: endTime };
        }
    } 
    
    // Pattern 4: General word-level timestamps from other lines
    // Be more careful here to not pick up timestamps that should be displayed
    // Only match if there are multiple timestamps
    const wordLevelPattern = /(\d{5,6})_(\d{5,6})/g;
    const matches = [...cleanText.matchAll(wordLevelPattern)];
    if (matches.length > 1) {
        // We have multiple timestamps, this is likely a word-level line
        // Get the first and last timestamps 
        const firstMatch = matches[0];
        const lastMatch = matches[matches.length - 1];
        
        const startTime = parseInt(firstMatch[1]);
        const endTime = parseInt(lastMatch[2]);
        console.log(`Extracted timestamp range from multiple timestamps: ${startTime}_${endTime}`);
        return { start: startTime, end: endTime };
    }
    
    // Fallback patterns for other timestamp formats
    
    // Bracket format [12345-67890]
    const bracketPattern = /\[(\d+)-(\d+)\]/;
    const bracketMatch = cleanText.match(bracketPattern);
    if (bracketMatch && bracketMatch.length >= 3) {
        const startTime = parseInt(bracketMatch[1]);
        const endTime = parseInt(bracketMatch[2]);
        console.log(`Extracted timestamp from brackets: ${startTime}-${endTime}`);
        return { start: startTime, end: endTime };
    }
    
    // Format with NAK character or \\0015
    const nakPattern = /(?:\\0*15|\\u0015|\u0015)(\d+)(?:_(\d+))?(?:\\0*15|\\u0015|\u0015)/;
    const nakMatch = cleanText.match(nakPattern);
    if (nakMatch && nakMatch.length >= 2) {
        const startTime = parseInt(nakMatch[1]);
        const endTime = nakMatch[2] ? parseInt(nakMatch[2]) : startTime + 5000;
        console.log(`Extracted timestamp from NAK format: ${startTime}_${endTime}`);
        return { start: startTime, end: endTime };
    }
    
    // No timestamp found
    console.warn("No timestamp pattern matched for:", cleanText);
    return null;
}

// Make available globally with special handling to avoid conflicts
window.extractChatTimestamps = extractChatTimestamps;

// Export a specifically named function for compatibility
window.extractTimestampsFromChat = extractChatTimestamps;

// Add initialization that runs after the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("CHAT timestamp extractor initialized and ready");
    
    // Trigger a re-initialization of timestamps after a short delay
    setTimeout(function() {
        if (typeof window.initializeTimestampsPostLoad === 'function') {
            console.log("Running post-load timestamp initialization");
            window.initializeTimestampsPostLoad();
        }
    }, 1000);
});
