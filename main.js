
// adapted from https://github.com/uuuulala/Threejs-rolling-dice-tutorial/


import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';


const canvasWidth = 500;
const canvasHeight = 300;


const canvasEl = document.querySelector('#canvas');
const scoreResult = document.querySelector('#score-result');
const rollBtn = document.querySelector('#roll-btn');


canvasEl.width = canvasWidth;
canvasEl.height = canvasHeight;

canvasEl.addEventListener('mousedown', onMouseDown, false);
canvasEl.addEventListener('mousemove', onMouseMove, false);
canvasEl.addEventListener('mouseup', onMouseUp, false);
canvasEl.addEventListener('touchstart', onTouchStart, false);
canvasEl.addEventListener('touchmove', onTouchMove, false);
canvasEl.addEventListener('touchend', onTouchEnd, false);



let renderer, scene, camera, physicsWorld, rayLine;

let diceIdArray = [];
const activeConstraints = [];


const params = {
    numberOfDice: 2,
    diceScale: 1.8,
    segments: 40,
    edgeRadius: .07,
    notchRadius: .12,
    notchDepth: .1,
};

const colorPal = [
    "#D77",
    "#7799DD", 
    "#77BA81",
    "#D1D177",
    "#AA77DD",
    "#999"
];

const floorWidth = 15;
const floorHeight = 9;
const floorDistance = -7;
const wallHeight = 1000;
const wallThickness = 0.00001;

// const diceScale = 1;
const diceArray = [];

// camera
const fov = 9;


let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let draggedDice = null;
let dragOffset = new THREE.Vector3();


const overlay = d3.select(".content").append("canvas").attr("id", "overlay")

overlay
    // .style("background-color", "plum")
    .style("border", "2px solid #999")
    .style("border-radius", "5px")
    .style("position", "absolute")
    .style("left", (canvasWidth * 0.05) + "px")
    .style("top", (canvasHeight * 0.05) + "px")
    .attr("width", canvasWidth * 0.9)
    .attr("height", canvasHeight * 0.9)
    .style("z-index", -1)


initPhysics();
initScene();

window.addEventListener('resize', updateSceneSize);
window.addEventListener('dblclick', throwDice);
rollBtn.addEventListener('click', throwDice);

function initScene() {

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: canvasEl
    });
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(40, 15, 0.6, 200);
    camera.position.set(0, 7, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    updateSceneSize();

    const ambientLight = new THREE.AmbientLight(0xffffff, .5);
    scene.add(ambientLight);
    const topLight = new THREE.PointLight(0xffffff, .5);
    topLight.position.set(10, 15, 0);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 2048;
    topLight.shadow.mapSize.height = 2048;
    topLight.shadow.camera.near = 5;
    topLight.shadow.camera.far = 400;
    scene.add(topLight);

    createFloor();

    createWalls();



    const diceMesh = createDiceMesh();

    for (let i = 0; i < params.numberOfDice; i++) {

        const color = colorPal[i % colorPal.length];
        let die = createDice(diceMesh, color);
        diceArray.push(die);
        let children = die.mesh.children;
        let childrenIds = [];
        children.forEach((c) => childrenIds.push(c.uuid));
        diceIdArray.push(childrenIds);
        addDiceEvents(die);
    }

    console.log(diceArray[1].mesh.children[0].material.color)

    // diceArray[0].mesh.children[0].material.color.copy({r: 1, g: 0, b: 0})
    // diceArray[1].mesh.children[0].material.color.copy({r: 0, g: 0, b: 1})
    throwDice();

    render();
}

function initPhysics() {
    physicsWorld = new CANNON.World({
        allowSleep: true,
        gravity: new CANNON.Vec3(0, -55, 0),
    })
    physicsWorld.defaultContactMaterial.restitution = .3;
}


function createFloor() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.ShadowMaterial({
            opacity: 0.05,
        })
    );
    floor.receiveShadow = true;
    floor.position.y = floorDistance;
    floor.rotation.x = -Math.PI / 2; // Replace the quaternion.setFromAxisAngle() line with this
    scene.add(floor);

    const floorBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
    });
    floorBody.position.copy(floor.position);
    floorBody.quaternion.setFromEuler(floor.rotation.x, floor.rotation.y, floor.rotation.z, "XYZ"); // Update this line
    physicsWorld.addBody(floorBody);
}


