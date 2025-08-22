// Audio context for generating sounds
let audioContext;
let isRecording = false;
let rhythmAttempt = [];
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

// Init audio
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Play note
function playNote(frequency, duration = 0.8) {
    initAudio();

    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioContext.destination);

    osc1.frequency.setValueAtTime(frequency, audioContext.currentTime);
    osc2.frequency.setValueAtTime(frequency * 2, audioContext.currentTime);

    osc1.type = "sine";
    osc2.type = "triangle";

    gain.gain.setValueAtTime(0.4, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    osc1.start(audioContext.currentTime);
    osc2.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + duration);
    osc2.stop(audioContext.currentTime + duration);
}

// Handle key press
function handleKeyPress(key, note) {
    playNote(noteFrequencies[note]);

    // Visual feedback
    const keyElement = document.querySelector(`[data-key="${key}"]`);
    if (keyElement) {
        keyElement.classList.add("active");
        setTimeout(() => keyElement.classList.remove("active"), 200);
    }

    if (isRecording) {
        const now = Date.now();
        const diff = startTime ? now - startTime : 0;
        rhythmAttempt.push({ key, note, time: diff });
        updateRhythmDisplay();
        startTime = now;
    }
}

// Update rhythm display
function updateRhythmDisplay() {
    const display = document.getElementById("rhythmDisplay");
    if (rhythmAttempt.length === 0) {
        display.textContent = "Reproduce your rhythm to log in...";
    } else {
        const pattern = rhythmAttempt.map(b => b.key).join(" - ");
        display.textContent = `Your attempt: ${pattern} (${rhythmAttempt.length} beats)`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const recordBtn = document.getElementById("recordBtn");
    const playBtn = document.getElementById("playBtn");
    const clearBtn = document.getElementById("clearBtn");
    const status = document.getElementById("status");
    const submitBtn = document.getElementById("submitBtn");
    const loginForm = document.getElementById("loginForm");

    // Keyboard
    document.addEventListener("keydown", (e) => {
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
            return; // Do not play note if typing in an input field
        }

        const k = e.key.toUpperCase();
        if (keyMappings[k]) {
            e.preventDefault();
            handleKeyPress(k, keyMappings[k]);
        }
    });

    // Clicks
    document.querySelectorAll(".white-key, .black-key").forEach(el => {
        el.addEventListener("click", () => {
            handleKeyPress(el.dataset.key, el.dataset.note);
        });
    });

    // Record attempt
    recordBtn.addEventListener("click", () => {
        if (!isRecording) {
            isRecording = true;
            rhythmAttempt = [];
            startTime = Date.now();
            recordBtn.textContent = "⏹️ Stop Recording";
            status.textContent = "Reproduce your rhythm now...";
            status.className = "status recording";
        } else {
            isRecording = false;
            recordBtn.textContent = "🎤 Start Attempt";

            if (rhythmAttempt.length >= 3) {
                status.textContent = "Attempt recorded! Submit to verify.";
                status.className = "status complete";
                submitBtn.disabled = false;
                playBtn.disabled = false;
            } else {
                status.textContent = "Too short — try at least 3 beats.";
                status.className = "status error";
                submitBtn.disabled = true;
                playBtn.disabled = true;
            }
        }
    });

    // Play back attempt
    playBtn.addEventListener("click", () => {
        let delay = 0;
        rhythmAttempt.forEach(b => {
            setTimeout(() => handleKeyPress(b.key, b.note), delay);
            delay += b.time;
        });
    });

    // Clear attempt
    clearBtn.addEventListener("click", () => {
        rhythmAttempt = [];
        updateRhythmDisplay();
        status.textContent = "Press 'Start Attempt' and reproduce your rhythm.";
        status.className = "status";
        submitBtn.disabled = true;
        playBtn.disabled = true;
    });

    // Submit form
    loginForm.addEventListener("submit", (e) => {
        if (rhythmAttempt.length < 3) {
            e.preventDefault();
            alert("Please reproduce your rhythm pattern before submitting.");
            return;
        }
        document.getElementById("rhythmPattern").value = JSON.stringify(rhythmAttempt);
    });
});
