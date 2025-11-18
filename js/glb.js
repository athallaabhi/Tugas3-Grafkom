// ===================================
// ===================================
// UNIFORM LINEAR MOTION SIMULATION (GLB)
// ===================================
// ===================================

// GLB Scene Variables (separate from pendulum and GLBB)
let glbScene, glbCamera, glbRenderer;
let glbVehicleGroup,
  glbWheels = [];
let glbTrackLine;

// GLB Simulation state
let isGLBSimulating = false;
let isGLBPaused = false;
let glbTime = 0;
let glbPosition = 0; // Current position along track
let glbMaxPosition = 0; // Track maximum position reached
let glbSimulationComplete = false;

// GLB Physics parameters
let glbVelocity = 5; // m/s - constant velocity (no acceleration)
let glbWheelRadius = 0.2; // meters
const glbTrackLength = 30; // meters

// ===================================
// GLB Initialization
// ===================================
function initGLB() {
  console.log("initGLB called");

  const container = document.getElementById("glbContainer");
  if (!container) {
    console.log("GLB container not found - may not be in DOM yet");
    return;
  }

  // Get container dimensions
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;
  console.log("GLB container size:", width, "x", height);

  // Scene
  glbScene = new THREE.Scene();
  glbScene.background = new THREE.Color(0x87ceeb); // Sky blue
  console.log("GLB scene created");

  // Camera - Perspective for 3D effect
  glbCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  glbCamera.position.set(10, 6, 15);
  glbCamera.lookAt(0, 0, 0);
  console.log("GLB camera created");

  // Renderer
  glbRenderer = new THREE.WebGLRenderer({ antialias: true });
  glbRenderer.setSize(width, height);
  glbRenderer.setPixelRatio(window.devicePixelRatio);
  glbRenderer.shadowMap.enabled = true;
  glbRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  console.log("GLB renderer created");

  // Clear container and append renderer
  container.innerHTML = "";
  container.appendChild(glbRenderer.domElement);
  console.log("GLB canvas appended to container");

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  glbScene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(15, 25, 15);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  glbScene.add(directionalLight);
  console.log("GLB lighting added");

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(70, 25);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x228b22,
    roughness: 0.8,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  glbScene.add(ground);
  console.log("GLB ground added");

  // Create track/road
  createGLBTrack();

  // Create vehicle with wheels
  createGLBVehicle();

  // Setup controls and parameters
  setupGLBControls();
  setupGLBParameterSync();

  console.log("Rendering first frame of GLB");
  glbRenderer.render(glbScene, glbCamera);

  // Start animation loop
  animateGLB();

  console.log("GLB initialization complete");

  // Handle window resize
  window.addEventListener("resize", onGLBWindowResize);
}

// ===================================
// Create Track/Road
// ===================================
function createGLBTrack() {
  // Create a road/track (sama seperti GLBB)
  const trackGeometry = new THREE.PlaneGeometry(glbTrackLength * 2, 2.5);
  const trackMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.6,
  });
  glbTrackLine = new THREE.Mesh(trackGeometry, trackMaterial);
  glbTrackLine.rotation.x = -Math.PI / 2;
  glbTrackLine.position.y = 0.01;
  glbTrackLine.receiveShadow = true;
  glbScene.add(glbTrackLine);

  // Add road markings (garis putus-putus)
  const markingGeometry = new THREE.PlaneGeometry(1.2, 0.12);
  const markingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
  });

  for (let i = -glbTrackLength; i < glbTrackLength; i += 2.5) {
    const marking = new THREE.Mesh(markingGeometry, markingMaterial);
    marking.rotation.x = -Math.PI / 2;
    marking.position.set(i, 0.02, 0);
    glbScene.add(marking);
  }

  // Add distance markers every 5 meters (pembatas oranye)
  for (let i = 0; i <= glbTrackLength; i += 5) {
    const markerGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(-glbTrackLength / 2 + i, 0.5, 1.5);
    marker.castShadow = true;
    glbScene.add(marker);
  }

  console.log("GLB track created");
}

