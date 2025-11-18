// ===================================
// Script untuk UI Interaktivity
// Belum ada implementasi simulasi
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    // Inisialisasi Canvas
    initializeCanvas();
    
    // Setup Parameter Synchronization
    setupParameterSync();
    
    // Setup Control Buttons
    setupControlButtons();
    
    // Calculate Initial Values
    updateCalculatedValues();
});

// ===================================
// Canvas Initialization
// ===================================
function initializeCanvas() {
    const canvas = document.getElementById('pendulumCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Draw placeholder
    drawPlaceholder(ctx, canvas.width, canvas.height);
    
    // Redraw on window resize
    window.addEventListener('resize', function() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        drawPlaceholder(ctx, canvas.width, canvas.height);
    });
}

function drawPlaceholder(ctx, width, height) {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw message
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Canvas Simulasi', width / 2, height / 2 - 20);
    
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('(Implementasi akan ditambahkan)', width / 2, height / 2 + 20);
}

// ===================================
// Parameter Synchronization
// ===================================
function setupParameterSync() {
    // Amplitude
    const amplitudeSlider = document.getElementById('amplitude');
    const amplitudeInput = document.getElementById('amplitudeValue');
    
    amplitudeSlider.addEventListener('input', function() {
        amplitudeInput.value = this.value;
        updateCalculatedValues();
    });
    
    amplitudeInput.addEventListener('input', function() {
        amplitudeSlider.value = this.value;
        updateCalculatedValues();
    });
    
    // Length
    const lengthSlider = document.getElementById('length');
    const lengthInput = document.getElementById('lengthValue');
    
    lengthSlider.addEventListener('input', function() {
        lengthInput.value = this.value;
        updateCalculatedValues();
    });
    
    lengthInput.addEventListener('input', function() {
        lengthSlider.value = this.value;
        updateCalculatedValues();
    });
    
    // Mass
    const massSlider = document.getElementById('mass');
    const massInput = document.getElementById('massValue');
    
    massSlider.addEventListener('input', function() {
        massInput.value = this.value;
        updateCalculatedValues();
    });
    
    massInput.addEventListener('input', function() {
        massSlider.value = this.value;
        updateCalculatedValues();
    });
}

// ===================================
// Calculate Physics Values
// ===================================
function updateCalculatedValues() {
    const length = parseFloat(document.getElementById('lengthValue').value);
    const g = 9.8; // gravitasi (m/s²)
    
    // Hitung periode: T = 2π√(L/g)
    const period = 2 * Math.PI * Math.sqrt(length / g);
    
    // Hitung frekuensi: f = 1/T
    const frequency = 1 / period;
    
    // Hitung frekuensi sudut: ω = 2πf
    const angularFrequency = 2 * Math.PI * frequency;
    
    // Update tampilan
    document.getElementById('periodValue').textContent = period.toFixed(2) + ' s';
    document.getElementById('frequencyValue').textContent = frequency.toFixed(2) + ' Hz';
    document.getElementById('angularFreqValue').textContent = angularFrequency.toFixed(2) + ' rad/s';
}

// ===================================
// Control Buttons
// ===================================
function setupControlButtons() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    startBtn.addEventListener('click', function() {
        console.log('Start button clicked');
        // TODO: Implementasi start simulasi
        showNotification('Tombol Mulai diklik (belum diimplementasikan)');
    });
    
    pauseBtn.addEventListener('click', function() {
        console.log('Pause button clicked');
        // TODO: Implementasi pause simulasi
        showNotification('Tombol Jeda diklik (belum diimplementasikan)');
    });
    
    resetBtn.addEventListener('click', function() {
        console.log('Reset button clicked');
        // TODO: Implementasi reset simulasi
        showNotification('Tombol Reset diklik (belum diimplementasikan)');
    });
}

// ===================================
// Notification Helper
// ===================================
function showNotification(message) {
    // Buat elemen notifikasi
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #2563eb, #1e40af);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    // Tambahkan ke body
    document.body.appendChild(notification);
    
    // Hapus setelah 3 detik
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Tambahkan keyframe animations via style
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