function createWall(width, height, depth, position, rotation) {

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
        color: 0xCCCCCC,
        roughness: 0,
        opacity: 0, // Set opacity to 0
        transparent: true
    });
    const wall = new THREE.Mesh(geometry, material);

    wall.position.copy(position);
    wall.rotation.copy(rotation);
    scene.add(wall);

    // Create a corresponding static Cannon.js body for physics
    const wallShape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const wallBody = new CANNON.Body({ mass: 0 });
    wallBody.addShape(wallShape);
    wallBody.position.copy(wall.position);
    wallBody.quaternion.copy(wall.quaternion);
    physicsWorld.addBody(wallBody);

    return wall;
}

function createWalls() {
    const w = wallThickness;
    const h = wallHeight;
    const d = floorHeight;

    const wallPositions = [
        { w: w, h: h, d: d, position: new THREE.Vector3(-floorWidth / 2 - wallThickness / 2, floorDistance + wallHeight / 2, 0), rotation: new THREE.Euler(0, 0, 0) }, // Left wall
        { w: w, h: h, d: d, position: new THREE.Vector3(floorWidth / 2 + wallThickness / 2, floorDistance + wallHeight / 2, 0), rotation: new THREE.Euler(0, 0, 0) }, // Right wall
        { w: floorWidth, h: wallHeight, d: wallThickness, position: new THREE.Vector3(0, floorDistance + wallHeight / 2, -floorHeight / 2 - wallThickness / 2), rotation: new THREE.Euler(0, 0, 0) }, // Bottom wall
        { w: floorWidth, h: wallHeight, d: wallThickness, position: new THREE.Vector3(0, floorDistance + wallHeight / 2, floorHeight / 2 + wallThickness / 2), rotation: new THREE.Euler(0, 0, 0) }, // Top wall
    ];

    wallPositions.forEach(wall => {
        createWall(wall.w, wall.h, wall.d, wall.position, wall.rotation);
    });
}


function createDiceMesh() {
    const boxMaterialOuter = new THREE.MeshStandardMaterial({
        color: 0x0ffffff,
        roughness: 0,
        // metalness: 0.5
    })
    const boxMaterialInner = new THREE.MeshStandardMaterial({
        color: 0xD77777,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide
    })

    const diceMesh = new THREE.Group();
    const innerMesh = new THREE.Mesh(createInnerGeometry(), boxMaterialInner);
    const outerMesh = new THREE.Mesh(createBoxGeometry(), boxMaterialOuter);
    outerMesh.castShadow = true;
    diceMesh.add(innerMesh, outerMesh);

    // return {diceMesh, innerMesh, outerMesh};
    return diceMesh;
}

function createDice(diceMesh, innerColor) {
    const mesh = diceMesh.clone();
    // const inner = innerMesh.clone();
    // const outer = outerMesh.clone();

    mesh.children[0].material = new THREE.MeshStandardMaterial({
        color: innerColor,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
    });

    mesh.scale.set(params.diceScale, params.diceScale, params.diceScale); // Scale the mesh
    scene.add(mesh);

    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(0.5 * params.diceScale, 0.5 * params.diceScale, 0.5 * params.diceScale)), // Scale the physics shape
        sleepTimeLimit: 0.1,
    });
    physicsWorld.addBody(body);

    return { mesh, body };

}

function createBoxGeometry() {

    let boxGeometry = new THREE.BoxGeometry(1, 1, 1, params.segments, params.segments, params.segments);

    const positionAttr = boxGeometry.attributes.position;
    const subCubeHalfSize = .5 - params.edgeRadius;


    for (let i = 0; i < positionAttr.count; i++) {

        let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);

        const subCube = new THREE.Vector3(Math.sign(position.x), Math.sign(position.y), Math.sign(position.z)).multiplyScalar(subCubeHalfSize);
        const addition = new THREE.Vector3().subVectors(position, subCube);

        if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.normalize().multiplyScalar(params.edgeRadius);
            position = subCube.add(addition);
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize) {
            addition.z = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.y = subCube.y + addition.y;
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.y = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.z = subCube.z + addition.z;
        } else if (Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.x = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.y = subCube.y + addition.y;
            position.z = subCube.z + addition.z;
        }

        const notchWave = (v) => {
            v = (1 / params.notchRadius) * v;
            v = Math.PI * Math.max(-1, Math.min(1, v));
            return params.notchDepth * (Math.cos(v) + 1.);
        }
        const notch = (pos) => notchWave(pos[0]) * notchWave(pos[1]);

        const offset = .23;

        if (position.y === .5) {
            position.y -= notch([position.x, position.z]);
        } else if (position.x === .5) {
            position.x -= notch([position.y + offset, position.z + offset]);
            position.x -= notch([position.y - offset, position.z - offset]);
        } else if (position.z === .5) {
            position.z -= notch([position.x - offset, position.y + offset]);
            position.z -= notch([position.x, position.y]);
            position.z -= notch([position.x + offset, position.y - offset]);
        } else if (position.z === -.5) {
            position.z += notch([position.x + offset, position.y + offset]);
            position.z += notch([position.x + offset, position.y - offset]);
            position.z += notch([position.x - offset, position.y + offset]);
            position.z += notch([position.x - offset, position.y - offset]);
        } else if (position.x === -.5) {
            position.x += notch([position.y + offset, position.z + offset]);
            position.x += notch([position.y + offset, position.z - offset]);
            position.x += notch([position.y, position.z]);
            position.x += notch([position.y - offset, position.z + offset]);
            position.x += notch([position.y - offset, position.z - offset]);
        } else if (position.y === -.5) {
            position.y += notch([position.x + offset, position.z + offset]);
            position.y += notch([position.x + offset, position.z]);
            position.y += notch([position.x + offset, position.z - offset]);
            position.y += notch([position.x - offset, position.z + offset]);
            position.y += notch([position.x - offset, position.z]);
            position.y += notch([position.x - offset, position.z - offset]);
        }

        positionAttr.setXYZ(i, position.x, position.y, position.z);
    }


    boxGeometry.deleteAttribute('normal');
    boxGeometry.deleteAttribute('uv');
    boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);

    boxGeometry.computeVertexNormals();

    return boxGeometry;
}