// ===================================
// Create Vehicle with Wheels
// ===================================
function createGLBVehicle() {
  if (glbVehicleGroup) {
    glbScene.remove(glbVehicleGroup);
  }

  glbVehicleGroup = new THREE.Group();
  glbWheels = [];

  // Vehicle body (warna biru untuk GLB - bedakan dari GLBB yang merah)
  const bodyGeometry = new THREE.BoxGeometry(1.8, 0.5, 0.9);
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0x0066ff, // Blue
    emissive: 0x000044,
    shininess: 120,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = glbWheelRadius + 0.25;
  body.castShadow = true;
  glbVehicleGroup.add(body);

  // Cabin (streamlined)
  const cabinGeometry = new THREE.BoxGeometry(0.9, 0.4, 0.75);
  const cabinMaterial = new THREE.MeshPhongMaterial({
    color: 0x222222,
    emissive: 0x000000,
    shininess: 100,
    transparent: true,
    opacity: 0.7,
  });
  const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
  cabin.position.set(-0.1, glbWheelRadius + 0.7, 0);
  cabin.castShadow = true;
  glbVehicleGroup.add(cabin);

  // Spoiler
  const spoilerGeometry = new THREE.BoxGeometry(0.2, 0.3, 1.0);
  const spoilerMaterial = new THREE.MeshPhongMaterial({
    color: 0x000000,
    emissive: 0x000000,
    shininess: 80,
  });
  const spoiler = new THREE.Mesh(spoilerGeometry, spoilerMaterial);
  spoiler.position.set(-0.8, glbWheelRadius + 0.5, 0);
  spoiler.castShadow = true;
  glbVehicleGroup.add(spoiler);

  // Create 4 wheels
  const wheelGeometry = new THREE.CylinderGeometry(
    glbWheelRadius,
    glbWheelRadius,
    0.2,
    32
  );
  const wheelMaterial = new THREE.MeshPhongMaterial({
    color: 0x111111,
    emissive: 0x000000,
    shininess: 60,
  });

  // Wheel positions
  const wheelOffsets = [
    { x: 0.7, z: 0.6 }, // front left
    { x: 0.7, z: -0.6 }, // front right
    { x: -0.7, z: 0.6 }, // back left
    { x: -0.7, z: -0.6 }, // back right
  ];

  wheelOffsets.forEach((offset) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(offset.x, glbWheelRadius, offset.z);
    wheel.castShadow = true;
    glbVehicleGroup.add(wheel);
    glbWheels.push(wheel);
  });

  // Position vehicle at start
  glbVehicleGroup.position.set(-glbTrackLength / 2, 0, 0);
  glbScene.add(glbVehicleGroup);

  console.log("GLB vehicle created with wheels");
}

// ===================================
// GLB Physics Simulation
// ===================================
function updateGLBPosition(deltaTime) {
  if (!glbVehicleGroup) return;

  // GLB: position changes linearly with constant velocity
  // s = v * t (no acceleration)
  glbPosition += glbVelocity * deltaTime;

  // Update vehicle position
  const xPosition = -glbTrackLength / 2 + glbPosition;
  glbVehicleGroup.position.x = xPosition;

  // Rotate wheels based on distance traveled
  const wheelRotation =
    (glbPosition / (2 * Math.PI * glbWheelRadius)) * 2 * Math.PI;
  glbWheels.forEach((wheel) => {
    wheel.rotation.x = wheelRotation;
  });

  // Camera follows vehicle
  glbCamera.position.x = xPosition + 10;
  glbCamera.lookAt(xPosition, 0, 0);

  // Track maximum position
  if (glbPosition > glbMaxPosition) {
    glbMaxPosition = glbPosition;
  }

  // Update real-time values display
  updateGLBCalculatedValues();

  // Check if reached end of track
  if (glbPosition >= glbTrackLength) {
    glbPosition = glbTrackLength; // Clamp to exactly 30m
    glbSimulationComplete = true;
    isGLBSimulating = false;
    showGLBCalculationResults();
    showGLBNotification("Simulasi selesai - Mencapai akhir lintasan");
    console.log("GLB simulation complete - reached end of track");
  }
}

