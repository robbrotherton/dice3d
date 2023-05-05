
// adapted from https://github.com/uuuulala/Threejs-rolling-dice-tutorial/


import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const canvasEl = document.querySelector('#canvas');
const scoreResult = document.querySelector('#score-result');
const rollBtn = document.querySelector('#roll-btn');

canvasEl.addEventListener('mousedown', onMouseDown, false);
canvasEl.addEventListener('mousemove', onMouseMove, false);
canvasEl.addEventListener('mouseup', onMouseUp, false);



let renderer, scene, camera, diceMesh, innerMesh, outerMesh, physicsWorld, rayLine;

const params = {
    numberOfDice: 2,
    segments: 40,
    edgeRadius: .07,
    notchRadius: .12,
    notchDepth: .1,
};



const floorWidth = 13;
const floorHeight = 9;
const floorDistance = -7;
const wallHeight = 10;
const wallThickness = 0.00001;

const diceScale = 1;
const diceArray = [];

// camera
const fov = 9;


let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let draggedDice = null;
let dragOffset = new THREE.Vector3();



initPhysics();
initScene();

window.addEventListener('resize', updateSceneSize);
window.addEventListener('dblclic/k', throwDice);
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



    diceMesh = createDiceMesh();
    console.log(diceMesh)
    for (let i = 0; i < params.numberOfDice; i++) {
        let die = createDice();
        diceArray.push(die);
        scene.add(diceArray[i].mesh);
        addDiceEvents(die);
    }

    rayLine = new THREE.Line();
    scene.add(rayLine);

    throwDice();

    render();
}

function initPhysics() {
    physicsWorld = new CANNON.World({
        allowSleep: true,
        gravity: new CANNON.Vec3(0, -50, 0),
    })
    physicsWorld.defaultContactMaterial.restitution = .3;
}


function createFloor() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(floorWidth, floorHeight),
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

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.5,
        metalness: 0.1,
        opacity: 1, // Set opacity to 0
        transparent: true // Enable transparency
    });

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
        // color: 0xCCCCCC,
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
    // Left wall
    createWall(
        wallThickness,
        wallHeight,
        floorHeight,
        new THREE.Vector3(-floorWidth / 2 - wallThickness / 2, floorDistance + wallHeight / 2, 0),
        new THREE.Euler(0, 0, 0)
    );

    // Right wall
    createWall(
        wallThickness,
        wallHeight,
        floorHeight,
        new THREE.Vector3(floorWidth / 2 + wallThickness / 2, floorDistance + wallHeight / 2, 0),
        new THREE.Euler(0, 0, 0)
    );

    // Bottom wall
    createWall(
        floorWidth,
        wallHeight,
        wallThickness,
        new THREE.Vector3(0, floorDistance + wallHeight / 2, -floorHeight / 2 - wallThickness / 2),
        new THREE.Euler(0, 0, 0)
    );

    // Top wall
    createWall(
        floorWidth,
        wallHeight,
        wallThickness,
        new THREE.Vector3(0, floorDistance + wallHeight / 2, floorHeight / 2 + wallThickness / 2),
        new THREE.Euler(0, 0, 0)
    );
}

