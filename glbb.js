// ===================================
// ===================================
// UNIFORMLY ACCELERATED LINEAR MOTION SIMULATION (GLBB)
// ===================================
// ===================================

// GLBB Scene Variables (separate from pendulum and GLB)
let glbbScene, glbbCamera, glbbRenderer;
let glbbVehicleGroup,
  glbbWheels = [];
let glbbTrackLine;

// GLBB Simulation state
let isGLBBSimulating = false;
let isGLBBPaused = false;
let glbbTime = 0;
let glbbPosition = 0; // Current position along track
let glbbVelocity = 0; // Current velocity (changes over time)
let glbbMaxPosition = 0; // Track maximum position reached
let glbbSimulationComplete = false;

// GLBB Physics parameters
let initialVelocity = 2; // m/s - initial velocity
let acceleration = 1; // m/s² - acceleration
let glbbWheelRadius = 0.2; // meters
const glbbTrackLength = 30; // meters (longer for acceleration)

// ===================================
// GLBB Initialization
// ===================================
function initGLBB() {
  console.log("initGLBB called");

  const container = document.getElementById("glbbContainer");
  if (!container) {
    console.log("GLBB container not found - may not be in DOM yet");
    return;
  }

  // Get container dimensions
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;
  console.log("GLBB container size:", width, "x", height);

  // Scene
  glbbScene = new THREE.Scene();
  glbbScene.background = new THREE.Color(0x87ceeb); // Sky blue
  console.log("GLBB scene created");

  // Camera - Perspective for 3D effect
  glbbCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  glbbCamera.position.set(10, 6, 15);
  glbbCamera.lookAt(0, 0, 0);
  console.log("GLBB camera created");

  // Renderer
  glbbRenderer = new THREE.WebGLRenderer({ antialias: true });
  glbbRenderer.setSize(width, height);
  glbbRenderer.setPixelRatio(window.devicePixelRatio);
  glbbRenderer.shadowMap.enabled = true;
  glbbRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  console.log("GLBB renderer created");

  // Clear container and append renderer
  container.innerHTML = "";
  container.appendChild(glbbRenderer.domElement);
  console.log("GLBB canvas appended to container");

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  glbbScene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(15, 25, 15);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  glbbScene.add(directionalLight);
  console.log("GLBB lighting added");

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(70, 25);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x228b22,
    roughness: 0.8,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  glbbScene.add(ground);
  console.log("GLBB ground added");

  // Create track/road
  createGLBBTrack();

  // Create vehicle with wheels
  createGLBBVehicle();

  // Setup controls
  setupGLBBControls();
  setupGLBBParameterSync();

  console.log("Rendering first frame of GLBB");
  glbbRenderer.render(glbbScene, glbbCamera);

  // Start animation loop
  animateGLBB();

  window.addEventListener("resize", onGLBBWindowResize);
}

function createGLBBTrack() {
  // Create a road/track
  const trackGeometry = new THREE.PlaneGeometry(glbbTrackLength * 2, 2.5);
  const trackMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.6,
  });
  glbbTrackLine = new THREE.Mesh(trackGeometry, trackMaterial);
  glbbTrackLine.rotation.x = -Math.PI / 2;
  glbbTrackLine.position.y = 0.01;
  glbbTrackLine.receiveShadow = true;
  glbbScene.add(glbbTrackLine);

  // Add road markings
  const markingGeometry = new THREE.PlaneGeometry(1.2, 0.12);
  const markingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
  });

  for (let i = -glbbTrackLength; i < glbbTrackLength; i += 2.5) {
    const marking = new THREE.Mesh(markingGeometry, markingMaterial);
    marking.rotation.x = -Math.PI / 2;
    marking.position.set(i, 0.02, 0);
    glbbScene.add(marking);
  }

  // Add distance markers every 5 meters
  for (let i = 0; i <= glbbTrackLength; i += 5) {
    const markerGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(-glbbTrackLength / 2 + i, 0.5, 1.5);
    marker.castShadow = true;
    glbbScene.add(marker);
  }

  console.log("GLBB track created");
}

