import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as YUKA from 'yuka';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();


const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 10, 4);
camera.lookAt(scene.position);

const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
directionalLight.position.set(10, 10, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

const spotLight = new THREE.SpotLight(0xFFFFFF);
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

import modelUrl from './model3d/maxime.glb';

class Model3D {
    constructor(scene, loader, entityManager) {
        this.scene = scene;
        this.loader = loader;
        this.entityManager = entityManager;
        this.models = [];
        this.mixers = [];
    }

    createInstance(position = new THREE.Vector3(0, 0, 0), scale = new THREE.Vector3(1.2, 1.2, 1.2)) {
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

// Model3D instances
const modelManager = new Model3D(scene, loader, entityManager);
const modelManagerOne = new Model3D(scene, loader, entityManager);
const modelManagerTwo = new Model3D(scene, loader, entityManager);
const modelManagerThree = new Model3D(scene, loader, entityManager);

modelManager.createInstance(new THREE.Vector3(0, 0, 0));
modelManagerOne.createInstance(new THREE.Vector3(1, 0, 1));
modelManagerTwo.createInstance(new THREE.Vector3(-1, 0, 1));
modelManagerThree.createInstance(new THREE.Vector3(2, 0, -2));

//text on the floor
function createTextOnFloor(message, size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    //text rendering
    context.font = `${size / 4}px 'code'`;
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.fillText(message, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true
    });

    const textPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        textMaterial
    );
    
    textPlane.rotation.x = -Math.PI / 2; // Face upward 
    textPlane.position.set(0, 0.01, 0); 
    textPlane.receiveShadow = true;

    return textPlane;
}

const textOnFloor = createTextOnFloor('Hello');
scene.add(textOnFloor);


window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const planeGeo = new THREE.PlaneGeometry(25, 25);
const planeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF   });
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


document.addEventListener("DOMContentLoaded", function() {
    const emailLink = document.getElementById("emailLink");
    const linkedinLink = document.getElementById("linkedinLink");
    const phoneLink = document.getElementById("phoneLink");
    const instaLink = document.getElementById("instaLink");
    const gitLink = document.getElementById("gitLink");
    
    const email = "mariia.popovych@powercoders.org";
    const phone = "41796037689";
    const linkedin = "https://www.linkedin.com/in/mariia-popovych-8a127a243/";
    const insta = "https://www.instagram.com/marypops32/";
    const git = "https://github.com/mariiapopovych";
    
    const mailText = "Mail";
    const phoneText = "Phone";
    const linkedinText = "LinkedIn";
    const instaText = "Instagram";
    const gitText = "GitHub";
    const randomChars = 'ag56789!@_#$%^&*()';

    function getRandomCharacter() {
        return randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    function animateText(linkElement, targetText, callback) {
        const textLength = targetText.length;
        let charIndex = 0;
        const intervalTime = 50;

        const animationInterval = setInterval(function() {
            if (charIndex < textLength) {
                const displayString = targetText.substring(0, charIndex) + getRandomCharacter().repeat(textLength - charIndex);
                linkElement.textContent = displayString;
                charIndex++;
            } else {
                clearInterval(animationInterval);
                linkElement.textContent = targetText;
                if (typeof callback === 'function') callback();
            }
        }, intervalTime);
    }

    // Email
    if (emailLink) {
        emailLink.addEventListener("click", function(event) {
            event.preventDefault();
            animateText(emailLink, email, function() {
                window.location.href = `mailto:${email}`;
            });
        });

        emailLink.addEventListener("mouseleave", function() {
            animateText(emailLink, mailText);
        });
    }

    // LinkedIn
    if (linkedinLink) {
        linkedinLink.addEventListener("click", function(event) {
            event.preventDefault();
            animateText(linkedinLink, linkedin, function() {
                window.open(linkedin, "_blank");
            });
        });

        linkedinLink.addEventListener("mouseleave", function() {
            animateText(linkedinLink, linkedinText);
        });
    }

    // Instagram
    if (instaLink) {
        instaLink.addEventListener("click", function(event) {
            event.preventDefault();
            animateText(instaLink, insta, function() {
                window.open(insta, "_blank");
            });
        });

        instaLink.addEventListener("mouseleave", function() {
            animateText(instaLink, instaText);
        });
    }

    // Phone
    if (phoneLink) {
        phoneLink.addEventListener("click", function(event) {
            event.preventDefault();
            animateText(phoneLink, phone, function() {
                window.location.href = `tel:${phone}`;
            });
        });

        phoneLink.addEventListener("mouseleave", function() {
            animateText(phoneLink, phoneText);
        });
    }

    // GitHub
    if (gitLink) {
        gitLink.addEventListener("click", function(event) {
            event.preventDefault();
            animateText(gitLink, git, function() {
                window.open(git, "_blank");
            });
        });

        gitLink.addEventListener("mouseleave", function() {
            animateText(gitLink, gitText);
        });
    }
});

