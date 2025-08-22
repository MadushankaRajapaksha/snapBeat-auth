// Audio context for generating sounds
let audioContext;
let isRecordingOld = false;
let isRecordingNew = false;
let oldRhythmPattern = [];
let newRhythmPattern = [];
let startTimeOld = 0;
let startTimeNew = 0;

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

// Handle key press for old rhythm
function handleKeyPressOld(key, note) {
    const frequency = noteFrequencies[note];
    playNote(frequency);
    
    const keyElement = document.querySelector(`.rhythm-section:nth-of-type(1) [data-key="${key}"]`);
    keyElement.classList.add('active');
    setTimeout(() => keyElement.classList.remove('active'), 200);
    
    if (isRecordingOld) {
        const currentTime = Date.now();
        const timeDiff = startTimeOld ? currentTime - startTimeOld : 0;
        oldRhythmPattern.push({ key, note, time: timeDiff });
        updateRhythmDisplay('old');
        startTimeOld = currentTime;
    }
}

// Handle key press for new rhythm
function handleKeyPressNew(key, note) {
    const frequency = noteFrequencies[note];
    playNote(frequency);
    
    const keyElement = document.querySelector(`.rhythm-section:nth-of-type(2) [data-key="${key}"]`);
    keyElement.classList.add('active');
    setTimeout(() => keyElement.classList.remove('active'), 200);
    
    if (isRecordingNew) {
        const currentTime = Date.now();
        const timeDiff = startTimeNew ? currentTime - startTimeNew : 0;
        newRhythmPattern.push({ key, note, time: timeDiff });
        updateRhythmDisplay('new');
        startTimeNew = currentTime;
    }
}