function createDiceMesh() {
    const boxMaterialOuter = new THREE.MeshStandardMaterial({
        color: 0xD77777,
        // roughness: 0.5,
        // metalness: 0.5
    })
    const boxMaterialInner = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0,
        metalness: 1,
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

function createDice() {
    const mesh = diceMesh.clone();
    // const inner = innerMesh.clone();
    // const outer = outerMesh.clone();

    mesh.scale.set(diceScale, diceScale, diceScale); // Scale the mesh
    scene.add(mesh);

    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(0.5 * diceScale, 0.5 * diceScale, 0.5 * diceScale)), // Scale the physics shape
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
    physicsWorld.fixedStep();

    for (const dice of diceArray) {
        dice.mesh.position.copy(dice.body.position)
        dice.mesh.quaternion.copy(dice.body.quaternion)
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function updateSceneSize() {
    camera.aspect = 1.5; //floorHeight / floorWidth;
    camera.updateProjectionMatrix();
    // renderer.setSize(floorWidth * 10, floorHeight * 10);
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



function onMouseDown(event) {
    event.preventDefault();

    mouse.x = (event.clientX / canvasEl.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / canvasEl.clientHeight) * 2 + 1;

    // console.log(mouse.x + ";" + mouse.y);
    raycaster.setFromCamera(mouse, camera);
    // Visualize the ray
    const rayDir = raycaster.ray.direction.clone().multiplyScalar(50);
    const rayGeom = new THREE.BufferGeometry().setFromPoints([raycaster.ray.origin, raycaster.ray.origin.clone().add(rayDir)]);
    const rayMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const rayLine = new THREE.Line(rayGeom, rayMat);
    scene.add(rayLine);

    const intersects = raycaster.intersectObjects(diceArray.map(dice => dice.mesh));
    console.log(diceArray)
    console.log(intersects)
    for (let i = 0; i < intersects.length; i++) {
        console.log(intersects[i].object)
    }

    // if (intersects.length > 0) {
    //     const intersect = intersects[0];
    //     const topLevelMesh = getTopLevelMesh(intersect.object);

    //     console.log('diceArray:', diceArray);
    //     console.log('intersect.object:', intersect.object);
    //     console.log('topLevelMesh:', topLevelMesh);

    //     draggedDice = diceArray.find(dice => dice.mesh === topLevelMesh);
    //     console.log('draggedDice:', draggedDice);

    //     // draggedDice = diceArray.find(dice => dice.mesh === intersect.object);
    //     for (let i = 0; i < diceArray.length; i++) {
    //         if (diceArray[i].mesh === intersect.object) {
    //             draggedDice = diceArray[i];
    //             break;
    //         }
    //     }
    //     dragOffset.copy(intersect.point).sub(draggedDice.mesh.position);
    //     scene.add(draggedDice.mesh);
    // }
}

function onMouseMove(event) {
    event.preventDefault();

    if (draggedDice !== null) {
        mouse.x = (event.clientX / canvasEl.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / canvasEl.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -7);
        const target = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, target);
        target.sub(dragOffset);

        draggedDice.mesh.position.copy(target);
        draggedDice.body.position.copy(target);
    }
}

function onMouseUp(event) {
    event.preventDefault();
    console.log('draggedDice:', draggedDice);

    if (draggedDice !== null) {
        const force = new THREE.Vector3(0, 10, 0); // Adjust this vector to control the force applied to the dice
        draggedDice.body.applyLocalForce(new CANNON.Vec3(force.x, force.y, force.z), new CANNON.Vec3(0, 0, 0));
        draggedDice.body.angularVelocity.set(Math.random() * 5, Math.random() * 5, Math.random() * 5);

        draggedDice = null;
    }
}

function getTopLevelMesh(object) {
    let topLevelMesh = object;
    while (topLevelMesh.parent) {
        topLevelMesh = topLevelMesh.parent;
    }
    return topLevelMesh;
}
// function onMouseDown(event) {
//     event.preventDefault();

//     mouse.x = (event.clientX / canvasEl.clientWidth) * 2 - 1;
//     mouse.y = -(event.clientY / canvasEl.clientHeight) * 2 + 1;

//     raycaster.setFromCamera(mouse, camera);

//     // Visualize the ray
//     const rayDir = raycaster.ray.direction.clone().multiplyScalar(50);
//     const rayGeom = new THREE.BufferGeometry().setFromPoints([raycaster.ray.origin, raycaster.ray.origin.clone().add(rayDir)]);
//     rayLine.geometry = rayGeom;

//     const intersects = raycaster.intersectObjects(diceArray.map(dice => dice.mesh));

//     console.log('intersects:', intersects);

//     // Rest of the onMouseDown function...
// }