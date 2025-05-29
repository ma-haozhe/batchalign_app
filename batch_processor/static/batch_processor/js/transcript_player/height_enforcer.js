/**
 * Transcript Container Height Enforcer
 * 
 * This module ensures the transcript container maintains a 600px height
 * regardless of CSS conflicts or dynamic content changes.
 */

(function() {
    'use strict';

    console.log('[Height Enforcer] Loading height enforcer module...');

    // Configuration
    const CONFIG = {
        MAX_HEIGHT: '600px',
        SELECTORS: [
            '.transcript-container',
            '#transcriptContainer', 
            '.transcript-content',
            '[data-transcript-container]'
        ],
        CHECK_INTERVAL: 1000, // Check every second
        FORCE_STYLES: {
            'height': '600px',
            'max-height': '600px',
            'overflow-y': 'auto',
            'overflow-x': 'hidden'
        }
    };

    let enforcer = null;
    let containers = [];

    /**
     * Find all transcript containers
     */
    function findTranscriptContainers() {
        const found = [];
        
        CONFIG.SELECTORS.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (!found.includes(el)) {
                    found.push(el);
                    console.log(`[Height Enforcer] Found container:`, selector, el);
                }
            });
        });

        return found;
    }

    /**
     * Apply height constraints to a container
     */
    function applyHeightConstraints(container) {
        if (!container) return false;

        const originalHeight = container.offsetHeight;
        
        // Apply styles with maximum priority
        Object.entries(CONFIG.FORCE_STYLES).forEach(([property, value]) => {
            container.style.setProperty(property, value, 'important');
        });

        // Also add CSS class for good measure
        container.classList.add('height-enforced');

        const newHeight = container.offsetHeight;
        
        console.log(`[Height Enforcer] Container ${container.className}:`, {
            originalHeight: originalHeight + 'px',
            newHeight: newHeight + 'px',
            targetHeight: CONFIG.MAX_HEIGHT,
            success: newHeight <= 600
        });

        return newHeight <= 600;
    }

    /**
     * Force height constraints on all containers
     */
    function enforceHeightConstraints() {
        containers = findTranscriptContainers();
        
        if (containers.length === 0) {
            console.warn('[Height Enforcer] No transcript containers found');
            return false;
        }

        let allSuccess = true;
        containers.forEach(container => {
            const success = applyHeightConstraints(container);
            if (!success) allSuccess = false;
        });

        return allSuccess;
    }

    /**
     * Start continuous monitoring
     */
    function startEnforcer() {
        if (enforcer) {
            console.log('[Height Enforcer] Enforcer already running');
            return;
        }

        console.log('[Height Enforcer] Starting continuous height enforcement...');
        
        // Initial enforcement
        enforceHeightConstraints();
        
        // Continuous monitoring
        enforcer = setInterval(() => {
            containers.forEach(container => {
                if (container.offsetHeight > 600) {
                    console.warn(`[Height Enforcer] Container height exceeded 600px (${container.offsetHeight}px), re-enforcing...`);
                    applyHeightConstraints(container);
                }
            });
        }, CONFIG.CHECK_INTERVAL);
    }

    /**
     * Stop continuous monitoring
     */
    function stopEnforcer() {
        if (enforcer) {
            clearInterval(enforcer);
            enforcer = null;
            console.log('[Height Enforcer] Stopped continuous height enforcement');
        }
    }

    /**
     * Add CSS rules dynamically
     */
    function injectEmergencyCSS() {
        const cssId = 'transcript-height-enforcer-css';
        
        if (document.getElementById(cssId)) {
            console.log('[Height Enforcer] Emergency CSS already injected');
            return;
        }

        const css = `
            /* Emergency Height Enforcement */
            .transcript-container,
            #transcriptContainer,
            .transcript-content,
            [data-transcript-container] {
                height: 600px !important;
                max-height: 600px !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }
            
            .height-enforced {
                height: 600px !important;
                max-height: 600px !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                box-sizing: border-box !important;
            }
        `;

        const style = document.createElement('style');
        style.id = cssId;
        style.textContent = css;
        document.head.appendChild(style);
        
        console.log('[Height Enforcer] Emergency CSS injected');
    }

    /**
     * Initialize the height enforcer
     */
    function init() {
        console.log('[Height Enforcer] Initializing...');
        
        // Inject emergency CSS first
        injectEmergencyCSS();
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(startEnforcer, 100);
            });
        } else {
            setTimeout(startEnforcer, 100);
        }
    }

    // Expose functions globally
    window.heightEnforcer = {
        init: init,
        start: startEnforcer,
        stop: stopEnforcer,
        enforce: enforceHeightConstraints,
        injectCSS: injectEmergencyCSS
    };

    // Auto-initialize
    init();

    console.log('[Height Enforcer] Module loaded successfully');
})();
