// Audio context for generating sounds
let audioContext;
let isRecording = false;
let rhythmPattern = [];
let startTime = 0;

// Note frequencies
const noteFrequencies = {
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 
    'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00
};

// Key mappings
const keyMappings = {
    'Q': 'C4', 'W': 'C#4', 'E': 'D4', 'R': 'D#4',
    'T': 'E4', 'Y': 'F4', 'U': 'F#4', 'I': 'G4'
};

// Initialize audio context
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playNote(frequency, duration = 0.8) {
    initAudio();
    
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(frequency * 2, audioContext.currentTime); // Octave higher
    oscillator1.type = 'sine';
    oscillator2.type = 'triangle';
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + duration);
    oscillator2.stop(audioContext.currentTime + duration);
}

// Handle key press
function handleKeyPress(key, note) {
    const frequency = noteFrequencies[note];
    playNote(frequency);
    
    // Visual feedback
    const keyElement = document.querySelector(`[data-key="${key}"]`);
    keyElement.classList.add('active');
    setTimeout(() => keyElement.classList.remove('active'), 200);
    
    // Record if recording
    if (isRecording) {
        const currentTime = Date.now();
        const timeDiff = startTime ? currentTime - startTime : 0;
        rhythmPattern.push({ key, note, time: timeDiff });
        updateRhythmDisplay();
        startTime = currentTime;
    }
}

// Update rhythm display
function updateRhythmDisplay() {
    const display = document.getElementById('rhythmDisplay');
    if (rhythmPattern.length === 0) {
        display.textContent = 'Your rhythm pattern will appear here...';
    } else {
        const pattern = rhythmPattern.map(beat => beat.key).join(' - ');
        display.textContent = `Pattern: ${pattern} (${rhythmPattern.length} beats)`;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const recordBtn = document.getElementById('recordBtn');
    const playBtn = document.getElementById('playBtn');
    const clearBtn = document.getElementById('clearBtn');
    const status = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');
    const signupForm = document.getElementById('signupForm');

    // Keyboard event listeners
    document.addEventListener('keydown', function(e) {
        // Check if the active element is an input field
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
            return; // Do not play note if typing in an input field
        }

        const key = e.key.toUpperCase();
        if (keyMappings[key]) {
            e.preventDefault();
            handleKeyPress(key, keyMappings[key]);
        }
    });

    // Click event listeners for virtual keys
    document.querySelectorAll('.white-key, .black-key').forEach(keyElement => {
        keyElement.addEventListener('click', function() {
            const keyChar = this.dataset.key;
            const note = this.dataset.note;
            handleKeyPress(keyChar, note);
        });
    });

    // Record button
    recordBtn.addEventListener('click', function() {
        if (!isRecording) {
            isRecording = true;
            rhythmPattern = [];
            startTime = Date.now();
            this.textContent = '⏹️ Stop Recording';
            this.classList.remove('btn-secondary');
            this.classList.add('btn-primary');
            status.textContent = 'Recording... Play your rhythm!';
            status.className = 'status recording';
            document.querySelector('.rhythm-section').classList.add('recording');
        } else {
            isRecording = false;
            this.textContent = '🎤 Start Recording';
            this.classList.remove('btn-primary');
            this.classList.add('btn-secondary');
            document.querySelector('.rhythm-section').classList.remove('recording');
            
            if (rhythmPattern.length >= 3) {
                status.textContent = 'Great! Your rhythm has been recorded.';
                status.className = 'status complete';
                playBtn.disabled = false;
                submitBtn.disabled = false;
            } else {
                status.textContent = 'Rhythm too short. Please record at least 3 beats.';
                status.className = 'status error';
                playBtn.disabled = true;
                submitBtn.disabled = true;
            }
        }
    });

    // Play button
    playBtn.addEventListener('click', function() {
        if (rhythmPattern.length > 0) {
            let delay = 0;
            rhythmPattern.forEach(beat => {
                setTimeout(() => {
                    handleKeyPress(beat.key, beat.note);
                }, delay);
                delay += beat.time;
            });
        }
    });

    // Clear button
    clearBtn.addEventListener('click', function() {
        rhythmPattern = [];
        updateRhythmDisplay();
        playBtn.disabled = true;
        submitBtn.disabled = true;
        status.textContent = 'Press "Start Recording" to begin creating your rhythm';
        status.className = 'status';
    });

    // Form submission
    signupForm.addEventListener('submit', function(e) {
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;

        if (!username || !email || rhythmPattern.length < 3) {
            e.preventDefault();
            alert('Please fill in all fields and record a rhythm pattern of at least 3 beats.');
            return;
        }

        // Stringify the rhythm pattern and set it to the hidden input
        document.getElementById('rhythmPattern').value = JSON.stringify(rhythmPattern);
    });
});
