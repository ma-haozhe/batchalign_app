/**
 * Transcript Player Diagnostic Tools
 */

// Function to verify Unicode decoding
function verifyUnicodeDecoding() {
    console.log("Running Unicode decoding verification...");
    const chatContent = document.getElementById('chatContent');
    
    if (!chatContent || !chatContent.value) {
        console.error("No CHAT content available for verification");
        return {
            status: "error",
            message: "No CHAT content available"
        };
    }
    
    // Get a sample of the content (first 500 chars)
    const sampleContent = chatContent.value.substring(0, 500);
    console.log("Sample content:", sampleContent);
    
    // Test for Unicode escape sequences
    const hasUnicodeEscapes = /\\u\d{4}/.test(sampleContent);
    const hasBackslashEscapes = /\\(?:1[05]|0*1[05])/.test(sampleContent);
    
    // Get decoded samples
    let decodedSample = "";
    if (typeof window.decodeUnicodeEscapeSequences === 'function') {
        decodedSample = window.decodeUnicodeEscapeSequences(sampleContent);
        console.log("Decoded sample:", decodedSample);
    } else {
        console.error("Unicode decoder function not available");
    }
    
    // Check for NAK characters in original content (control character \u0015)
    const hasNakChars = sampleContent.includes('\u0015') || /\\u0*15/.test(sampleContent);
    
    // Check for newline characters (\u000A)
    const hasNewlineEscapes = /\\u0*0*A/i.test(sampleContent) || /\\0*10/.test(sampleContent);
    
    // Check for timestamps in expected format
    const hasTimestamps = /\d{4,5}_\d{4,5}/.test(sampleContent);
    
    return {
        status: "success",
        hasUnicodeEscapes,
        hasBackslashEscapes,
        hasNakChars,
        hasNewlineEscapes,
        hasTimestamps,
        originalSample: sampleContent,
        decodedSample: decodedSample
    };
}

// Function to verify timestamp extraction
function verifyTimestampExtraction() {
    console.log("Running timestamp extraction verification...");
    const chatContent = document.getElementById('chatContent');
    
    if (!chatContent || !chatContent.value) {
        console.error("No CHAT content available for verification");
        return {
            status: "error",
            message: "No CHAT content available"
        };
    }
    
    // Split into lines and take a sample of utterance lines
    const lines = chatContent.value.split('\n');
    const utteranceLines = lines.filter(line => line.startsWith('*'));
    
    if (utteranceLines.length === 0) {
        console.warn("No utterance lines found in content");
        return {
            status: "warning",
            message: "No utterance lines found"
        };
    }
    
    // Take a sample of up to 5 utterance lines
    const sampleLines = utteranceLines.slice(0, 5);
    const results = [];
    
    // Test timestamp extraction on each line
    for (const line of sampleLines) {
        // First decode any Unicode escapes
        const decodedLine = typeof window.decodeUnicodeEscapeSequences === 'function'
            ? window.decodeUnicodeEscapeSequences(line)
            : line;
            
        // Try extracting timestamps
        let timestamps = null;
        if (typeof window.extractTimestampsFromChat === 'function') {
            timestamps = window.extractTimestampsFromChat(decodedLine);
        }
        
        results.push({
            line: decodedLine,
            timestamps: timestamps,
            success: !!timestamps
        });
    }
    
    // Count successful extractions
    const successCount = results.filter(r => r.success).length;
    
    return {
        status: successCount > 0 ? "success" : "warning",
        message: `Extracted timestamps from ${successCount} of ${results.length} sample lines`,
        sampleResults: results
    };
}

