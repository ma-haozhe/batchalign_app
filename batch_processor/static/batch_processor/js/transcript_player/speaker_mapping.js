/**
 * Speaker Mapping functionality for the Transcript Player
 */

// Global speaker variables
window.uniqueSpeakers = new Set();
window.speakerMappings = {};
window.speakerColors = {};
window.colorPalette = [
    '#007bff', '#6610f2', '#6f42c1', '#e83e8c', '#dc3545',
    '#fd7e14', '#ffc107', '#28a745', '#20c997', '#17a2b8'
];

// Assign colors to speakers
window.assignSpeakerColors = function() {
    console.log("Assigning colors to speakers");
    
    // Collect all unique speakers from the transcript
    document.querySelectorAll('.transcript-line[data-speaker]').forEach(line => {
        const speaker = line.dataset.speaker;
        if (speaker) {
            window.uniqueSpeakers.add(speaker);
        }
    });
    
    // Assign colors
    let colorIndex = 0;
    window.uniqueSpeakers.forEach(speaker => {
        window.speakerColors[speaker] = window.colorPalette[colorIndex % window.colorPalette.length];
        colorIndex++;
        
        // Apply colors to all speaker labels
        document.querySelectorAll(`.transcript-line[data-speaker="${speaker}"] .speaker-label`).forEach(label => {
            label.style.color = window.speakerColors[speaker];
        });
    });
}

