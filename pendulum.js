// ===================================
// THREE.js 3D Pendulum Simulation
// ===================================

let scene, camera, renderer;
let pendulumGroup, ropeLineGeometry, sphere;
let ropeVertices;
let angleArc = null; // Store arc reference

// Simulation state
let isSimulating = false;
let isPaused = false;
let time = 0;

// Physics parameters
let amplitude = 30; // degrees
let ropeLength = 2; // meters
let mass = 1; // kg
let useDamping = true; // Toggle for damping
const g = 9.8; // gravitational acceleration

// Helper function to adjust camera based on rope length
function adjustCameraForRopeLength() {
  if (!camera) return;

  // Calculate distance needed to see full pendulum
  const pivotY = 0.8;
  const bottomY = pivotY - ropeLength;
  const distance = Math.max(2.5, ropeLength * 1.8);

  // Position camera at angle to see pendulum from side
  camera.position.set(distance * 0.8, pivotY - 0.3, distance * 0.8);
  camera.lookAt(0, pivotY - ropeLength * 0.5, 0);
  console.log("Camera adjusted for rope length:", ropeLength);
}

// Helper function to create angle arc (protractor) - 180 degrees with 0 at bottom
function createAngleArc() {
  // Create group to hold arc and labels
  if (!angleArc) {
    angleArc = new THREE.Group();
  } else {
    // Clear existing children
    while (angleArc.children.length > 0) {
      angleArc.remove(angleArc.children[0]);
    }
  }

  // Always add to current pendulumGroup (important after recreating pendulum)
  pendulumGroup.add(angleArc);

  const arcRadius = ropeLength * 0.5;
  const arcColor = 0x00ccff;

  // Draw main semicircle arc from -PI to 0 (180 degrees, bottom is 0)
  const arcCurve = new THREE.EllipseCurve(
    0,
    0, // center
    arcRadius,
    arcRadius, // radius
    -Math.PI,
    0, // start angle (-180°), end angle (0°)
    false, // clockwise
    0 // rotation
  );

  const arcPoints = arcCurve.getPoints(256);
  const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const arcMaterial = new THREE.LineBasicMaterial({
    color: arcColor,
    linewidth: 3,
  });
  const arcLine = new THREE.Line(arcGeometry, arcMaterial);
  arcLine.position.z = 0.05;
  angleArc.add(arcLine);

  // Draw diameter line at bottom (0 degrees position)
  const diameterGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-arcRadius * 1.1, 0, 0.05),
    new THREE.Vector3(arcRadius * 1.1, 0, 0.05),
  ]);
  const diameterLine = new THREE.Line(diameterGeom, arcMaterial);
  angleArc.add(diameterLine);

  // Add angle markers every 15 degrees
  for (let deg = 0; deg <= 180; deg += 15) {
    // Convert to arc angle: 0° is at bottom (Math.PI/2 in ellipse curve)
    // -90° is at left (-Math.PI in ellipse), +90° is at right (0 in ellipse)
    const arcAngle = Math.PI - (deg * Math.PI) / 180;

    const outerX = arcRadius * Math.cos(arcAngle);
    const outerY = arcRadius * Math.sin(arcAngle);
    const innerX = (arcRadius - 0.15) * Math.cos(arcAngle);
    const innerY = (arcRadius - 0.15) * Math.sin(arcAngle);

    // Draw tick mark
    const tickGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(innerX, innerY, 0.05),
      new THREE.Vector3(outerX, outerY, 0.05),
    ]);
    const tickLine = new THREE.Line(tickGeometry, arcMaterial);
    angleArc.add(tickLine);

    // Add labels for major angles
    if (deg % 30 === 0) {
      const labelRadius = arcRadius + 0.35;
      const labelX = labelRadius * Math.cos(arcAngle);
      const labelY = labelRadius * Math.sin(arcAngle);

      // Determine label text: 0 at bottom, -90 at left, +90 at right
      let labelText;
      if (deg === 0) labelText = "0°";
      else if (deg === 90) labelText = "±90°";
      else if (deg === 180) labelText = "±180°";
      else if (deg < 90) labelText = "+" + deg + "°";
      else labelText = "-" + deg + "°";

      // Scale proportionally to ropeLength to maintain consistent visual size
      const labelScale = 0.3 * (ropeLength / 2);
      const textObj = createTextLabel(
        labelText,
        labelX,
        labelY,
        0.06,
        labelScale
      );
      if (textObj) angleArc.add(textObj);
    }
  }

  // Position arc at pivot
  angleArc.position.set(0, 0.8, 0);
  console.log("180° Protractor arc created");
}