// Function to verify autoscrolling
function verifyAutoScrolling() {
    console.log("Verifying auto-scrolling functionality...");
    
    const autoScrollToggle = document.getElementById('autoScrollToggle');
    const container = document.getElementById('transcriptContainer');
    
    if (!autoScrollToggle) {
        console.error("Auto-scroll toggle not found");
        return {
            status: "error",
            message: "Auto-scroll toggle not found"
        };
    }
    
    if (!container) {
        console.error("Transcript container not found");
        return {
            status: "error",
            message: "Transcript container not found"
        };
    }
    
    // Check if the container has any transcript lines with timestamps
    const transcriptLines = container.querySelectorAll('.transcript-line[data-start]');
    if (transcriptLines.length === 0) {
        console.warn("No transcript lines with timestamps found");
        return {
            status: "warning",
            message: "No transcript lines with timestamps found"
        };
    }
    
    // Check if auto-scroll is enabled by default
    const isAutoScrollEnabled = autoScrollToggle.checked;
    
    // Check if the scrollToElement function exists
    const hasScrollFunction = typeof window.scrollToElement === 'function' || 
                             typeof scrollToElement === 'function';
    
    return {
        status: "success",
        isAutoScrollEnabled,
        hasScrollFunction,
        lineCount: transcriptLines.length
    };
}

// Function to run all diagnostic tests
function runDiagnostics() {
    console.log("Running full transcript display diagnostics...");
    
    const results = {
        unicodeDecoding: verifyUnicodeDecoding(),
        timestampExtraction: verifyTimestampExtraction(),
        autoScrolling: verifyAutoScrolling()
    };
    
    // Format results for display
    let html = '<h6>Diagnostic Results</h6>';
    
    // Unicode Decoding
    html += `<div class="diagnostic-section mb-2">
        <div class="d-flex justify-content-between">
            <strong>Unicode Decoding:</strong>
            <span class="badge bg-${results.unicodeDecoding.status === 'success' ? 'success' : 'warning'}">
                ${results.unicodeDecoding.status === 'success' ? 'OK' : 'Issues Found'}
            </span>
        </div>
        <ul class="small text-muted list-unstyled ms-3">
            <li>Unicode escapes: ${results.unicodeDecoding.hasUnicodeEscapes ? '✓' : '✗'}</li>
            <li>Backslash codes: ${results.unicodeDecoding.hasBackslashEscapes ? '✓' : '✗'}</li>
            <li>NAK characters: ${results.unicodeDecoding.hasNakChars ? '✓' : '✗'}</li>
            <li>Newline escapes: ${results.unicodeDecoding.hasNewlineEscapes ? '✓' : '✗'}</li>
            <li>Timestamps found: ${results.unicodeDecoding.hasTimestamps ? '✓' : '✗'}</li>
        </ul>
    </div>`;
    
    // Timestamp Extraction
    html += `<div class="diagnostic-section mb-2">
        <div class="d-flex justify-content-between">
            <strong>Timestamp Extraction:</strong>
            <span class="badge bg-${results.timestampExtraction.status === 'success' ? 'success' : 'warning'}">
                ${results.timestampExtraction.message}
            </span>
        </div>`;
        
    if (results.timestampExtraction.sampleResults) {
        html += '<div class="collapse" id="timestampSamples">';
        results.timestampExtraction.sampleResults.forEach((result, i) => {
            html += `<div class="small text-muted">
                <strong>Line ${i+1}:</strong> 
                ${result.success ? 
                    `Timestamps found: ${result.timestamps.start}-${result.timestamps.end}ms` : 
                    'No timestamps found'}
            </div>`;
        });
        html += '</div>';
        html += '<button class="btn btn-sm btn-outline-secondary mt-1" data-bs-toggle="collapse" data-bs-target="#timestampSamples">Show details</button>';
    }
    html += '</div>';
    
    // Auto-scrolling
    html += `<div class="diagnostic-section mb-2">
        <div class="d-flex justify-content-between">
            <strong>Auto-scrolling:</strong>
            <span class="badge bg-${results.autoScrolling.status === 'success' ? 'success' : 'warning'}">
                ${results.autoScrolling.status === 'success' ? 'Ready' : 'Issues Found'}
            </span>
        </div>
        <ul class="small text-muted list-unstyled ms-3">
            <li>Auto-scroll enabled: ${results.autoScrolling.isAutoScrollEnabled ? '✓' : '✗'}</li>
            <li>Scroll function: ${results.autoScrolling.hasScrollFunction ? '✓' : '✗'}</li>
            <li>Lines with timestamps: ${results.autoScrolling.lineCount || 0}</li>
        </ul>
    </div>`;
    
    // Add controls for fixing issues
    html += `<div class="mt-3">
        <button id="fixIssuesBtn" class="btn btn-sm btn-primary">Fix Issues</button>
        <button id="reloadPageBtn" class="btn btn-sm btn-outline-secondary ms-2">Reload Page</button>
    </div>`;
    
    // Update the display
    document.querySelector('#testResults').innerHTML = html;
    
    // Add event handlers
    document.getElementById('fixIssuesBtn').addEventListener('click', function() {
        fixIdentifiedIssues(results);
    });
    
    document.getElementById('reloadPageBtn').addEventListener('click', function() {
        window.location.reload();
    });
    
    return results;
}

