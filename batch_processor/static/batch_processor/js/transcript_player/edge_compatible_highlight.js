/**
 * Edge-compatible transcript highlighting system
 * This replaces all the complex highlighting logic with a simple, reliable implementation
 * that works consistently across browsers including Edge
 */

(function() {
    'use strict';
    
    // Global state variables
    let currentActiveElement = null;
    let highlightDebugMode = false;
    
    /**
     * Main highlighting function - called every time the audio position changes
     */
    function highlightCurrentTranscript(currentTimeMs) {
        if (currentTimeMs === null || currentTimeMs === undefined || currentTimeMs < 0) {
            console.warn('Invalid time provided to highlighter:', currentTimeMs);
            return;
        }
        
        if (highlightDebugMode) {
            console.log('Highlighting at time:', currentTimeMs + 'ms');
        }
        
        // Add a visual debug indicator every 5 seconds when debug mode is on
        if (highlightDebugMode && Math.floor(currentTimeMs / 1000) % 5 === 0) {
            console.log('🎯 Highlighting called with time:', currentTimeMs + 'ms');
        }
        
        // Find all transcript lines with timing data
        const transcriptLines = document.querySelectorAll('.transcript-line[data-start]');
        if (transcriptLines.length === 0) {
            if (highlightDebugMode) {
                console.log('No transcript lines found with timing data');
            }
            return;
        }
        
        // Clear previous highlighting
        clearAllHighlighting();
        
        // Find the best matching line
        let bestMatch = findBestMatchingLine(transcriptLines, currentTimeMs);
        
        if (bestMatch) {
            highlightLine(bestMatch, currentTimeMs);
            
            // Auto-scroll if enabled - try multiple auto-scroll methods
            if (window.autoScroll !== false) {
                // Try the dedicated auto-scroll function first
                if (typeof window.performAutoScroll === 'function') {
                    console.log('Using performAutoScroll function');
                    window.performAutoScroll(bestMatch);
                } 
                // Fallback to scroll function from transcript display
                else if (typeof scrollToElement === 'function') {
                    console.log('Using scrollToElement function');
                    scrollToElement(bestMatch);
                }
                // Basic fallback
                else {
                    console.log('Using basic scrollIntoView fallback');
                    try {
                        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } catch (e) {
                        console.log('Auto-scroll failed:', e);
                    }
                }
            } else {
                console.log('Auto-scroll is disabled');
            }
        }
    }
    
    /**
     * Clear all existing highlighting - Enhanced Safari fix
     */
    function clearAllHighlighting() {
        // Get ALL transcript lines, not just highlighted ones (Safari needs this)
        const allTranscriptLines = document.querySelectorAll('.transcript-line');
        
        allTranscriptLines.forEach(function(el) {
            // Remove ALL possible highlighting classes
            el.classList.remove('active', 'next-up', 'highlighted', 'current', 'playing');
            
            // Complete style attribute removal first
            try {
                if (el.hasAttribute('style')) {
                    el.removeAttribute('style');
                }
            } catch(e) {}
            
            // GENTLE Safari-specific clearing (avoiding DOM manipulation)
            if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
                try {
                    // GENTLE Safari clearing - avoid DOM manipulation that causes unresponsiveness
                    
                    // Remove highlight classes
                    el.classList.remove('active', 'next-up', 'highlighted', 'current', 'playing');
                    
                    // Clear only specific style properties that might stick
                    const propertiesToClear = ['background-color', 'border-color', 'color', 'border-left'];
                    propertiesToClear.forEach(prop => {
                        if (el.style[prop]) {
                            el.style.removeProperty(prop);
                        }
                    });
                    
                    // Light reflow trigger using getBoundingClientRect (gentle)
                    el.getBoundingClientRect();
                    
                    // That's it - no DOM manipulation to avoid Safari unresponsiveness
                    
                } catch(e) {
                    console.warn('Safari gentle clearing failed:', e);
                    // Fallback: just remove classes and style attribute
                    el.classList.remove('active', 'next-up', 'highlighted', 'current', 'playing');
                    el.removeAttribute('style');
                }
            } else {
                // For non-Safari browsers, standard but thorough clearing
                try {
                    // Remove individual style properties
                    const styleProperties = [
                        'background-color', 'backgroundColor', 'border-left', 'borderLeft',
                        'border-left-color', 'borderLeftColor', 'border-left-width', 'borderLeftWidth',
                        'border-left-style', 'borderLeftStyle', 'font-weight', 'fontWeight',
                        'transform', 'box-shadow', 'boxShadow', 'color', 'border-color', 
                        'borderColor', 'background', 'border', 'opacity', 'filter'
                    ];
                    
                    styleProperties.forEach(prop => {
                        try {
                            if (el.style.removeProperty) {
                                el.style.removeProperty(prop);
                            }
                            el.style[prop] = '';
                        } catch(e) {}
                    });
                } catch(e) {}
            }
        });
        
        // Reset progress bars
        const progressBars = document.querySelectorAll('.content-progress');
        progressBars.forEach(function(bar) {
            if (bar.hasAttribute('style')) {
                bar.removeAttribute('style');
            }
            bar.style.width = '0%';
        });
        
        currentActiveElement = null;
        
        // Ultra-aggressive Safari page-level style refresh
        if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
            try {
                // Force complete style recalculation by briefly hiding the entire transcript container
                const transcriptContainer = document.querySelector('.transcript-container, #transcript-container, .transcript-content');
                if (transcriptContainer) {
                    const originalDisplay = transcriptContainer.style.display;
                    transcriptContainer.style.display = 'none';
                    transcriptContainer.offsetHeight; // Force reflow
                    transcriptContainer.style.display = originalDisplay || '';
                    transcriptContainer.offsetHeight; // Force another reflow
                }
            } catch(e) {
                console.warn('Safari container refresh failed:', e);
            }
        }
    }
    
    /**
     * Find the best matching transcript line for the current time
     */
    function findBestMatchingLine(transcriptLines, currentTimeMs) {
        let bestMatch = null;
        let closestPastLine = null;
        let closestDistance = Infinity;
        
        // Convert NodeList to Array for better Edge compatibility
        const lines = Array.prototype.slice.call(transcriptLines);
        
        // Sort lines by start time
        lines.sort(function(a, b) {
            return parseInt(a.getAttribute('data-start')) - parseInt(b.getAttribute('data-start'));
        });
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const startTime = parseInt(line.getAttribute('data-start'));
            const endTime = line.getAttribute('data-end') ? 
                parseInt(line.getAttribute('data-end')) : 
                startTime + 10000; // Default 10 second duration
            
            // Skip invalid timestamps
            if (isNaN(startTime)) continue;
            
            // Skip word-level timing lines (they start with %wor:)
            const textContent = line.textContent || '';
            if (textContent.trim().indexOf('%wor:') === 0) continue;
            
            // Check if current time is within this segment
            if (currentTimeMs >= startTime && currentTimeMs <= endTime) {
                bestMatch = line;
                break;
            }
            
            // Track the closest past line as fallback
            if (startTime < currentTimeMs) {
                const distance = currentTimeMs - startTime;
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPastLine = line;
                }
            }
        }
        
        // If no exact match found, use the closest past line
        if (!bestMatch && closestPastLine) {
            bestMatch = closestPastLine;
        }
        
        return bestMatch;
    }
    
    /**
     * Highlight a specific transcript line
     */
    function highlightLine(line, currentTimeMs) {
        if (!line) return;
        
        // Add the active class
        line.classList.add('active');
        currentActiveElement = line;
        
        // BACKUP: Add inline styles to ensure highlighting is visible in normal mode
        if (!highlightDebugMode) {
            line.style.backgroundColor = '#e3f2fd'; // Light blue to match CSS
            line.style.borderLeft = '5px solid #2196f3'; // Blue border
            line.style.fontWeight = '600';
            line.style.transform = 'translateX(5px)';
            line.style.boxShadow = '0 3px 8px rgba(33, 150, 243, 0.3)';
            line.style.color = '#1565c0'; // Dark blue text
        }
        
        // Always log highlighting activity for debugging
        console.log('🎯 Applied .active class to line:', line.textContent.substring(0, 50) + '...');
        
        // Add visual indicator to page title
        document.title = '🎯 HIGHLIGHTING ACTIVE - ' + (document.title.replace(/^🎯 HIGHLIGHTING ACTIVE - /, ''));
        
        // Add temporary visual debug indicator
        if (highlightDebugMode) {
            line.style.border = '2px solid red';
            setTimeout(function() {
                line.style.border = '';
            }, 1000);
            console.log('✅ Highlighted line (DEBUG MODE):', line.textContent.substring(0, 50) + '...');
        } else {
            console.log('✅ Highlighted line (NORMAL MODE):', line.textContent.substring(0, 50) + '...');
            console.log('   📍 LOOK FOR YELLOW BACKGROUND WITH ORANGE BORDER!');
        }
        
        // Update progress indicator if it exists
        updateProgressIndicator(line, currentTimeMs);
    }
    
    /**
     * Update the progress indicator for the current line
     */
    function updateProgressIndicator(line, currentTimeMs) {
        const progressElement = line.querySelector('.content-progress');
        if (!progressElement) return;
        
        const startTime = parseInt(line.getAttribute('data-start'));
        const endTime = line.getAttribute('data-end') ? 
            parseInt(line.getAttribute('data-end')) : 
            startTime + 10000;
        
        if (isNaN(startTime) || isNaN(endTime)) return;
        
        const duration = endTime - startTime;
        const elapsed = currentTimeMs - startTime;
        const percentage = Math.min(100, Math.max(0, (elapsed / duration) * 100));
        
        progressElement.style.width = percentage + '%';
    }
    
    /**
     * Enhanced scrolling function for Edge compatibility
     */
    function scrollToElement(element) {
        if (!element) {
            console.warn('scrollToElement: No element provided');
            return;
        }
        
        if (!window.autoScroll) {
            console.log('scrollToElement: Auto-scroll is disabled');
            return;
        }
        
        console.log('scrollToElement: Attempting to scroll to element:', element.textContent ? element.textContent.slice(0, 50) + '...' : 'unknown');
        
        const container = document.getElementById('transcriptContainer');
        if (!container) {
            console.error('scrollToElement: Transcript container not found');
            return;
        }
        
        try {
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            
            console.log('scrollToElement: Container rect:', containerRect);
            console.log('scrollToElement: Element rect:', elementRect);
            
            // Check if element is already visible with some padding
            const padding = 50; // Give some breathing room
            const isVisible = elementRect.top >= (containerRect.top - padding) && 
                             elementRect.bottom <= (containerRect.bottom + padding);
            
            if (isVisible) {
                console.log('scrollToElement: Element is already visible, no scroll needed');
                return;
            }
            
            // Calculate scroll position
            const containerScrollTop = container.scrollTop;
            const elementOffsetTop = element.offsetTop;
            const containerHeight = container.clientHeight;
            const elementHeight = element.offsetHeight;
            
            console.log('scrollToElement: Current scroll:', containerScrollTop);
            console.log('scrollToElement: Element offset top:', elementOffsetTop);
            console.log('scrollToElement: Container height:', containerHeight);
            
            // Center the element in the container
            const targetScrollTop = Math.max(0, elementOffsetTop - (containerHeight / 2) + (elementHeight / 2));
            
            console.log('scrollToElement: Target scroll position:', targetScrollTop);
            
            // Use native scrollTo for better Edge compatibility
            if (container.scrollTo && typeof container.scrollTo === 'function') {
                console.log('scrollToElement: Using smooth scroll');
                container.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            } else {
                // Fallback for older browsers
                console.log('scrollToElement: Using direct scroll assignment');
                container.scrollTop = targetScrollTop;
            }
            
            // Verify scroll happened
            setTimeout(() => {
                const newScrollTop = container.scrollTop;
                console.log('scrollToElement: Scroll verification - new position:', newScrollTop);
                if (Math.abs(newScrollTop - targetScrollTop) > 10) {
                    console.warn('scrollToElement: Scroll may not have worked as expected');
                } else {
                    console.log('scrollToElement: ✅ Scroll completed successfully');
                }
            }, 100);
            
        } catch (error) {
            console.error('scrollToElement: Scroll error:', error.message);
        }
    }
    
    /**
     * Initialize the highlighting system
     */
    function initializeHighlighting() {
        console.log('Initializing Edge-compatible transcript highlighting');
        
        // Make the main function globally available
        window.highlightTranscriptAtTime = highlightCurrentTranscript;
        window.updateTranscriptHighlight = highlightCurrentTranscript;
        window.updateTranscriptTime = function(timeMs) {
            highlightCurrentTranscript(timeMs);
        };
        
        // Make scroll function available
        window.scrollToElement = scrollToElement;
        
        // Enable debug mode if needed
        if (window.location.search.indexOf('debug=highlight') !== -1 || 
            window.location.search.indexOf('highlight_debug=1') !== -1) {
            highlightDebugMode = true;
            console.log('🔍 Highlight debug mode enabled');
        }
        
        console.log('Edge-compatible highlighting system ready');
    }
    
    /**
     * Test function to verify highlighting works
     */
    function testHighlighting() {
        console.log('Testing highlighting system...');
        
        const transcriptLines = document.querySelectorAll('.transcript-line[data-start]');
        console.log('Found', transcriptLines.length, 'transcript lines with timing');
        
        if (transcriptLines.length > 0) {
            const firstLine = transcriptLines[0];
            const startTime = parseInt(firstLine.getAttribute('data-start'));
            console.log('Testing with first line start time:', startTime);
            
            // Test with the exact start time
            console.log('🧪 Testing highlighting with time:', startTime);
            highlightCurrentTranscript(startTime);
            
            // Test with a time 1 second into the first segment
            setTimeout(function() {
                console.log('🧪 Testing highlighting with time:', startTime + 1000);
                highlightCurrentTranscript(startTime + 1000);
            }, 1000);
            
            // Test with 0ms to make sure that works too
            setTimeout(function() {
                console.log('🧪 Testing highlighting with time: 0ms');
                highlightCurrentTranscript(0);
            }, 2000);
        }
        
        return transcriptLines.length > 0;
    }
    
    /**
     * Run a continuous highlighting test simulating audio playback
     */
    function runContinuousHighlightTest() {
        console.log('🎬 Starting continuous highlight test...');
        const transcriptLines = document.querySelectorAll('.transcript-line[data-start]');
        
        if (transcriptLines.length < 3) {
            console.log('Not enough transcript lines for continuous test');
            return;
        }
        
        // Get first few lines for testing
        const testLines = Array.prototype.slice.call(transcriptLines, 0, 3);
        let currentTestIndex = 0;
        
        const testInterval = setInterval(function() {
            if (currentTestIndex >= testLines.length) {
                clearInterval(testInterval);
                console.log('✅ Continuous highlight test completed');
                return;
            }
            
            const line = testLines[currentTestIndex];
            const startTime = parseInt(line.getAttribute('data-start'));
            console.log('🔄 Testing line', currentTestIndex + 1, 'at time', startTime);
            highlightCurrentTranscript(startTime + 500); // Add 500ms to be within the segment
            
            currentTestIndex++;
        }, 2000); // Test each line for 2 seconds
        
        return true;
    }
    
    /**
     * Debug function to toggle highlighting debug mode
     */
    function setHighlightDebug(enabled) {
        highlightDebugMode = enabled;
        console.log('🔍 Highlight debug mode:', enabled ? 'ENABLED' : 'DISABLED');
        return highlightDebugMode;
    }
    
    /**
     * Debug function to get highlighting info
     */
    function debugHighlighter() {
        const transcriptLines = document.querySelectorAll('.transcript-line[data-start]');
        const activeLines = document.querySelectorAll('.transcript-line.active');
        
        console.log('🔍 Highlighter Debug Info:');
        console.log('- Debug mode:', highlightDebugMode);
        console.log('- Total transcript lines with timing:', transcriptLines.length);
        console.log('- Currently active lines:', activeLines.length);
        console.log('- Current active element:', currentActiveElement);
        
        if (activeLines.length > 0) {
            console.log('- Active line text:', activeLines[0].textContent.slice(0, 50) + '...');
        }
        
        return {
            debugMode: highlightDebugMode,
            totalLines: transcriptLines.length,
            activeLines: activeLines.length,
            currentActive: currentActiveElement
        };
    }
    
    // Export core functions globally for integration and testing
    window.highlightCurrentTranscript = highlightCurrentTranscript;
    window.clearAllHighlighting = clearAllHighlighting;
    window.safariClearFix = clearAllHighlighting; // Alias for Safari clear fix
    window.debugHighlighter = debugHighlighter;
    window.setHighlightDebug = setHighlightDebug;
    
    // Export test functions globally
    window.testTranscriptHighlighting = testHighlighting;
    window.runContinuousHighlightTest = runContinuousHighlightTest;
    
    console.log('🎯 Transcript highlighting functions loaded and exposed globally');
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHighlighting);
    } else {
        initializeHighlighting();
    }
    
})();
