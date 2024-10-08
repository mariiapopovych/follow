import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as YUKA from 'yuka';


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;  
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
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

const ambientLight = new THREE.AmbientLight(0x333333, 0.3); 
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
directionalLight.position.set(10, 10, 10);
directionalLight.castShadow = true; 
scene.add(directionalLight);

const spotLight = new THREE.SpotLight(0x999999);
scene.add(spotLight);
spotLight.position.set(0, 8, 4);
spotLight.intensity = 2;  
spotLight.angle = 0.45;
spotLight.penumbra = 0.3;
spotLight.castShadow = true;

spotLight.shadow.mapSize.width = 2048; 
spotLight.shadow.mapSize.height = 2048;
spotLight.shadow.camera.near = 1;  
spotLight.shadow.camera.far = 20;  
spotLight.shadow.focus = 1;



const entityManager = new YUKA.EntityManager();
const loader = new GLTFLoader();

import modelUrl from './model3d/man.gltf';

class Model3D {
    constructor(scene, loader, entityManager) {
        this.scene = scene;
        this.loader = loader;
        this.entityManager = entityManager;
        this.models = [];
        this.mixers = [];
    }

    createInstance(position = new THREE.Vector3(0, 0, 0), scale = new THREE.Vector3(0.05, 0.05, 0.05)) {
        const vehicle = new YUKA.Vehicle();
        vehicle.scale.copy(scale);

        this.entityManager.add(vehicle);

        const group = new THREE.Group();
        this.scene.add(group);

        this.loader.load(modelUrl, (gltf) => {
            const model = gltf.scene;
            model.matrixAutoUpdate = false;
            group.add(model);
            vehicle.setRenderComponent(model, (entity, renderComponent) => {
                renderComponent.matrix.copy(entity.worldMatrix);
            });

            model.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;   
                    node.receiveShadow = true; 
                }
            });

            // animations
            let mixer = null;
            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                const action = mixer.clipAction(gltf.animations[0]);
                action.play();
                this.mixers.push({ mixer, action });
            }

            group.position.copy(position);
            vehicle.position.copy(position);

            this.models.push({ group, vehicle });
        });
    }

    addArriveBehavior(target) {
        const radius = 0.2;
        const deceleration = 2;

        this.models.forEach(({ vehicle }) => {
            vehicle.steering.clear();

            const arriveBehavior = new YUKA.ArriveBehavior(target.position, radius, deceleration);
            vehicle.steering.add(arriveBehavior);
            vehicle.maxSpeed = 0.4;
            vehicle.arriveTolerance = 0.5;
        });
    }

    update(delta) {
        this.entityManager.update(delta);

        for (let { mixer, action } of this.mixers) {
            if (mixer && action && !action.paused) {
                mixer.update(delta);
            }
        }
    }

    getModelsCount() {
        return this.models.length;
    }
}

//multiple Model3D 
const modelManager = new Model3D(scene, loader, entityManager);
const modelManagerOne = new Model3D(scene, loader, entityManager);
const modelManagerTwo = new Model3D(scene, loader, entityManager);
const modelManagerThree = new Model3D(scene, loader, entityManager);

// instances to each model manager
modelManager.createInstance(new THREE.Vector3(0, 0, 0));
modelManagerOne.createInstance(new THREE.Vector3(1, 0, 1));
modelManagerTwo.createInstance(new THREE.Vector3(-1, 0, 1));
modelManagerThree.createInstance(new THREE.Vector3(2, 0, -2));


function createTextSprite(message) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '30px Arial';
    context.fillStyle = 'white';
    context.fillText(message, 0, 30);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(10, 5, 1); 

    return sprite;
}


const textSprite = createTextSprite("Running idiots");
textSprite.position.set(0, -1, 0); 
scene.add(textSprite);

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


const planeGeo = new THREE.PlaneGeometry(25, 25);
const planeMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC }); 
const planeMesh = new THREE.Mesh(planeGeo, planeMat);
planeMesh.rotation.x = -0.5 * Math.PI;
planeMesh.receiveShadow = true;  
scene.add(planeMesh);
planeMesh.name = 'plane';

const raycaster = new THREE.Raycaster();
const mousePosition = new THREE.Vector2();
const target = new YUKA.GameEntity();
entityManager.add(target);

window.addEventListener('mousemove', function (e) {
    mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('click', function () {
    raycaster.setFromCamera(mousePosition, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].object.name === 'plane') {
            target.position.set(intersects[i].point.x, 0, intersects[i].point.z);

            modelManager.addArriveBehavior(target);
            modelManagerOne.addArriveBehavior(target);
            modelManagerTwo.addArriveBehavior(target);
            modelManagerThree.addArriveBehavior(target);
        }
    }
});

modelManager.addArriveBehavior(target);
modelManagerOne.addArriveBehavior(target);
modelManagerTwo.addArriveBehavior(target);
modelManagerThree.addArriveBehavior(target);

const time = new YUKA.Time();

function animate(t) {
    const delta = time.update().getDelta();

    modelManager.update(delta);
    modelManagerOne.update(delta);
    modelManagerTwo.update(delta);
    modelManagerThree.update(delta);

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
