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
    if (!speakerInputs) return;
    
    speakerInputs.innerHTML = '';
    
    // Get existing mappings from the server
    let speakersData = [];
    try {
        const speakersJsonElement = document.getElementById('speakersData');
        const speakersJsonValue = speakersJsonElement ? speakersJsonElement.value : (window.speakersJson || '[]');
        speakersData = JSON.parse(speakersJsonValue);
    } catch (e) {
        console.error("Error parsing speakers JSON:", e);
    }
    
    // Process any server-provided mappings
    speakersData.forEach(speaker => {
        if (speaker && speaker.original_id) {
            window.speakerMappings[speaker.original_id] = speaker.role;
            window.uniqueSpeakers.add(speaker.original_id);
        }
    });
    
    // Collect speakers from transcript if needed
    if (window.uniqueSpeakers.size === 0) {
        document.querySelectorAll('.transcript-line[data-speaker]').forEach(line => {
            const speaker = line.dataset.speaker;
            if (speaker) {
                window.uniqueSpeakers.add(speaker);
            }
        });
    }
    
    // Add all speakers to the form
    window.uniqueSpeakers.forEach(speaker => {
        const div = document.createElement('div');
        div.className = 'mb-3';
        div.innerHTML = `
            <label class="form-label">${speaker}</label>
            <input type="text" 
                   class="form-control" 
                   name="mapping_${speaker}" 
                   value="${window.speakerMappings[speaker] || ''}"
                   placeholder="e.g., MOT, CHI">
        `;
        speakerInputs.appendChild(div);
    });
    
    // Setup form submission handler
    const form = document.getElementById('speakerMappingForm');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            updateSpeakerMappings();
        };
    }
}

// Function to update speaker mappings
window.updateSpeakerMappings = async function() {
    // Get form inputs
    const mappings = {};
    document.querySelectorAll('[name^="mapping_"]').forEach(input => {
        const speaker = input.name.replace('mapping_', '');
        mappings[speaker] = {
            role: input.value.toUpperCase(),
            display_name: input.value
        };
        
        // Update local speaker mappings
        window.speakerMappings[speaker] = input.value.toUpperCase();
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