/**
 * Dedicated Auto-Scroll Fix
 * This file ensures auto-scroll works reliably across all browsers
 */

(function() {
    'use strict';
    
    // Auto-scroll configuration
    let autoScrollEnabled = true;
    let debugAutoScroll = false;
    
    // Enable debug mode if URL parameter is present
    if (window.location.search.includes('autoscroll_debug=1')) {
        debugAutoScroll = true;
        console.log('🔍 Auto-scroll debug mode enabled');
    }
    
    /**
     * Integration with height enforcer - ensure container constraints before auto-scroll
     */
    function ensureContainerConstraints() {
        if (window.heightEnforcer && typeof window.heightEnforcer.enforce === 'function') {
            console.log('🔧 Enforcing container constraints before auto-scroll...');
            window.heightEnforcer.enforce();
        }
    }
    
    /**
     * Enhanced auto-scroll function that works reliably and ALWAYS centers the element
     */
    function performAutoScroll(targetElement) {
        if (!targetElement) {
            console.warn('performAutoScroll: No target element provided');
            return false;
        }
        
        if (!autoScrollEnabled) {
            console.log('performAutoScroll: Auto-scroll is disabled');
            return false;
        }
        
        // CRITICAL: Ensure container height constraints before auto-scroll
        ensureContainerConstraints();
        
        // Find the transcript container - BE VERY SPECIFIC about the correct container
        // The scrollable container is .transcript-container (class), not #transcriptContainer (ID)
        let container = document.querySelector('.transcript-container');
        
        // Fallback selectors only if the primary one fails
        if (!container) {
            container = document.getElementById('transcriptContainer');
        }
        
        // Additional fallbacks for different template structures
        if (!container) {
            container = document.querySelector('#transcript-container') ||
                       document.querySelector('.transcript-content') ||
                       document.querySelector('.chat-content') ||
                       document.querySelector('[class*="transcript"]') ||
                       targetElement.closest('[class*="container"]');
        }
        
        if (!container) {
            console.error('performAutoScroll: Transcript container not found');
            console.log('Available containers:', document.querySelectorAll('[id*="transcript"], [class*="transcript"], [class*="container"]'));
            return false;
        }
        
        // Validate that this is actually a scrollable container
        const isScrollable = container.scrollHeight > container.clientHeight;
        const hasOverflow = getComputedStyle(container).overflowY !== 'visible';
        
        console.log('🔄 Auto-scrolling to:', targetElement.textContent.slice(0, 50) + '...');
        console.log('📦 Using container:', container.id || container.className);
        console.log('📦 Container validation:');
        console.log('  - Is scrollable (content > viewport):', isScrollable);
        console.log('  - Has overflow styling:', hasOverflow);
        console.log('  - Container details:');
        console.log('    - clientHeight (visible):', container.clientHeight);
        console.log('    - scrollHeight (total):', container.scrollHeight);
        console.log('    - offsetHeight:', container.offsetHeight);
        console.log('    - scrollTop (current):', container.scrollTop);
        console.log('    - overflow-y:', getComputedStyle(container).overflowY);
        console.log('    - computed height:', getComputedStyle(container).height);
        console.log('    - rect height:', container.getBoundingClientRect().height);
        
        // CRITICAL CHECK: Verify container height is reasonable for auto-scroll
        const containerRect = container.getBoundingClientRect();
        if (containerRect.height > 1000) {
            console.warn('⚠️ Container height is too large:', containerRect.height + 'px');
            console.warn('   This suggests the container is not properly height-constrained');
            console.warn('   Auto-scroll will detect entire page instead of transcript container');
            console.warn('   Expected: ~600px, Actual:', containerRect.height + 'px');
        } else {
            console.log('✅ Container height looks good:', containerRect.height + 'px');
        }
        
        // If this doesn't look like the right container, warn and try to find better one
        if (!isScrollable && container.clientHeight > 8000) {
            console.warn('⚠️ Container seems too large, might be wrong element');
            console.warn('  Looking for better container...');
            
            // Try to find a better container by looking for one with reasonable height
            const altContainers = document.querySelectorAll('[class*="transcript"], [id*="transcript"]');
            for (const alt of altContainers) {
                const altScrollable = alt.scrollHeight > alt.clientHeight;
                const altReasonableHeight = alt.clientHeight < 1000;
                if (altScrollable && altReasonableHeight) {
                    console.log('✅ Found better container:', alt.id || alt.className);
                    container = alt;
                    break;
                }
            }
        }
        
        try {
            // Get container and element dimensions - FIXED: Use visible height, not scroll height
            const containerHeight = container.clientHeight; // Visible height of container
            const containerScrollHeight = container.scrollHeight; // Total scrollable height
            const containerScrollTop = container.scrollTop; // Current scroll position
            
            // Calculate element's position within the container
            const elementOffsetTop = targetElement.offsetTop;
            
            // Position element at center of VISIBLE container (50% from top of viewport)
            const halfContainerHeight = containerHeight / 2;
            const rawTargetScroll = elementOffsetTop - halfContainerHeight;
            const targetScrollTop = Math.max(0, rawTargetScroll);
            
            console.log('📊 Scroll calculation (DETAILED DEBUG):');
            console.log('  - Container visible height:', containerHeight);
            console.log('  - Container total height:', containerScrollHeight);
            console.log('  - Element offset top:', elementOffsetTop);
            console.log('  - Half container height:', halfContainerHeight);
            console.log('  - Raw calculation (offset - half):', rawTargetScroll);
            console.log('  - Final target scroll (max with 0):', targetScrollTop);
            console.log('  - Current scroll:', containerScrollTop);
            console.log('  - Scroll needed:', targetScrollTop - containerScrollTop);
            
            // Always perform the scroll - don't skip if "already visible"
            let scrollSuccess = false;
            
            // Method 1: Modern smooth scroll
            if (container.scrollTo && typeof container.scrollTo === 'function') {
                try {
                    container.scrollTo({
                        top: targetScrollTop,
                        behavior: 'smooth'
                    });
                    scrollSuccess = true;
                    console.log('✅ Used smooth scrollTo');
                } catch (e) {
                    console.warn('⚠️ Smooth scrollTo failed:', e);
                }
            }
            
            // Method 2: Direct scroll assignment (fallback)
            if (!scrollSuccess) {
                try {
                    container.scrollTop = targetScrollTop;
                    scrollSuccess = true;
                    console.log('✅ Used direct scrollTop assignment');
                } catch (e) {
                    console.warn('⚠️ Direct scroll failed:', e);
                }
            }
            
            // Method 3: Element.scrollIntoView (last resort)
            if (!scrollSuccess) {
                try {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                    scrollSuccess = true;
                    console.log('✅ Used scrollIntoView');
                } catch (e) {
                    console.warn('⚠️ scrollIntoView failed:', e);
                }
            }
            
            // Verify scroll worked after a delay
            if (scrollSuccess) {
                setTimeout(() => {
                    const newScrollTop = container.scrollTop;
                    const scrollDifference = Math.abs(newScrollTop - targetScrollTop);
                    
                    console.log('🔍 Scroll verification:');
                    console.log('  - Expected scroll position:', targetScrollTop);
                    console.log('  - Actual scroll position:', newScrollTop);
                    console.log('  - Difference:', scrollDifference);
                    
                    if (scrollDifference > 50) {
                        console.warn('⚠️ Scroll may not have worked as expected');
                        // Try a backup scroll
                        try {
                            container.scrollTop = targetScrollTop;
                            console.log('🔄 Applied backup scroll');
                        } catch (e) {
                            console.error('❌ Backup scroll failed:', e);
                        }
                    } else {
                        console.log('✅ Scroll completed successfully - element should be centered');
                    }
                }, 500); // Increased delay for verification
            }
            
            return scrollSuccess;
            
        } catch (error) {
            console.error('❌ Error during scroll operation:', error);
            return false;
        }
    }
    
    /**
     * Alternative scroll function for compatibility
     */
    function scrollToElement(element) {
        return performAutoScroll(element);
    }
    
    /**
     * Enable auto-scroll
     */
    function enableAutoScroll() {
        autoScrollEnabled = true;
        const toggle = document.getElementById('autoScrollToggle');
        if (toggle) toggle.checked = true;
        console.log('🔄 Auto-scroll enabled');
    }
    
    /**
     * Disable auto-scroll
     */
    function disableAutoScroll() {
        autoScrollEnabled = false;
        const toggle = document.getElementById('autoScrollToggle');
        if (toggle) toggle.checked = false;
        console.log('⏸️ Auto-scroll disabled');
    }
    
    /**
     * Toggle auto-scroll
     */
    function toggleAutoScroll() {
        if (autoScrollEnabled) {
            disableAutoScroll();
        } else {
            enableAutoScroll();
        }
        return autoScrollEnabled;
    }
    
    /**
     * Check if auto-scroll is enabled
     */
    function isAutoScrollEnabled() {
        return autoScrollEnabled;
    }
    
    /**
     * Initialize auto-scroll system
     */
    function initializeAutoScroll() {
        console.log('🚀 Initializing dedicated auto-scroll system');
        
        // Setup auto-scroll toggle
        const autoScrollToggle = document.getElementById('autoScrollToggle');
        if (autoScrollToggle) {
            autoScrollEnabled = autoScrollToggle.checked;
            
            autoScrollToggle.addEventListener('change', function() {
                autoScrollEnabled = this.checked;
                console.log('Auto-scroll toggled:', autoScrollEnabled);
            });
            
            console.log('Auto-scroll toggle initialized, current state:', autoScrollEnabled);
        } else {
            console.warn('Auto-scroll toggle button not found');
        }
        
        console.log('✅ Dedicated auto-scroll system initialized');
    }
    
    // Expose functions globally for other scripts to use
    window.performAutoScroll = performAutoScroll;
    window.scrollToElement = scrollToElement;
    window.enableAutoScroll = enableAutoScroll;
    window.disableAutoScroll = disableAutoScroll;
    window.toggleAutoScroll = toggleAutoScroll;
    window.isAutoScrollEnabled = isAutoScrollEnabled;

    // Also expose as properties to ensure they're accessible
    window.autoScrollFunctions = {
        performAutoScroll: performAutoScroll,
        scrollToElement: scrollToElement,
        enableAutoScroll: enableAutoScroll,
        disableAutoScroll: disableAutoScroll,
        toggleAutoScroll: toggleAutoScroll,
        isAutoScrollEnabled: isAutoScrollEnabled
    };

    console.log('🔄 Auto-scroll functions loaded and exposed globally');

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAutoScroll);
    } else {
        initializeAutoScroll();
    }
    
})();
