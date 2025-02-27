/**
 * Missing Segments functionality for the Transcript Player
 */

// Initialize missing segments
window.initializeMissingSegments = function() {
    console.log("Initializing missing segments handling");
    
    // Get missing segments data if available
    const missingSegmentsJson = document.getElementById('missingSegmentsData')?.value || '[]';
    let missingSegments = [];
    
    if (missingSegmentsJson && missingSegmentsJson.trim() !== "") {
        try {
            missingSegments = JSON.parse(missingSegmentsJson);
            console.log(`Found ${missingSegments.length} missing segments`);
            
            // Add missing segments to the display
            displayMissingSegments(missingSegments);
        } catch (e) {
            console.error("Error parsing missing segments JSON:", e);
        }
    } else {
        console.log("No missing segments data available");
    }
    
    // Set up event handlers for missing segment controls
    setupMissingSegmentControls();
};

// Display missing segments in the transcript
function displayMissingSegments(missingSegments) {
    if (!missingSegments || missingSegments.length === 0) return;
    
    const transcriptContainer = document.getElementById('transcriptContainer');
    if (!transcriptContainer) return;
    
    // Find all existing transcript lines
    const existingLines = Array.from(transcriptContainer.querySelectorAll('.transcript-line'));
    
    // Process each missing segment
    missingSegments.forEach(segment => {
        // Create missing segment element
        const missingLine = document.createElement('div');
        missingLine.className = 'missing-segment';
        missingLine.dataset.start = segment.start;
        missingLine.dataset.end = segment.end;
        missingLine.dataset.speaker = segment.speaker;
        missingLine.dataset.segmentId = segment.id || `missing-${segment.start}-${segment.end}`;
        
        // Find where to insert this segment (maintain chronological order)
        const start = parseFloat(segment.start);
        let insertPosition = null;
        
        for (let i = 0; i < existingLines.length; i++) {
            const lineStart = parseFloat(existingLines[i].dataset.start || 0);
            if (start < lineStart) {
                insertPosition = existingLines[i];
                break;
            }
        }
        
        // Add click handler for seeking
        missingLine.addEventListener('click', function(e) {
            // Don't trigger if clicking on the edit button
            if (e.target.tagName === 'BUTTON') return;
            
            console.log(`Seeking to time: ${segment.start}ms`);
            window.seekToTime(segment.start);
        });
        
        // Create timestamp
        const timestamp = document.createElement('span');
        timestamp.className = 'transcript-timestamp';
        timestamp.textContent = window.formatTime(segment.start / 1000);
        
        // Create icon
        const icon = document.createElement('span');
        icon.className = 'missing-segment-icon';
        icon.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i>';
        
        // Create text content based on whether there's existing content
        const textContent = document.createElement('span');
        textContent.className = 'missing-segment-text';
        
        if (segment.text && segment.text.trim()) {
            textContent.textContent = segment.text;
        } else {
            textContent.textContent = `Missing content (${segment.speaker || 'unknown speaker'})`;
            textContent.classList.add('placeholder-text');
        }
        
        // Create edit button
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-sm btn-outline-primary ms-2 edit-missing';
        editButton.innerHTML = '<i class="bi bi-pencil"></i>';
        editButton.addEventListener('click', function() {
            toggleMissingSegmentEdit(missingLine);
        });
        
        // Assemble the missing segment element
        missingLine.appendChild(timestamp);
        missingLine.appendChild(icon);
        missingLine.appendChild(textContent);
        missingLine.appendChild(editButton);
        
        // Add edit form (hidden initially)
        const editForm = document.createElement('div');
        editForm.className = 'missing-segment-edit d-none';
        editForm.innerHTML = `
            <div class="input-group">
                <input type="text" class="form-control" placeholder="Enter missing content..." 
                       value="${segment.text || ''}">
                <button class="btn btn-primary save-missing" type="button">Save</button>
                <button class="btn btn-secondary cancel-missing" type="button">Cancel</button>
            </div>
        `;
        missingLine.appendChild(editForm);
        
        // Add event listeners to edit form buttons
        editForm.querySelector('.save-missing').addEventListener('click', function() {
            saveMissingSegment(missingLine);
        });
        
        editForm.querySelector('.cancel-missing').addEventListener('click', function() {
            toggleMissingSegmentEdit(missingLine);
        });
        
        // Insert at the right position or append at the end
        if (insertPosition) {
            transcriptContainer.insertBefore(missingLine, insertPosition);
        } else {
            transcriptContainer.appendChild(missingLine);
        }
        
        // Add to existingLines array to maintain insertion order for subsequent segments
        existingLines.push(missingLine);
        existingLines.sort((a, b) => parseFloat(a.dataset.start || 0) - parseFloat(b.dataset.start || 0));
    });
}