// ===================================
// Animation Loop
// ===================================
function animateGLB() {
  requestAnimationFrame(animateGLB);

  if (isGLBSimulating && !isGLBPaused && !glbSimulationComplete) {
    const deltaTime = 0.016; // ~60fps
    glbTime += deltaTime;
    updateGLBPosition(deltaTime);
  }

  if (glbRenderer && glbScene && glbCamera) {
    glbRenderer.render(glbScene, glbCamera);
  }
}

function onGLBWindowResize() {
  const container = document.getElementById("glbContainer");
  if (container && glbCamera && glbRenderer) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    glbCamera.aspect = width / height;
    glbCamera.updateProjectionMatrix();
    glbRenderer.setSize(width, height);
  }
}

// ===================================
// Parameter Synchronization
// ===================================
function setupGLBParameterSync() {
  const velocitySlider = document.getElementById("glbVelocity");
  const velocityInput = document.getElementById("glbVelocityValue");

  if (velocitySlider && velocityInput) {
    velocitySlider.addEventListener("input", function () {
      glbVelocity = parseFloat(this.value);
      velocityInput.value = this.value;
    });

    velocityInput.addEventListener("input", function () {
      glbVelocity = parseFloat(this.value);
      velocitySlider.value = this.value;
    });
  }

  const wheelRadiusSlider = document.getElementById("glbWheelRadius");
  const wheelRadiusInput = document.getElementById("glbWheelRadiusValue");

  if (wheelRadiusSlider && wheelRadiusInput) {
    wheelRadiusSlider.addEventListener("input", function () {
      glbWheelRadius = parseFloat(this.value);
      wheelRadiusInput.value = this.value;
      createGLBVehicle(); // Recreate vehicle with new wheel size
      if (glbRenderer && glbScene && glbCamera) {
        glbRenderer.render(glbScene, glbCamera);
      }
    });

    wheelRadiusInput.addEventListener("input", function () {
      glbWheelRadius = parseFloat(this.value);
      wheelRadiusSlider.value = this.value;
      createGLBVehicle(); // Recreate vehicle with new wheel size
      if (glbRenderer && glbScene && glbCamera) {
        glbRenderer.render(glbScene, glbCamera);
      }
    });
  }
}

// ===================================
// Calculate and Display Values
// ===================================
function updateGLBCalculatedValues() {
  const distanceEl = document.getElementById("glbDistanceValue");
  const timeEl = document.getElementById("glbTimeValue");
  const velocityEl = document.getElementById("glbVelocityValue");
  const rotationEl = document.getElementById("glbRotationValue");

  if (distanceEl) {
    distanceEl.textContent = glbPosition.toFixed(2) + " m";
  }

  if (timeEl) {
    timeEl.textContent = glbTime.toFixed(2) + " s";
  }

  if (velocityEl) {
    velocityEl.textContent = glbVelocity.toFixed(2) + " m/s";
  }

  if (rotationEl) {
    const rotations = glbPosition / (2 * Math.PI * glbWheelRadius);
    rotationEl.textContent = rotations.toFixed(2) + " putaran";
  }
}

// ===================================
// Reset Simulation Function
// ===================================
function resetGLBSimulation() {
  isGLBSimulating = false;
  isGLBPaused = false;
  glbTime = 0;
  glbPosition = 0;
  glbMaxPosition = 0;
  glbSimulationComplete = false;

  // Reset vehicle position
  if (glbVehicleGroup) {
    glbVehicleGroup.position.set(-glbTrackLength / 2, 0, 0);
  }

  // Reset wheels rotation
  glbWheels.forEach((wheel) => {
    wheel.rotation.x = 0;
  });

  // Reset camera
  glbCamera.position.set(10, 6, 15);
  glbCamera.lookAt(0, 0, 0);

  // Update displays
  updateGLBCalculatedValues();

  console.log("GLB simulation reset");
}