function createInnerGeometry() {
    const baseGeometry = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius);
    const offset = .48;
    return BufferGeometryUtils.mergeBufferGeometries([
        baseGeometry.clone().translate(0, 0, offset),
        baseGeometry.clone().translate(0, 0, -offset),
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, -offset, 0),
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, offset, 0),
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(-offset, 0, 0),
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(offset, 0, 0),
    ], false);
}

function addDiceEvents(dice) {
    dice.body.addEventListener('sleep', (e) => {

        dice.body.allowSleep = false;

        const euler = new CANNON.Vec3();
        e.target.quaternion.toEuler(euler);

        const eps = .1;
        let isZero = (angle) => Math.abs(angle) < eps;
        let isHalfPi = (angle) => Math.abs(angle - .5 * Math.PI) < eps;
        let isMinusHalfPi = (angle) => Math.abs(.5 * Math.PI + angle) < eps;
        let isPiOrMinusPi = (angle) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);


        if (isZero(euler.z)) {
            if (isZero(euler.x)) {
                showRollResults(1);
            } else if (isHalfPi(euler.x)) {
                showRollResults(4);
            } else if (isMinusHalfPi(euler.x)) {
                showRollResults(3);
            } else if (isPiOrMinusPi(euler.x)) {
                showRollResults(6);
            } else {
                // landed on edge => wait to fall on side and fire the event again
                dice.body.allowSleep = true;
            }
        } else if (isHalfPi(euler.z)) {
            showRollResults(2);
        } else if (isMinusHalfPi(euler.z)) {
            showRollResults(5);
        } else {
            // landed on edge => wait to fall on side and fire the event again
            dice.body.allowSleep = true;
        }
    });
}

function showRollResults(score) {
    if (scoreResult.innerHTML === '') {
        scoreResult.innerHTML += score;
    } else {
        scoreResult.innerHTML += ('+' + score);
    }
}

