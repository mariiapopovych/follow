import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as YUKA from 'yuka';

// Import the GLB model to ensure Parcel processes it
import strikerModel from './model3d/Striker.glb';

// Scene Setup
const scene = new THREE.Scene();

// Camera Setup
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 20, 20); // Adjusted Z position for better initial view
camera.lookAt(scene.position);

// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xA3A3A3);
document.body.appendChild(renderer.domElement);

// Handle Window Resize
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Load GLTF Model
const loader = new GLTFLoader();
loader.load(
    strikerModel, // Use the imported model path
    (gltf) => {
        scene.add(gltf.scene);
    },
    undefined,
    (error) => {
        console.error('An error occurred while loading the GLTF model:', error);
    }
);

// Add Directional Light
const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
directionalLight.position.set(10, 10, 10); // Positioning light for better illumination
scene.add(directionalLight);

// Create Vehicle Mesh
const vehicleGeometry = new THREE.ConeGeometry(0.1, 0.5, 8); // Updated to ConeGeometry
vehicleGeometry.rotateX(Math.PI * 0.5);

const vehicleMaterial = new THREE.MeshNormalMaterial();
const vehicleMesh = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
vehicleMesh.matrixAutoUpdate = false;
scene.add(vehicleMesh);

// YUKA Vehicle Setup
const vehicle = new YUKA.Vehicle();
vehicle.setRenderComponent(vehicleMesh, sync);

// Sync Function for YUKA
function sync(entity, renderComponent) {
    renderComponent.matrix.copy(entity.worldMatrix);
}

// Define Path for YUKA
const path = new YUKA.Path();
path.add(new YUKA.Vector3(-4, 0, 4));
path.add(new YUKA.Vector3(-6, 0, 0));
path.add(new YUKA.Vector3(-4, 0, -4));
path.add(new YUKA.Vector3(0, 0, 0));
path.add(new YUKA.Vector3(4, 0, -4));
path.add(new YUKA.Vector3(6, 0, 0));
path.add(new YUKA.Vector3(4, 0, 4));
path.add(new YUKA.Vector3(0, 0, 6));
path.loop = true;

vehicle.position.copy(path.current());

// Add Behaviors to Vehicle
const followPathBehavior = new YUKA.FollowPathBehavior(path, 0.5);
vehicle.steering.add(followPathBehavior);

const onPathBehavior = new YUKA.OnPathBehavior(path);
vehicle.steering.add(onPathBehavior);

// Entity Manager
const entityManager = new YUKA.EntityManager();
entityManager.add(vehicle);

// Visualize Path with Lines
const positions = path._waypoints.flatMap(waypoint => [waypoint.x, waypoint.y, waypoint.z]);

const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
const lines = new THREE.LineLoop(lineGeometry, lineMaterial);
scene.add(lines);

// YUKA Time
const time = new YUKA.Time();

// Animation Loop
function animate() {
    const delta = time.update().getDelta();
    entityManager.update(delta);
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
