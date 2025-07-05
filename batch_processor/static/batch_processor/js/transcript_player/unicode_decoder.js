/**
 * Unicode Escape Sequence Decoder
 * For properly handling Unicode escape sequences in transcript files
 */

// Helper function to decode Unicode escape sequences like \u000A (newline) and \u0015 (NAK)
function decodeUnicodeEscapeSequences(text) {
    if (!text) return text;
    
    // Handle both standard format \uXXXX and other forms like \u000A or \0015
    return text
        // Handle standard JavaScript Unicode escapes \uXXXX
        .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        })
        // Handle other backslash formats like \0015XXXX_YYYY\0015 (CHAT format specific notation)
        .replace(/\\0*15(\d+(?:_\d+)?)\\0*15/g, '$1')
        // Handle actual Unicode NAK characters around timestamps
        .replace(/\u0015(\d+(?:_\d+)?)\u0015/g, '$1')
        // Handle \1234 style escape sequences (octal notation)
        .replace(/\\([0-7]{3})/g, (match, oct) => {
            return String.fromCharCode(parseInt(oct, 8));
        })
        // Handle numeric escape codes like \15 or \015
        .replace(/\\0*([0-9]{1,3})/g, (match, num) => {
            return String.fromCharCode(parseInt(num, 10));
        });
}

// Make it available globally
window.decodeUnicodeEscapeSequences = decodeUnicodeEscapeSequences;
