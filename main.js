import * as YUKA from 'https://cdn.jsdelivr.net/npm/yuka/build/yuka.module.js';



const scene = new THREE.Scene();


const camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0xA3A3A3);


camera.position.set(0, 20, 0);
camera.lookAt(scene.position);



//const boxGeometry = new THREE.BoxGeometry();
//const boxMaterial = new THREE.MeshBasicMaterial({color: 0x00FF00});
//const box = new THREE.Mesh(boxGeometry, boxMaterial);
//scene.add(box);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
scene.add(directionalLight);

const vehicleGeometry = new THREE.ConeBufferGeometry(0.1, 0.5, 8);
vehicleGeometry.rotateX(Math.PI * 0.5);

const vehicleMaterial = new THREE.MeshNormalMaterial();
const vehicleMesh = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
vehicleMesh.matrixAutoUpdate = false;
scene.add(vehicleMesh);

const vehicle = new YUKA.Vehicle();
vehicle.setRenderComponent(vehicleMesh, sync);

function sync(entity, renderComponent){
    renderComponent.matrix.copy(entity.worldMatrix);
}

const path = new YUKA.Path();
path.add(new YUKA.Vector3(-4, 0,4))
path.add(new YUKA.Vector3(-6, 0,0))
path.add(new YUKA.Vector3(-4, 0,-4))
path.add(new YUKA.Vector3(0, 0,0))
path.add(new YUKA.Vector3(4, 0,-4))
path.add(new YUKA.Vector3(6, 0,0))
path.add(new YUKA.Vector3(4, 0,4))
path.add(new YUKA.Vector3(0, 0,6))
path.loop = true;

vehicle.position.copy(path.current());

const followPathBehavior = new YUKA.FollowPathBehavior(path, 0.5);
vehicle.steering.add(followPathBehavior);

const onPathBehavior = new YUKA.OnPathBehavior(path);
vehicle.steering.add(onPathBehavior);

//vehicle.maxSpeed = 6;

const entityManager = new YUKA.EntityManager();
entityManager.add(vehicle);

const position = [];
for(let i = 0; i < path._waypoints.length; i++){
    const waypoint = path._waypoints[i];
    position.push(waypoint.x, waypoint.y, waypoint.z);
}

const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));

const lineMaterial = new THREE.LineBasicMaterial({color: 0xFFFFFF});
const lines = new THREE.LineLoop(lineGeometry, lineMaterial);
scene.add(lines);

const time = new YUKA.Time();

function animate(){
    const delta = time.update().getDelta();
    entityManager.update(delta);
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
window.addEventListener('resize', function(){
    camera.aspect = window.innerWidth / this.window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
})



renderer.render(scene, camera)




