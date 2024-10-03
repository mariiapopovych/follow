import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as YUKA from 'yuka';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

import modelUrl from './model3d/man.gltf';

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
renderer.setClearColor(0xA3A3A3);

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 10, 4);
camera.lookAt(scene.position);

const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
scene.add(directionalLight);

const vehicle = new YUKA.Vehicle();
vehicle.scale.set(0.15, 0.15, 0.15);

function sync(entity, renderComponent) {
    renderComponent.matrix.copy(entity.worldMatrix);
}

const entityManager = new YUKA.EntityManager();
entityManager.add(vehicle);

const loader = new GLTFLoader();
const group = new THREE.Group();
let mixer;  // Used for managing animations

// Load the GLTF model
loader.load(modelUrl, function (gltf) {
    const model = gltf.scene;
    model.matrixAutoUpdate = false;
    group.add(model);
    scene.add(group);
    vehicle.setRenderComponent(model, sync);

    // Handle animations
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
            mixer.clipAction(clip).play();
        });
    }
});

const target = new YUKA.GameEntity();
entityManager.add(target);

const arriveBehavior = new YUKA.ArriveBehavior(target.position, 3, 0.5);
vehicle.steering.add(arriveBehavior);
vehicle.position.set(-3, 0, -3);
vehicle.maxSpeed = 1.5;

const mousePosition = new THREE.Vector2();

window.addEventListener('mousemove', function (e) {
    mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

const planeGeo = new THREE.PlaneGeometry(25, 25);
const planeMat = new THREE.MeshBasicMaterial({ visible: false });
const planeMesh = new THREE.Mesh(planeGeo, planeMat);
planeMesh.rotation.x = -0.5 * Math.PI;
scene.add(planeMesh);
planeMesh.name = 'plane';

const raycaster = new THREE.Raycaster();

window.addEventListener('click', function () {
    raycaster.setFromCamera(mousePosition, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].object.name === 'plane') {
            target.position.set(intersects[i].point.x, 0, intersects[i].point.z);
        }
    }
});

const time = new YUKA.Time();

function animate(t) {
    const delta = time.update().getDelta();
    entityManager.update(delta);

    // Update animations if mixer is defined
    if (mixer) {
        mixer.update(delta);
    }

    group.position.y = 0.05 * Math.sin(t / 500);
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