function createGLBBVehicle() {
  if (glbbVehicleGroup) {
    glbbScene.remove(glbbVehicleGroup);
  }

  glbbVehicleGroup = new THREE.Group();
  glbbWheels = [];

  // Vehicle body (sports car style for acceleration)
  const bodyGeometry = new THREE.BoxGeometry(1.8, 0.5, 0.9);
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0xff0000, // Bright red
    emissive: 0x440000,
    shininess: 120,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = glbbWheelRadius + 0.25;
  body.castShadow = true;
  glbbVehicleGroup.add(body);

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
  cabin.position.set(-0.1, glbbWheelRadius + 0.7, 0);
  cabin.castShadow = true;
  glbbVehicleGroup.add(cabin);

  // Spoiler for sports effect
  const spoilerGeometry = new THREE.BoxGeometry(0.2, 0.3, 1.0);
  const spoilerMaterial = new THREE.MeshPhongMaterial({
    color: 0x000000,
    emissive: 0x000000,
    shininess: 80,
  });
  const spoiler = new THREE.Mesh(spoilerGeometry, spoilerMaterial);
  spoiler.position.set(-0.8, glbbWheelRadius + 0.5, 0);
  spoiler.castShadow = true;
  glbbVehicleGroup.add(spoiler);

  // Create 4 wheels
  const wheelGeometry = new THREE.CylinderGeometry(
    glbbWheelRadius,
    glbbWheelRadius,
    0.18,
    32
  );
  const wheelMaterial = new THREE.MeshPhongMaterial({
    color: 0x111111,
    emissive: 0x000000,
    shininess: 60,
  });

  const wheelPositions = [
    { x: 0.6, z: 0.55 }, // front right
    { x: 0.6, z: -0.55 }, // front left
    { x: -0.6, z: 0.55 }, // back right
    { x: -0.6, z: -0.55 }, // back left
  ];

  wheelPositions.forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(pos.x, glbbWheelRadius, pos.z);
    wheel.castShadow = true;
    glbbWheels.push(wheel);
    glbbVehicleGroup.add(wheel);

    // Add wheel rims for detail
    const rimGeometry = new THREE.CylinderGeometry(
      glbbWheelRadius * 0.5,
      glbbWheelRadius * 0.5,
      0.05,
      16
    );
    const rimMaterial = new THREE.MeshPhongMaterial({
      color: 0xcccccc,
      shininess: 100,
    });
    const rim = new THREE.Mesh(rimGeometry, wheelMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(pos.x, glbbWheelRadius, pos.z);
    glbbVehicleGroup.add(rim);
  });

  // Position vehicle at start
  glbbVehicleGroup.position.x = -glbbTrackLength / 2;
  glbbVehicleGroup.position.y = 0;
  glbbVehicleGroup.position.z = 0;

  glbbScene.add(glbbVehicleGroup);
  console.log("GLBB vehicle with wheels created");
}

// ===================================
// GLBB Physics Simulation
// ===================================
function updateGLBB(deltaTime) {
  if (!glbbVehicleGroup) return;

  // GLBB equations: v = v0 + at, s = v0*t + 0.5*a*t²
  glbbVelocity = initialVelocity + acceleration * glbbTime;
  glbbPosition =
    initialVelocity * glbbTime + 0.5 * acceleration * glbbTime * glbbTime;

  // Track maximum position reached
  if (Math.abs(glbbPosition) > Math.abs(glbbMaxPosition)) {
    glbbMaxPosition = glbbPosition;
  }

  // Stop if reached end of track
  if (glbbPosition >= glbbTrackLength) {
    glbbPosition = glbbTrackLength;
    isGLBBSimulating = false;
    glbbSimulationComplete = true;
    showGLBBCalculationResults();
    showGLBBNotification("Simulasi selesai - Mencapai akhir lintasan");
  }

  // Update vehicle position (clamp to track bounds)
  const minPos = -glbbTrackLength / 2;
  const maxPos = glbbTrackLength / 2;
  const clampedPosition = Math.max(minPos, Math.min(maxPos, glbbPosition));
  glbbVehicleGroup.position.x = -glbbTrackLength / 2 + glbbPosition;

  // Calculate wheel rotation based on distance traveled
  const angularDisplacement = (glbbVelocity * deltaTime) / glbbWheelRadius;

  // Rotate all wheels
  glbbWheels.forEach((wheel) => {
    wheel.rotation.y += angularDisplacement;
  });

  // Update calculated values display
  updateGLBBCalculatedValues();

  // Make camera follow the vehicle smoothly
  const cameraOffset = 10;
  const targetCameraX = glbbVehicleGroup.position.x + cameraOffset;
  glbbCamera.position.x += (targetCameraX - glbbCamera.position.x) * 0.05;
  glbbCamera.lookAt(glbbVehicleGroup.position);
}