// Helper function to create 3D text label
function createTextLabel(text, x, y, z, scale = 0.3) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgb(0, 204, 255)";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text + "°", 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(scale, scale, scale);
  sprite.position.set(x, y, z);
  return sprite;
}

// Wait for THREE.js to be loaded
function waitForThreeJS() {
  if (typeof THREE === "undefined") {
    console.log("THREE not loaded yet, waiting...");
    setTimeout(waitForThreeJS, 100);
    return;
  }

  console.log("THREE.js loaded successfully");

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      try {
        console.log("DOM ready, initializing...");
        initThreeJS();
        setupParameterSync();
        setupControlButtons();
        updateCalculatedValues();
        animate();
      } catch (error) {
        console.error("Error initializing simulation:", error);
        console.error("Stack:", error.stack);
      }
    });
  } else {
    // DOM already loaded
    try {
      console.log("DOM already ready, initializing...");
      initThreeJS();
      setupParameterSync();
      setupControlButtons();
      updateCalculatedValues();
      animate();
    } catch (error) {
      console.error("Error initializing simulation:", error);
      console.error("Stack:", error.stack);
    }
  }
}

// Start waiting for THREE.js
waitForThreeJS();

// ===================================
// THREE.JS Initialization
// ===================================
function initThreeJS() {
  console.log("initThreeJS called");

  const container = document.getElementById("pendulumContainer");
  if (!container) {
    console.error("Container not found!");
    return;
  }

  // Get container dimensions
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;
  console.log("Container size:", width, "x", height);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x001f3f);
  console.log("Scene created");

  // Camera - Perspective for 3D effect
  // Adjust based on rope length so we can always see the full pendulum
  const maxDistance = Math.max(2, ropeLength * 1.5);
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(2.5, 0.8, 2.5);
  camera.lookAt(0, 0.5, 0);
  console.log("Camera created (Perspective), looking at pendulum");

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  console.log("Renderer created");

  // Clear container and append renderer
  container.innerHTML = "";
  container.appendChild(renderer.domElement);
  console.log("Canvas appended to container");

  // Lighting for 3D effect
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);
  console.log("Lighting added");

  // Add grid helper instead of axes
  const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x888888);
  gridHelper.position.y = -5;
  scene.add(gridHelper);
  console.log("Grid helper added");

  createPendulum();

  console.log("Rendering first frame");
  renderer.render(scene, camera);

  window.addEventListener("resize", onWindowResize);
}

function createPendulum() {
  console.log("createPendulum called");

  if (pendulumGroup) {
    scene.remove(pendulumGroup);
  }

  pendulumGroup = new THREE.Group();
  scene.add(pendulumGroup);
  console.log("Pendulum group added to scene");

  // Pivot point (support)
  const pivotGeometry = new THREE.SphereGeometry(0.15, 32, 32);
  const pivotMaterial = new THREE.MeshPhongMaterial({
    color: 0xffa500,
    emissive: 0x330000,
    shininess: 100,
  });
  const pivot = new THREE.Mesh(pivotGeometry, pivotMaterial);
  pivot.position.y = 0.8;
  pendulumGroup.add(pivot);
  console.log("Pivot added");

  // Rope - using tube geometry for 3D cylinder
  // Use global ropeLength variable, don't redeclare it
  const ropeTubeRadius = 0.01;

  // Create rope as a tube from pivot to sphere position
  ropeVertices = [
    new THREE.Vector3(0, 0.8, 0),
    new THREE.Vector3(0, 0.8 - ropeLength, 0),
  ];

  // Store for later updates
  window.ropeStartPos = new THREE.Vector3(0, 0.8, 0);
  window.ropeEndPos = new THREE.Vector3(0, 0.8 - ropeLength, 0);

  // Create rope using LatheGeometry or TubeGeometry
  const ropeCurve = new THREE.LineCurve3(ropeVertices[0], ropeVertices[1]);
  const ropeGeometry = new THREE.TubeGeometry(
    ropeCurve,
    8,
    ropeTubeRadius,
    8,
    false
  );
  const ropeMaterial = new THREE.MeshPhongMaterial({
    color: 0xff3333,
    emissive: 0x330000,
    shininess: 30,
  });
  window.ropeMesh = new THREE.Mesh(ropeGeometry, ropeMaterial);
  pendulumGroup.add(window.ropeMesh);
  console.log("Rope added");

  // Sphere (Pendulum Bob)
  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshPhongMaterial({
    color: 0xffff00,
    emissive: 0x333300,
    shininess: 120,
  });
  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.y = 0.8 - ropeLength;
  pendulumGroup.add(sphere);
  console.log("Sphere added at position:", sphere.position);

  // Arc helper to show angle
  createAngleArc();

  console.log(
    "Total objects in pendulum group:",
    pendulumGroup.children.length
  );

  // Adjust camera to fit the new rope length
  adjustCameraForRopeLength();
}