// Update rhythm display
function updateRhythmDisplay(type) {
    const display = document.getElementById(`${type}RhythmDisplay`);
    const pattern = type === 'old' ? oldRhythmPattern : newRhythmPattern;

    if (pattern.length === 0) {
        display.textContent = `Your ${type} rhythm pattern will appear here...`;
    } else {
        const patternKeys = pattern.map(beat => beat.key).join(' - ');
        display.textContent = `Pattern: ${patternKeys} (${pattern.length} beats)`;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const changePasswordForm = document.getElementById('changePasswordForm');

    // Old Rhythm Controls
    const recordOldBtn = document.getElementById('recordOldBtn');
    const playOldBtn = document.getElementById('playOldBtn');
    const clearOldBtn = document.getElementById('clearOldBtn');
    const oldStatus = document.getElementById('oldStatus');

    // New Rhythm Controls
    const recordNewBtn = document.getElementById('recordNewBtn');
    const playNewBtn = document.getElementById('playNewBtn');
    const clearNewBtn = document.getElementById('clearNewBtn');
    const newStatus = document.getElementById('newStatus');

    const submitBtn = document.getElementById('submitBtn');

    // Keyboard event listeners
    document.addEventListener('keydown', function(e) {
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
            return; // Do not play note if typing in an input field
        }

        const key = e.key.toUpperCase();
        if (keyMappings[key]) {
            e.preventDefault();
            if (isRecordingOld) {
                handleKeyPressOld(key, keyMappings[key]);
            } else if (isRecordingNew) {
                handleKeyPressNew(key, keyMappings[key]);
            }
        }
    });

    // Click event listeners for virtual keys (Old Rhythm)
    document.querySelectorAll('.rhythm-section:nth-of-type(1) .white-key, .rhythm-section:nth-of-type(1) .black-key').forEach(key => {
        key.addEventListener('click', function() {
            const keyChar = this.dataset.key;
            const note = this.dataset.note;
            if (isRecordingOld) {
                handleKeyPressOld(keyChar, note);
            }
        });
    });

    // Click event listeners for virtual keys (New Rhythm)
    document.querySelectorAll('.rhythm-section:nth-of-type(2) .white-key, .rhythm-section:nth-of-type(2) .black-key').forEach(key => {
        key.addEventListener('click', function() {
            const keyChar = this.dataset.key;
            const note = this.dataset.note;
            if (isRecordingNew) {
                handleKeyPressNew(keyChar, note);
            }
        });
    });

    // Record Old button
    recordOldBtn.addEventListener('click', function() {
        if (!isRecordingOld) {
            isRecordingOld = true;
            isRecordingNew = false; // Ensure only one is recording at a time

            startTimeOld = Date.now();
            this.textContent = '⏹️ Stop Recording Old';
            this.classList.remove('btn-secondary');
            this.classList.add('btn-primary');
            oldStatus.textContent = 'Recording Old Rhythm... Play your rhythm!';
            oldStatus.className = 'status recording';
            document.querySelector('.rhythm-section:nth-of-type(1)').classList.add('recording');
        } else {
            isRecordingOld = false;
            this.textContent = '🎤 Start Recording Old';
            this.classList.remove('btn-primary');
            this.classList.add('btn-secondary');
            document.querySelector('.rhythm-section:nth-of-type(1)').classList.remove('recording');
            
            if (oldRhythmPattern.length >= 3) {
                oldStatus.textContent = 'Old rhythm has been recorded.';
                oldStatus.className = 'status complete';
                playOldBtn.disabled = false;
                checkSubmissionReadiness();
            } else {
                oldStatus.textContent = 'Old rhythm too short. Please record at least 3 beats.';
                oldStatus.className = 'status error';
                playOldBtn.disabled = true;
                submitBtn.disabled = true;
            }
        }
    });

    // Play Old button
    playOldBtn.addEventListener('click', function() {
        if (oldRhythmPattern.length > 0) {
            let delay = 0;
            oldRhythmPattern.forEach(beat => {
                setTimeout(() => {
                    handleKeyPressOld(beat.key, beat.note);
                }, delay);
                delay += beat.time;
            });
        }
    });

    // Clear Old button
    clearOldBtn.addEventListener('click', function() {
        oldRhythmPattern = [];
        updateRhythmDisplay('old');
        playOldBtn.disabled = true;
        oldStatus.textContent = 'Press "Start Recording Old" to begin entering your old rhythm';
        oldStatus.className = 'status';
        checkSubmissionReadiness();
    });

    // Record New button
    recordNewBtn.addEventListener('click', function() {
        if (!isRecordingNew) {
            isRecordingNew = true;
            isRecordingOld = false; // Ensure only one is recording at a time

            startTimeNew = Date.now();
            this.textContent = '⏹️ Stop Recording New';
            this.classList.remove('btn-secondary');
            this.classList.add('btn-primary');
            newStatus.textContent = 'Recording New Rhythm... Play your rhythm!';
            newStatus.className = 'status recording';
            document.querySelector('.rhythm-section:nth-of-type(2)').classList.add('recording');
        } else {
            isRecordingNew = false;
            this.textContent = '🎤 Start Recording New';
            this.classList.remove('btn-primary');
            this.classList.add('btn-secondary');
            document.querySelector('.rhythm-section:nth-of-type(2)').classList.remove('recording');
            
            if (newRhythmPattern.length >= 3) {
                newStatus.textContent = 'New rhythm has been recorded.';
                newStatus.className = 'status complete';
                playNewBtn.disabled = false;
                checkSubmissionReadiness();
            } else {
                newStatus.textContent = 'New rhythm too short. Please record at least 3 beats.';
                newStatus.className = 'status error';
                playNewBtn.disabled = true;
                submitBtn.disabled = true;
            }
        }
    });

    // Play New button
    playNewBtn.addEventListener('click', function() {
        if (newRhythmPattern.length > 0) {
            let delay = 0;
            newRhythmPattern.forEach(beat => {
                setTimeout(() => {
                    handleKeyPressNew(beat.key, beat.note);
                }, delay);
                delay += beat.time;
            });
        }
    });

    // Clear New button
    clearNewBtn.addEventListener('click', function() {
        newRhythmPattern = [];
        updateRhythmDisplay('new');
        playNewBtn.disabled = true;
        newStatus.textContent = 'Press "Start Recording New" to begin creating your new rhythm';
        newStatus.className = 'status';
        checkSubmissionReadiness();
    });

    function checkSubmissionReadiness() {
        if (oldRhythmPattern.length >= 3 && newRhythmPattern.length >= 3) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    // Form submission
    changePasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (oldRhythmPattern.length < 3 || newRhythmPattern.length < 3) {
            alert('Please record both old and new rhythm patterns (at least 3 beats each).');
            return;
        }

        document.getElementById('oldRhythmPattern').value = JSON.stringify(oldRhythmPattern);
        document.getElementById('newRhythmPattern').value = JSON.stringify(newRhythmPattern);

        try {
            const response = await fetch('/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    old_rhythm_pattern: oldRhythmPattern,
                    new_rhythm_pattern: newRhythmPattern
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                
                window.location.href = '/login';  
            } else {
                alert(result.message || 'An error occurred.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An unexpected error occurred. Please try again.');
        }
    });
});