// ===================================
// GLBB Animation Loop
// ===================================
function animateGLBB() {
  requestAnimationFrame(animateGLBB);

  if (isGLBBSimulating && !isGLBBPaused) {
    const deltaTime = 0.016; // ~60fps
    glbbTime += deltaTime;
    updateGLBB(deltaTime);
  }

  if (glbbRenderer && glbbScene && glbbCamera) {
    glbbRenderer.render(glbbScene, glbbCamera);
  }
}

function onGLBBWindowResize() {
  const container = document.getElementById("glbbContainer");
  if (container && glbbCamera && glbbRenderer) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    glbbCamera.aspect = width / height;
    glbbCamera.updateProjectionMatrix();
    glbbRenderer.setSize(width, height);
  }
}

// ===================================
// GLBB Parameter Synchronization
// ===================================
function setupGLBBParameterSync() {
  const initialVelSlider = document.getElementById("initialVelocity");
  const initialVelInput = document.getElementById("initialVelocityValue");

  if (initialVelSlider && initialVelInput) {
    initialVelSlider.addEventListener("input", function () {
      initialVelocity = parseFloat(this.value);
      initialVelInput.value = this.value;
    });

    initialVelInput.addEventListener("input", function () {
      initialVelocity = parseFloat(this.value);
      initialVelSlider.value = this.value;
    });
  }

  const accelerationSlider = document.getElementById("acceleration");
  const accelerationInput = document.getElementById("accelerationValue");

  if (accelerationSlider && accelerationInput) {
    accelerationSlider.addEventListener("input", function () {
      acceleration = parseFloat(this.value);
      accelerationInput.value = this.value;
    });

    accelerationInput.addEventListener("input", function () {
      acceleration = parseFloat(this.value);
      accelerationSlider.value = this.value;
    });
  }

  const glbbWheelRadiusSlider = document.getElementById("glbbWheelRadius");
  const glbbWheelRadiusInput = document.getElementById("glbbWheelRadiusValue");

  if (glbbWheelRadiusSlider && glbbWheelRadiusInput) {
    glbbWheelRadiusSlider.addEventListener("input", function () {
      glbbWheelRadius = parseFloat(this.value);
      glbbWheelRadiusInput.value = this.value;
      createGLBBVehicle(); // Recreate vehicle with new wheel size
      if (glbbRenderer && glbbScene && glbbCamera) {
        glbbRenderer.render(glbbScene, glbbCamera);
      }
    });

    glbbWheelRadiusInput.addEventListener("input", function () {
      glbbWheelRadius = parseFloat(this.value);
      glbbWheelRadiusSlider.value = this.value;
      createGLBBVehicle(); // Recreate vehicle with new wheel size
      if (glbbRenderer && glbbScene && glbbCamera) {
        glbbRenderer.render(glbbScene, glbbCamera);
      }
    });
  }
}

// ===================================
// GLBB Calculate and Display Values
// ===================================
function updateGLBBCalculatedValues() {
  const distanceEl = document.getElementById("glbbDistanceValue");
  const timeEl = document.getElementById("glbbTimeValue");
  const velocityEl = document.getElementById("glbbVelocityValue");
  const rotationEl = document.getElementById("glbbRotationValue");

  if (distanceEl) {
    distanceEl.textContent = glbbPosition.toFixed(2) + " m";
  }

  if (timeEl) {
    timeEl.textContent = glbbTime.toFixed(2) + " s";
  }

  if (velocityEl) {
    velocityEl.textContent = glbbVelocity.toFixed(2) + " m/s";
  }

  if (rotationEl) {
    const totalRotation = glbbPosition / glbbWheelRadius;
    rotationEl.textContent = totalRotation.toFixed(2) + " rad";
  }
}

// ===================================
// Reset GLBB Simulation Function
// ===================================
function resetGLBBSimulation() {
  isGLBBSimulating = false;
  isGLBBPaused = false;
  glbbTime = 0;
  glbbPosition = 0;
  glbbVelocity = initialVelocity;
  glbbMaxPosition = 0;
  glbbSimulationComplete = false;

  // Reset vehicle position
  if (glbbVehicleGroup) {
    glbbVehicleGroup.position.x = -glbbTrackLength / 2;
  }

  // Reset wheel rotations
  glbbWheels.forEach((wheel) => {
    wheel.rotation.y = 0;
  });

  // Reset camera
  if (glbbCamera) {
    glbbCamera.position.set(10, 6, 15);
    glbbCamera.lookAt(0, 0, 0);
  }

  updateGLBBCalculatedValues();
  if (glbbRenderer && glbbScene && glbbCamera) {
    glbbRenderer.render(glbbScene, glbbCamera);
  }

  console.log("GLBB simulation reset");
}