// ===================================
// Physics Simulation
// ===================================
function updatePendulumPosition(currentTime) {
  if (!sphere) return;

  const amplitudeRad = (amplitude * Math.PI) / 180;
  const period = 2 * Math.PI * Math.sqrt(ropeLength / g);
  const angularFrequency = (2 * Math.PI) / period;

  // Apply damping if enabled
  let angle;
  if (useDamping) {
    const dampingFactor = 0.995;
    angle =
      amplitudeRad *
      Math.cos(angularFrequency * currentTime) *
      Math.pow(dampingFactor, currentTime * 10);
  } else {
    angle = amplitudeRad * Math.cos(angularFrequency * currentTime);
  }

  // Calculate position
  const xPosition = ropeLength * Math.sin(angle);
  const yPosition = 0.8 - ropeLength * Math.cos(angle);

  sphere.position.x = xPosition;
  sphere.position.y = yPosition;

  // Update angle indicator line on protractor (show current angle)
  if (angleArc && pendulumGroup) {
    // Remove old angle indicator if exists
    const oldIndicator = angleArc.children.find(
      (child) => child.userData && child.userData.isAngleIndicator
    );
    if (oldIndicator) angleArc.remove(oldIndicator);

    // Add new angle indicator line from center to current angle
    const arcRadius = ropeLength * 0.6;
    const indicatorX = arcRadius * Math.cos(angle);
    const indicatorY = arcRadius * Math.sin(angle);

    const indicatorGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.06),
      new THREE.Vector3(indicatorX, indicatorY, 0.06),
    ]);
    const indicatorMaterial = new THREE.LineBasicMaterial({
      color: 0xff6600,
      linewidth: 3,
    });
    const indicatorLine = new THREE.Line(indicatorGeometry, indicatorMaterial);
    indicatorLine.userData.isAngleIndicator = true;
    angleArc.add(indicatorLine);

    // Update angle value display label at the end of indicator
    const oldLabel = angleArc.children.find(
      (child) => child.userData && child.userData.isAngleLabel
    );
    if (oldLabel) angleArc.remove(oldLabel);

    const labelX = (arcRadius + 0.35) * Math.cos(angle);
    const labelY = (arcRadius + 0.35) * Math.sin(angle);
    const angleDisplay = Math.round((angle * 180) / Math.PI);

    // Scale proportionally to ropeLength to maintain consistent visual size
    const labelScale = 0.25 * (ropeLength / 2);
    const label = createTextLabel(
      angleDisplay.toString(),
      labelX,
      labelY,
      0.07,
      labelScale
    );
    if (label) {
      label.userData.isAngleLabel = true;
      angleArc.add(label);
    }
  }

  // Update rope geometry to connect pivot to sphere
  if (window.ropeMesh && pendulumGroup) {
    // Remove old rope
    pendulumGroup.remove(window.ropeMesh);

    // Create new rope from pivot to sphere
    const ropeCurve = new THREE.LineCurve3(
      new THREE.Vector3(0, 0.8, 0),
      new THREE.Vector3(xPosition, yPosition, 0)
    );
    const ropeGeometry = new THREE.TubeGeometry(ropeCurve, 8, 0.01, 8, false);
    const ropeMaterial = new THREE.MeshPhongMaterial({
      color: 0xff3333,
      emissive: 0x330000,
      shininess: 30,
    });
    window.ropeMesh = new THREE.Mesh(ropeGeometry, ropeMaterial);
    pendulumGroup.add(window.ropeMesh);
  }
}