// Toggle edit mode for a missing segment
function toggleMissingSegmentEdit(missingLine) {
    // Toggle edit form visibility
    const editForm = missingLine.querySelector('.missing-segment-edit');
    const textElement = missingLine.querySelector('.missing-segment-text');
    const editButton = missingLine.querySelector('.edit-missing');
    
    if (editForm && textElement) {
        // Toggle visibility
        editForm.classList.toggle('d-none');
        textElement.classList.toggle('d-none');
        if (editButton) editButton.classList.toggle('d-none');
        
        // Focus the input if we're now editing
        if (!editForm.classList.contains('d-none')) {
            const input = editForm.querySelector('input');
            if (input) {
                input.focus();
                
                // Add enter key handler
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveMissingSegment(missingLine);
                    }
                });
            }
        }
    }
}

// Save edited missing segment
function saveMissingSegment(missingLine) {
    const editForm = missingLine.querySelector('.missing-segment-edit');
    const input = editForm.querySelector('input');
    const textElement = missingLine.querySelector('.missing-segment-text');
    const editButton = missingLine.querySelector('.edit-missing');
    
    if (input && textElement) {
        const newText = input.value.trim();
        
        if (newText) {
            // Update the display text
            textElement.textContent = newText;
            textElement.classList.remove('placeholder-text');
            
            // Save to server
            updateMissingSegmentOnServer(
                missingLine.dataset.segmentId,
                newText,
                missingLine.dataset.start,
                missingLine.dataset.end,
                missingLine.dataset.speaker
            );
        }
    }
    
    // Exit edit mode
    if (editForm) editForm.classList.add('d-none');
    if (textElement) textElement.classList.remove('d-none');
    if (editButton) editButton.classList.remove('d-none');
}

// Send updated missing segment to server
function updateMissingSegmentOnServer(segmentId, text, start, end, speaker) {
    const transcriptId = document.getElementById('transcriptId').value;
    
    if (!transcriptId || !segmentId) {
        console.error("Missing transcript ID or segment ID for update");
        return;
    }
    
    // Show loading indicator
    const segment = document.querySelector(`[data-segment-id="${segmentId}"]`);
    if (segment) {
        const loadingIndicator = document.createElement('span');
        loadingIndicator.className = 'loading-indicator ms-2';
        loadingIndicator.innerHTML = '<i class="bi bi-arrow-repeat spinning"></i> Saving...';
        segment.appendChild(loadingIndicator);
    }
    
    // Get CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    // Send update to server
    fetch(`/transcript/${transcriptId}/update-missing-segment/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            segment_id: segmentId,
            text: text,
            start_time: start,
            end_time: end,
            speaker: speaker
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Update successful:", data);
        
        // Remove loading indicator and show success message
        if (segment) {
            const loadingIndicator = segment.querySelector('.loading-indicator');
            if (loadingIndicator) {
                segment.removeChild(loadingIndicator);
            }
            
            // Add success message
            const successMessage = document.createElement('span');
            successMessage.className = 'text-success ms-2 success-message';
            successMessage.innerHTML = '<i class="bi bi-check-circle"></i> Saved';
            segment.appendChild(successMessage);
            
            // Remove success message after 2 seconds
            setTimeout(() => {
                if (segment.contains(successMessage)) {
                    segment.removeChild(successMessage);
                }
            }, 2000);
        }
    })
    .catch(error => {
        console.error("Error updating missing segment:", error);
        
        // Remove loading indicator and show error message
        if (segment) {
            const loadingIndicator = segment.querySelector('.loading-indicator');
            if (loadingIndicator) {
                segment.removeChild(loadingIndicator);
            }
            
            // Add error message
            const errorMessage = document.createElement('span');
            errorMessage.className = 'text-danger ms-2 error-message';
            errorMessage.innerHTML = '<i class="bi bi-exclamation-circle"></i> Error saving';
            segment.appendChild(errorMessage);
            
            // Remove error message after 3 seconds
            setTimeout(() => {
                if (segment.contains(errorMessage)) {
                    segment.removeChild(errorMessage);
                }
            }, 3000);
        }
    });
}

// Set up event handlers for missing segment controls
function setupMissingSegmentControls() {
    // Global event delegation for missing segment controls
    document.addEventListener('click', function(e) {
        // Handle edit button clicks
        if (e.target.closest('.edit-missing')) {
            const missingLine = e.target.closest('.missing-segment');
            if (missingLine) {
                e.preventDefault();
                toggleMissingSegmentEdit(missingLine);
            }
        }
        
        // Handle save button clicks
        if (e.target.closest('.save-missing')) {
            const missingLine = e.target.closest('.missing-segment');
            if (missingLine) {
                e.preventDefault();
                saveMissingSegment(missingLine);
            }
        }
        
        // Handle cancel button clicks
        if (e.target.closest('.cancel-missing')) {
            const missingLine = e.target.closest('.missing-segment');
            if (missingLine) {
                e.preventDefault();
                toggleMissingSegmentEdit(missingLine);
            }
        }
    });
}