// ===================================
// GLBB Control Buttons
// ===================================
function setupGLBBControls() {
  const startBtn = document.getElementById("startGLBBBtn");
  const pauseBtn = document.getElementById("pauseGLBBBtn");
  const resetBtn = document.getElementById("resetGLBBBtn");

  if (startBtn) {
    startBtn.addEventListener("click", function () {
      isGLBBSimulating = true;
      isGLBBPaused = false;
      showGLBBNotification("Simulasi GLBB dimulai");
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      if (isGLBBSimulating) {
        isGLBBPaused = !isGLBBPaused;
        showGLBBNotification(
          isGLBBPaused ? "Simulasi dijeda" : "Simulasi dilanjutkan"
        );
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      resetGLBBSimulation();
      showGLBBNotification("Simulasi GLBB direset");
    });
  }
}

// ===================================
// GLBB Notification Helper
// ===================================
function showGLBBNotification(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
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
// GLBB Calculation Results Display
// ===================================
function showGLBBCalculationResults() {
  // Calculate key results
  const finalTime = glbbTime;
  const finalPosition = glbbPosition;
  const finalVelocity = glbbVelocity;
  const maxPosition = glbbMaxPosition;

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
    <h2 style="color: #1e40af; margin-top: 0; margin-bottom: 20px; font-size: 24px;">Hasil Simulasi GLBB</h2>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #374151; margin-top: 0; font-size: 18px;">Parameter Awal:</h3>
      <p style="margin: 8px 0; color: #1f2937;">• Kecepatan Awal (v₀): <strong>${initialVelocity.toFixed(
        2
      )} m/s</strong></p>
      <p style="margin: 8px 0; color: #1f2937;">• Percepatan (a): <strong>${acceleration.toFixed(
        2
      )} m/s²</strong></p>
      <p style="margin: 8px 0; color: #1f2937;">• Jari-jari Roda (r): <strong>${glbbWheelRadius.toFixed(
        2
      )} m</strong></p>
    </div>
    
    <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #075985; margin-top: 0; font-size: 18px;">Hasil Akhir:</h3>
      <p style="margin: 8px 0; color: #0c4a6e;">• Waktu Total: <strong>${finalTime.toFixed(
        2
      )} s</strong></p>
      <p style="margin: 8px 0; color: #0c4a6e;">• Posisi Akhir: <strong>${finalPosition.toFixed(
        2
      )} m</strong></p>
      <p style="margin: 8px 0; color: #0c4a6e;">• Kecepatan Akhir: <strong>${finalVelocity.toFixed(
        2
      )} m/s</strong></p>
      <p style="margin: 8px 0; color: #0c4a6e;">• Jarak Maksimum: <strong>${maxPosition.toFixed(
        2
      )} m</strong></p>
    </div>
    
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #92400e; margin-top: 0; font-size: 18px;">Rumus yang Digunakan:</h3>
      <p style="margin: 8px 0; color: #78350f;">• v = v₀ + at</p>
      <p style="margin: 8px 0; color: #78350f;">• s = v₀t + ½at²</p>
      <p style="margin: 8px 0; color: #78350f;">• θ = s / r (rotasi roda)</p>
    </div>
    
    <button id="closeResultsBtn" style="
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
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
  const closeBtn = document.getElementById("closeResultsBtn");
  closeBtn.addEventListener("click", () => {
    modal.style.animation = "slideOut 0.3s ease-in";
    backdrop.style.opacity = "0";
    backdrop.style.transition = "opacity 0.3s";
    setTimeout(() => {
      if (modal.parentNode) document.body.removeChild(modal);
      if (backdrop.parentNode) document.body.removeChild(backdrop);

      // Auto-reset simulation after closing modal
      resetGLBBSimulation();
      showGLBBNotification("Simulasi telah direset");
    }, 300);
  });

  // Close on backdrop click
  backdrop.addEventListener("click", () => {
    closeBtn.click();
  });
}

// ===================================
// Initialize GLBB when container is available
// ===================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
      const glbbContainer = document.getElementById("glbbContainer");
      if (glbbContainer) {
        initGLBB();
      }
    }, 500);
  });
} else {
  setTimeout(() => {
    const glbbContainer = document.getElementById("glbbContainer");
    if (glbbContainer) {
      initGLBB();
    }
  }, 500);
}