// ===================================
// Animation Loop
// ===================================
function animate() {
  requestAnimationFrame(animate);

  if (isSimulating && !isPaused) {
    time += 0.016;
    updatePendulumPosition(time);
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  const container = document.getElementById("pendulumContainer");
  if (container) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
}

// ===================================
// Parameter Synchronization
// ===================================
function setupParameterSync() {
  const amplitudeSlider = document.getElementById("amplitude");
  const amplitudeInput = document.getElementById("amplitudeValue");

  amplitudeSlider.addEventListener("input", function () {
    amplitude = parseFloat(this.value);
    amplitudeInput.value = this.value;
    updateCalculatedValues();
    if (isSimulating) time = 0;
  });

  amplitudeInput.addEventListener("input", function () {
    amplitude = parseFloat(this.value);
    amplitudeSlider.value = this.value;
    updateCalculatedValues();
    if (isSimulating) time = 0;
  });

  const lengthSlider = document.getElementById("length");
  const lengthInput = document.getElementById("lengthValue");

  lengthSlider.addEventListener("input", function () {
    ropeLength = parseFloat(this.value);
    lengthInput.value = this.value;
    updateCalculatedValues();
    createPendulum();
    updatePendulumPosition(time); // Update to show current position
    renderer.render(scene, camera); // Force render to show changes
    if (isSimulating) time = 0;
  });

  lengthInput.addEventListener("input", function () {
    ropeLength = parseFloat(this.value);
    lengthSlider.value = this.value;
    updateCalculatedValues();
    createPendulum();
    updatePendulumPosition(time); // Update to show current position
    renderer.render(scene, camera); // Force render to show changes
    if (isSimulating) time = 0;
  });

  const massSlider = document.getElementById("mass");
  const massInput = document.getElementById("massValue");

  massSlider.addEventListener("input", function () {
    mass = parseFloat(this.value);
    massInput.value = this.value;
    updateCalculatedValues();
    createPendulum();
    updatePendulumPosition(time); // Update to show current position
    renderer.render(scene, camera); // Force render to show changes
  });

  massInput.addEventListener("input", function () {
    mass = parseFloat(this.value);
    massSlider.value = this.value;
    updateCalculatedValues();
    createPendulum();
    updatePendulumPosition(time); // Update to show current position
    renderer.render(scene, camera); // Force render to show changes
  });

  // Damping toggle
  const dampingToggle = document.getElementById("damping");
  const dampingStatus = document.getElementById("dampingStatus");

  dampingToggle.addEventListener("change", function () {
    useDamping = this.checked;
    dampingStatus.textContent = useDamping ? "Aktif" : "Nonaktif";
    if (isSimulating) time = 0; // Reset time when toggling during simulation
  });
}

// ===================================
// Calculate Physics Values
// ===================================
function updateCalculatedValues() {
  const period = 2 * Math.PI * Math.sqrt(ropeLength / g);
  const frequency = 1 / period;
  const angularFrequency = 2 * Math.PI * frequency;

  document.getElementById("periodValue").textContent = period.toFixed(2) + " s";
  document.getElementById("frequencyValue").textContent =
    frequency.toFixed(2) + " Hz";
  document.getElementById("angularFreqValue").textContent =
    angularFrequency.toFixed(2) + " rad/s";
}

// ===================================
// Control Buttons
// ===================================
function setupControlButtons() {
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");

  startBtn.addEventListener("click", function () {
    isSimulating = true;
    isPaused = false;
    time = 0;
    showNotification("Simulasi dimulai");
  });

  pauseBtn.addEventListener("click", function () {
    if (isSimulating) {
      isPaused = !isPaused;
      showNotification(isPaused ? "Simulasi dijeda" : "Simulasi dilanjutkan");
    }
  });

  resetBtn.addEventListener("click", function () {
    isSimulating = false;
    isPaused = false;
    time = 0;
    sphere.position.y = 3 - ropeLength;
    ropeVertices[1] = new THREE.Vector3(0, 3 - ropeLength, 0);
    ropeLineGeometry.setFromPoints(ropeVertices);
    showNotification("Simulasi direset");
  });
}

// ===================================
// Notification Helper
// ===================================
function showNotification(message) {
  const notification = document.createElement("div");
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
        font-family: 'Segoe UI', sans-serif;
    `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-in";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}