// ===================================
// Control Buttons
// ===================================
function setupGLBControls() {
  const startBtn = document.getElementById("glbStartBtn");
  const pauseBtn = document.getElementById("glbPauseBtn");
  const resetBtn = document.getElementById("glbResetBtn");

  if (startBtn) {
    startBtn.addEventListener("click", function () {
      if (!isGLBSimulating) {
        isGLBSimulating = true;
        isGLBPaused = false;
        glbSimulationComplete = false;
        console.log("GLB simulation started");
      }
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      isGLBPaused = !isGLBPaused;
      console.log("GLB simulation paused:", isGLBPaused);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      resetGLBSimulation();
      showGLBNotification("Simulasi GLB direset");
    });
  }

  setupGLBParameterSync();
  updateGLBCalculatedValues();
}

// ===================================
// GLB Notification Helper
// ===================================
function showGLBNotification(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    font-weight: 500;
    font-family: 'Segoe UI', sans-serif;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-in";
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// ===================================
// GLB Calculation Results Modal
// ===================================
function showGLBCalculationResults() {
  // Calculate key results
  const finalTime = glbTime;
  const finalPosition = glbPosition;
  const finalVelocity = glbVelocity; // Constant in GLB
  const maxPosition = glbMaxPosition;

  // Create results modal
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    z-index: 2000;
    max-width: 500px;
    width: 90%;
    animation: slideIn 0.3s ease-out;
  `;

  let resultsHTML = `
    <h2 style="color: #1e40af; margin-top: 0; margin-bottom: 20px; font-size: 24px;">Hasil Simulasi GLB</h2>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #374151; margin-top: 0; font-size: 18px;">Parameter Awal:</h3>
      <p style="margin: 8px 0; color: #1f2937;">• Kecepatan Konstan (v): <strong>${glbVelocity.toFixed(
        2
      )} m/s</strong></p>
      <p style="margin: 8px 0; color: #1f2937;">• Jari-jari Roda (r): <strong>${glbWheelRadius.toFixed(
        2
      )} m</strong></p>
    </div>
    
    <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #1e3a8a; margin-top: 0; font-size: 18px;">Hasil Akhir:</h3>
      <p style="margin: 8px 0; color: #1e40af;">• Waktu Total: <strong>${finalTime.toFixed(
        2
      )} s</strong></p>
      <p style="margin: 8px 0; color: #1e40af;">• Posisi Akhir: <strong>${finalPosition.toFixed(
        2
      )} m</strong></p>
      <p style="margin: 8px 0; color: #1e40af;">• Kecepatan (tetap): <strong>${finalVelocity.toFixed(
        2
      )} m/s</strong></p>
      <p style="margin: 8px 0; color: #1e40af;">• Jarak Maksimum: <strong>${maxPosition.toFixed(
        2
      )} m</strong></p>
      <p style="margin: 8px 0; color: #1e40af;">• Rotasi Roda: <strong>${(
        finalPosition /
        (2 * Math.PI * glbWheelRadius)
      ).toFixed(2)} putaran</strong></p>
    </div>
    
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #92400e; margin-top: 0; font-size: 18px;">Rumus yang Digunakan:</h3>
      <p style="margin: 8px 0; color: #78350f;">• s = v × t (jarak = kecepatan × waktu)</p>
      <p style="margin: 8px 0; color: #78350f;">• v = konstan (tidak ada percepatan)</p>
      <p style="margin: 8px 0; color: #78350f;">• θ = s / r (rotasi roda)</p>
    </div>
    
    <button id="closeGLBResultsBtn" style="
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    ">Tutup</button>
  `;

  modal.innerHTML = resultsHTML;

  // Add backdrop
  const backdrop = document.createElement("div");
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1999;
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  // Close button handler
  const closeBtn = document.getElementById("closeGLBResultsBtn");
  closeBtn.addEventListener("click", () => {
    modal.style.animation = "slideOut 0.3s ease-in";
    backdrop.style.opacity = "0";
    backdrop.style.transition = "opacity 0.3s";
    setTimeout(() => {
      if (modal.parentNode) document.body.removeChild(modal);
      if (backdrop.parentNode) document.body.removeChild(backdrop);

      // Auto-reset simulation after closing modal
      resetGLBSimulation();
      showGLBNotification("Simulasi telah direset");
    }, 300);
  });

  // Close on backdrop click
  backdrop.addEventListener("click", () => {
    closeBtn.click();
  });
}