// Function to fix identified issues
function fixIdentifiedIssues(results) {
    console.log("Fixing identified issues...");
    
    let fixesApplied = 0;
    let fixSummary = '<h6>Fixes Applied:</h6><ul class="small">';
    
    // 1. If transcript initialization failed
    if (document.getElementById('transcriptContainer').childElementCount === 0) {
        console.log("Fixing empty transcript container...");
        if (typeof window.initializeTranscriptDisplay === 'function') {
            window.initializeTranscriptDisplay();
            fixesApplied++;
            fixSummary += '<li>Re-initialized transcript display</li>';
        }
    }
    
    // 2. If timestamp extraction failed
    if (results.timestampExtraction.status !== 'success' || 
        document.querySelectorAll('.transcript-line[data-start]').length === 0) {
        console.log("Fixing timestamp extraction...");
        if (typeof initializeTimestampsPostLoad === 'function') {
            const timestampsFixed = initializeTimestampsPostLoad();
            if (timestampsFixed > 0) {
                fixesApplied++;
                fixSummary += `<li>Added timestamps to ${timestampsFixed} lines</li>`;
            }
        }
    }
    
    // 3. Make sure auto-scrolling is enabled
    const autoScrollToggle = document.getElementById('autoScrollToggle');
    if (autoScrollToggle && !autoScrollToggle.checked) {
        autoScrollToggle.checked = true;
        window.autoScroll = true;
        fixesApplied++;
        fixSummary += '<li>Enabled auto-scrolling</li>';
        
        // Trigger change event
        const event = new Event('change');
        autoScrollToggle.dispatchEvent(event);
    }
    
    // 4. Fix Unicode decoding if needed
    if (results.unicodeDecoding.status !== 'success') {
        console.log("Fixing Unicode decoding...");
        // Re-initialize with our enhanced decoder
        const chatContent = document.getElementById('chatContent');
        if (chatContent && chatContent.value && typeof window.decodeUnicodeEscapeSequences === 'function') {
            // No need to modify the actual content, just re-display with proper decoding
            if (typeof window.initializeTranscriptDisplay === 'function') {
                window.initializeTranscriptDisplay();
                fixesApplied++;
                fixSummary += '<li>Applied enhanced Unicode decoding</li>';
            }
        }
    }
    
    fixSummary += '</ul>';
    
    // Update the user on fixes
    if (fixesApplied > 0) {
        document.querySelector('#testResults').innerHTML = `
            <div class="alert alert-success">
                <strong>Success!</strong> Applied ${fixesApplied} fixes to the transcript display.
                ${fixSummary}
                <button id="runTestsAgainBtn" class="btn btn-sm btn-primary mt-2">Run Diagnostics Again</button>
            </div>
        `;
        
        document.getElementById('runTestsAgainBtn').addEventListener('click', runDiagnostics);
    } else {
        document.querySelector('#testResults').innerHTML = `
            <div class="alert alert-info">
                <strong>No fixes needed.</strong> Your transcript display appears to be working correctly.
                <button id="runTestsAgainBtn" class="btn btn-sm btn-primary mt-2">Run Diagnostics Again</button>
            </div>
        `;
        
        document.getElementById('runTestsAgainBtn').addEventListener('click', runDiagnostics);
    }
}

// Add event listener to run tests button
document.addEventListener('DOMContentLoaded', function() {
    const runTestsBtn = document.getElementById('runTestsBtn');
    if (runTestsBtn) {
        runTestsBtn.addEventListener('click', runDiagnostics);
    }
});