function render() {
    // Attract neighboring dice towards the dragged dice
    attractNeighbors();

    physicsWorld.fixedStep();

    for (const dice of diceArray) {
        dice.mesh.position.copy(dice.body.position)
        dice.mesh.quaternion.copy(dice.body.quaternion)
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function updateSceneSize() {
    camera.aspect = canvasWidth / canvasHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasWidth, canvasHeight);
}

function throwDice() {
    scoreResult.innerHTML = '';

    diceArray.forEach((d, dIdx) => {

        d.body.velocity.setZero();
        d.body.angularVelocity.setZero();

        d.body.position = new CANNON.Vec3(6, -4 + dIdx * 0.1, 0);
        d.mesh.position.copy(d.body.position);

        d.mesh.rotation.set(2 * Math.PI * Math.random(), 0, 2 * Math.PI * Math.random())
        d.body.quaternion.copy(d.mesh.quaternion);

        const force = 3 + 5 * Math.random();
        d.body.applyImpulse(
            new CANNON.Vec3(-force * 4, force * 0.5, 0),
            new CANNON.Vec3(0, 0, .2)
        );

        d.body.allowSleep = true;
    });
}

function attractNeighbors() {
    if (draggedDice === null) {
        return;
    }

    const constraintDistance = params.diceScale * 2;
    const attractionForce = -20; // Adjust this value to control the attraction force
    const maxDistance = 100; // Adjust this value to control the pick-up distance

    diceArray.forEach((otherDice, index) => {
        if (otherDice !== draggedDice) {
            const distance = draggedDice.mesh.position.distanceTo(otherDice.mesh.position);
            if (distance <= maxDistance) {
                const forceDirection = draggedDice.mesh.position.clone().sub(otherDice.mesh.position).normalize();
                const force = new CANNON.Vec3(forceDirection.x * attractionForce, forceDirection.y * attractionForce, forceDirection.z * attractionForce);
                otherDice.body.applyForce(force, otherDice.body.position);

                // Create constraints between the dice when they are close enough
                if (distance <= constraintDistance) {
                    const existingConstraint = activeConstraints.find(constraint => (constraint.bodyA === draggedDice.body && constraint.bodyB === otherDice.body) || (constraint.bodyA === otherDice.body && constraint.bodyB === draggedDice.body));

                    if (!existingConstraint) {
                        const constraint = new CANNON.LockConstraint(draggedDice.body, otherDice.body, { collideConnected: false });
                        physicsWorld.addConstraint(constraint);
                        activeConstraints.push(constraint);
                    }
                }
            }
        }
    });
}


function onMouseDown(event) {
    event.preventDefault();

    const canvasRect = canvasEl.getBoundingClientRect();
    mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(diceArray.map(dice => dice.mesh));
    const intersect = intersects[0];
    // console.log(intersects)

    let clickedDiceIndex;
    for (let i = 0; i < intersects.length; i++) {
        // let obj = intersects[i].object;
        let id = intersects[i].object.uuid;

        for (let j = 0; j < diceIdArray.length; j++) {
            let childIds = diceIdArray[j];

            for (let k = 0; k < childIds.length; k++) {
                if (id === childIds[k]) {
                    draggedDice = diceArray[j];
                    clickedDiceIndex = j;
                    console.log(j);
                    break;
                }
            }
        }
    }

    // make clicked dice move
    // const force0 = 3 + 5 * Math.random();
    // diceArray[clickedDiceIndex].body.applyImpulse(
    //     new CANNON.Vec3(-force0 * 4, force0 * 0.5, 0),
    //     new CANNON.Vec3(0, 0, .2)
    // );
    draggedDice.body.allowSleep = false;
    console.log(draggedDice);
    // dragOffset.copy(intersect.point).sub(draggedDice.mesh.position);
    // scene.add(draggedDice.mesh);
    // }
}

var prevPos = new THREE.Vector3();
var target;
var dragDirection;
const prevPositions = [];
const bufferSize = 5;

function onMouseMove(event) {
    event.preventDefault();

    if (draggedDice !== null) {

        const canvasRect = canvasEl.getBoundingClientRect();
        mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
        mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

        target = new THREE.Vector3();
        target.x = mouse.x;
        target.y = mouse.y;
        target.z = 0.90;
        target.unproject(camera);

        draggedDice.mesh.position.copy(target);
        draggedDice.body.position.set(target.x, target.y, target.z);
        draggedDice.body.velocity.set(0, 0, 0);
        draggedDice.body.angularVelocity.set(0, 0, 0);
        // draggedDice.body.wakeUp();

        // Calculate dragDirection by averaging the previous positions
        if (prevPositions.length >= bufferSize) {
            prevPositions.shift();
        }
        prevPositions.push(target.clone());

        dragDirection = new THREE.Vector3();
        for (let i = 0; i < prevPositions.length - 1; i++) {
            const diff = prevPositions[i + 1].clone().sub(prevPositions[i]);
            dragDirection.add(diff);
        }
        dragDirection.divideScalar(prevPositions.length - 1).normalize();
    }
}


function onMouseUp(event) {
    event.preventDefault();
    console.log('rollin');

    if (draggedDice !== null) {
        // Remove the constraints
        activeConstraints.forEach(constraint => {
            physicsWorld.removeConstraint(constraint);
        });
        activeConstraints.length = 0;
        const forceMagnitude = 30;
        const force = new CANNON.Vec3(dragDirection.x * forceMagnitude, 10, dragDirection.z * forceMagnitude);

        diceArray.forEach((d) => {
            d.body.applyImpulse(force, new CANNON.Vec3(0, 0, 0));
            d.body.angularVelocity.set(Math.random() * 20, Math.random() * 20, Math.random() * 20);

        });

        draggedDice.body.allowSleep = true;
        draggedDice = null;

    }
}



function onTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const simulatedMouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => { },
    };
    onMouseDown(simulatedMouseEvent);
}

function onTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const simulatedMouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => { },
    };
    onMouseMove(simulatedMouseEvent);
}

function onTouchEnd(event) {
    event.preventDefault();
    onMouseUp(event);
}
