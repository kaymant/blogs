import * as THREE from './three/three.module.js';
import { OrbitControls } from './three/controls/OrbitControls.js';

export let charges = [];

const d = 1.5;
const defaultCharges = [
  { q: 1, pos: [ d,  d,  d] },
  { q: -1, pos: [ d,  d, -d] },
  { q: 1, pos: [ d, -d,  d] },
  { q: 1, pos: [ d, -d, -d] },
  { q: 1, pos: [-d,  d,  d] },
  { q: 1, pos: [-d,  d, -d] },
  { q: -1, pos: [-d, -d,  d] },
  { q: -1, pos: [-d, -d, -d] },
];

charges = [...defaultCharges];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 12);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function electricFieldAt(x, y, z) {
  let Ex = 0, Ey = 0, Ez = 0;
  for (let { q, pos } of charges) {
    const dx = x - pos[0];
    const dy = y - pos[1];
    const dz = z - pos[2];
    const r2 = dx * dx + dy * dy + dz * dz + 0.0001;
    const r3 = Math.pow(r2, 1.5);
    Ex += q * dx / r3;
    Ey += q * dy / r3;
    Ez += q * dz / r3;
  }
  return [Ex, Ey, Ez];
}

function fieldStrengthColorOld(mag) {
  const c = Math.min(1, mag / 1.5);
  return new THREE.Color(c, c, 0);
}

function fieldStrengthColor(mag) {
  const minField = 0.01;
  const maxField = 5.0;

  // Clamp and normalize magnitude
  const t = Math.min(1, Math.max(0, (mag - minField) / (maxField - minField)));

  // Gradient: blue (low) → green (mid) → red (high)
  let r, g, b;
  if (t < 0.5) {
    // blue to green
    r = 0;
    g = t * 2;
    b = 1 - t * 2;
  } else {
    // green to red
    r = (t - 0.5) * 2;
    g = 1 - (t - 0.5) * 2;
    b = 0;
  }

  return new THREE.Color(r, g, b);
}

function traceLine(seed, direction, stepSize = 0.2, steps = 150) {
  let [x, y, z] = seed;
  const controlPoints = [];

  for (let i = 0; i < steps; i++) {
    const [Ex, Ey, Ez] = electricFieldAt(x, y, z);
    const mag = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
    if (mag < 0.01) break;  // Stop if the field is too weak

    controlPoints.push(new THREE.Vector3(x, y, z));

    // Adjust the direction based on whether the charge is positive or negative
    const scale = direction * stepSize / mag;
    x += Ex * scale;
    y += Ey * scale;
    z += Ez * scale;
  }

  if (controlPoints.length < 2) return;  // Not enough points to form a line

  // Create a Catmull-Rom curve for smooth tracing
  const curve = new THREE.CatmullRomCurve3(controlPoints);
  const curvePoints = curve.getPoints(controlPoints.length * 5);

  const positions = [];
  const colors = [];

  // Add positions and colors based on electric field strength
  for (let i = 0; i < curvePoints.length; i++) {
    const point = curvePoints[i];
    const [Ex, Ey, Ez] = electricFieldAt(point.x, point.y, point.z);
    const mag = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
    const color = fieldStrengthColorOld(mag);
    positions.push(point.x, point.y, point.z);
    colors.push(color.r, color.g, color.b);
  }

  // Create a geometry with the points
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  // Create the line material with color gradients
  const material = new THREE.LineBasicMaterial({ vertexColors: true });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}



function traceLine2(seed, direction, stepSize = 0.2, steps = 150) {
  let [x, y, z] = seed;
  const controlPoints = [];

  for (let i = 0; i < steps; i++) {
    const [Ex, Ey, Ez] = electricFieldAt(x, y, z);
    const mag = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
    if (mag < 0.01) break;

    controlPoints.push(new THREE.Vector3(x, y, z));
    const scale = direction * stepSize / mag;
    x += Ex * scale;
    y += Ey * scale;
    z += Ez * scale;
  }

  if (controlPoints.length < 2) return;

  const curve = new THREE.CatmullRomCurve3(controlPoints);
  const curvePoints = curve.getPoints(controlPoints.length * 5);

  const positions = [];
  const colors = [];

  for (let i = 0; i < curvePoints.length; i++) {
    const point = curvePoints[i];
    const [Ex, Ey, Ez] = electricFieldAt(point.x, point.y, point.z);
    const mag = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
    const color = fieldStrengthColorOld(mag);
    positions.push(point.x, point.y, point.z);
    colors.push(color.r, color.g, color.b);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({ vertexColors: true });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}


function addSeedLines() {
  const numLines = 20; // number of seed points per charge
  const radius = 0.001;  // distance from charge center to place the seed

  charges.forEach(charge => {
    const [cx, cy, cz] = charge.pos;
    const q = charge.q;

    for (let i = 0; i < numLines; i++) {
      const theta = Math.acos(2 * Math.random() - 1); // uniform spherical distribution
      const phi = 2 * Math.PI * Math.random();

      const x = cx + radius * Math.sin(theta) * Math.cos(phi);
      const y = cy + radius * Math.sin(theta) * Math.sin(phi);
      const z = cz + radius * Math.cos(theta);

      const direction = q > 0 ? 1 : -1; // forward for +ve, backward for -ve
      traceLine([x, y, z], direction);
    }
  });
}


function drawCharges() {
  for (let { q, pos } of charges) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 16, 16),
      new THREE.MeshBasicMaterial({ color: q > 0 ? 0xff0000 : 0x0000ff })
    );
    sphere.position.set(...pos);
    scene.add(sphere);
  }
}

export function regenerateField() {
  while (scene.children.length > 0) scene.remove(scene.children[0]);
  drawCharges();
  addSeedLines();
}

regenerateField();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

