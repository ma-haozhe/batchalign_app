/**
 * Edge-compatible diagnostics for transcript highlighting
 */

(function() {
    'use strict';
    
    function runHighlightDiagnostics() {
        console.log('=== TRANSCRIPT HIGHLIGHT DIAGNOSTICS ===');
        
        const results = {
            transcriptLines: 0,
            linesWithTiming: 0,
            progressBars: 0,
            cssClasses: [],
            errors: []
        };
        
        try {
            // Check for transcript lines
            const transcriptLines = document.querySelectorAll('.transcript-line');
            results.transcriptLines = transcriptLines.length;
            console.log('Total transcript lines found:', results.transcriptLines);
            
            // Check for lines with timing data
            const linesWithTiming = document.querySelectorAll('.transcript-line[data-start]');
            results.linesWithTiming = linesWithTiming.length;
            console.log('Lines with timing data:', results.linesWithTiming);
            
            // Check for progress bars
            const progressBars = document.querySelectorAll('.content-progress');
            results.progressBars = progressBars.length;
            console.log('Progress bars found:', results.progressBars);
            
            // Check CSS classes
            const stylesheets = document.styleSheets;
            for (let i = 0; i < stylesheets.length; i++) {
                try {
                    const stylesheet = stylesheets[i];
                    if (stylesheet.href && stylesheet.href.indexOf('edge_compatible_highlight') !== -1) {
                        results.cssClasses.push('edge_compatible_highlight.css loaded');
                    }
                    if (stylesheet.href && stylesheet.href.indexOf('transcript_player') !== -1) {
                        results.cssClasses.push('transcript_player.css loaded');
                    }
                } catch (e) {
                    // Can't access cross-origin stylesheets
                }
            }
            
            // Check if highlighting functions exist
            if (typeof window.highlightTranscriptAtTime === 'function') {
                results.cssClasses.push('highlightTranscriptAtTime function available');
            } else {
                results.errors.push('highlightTranscriptAtTime function not available');
            }
            
            if (typeof window.updateTranscriptHighlight === 'function') {
                results.cssClasses.push('updateTranscriptHighlight function available');
            } else {
                results.errors.push('updateTranscriptHighlight function not available');
            }
            
            // Test a sample highlighting if we have data
            if (results.linesWithTiming > 0) {
                const firstLine = linesWithTiming[0];
                const startTime = parseInt(firstLine.getAttribute('data-start'));
                
                console.log('Testing highlight with first line start time:', startTime);
                
                if (typeof window.highlightTranscriptAtTime === 'function') {
                    window.highlightTranscriptAtTime(startTime + 1000);
                    
                    // Check if highlighting worked
                    setTimeout(function() {
                        const activeLines = document.querySelectorAll('.transcript-line.active');
                        if (activeLines.length > 0) {
                            results.cssClasses.push('Highlighting test PASSED - found active line');
                            console.log('✓ Highlighting test passed');
                        } else {
                            results.errors.push('Highlighting test FAILED - no active lines found');
                            console.log('✗ Highlighting test failed');
                        }
                        
                        displayDiagnosticResults(results);
                    }, 500);
                } else {
                    results.errors.push('Cannot test highlighting - function not available');
                    displayDiagnosticResults(results);
                }
            } else {
                results.errors.push('Cannot test highlighting - no lines with timing data');
                displayDiagnosticResults(results);
            }
            
        } catch (error) {
            results.errors.push('Diagnostic error: ' + error.message);
            console.error('Diagnostic error:', error);
            displayDiagnosticResults(results);
        }
    }
    
    function displayDiagnosticResults(results) {
        let report = '\\n=== DIAGNOSTIC REPORT ===\\n';
        report += 'Transcript lines: ' + results.transcriptLines + '\\n';
        report += 'Lines with timing: ' + results.linesWithTiming + '\\n';
        report += 'Progress bars: ' + results.progressBars + '\\n';
        report += '\\nFeatures detected:\\n';
        results.cssClasses.forEach(function(item) {
            report += '✓ ' + item + '\\n';
        });
        
        if (results.errors.length > 0) {
            report += '\\nErrors found:\\n';
            results.errors.forEach(function(error) {
                report += '✗ ' + error + '\\n';
            });
        }
        
        console.log(report);
        
        // Also show in UI if debug panel exists
        const debugContent = document.querySelector('.debug-content');
        if (debugContent) {
            debugContent.innerHTML = '<pre>' + report + '</pre>';
            
            // Show debug panel
            const debugInfo = document.getElementById('debugInfo');
            if (debugInfo) {
                debugInfo.style.display = 'block';
            }
        }
    }
    
    // Make functions globally available
    window.runHighlightDiagnostics = runHighlightDiagnostics;
    
    // Auto-run diagnostics if URL parameter is present
    if (window.location.search.indexOf('highlight_debug=1') !== -1) {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(runHighlightDiagnostics, 2000);
        });
    }
    
})();