// Initialize speaker mappings in the form
window.initializeSpeakerMappings = function() {
    console.log("Initializing speaker mappings");
    const speakerInputs = document.getElementById('speakerInputs');
    if (!speakerInputs) {
        console.error("Speaker inputs container not found");
        return;
    }
    
    // Clear existing content
    speakerInputs.innerHTML = '';
    
    // Get existing mappings from the server
    let speakerMappings = {};
    try {
        // First try to get speakerMappings from the DOM
        const speakersDataElement = document.getElementById('speakersData');
        if (speakersDataElement && speakersDataElement.value) {
            console.log("Found speakersData element with value:", speakersDataElement.value);
            speakerMappings = JSON.parse(speakersDataElement.value);
        } else {
            console.warn("No speakersData element or empty value");
        }
    } catch (e) {
        console.error("Error parsing speakers JSON:", e);
    }
    
    console.log("Speaker mappings loaded:", speakerMappings);
    
    // Store mappings in global variable for later use
    window.speakerMappings = speakerMappings || {};
    
    // Collect speakers from transcript
    document.querySelectorAll('.transcript-line[data-speaker]').forEach(line => {
        const speaker = line.dataset.speaker;
        if (speaker) {
            window.uniqueSpeakers.add(speaker);
        }
    });
    
    // Get speakers from JSON if available
    try {
        const speakersJsonElement = document.getElementById('speakersJson');
        if (speakersJsonElement && speakersJsonElement.value) {
            const speakersArray = JSON.parse(speakersJsonElement.value);
            speakersArray.forEach(speaker => {
                if (speaker) {
                    window.uniqueSpeakers.add(speaker);
                }
            });
        }
    } catch (e) {
        console.error("Error parsing speakersJson:", e);
    }
    
    console.log(`Found ${window.uniqueSpeakers.size} unique speakers:`, Array.from(window.uniqueSpeakers));
    
    // If no speakers found, show a message with a manual add button
    if (window.uniqueSpeakers.size === 0) {
        console.warn("No speakers found in transcript");
        
        // Try to extract them from CHAT format even if they weren't set as data attributes
        try {
            const chatContent = document.getElementById('chatContent');
            if (chatContent && chatContent.value) {
                console.log("Trying to extract speakers from chat content");
                const lines = chatContent.value.split('\n');
                let speakersInChat = new Set();
                
                // Look for common CHAT format speaker markers (lines starting with *)
                for (const line of lines) {
                    if (line.startsWith('*') && line.includes(':')) {
                        const speaker = line.substring(1, line.indexOf(':')).trim();
                        if (speaker) {
                            speakersInChat.add(speaker);
                            window.uniqueSpeakers.add(speaker);
                        }
                    }
                }
                
                console.log("Found additional speakers in CHAT content:", Array.from(speakersInChat));
                
                // If we found speakers, don't show the empty message
                if (speakersInChat.size > 0) {
                    console.log("Proceeding with speakers found in CHAT content");
                    // Continue to the speaker form creation below
                    // by not returning here
                } else {
                    // Still no speakers found, show the message
                    speakerInputs.innerHTML = `
                        <div class="alert alert-warning">
                            <strong>No speakers found in transcript.</strong> 
                            <p>This may be because the transcript format doesn't include speaker information or 
                            because speaker diarization hasn't been processed yet.</p>
                            <div class="mt-3">
                                <button id="addSpeakerBtn" class="btn btn-sm btn-outline-primary">
                                    <i class="bi bi-person-plus"></i> Add Speaker Manually
                                </button>
                            </div>
                        </div>
                    `;
                    
                    // Add handler for the manual add button
                    setTimeout(() => {
                        const addBtn = document.getElementById('addSpeakerBtn');
                        if (addBtn) {
                            addBtn.addEventListener('click', function() {
                                window.uniqueSpeakers.add('SPEAKER');
                                window.uniqueSpeakers.add('MOT');
                                window.uniqueSpeakers.add('CHI');
                                window.initializeSpeakerMappings();
                            });
                        }
                    }, 100);
                    
                    return;
                }
            } else {
                // No chat content, show the message
                speakerInputs.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>No speakers found in transcript.</strong> 
                        <p>This may be because the transcript format doesn't include speaker information or 
                        because speaker diarization hasn't been processed yet.</p>
                        <div class="mt-3">
                            <button id="addSpeakerBtn" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-person-plus"></i> Add Speaker Manually
                            </button>
                        </div>
                    </div>
                `;
                
                // Add handler for the manual add button
                setTimeout(() => {
                    const addBtn = document.getElementById('addSpeakerBtn');
                    if (addBtn) {
                        addBtn.addEventListener('click', function() {
                            window.uniqueSpeakers.add('SPEAKER');
                            window.uniqueSpeakers.add('MOT');
                            window.uniqueSpeakers.add('CHI');
                            window.initializeSpeakerMappings();
                        });
                    }
                }, 100);
                
                return;
            }
        } catch (e) {
            console.error("Error trying to extract speakers from chat content:", e);
            speakerInputs.innerHTML = `
                <div class="alert alert-warning">
                    <strong>No speakers found in transcript.</strong> 
                    <p>This may be because the transcript format doesn't include speaker information or 
                    because speaker diarization hasn't been processed yet.</p>
                    <div class="mt-3">
                        <button id="addSpeakerBtn" class="btn btn-sm btn-outline-primary">
                            <i class="bi bi-person-plus"></i> Add Speaker Manually
                        </button>
                    </div>
                </div>
            `;
            
            // Add handler for the manual add button 
            setTimeout(() => {
                const addBtn = document.getElementById('addSpeakerBtn');
                if (addBtn) {
                    addBtn.addEventListener('click', function() {
                        window.uniqueSpeakers.add('SPEAKER');
                        window.uniqueSpeakers.add('MOT');
                        window.uniqueSpeakers.add('CHI');
                        window.initializeSpeakerMappings();
                    });
                }
            }, 100);
            
            return;
        }
    }
    
    console.log("Adding speaker inputs to form");
    
    // Add all speakers to the form
    Array.from(window.uniqueSpeakers).sort().forEach(speaker => {
        const div = document.createElement('div');
        div.className = 'mb-2 d-flex align-items-center';
        
        // Create color indicator
        const colorBox = document.createElement('div');
        colorBox.className = 'color-box me-2';
        colorBox.style.width = '16px';
        colorBox.style.height = '16px';
        colorBox.style.backgroundColor = window.speakerColors[speaker] || '#6c757d';
        colorBox.style.borderRadius = '3px';
        
        // Create label
        const label = document.createElement('label');
        label.className = 'me-2 mb-0';
        label.style.minWidth = '100px';
        label.textContent = speaker;
        
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control form-control-sm speaker-input';
        input.dataset.originalSpeaker = speaker;
        // Handle both formats: string or object with role/display_name
        let mappedValue = '';
        if (window.speakerMappings[speaker]) {
            if (typeof window.speakerMappings[speaker] === 'string') {
                // Simple string format (backwards compatibility)
                mappedValue = window.speakerMappings[speaker];
            } else if (typeof window.speakerMappings[speaker] === 'object') {
                // Object format with role and display_name
                mappedValue = window.speakerMappings[speaker].role || 
                              window.speakerMappings[speaker].display_name || '';
            }
        }
        input.value = mappedValue;
        input.placeholder = 'e.g., MOT, CHI';
        
        // Assemble the elements
        div.appendChild(colorBox);
        div.appendChild(label);
        div.appendChild(input);
        speakerInputs.appendChild(div);
    });
    
    // Setup form submission handler
    const form = document.getElementById('speakerMappingForm');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            window.updateSpeakerMappings();
        };
    } else {
        console.error("Speaker mapping form not found");
    }
}

// Function to update speaker mappings
window.updateSpeakerMappings = async function() {
    // Get form inputs
    const mappings = {};
    document.querySelectorAll('.speaker-input').forEach(input => {
        const originalSpeaker = input.dataset.originalSpeaker;
        const mappedValue = input.value.trim();
        
        if (mappedValue) {
            mappings[originalSpeaker] = {
                role: mappedValue.toUpperCase(),
                display_name: mappedValue
            };
            
            // Update local speaker mappings
            window.speakerMappings[originalSpeaker] = mappedValue.toUpperCase();
        }
    });
    
    try {
        // Find transcript ID
        const transcriptId = document.getElementById('transcriptId').value;
        if (!transcriptId) {
            console.error("Cannot update speaker mappings: transcript ID not found");
            return;
        }
        
        // Get CSRF token
        const csrftoken = getCookie('csrftoken');
        
        // Send update to server - use the correct URL endpoint
        const response = await fetch(`/update-speaker-mapping/${transcriptId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ mappings: mappings })  // Match the expected format in views.py
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            // Show success message
            const form = document.getElementById('speakerMappingForm');
            if (form) {
                const alert = document.createElement('div');
                alert.className = 'alert alert-success mt-3';
                alert.innerHTML = '<strong>Success!</strong> Speaker mapping updated.';
                form.after(alert);
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => alert.remove(), 3000);
            }
            
            // Apply the updated mappings to the current transcript display
            applyUpdatedSpeakerMappings();
        } else {
            console.error('Error updating speaker mapping:', data.message);
            alert('Error updating speaker mapping: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating speaker mappings:', error);
        alert('Error updating speaker mappings. See console for details.');
    }
};

window.applyUpdatedSpeakerMappings = function() {
    // Update speaker labels in the transcript
    document.querySelectorAll('.transcript-line').forEach(line => {
        const originalSpeaker = line.dataset.speaker;
        if (originalSpeaker && window.speakerMappings[originalSpeaker]) {
            const mappedSpeaker = window.speakerMappings[originalSpeaker];
            line.dataset.mappedSpeaker = mappedSpeaker;
            
            // Update the speaker label
            const speakerLabel = line.querySelector('.speaker-label');
            if (speakerLabel) {
                // Update text content
                if (speakerLabel.textContent.startsWith('*')) {
                    speakerLabel.textContent = `*${mappedSpeaker}:`;
                } else {
                    speakerLabel.textContent = mappedSpeaker;
                }
            }
        }
    });
    
    // Also refresh the transcript highlighting
    if (typeof window.updateTranscriptHighlight === 'function') {
        window.updateTranscriptHighlight();
    }
    
    // Call the legacy updateTranscriptSpeakerLabels function if it exists (for backward compatibility)
    if (typeof window.updateTranscriptSpeakerLabels === 'function') {
        try {
            window.updateTranscriptSpeakerLabels(window.speakerMappings);
        } catch (e) {
            console.warn("Error calling legacy updateTranscriptSpeakerLabels:", e);
        }
    }
}

// Helper function to get CSRF token from cookies
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