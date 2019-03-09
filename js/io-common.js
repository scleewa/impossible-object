"use strict";

// World Constants
var WC = {
	// Camera
	camWidth: 40,
	camHeight: 30,
	camDepth: 200,
	camDist: 35,
	camFOV: 50,
	camDefXZ: Math.PI / 4,
	camDefY: Math.asin(Math.sqrt(3) / 3),
	camResetDelay: 1,
	// Light
	lightAmb: 0x808080,
	lightDir: 0xffffff,
	lightDirX: 1,
	lightDirY: 3,
	lightDirZ: 2,
	lightSpot: 0xffffff,
	lightSpotRad: 20,
	// Helper
	axisLength: 10,
};

// orbits : [{s: Vector3, d: Vector3}, ...]
var ObjBall = (function() {
    function ObjBall(r, clr, speed, orbits, starting, castShadow) {
		// Info
		this.created = World.clock.getElapsedTime();
		this.speed = speed;
		this.orbits = orbits;
		this.orbitNo = this.orbits.length;
		this.run = 0;
		this.setOrbitInfo(starting);
		// 3D Object
		var geometry = new THREE.SphereGeometry(r);
		var material = new THREE.MeshLambertMaterial({ color: clr, overdraw: 0.5 });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.castShadow = castShadow;
    }
	ObjBall.prototype.update = function(delta) {
		this.run += this.speed * delta;
		while (this.run >= this.curDist) {
			this.run -= this.curDist;
			this.setOrbitInfo((this.curOrbit + 1) % this.orbitNo);
		}
		var pos = new THREE.Vector3();
		pos.addScaledVector(this.curDir, this.run);
		pos.add(this.curDisp);
		this.mesh.position.copy(pos);
		return false;
	};
	ObjBall.prototype.setOrbitInfo = function(orbit) {
		this.curOrbit = orbit;
		this.curDisp = this.orbits[this.curOrbit].s;
		this.curDir = new THREE.Vector3()
		this.curDir.subVectors(this.orbits[this.curOrbit].d, this.orbits[this.curOrbit].s); 
		this.curDist = this.curDir.length();
		this.curDir.normalize();
	};
    return ObjBall;
})();

var StaticObjCreator = {
	clr: 0x000000,
	alpha: 1,
	receiveShadow: false,
	castShadow: false,
	setColor: function(clr) {  this.clr = clr; },
	setAlpha: function(alpha) { this.alpha = alpha; },
	setShadow: function(receiveShadow, castShadow) {
		this.receiveShadow = receiveShadow;
		this.castShadow = castShadow;
	},
	createBox: function(x1, x2, y1, y2, z1, z2) {
		var sx = Math.abs(x2 - x1);
		var sy = Math.abs(y2 - y1);
		var sz = Math.abs(z2 - z1);
		var geometry = new THREE.BoxGeometry(sx, sy, sz);
		var material = new THREE.MeshLambertMaterial({ color: this.clr, overdraw: 0.5, transparent: this.alpha == 1 ? false : true });
		if (this.alpha != 1) material.opacity = this.alpha;
		var newObj = new THREE.Mesh(geometry, material);
		newObj.position.x = (x1 + x2) / 2.0;
		newObj.position.y = (y1 + y2) / 2.0;
		newObj.position.z = (z1 + z2) / 2.0;
		newObj.receiveShadow = this.receiveShadow;
		newObj.castShadow = this.castShadow;
		return newObj;
	},
	createUnitSizedCorner: function(ry, rz, x, y, z) {
		var shape = new THREE.Shape();
		shape.moveTo(-0.5, -0.5);
		shape.lineTo(0.5, -0.5);
		shape.lineTo(0.5, 0.5);
		shape.lineTo(-0.5, -0.5);

		var extrudeSettings = {
			steps: 1,
			amount: 1,
			bevelEnabled: false,
			bevelThickness: 0,
			bevelSize: 0,
			bevelSegments: 0
		};

		var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
		// z-centering
		for (var i = 0, l = geometry.vertices.length; i < l ; i++)
			geometry.vertices[i].z -= 0.5;
		var material = new THREE.MeshLambertMaterial( { color: this.clr, overdraw: 0.5 } );
		var newObj = new THREE.Mesh( geometry, material );
		newObj.rotation.y = ry * Math.PI / 2;
		newObj.rotation.z = rz * Math.PI / 2;
		newObj.position.x = x;
		newObj.position.y = y;
		newObj.position.z = z;
		newObj.receiveShadow = this.receiveShadow;
		newObj.castShadow = this.castShadow;
		return newObj;
	},
};

var World = {
	domMain: null,
	domRenderer: null,
	domMsg: [null, null],
	mouseLastPos: new THREE.Vector2(0, 0),
	mouseDrag: false,
	cameras: [null, null],	// Orthographic(Isometric), Perspective
	curCamera: 0,
	resettingCamera: false,
	lastCameraMove: 0,
	lights: [null, null, null], // Amb, Directional, SpotLight
	curLight: 0,
	lightRad: 0,
	lightRadSpeed: 0,
	turnRad: 0,
	turnRadSpeed: 0,
	gui: null,
	objBase: null,			// Base group for all object meshes
	objHelper: [],			// Helper Objects (Axes...)
	objStatic: [],			// Static Objects
	objDynamic: [],			// Dynamic Objects
	isMobile: function() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
	},
	guiController: {
		impossibleObject: function() {},
		perspCamera: false,
		spotLight: false,
		axes: false,
		turnObject: function() { World.turnObj(); },
		resetCamera: function() { World.resetCamera(true); },
		next: function() { Controller.nextStage(); },
	},
	init: function() {
		// Doesn't fully support mobile browsers
		if (this.isMobile()) {
			alert("io doesn't fully support mobile browsers.");
		} 
		// Clock
		this.clock = new THREE.Clock();
		// Main dom
		this.domMain = document.createElement('div');
		document.body.appendChild(this.domMain);
		// Message dom
		for (var i = 0; i < 2; i++) {
			this.domMsg[i] = document.createElement('div');
			this.domMsg[i].id = i == 0 ? "msgMain" : "msgSub";
			this.domMsg[i].className = 'unselectable';
			this.domMsg[i].style.position = 'absolute';
			if (i == 0)
				this.domMsg[i].style.top = '12%';
			else
				this.domMsg[i].style.bottom = '12%';
			this.domMsg[i].style.width = '100%';
			this.domMsg[i].style.textAlign = 'center';
			this.domMsg[i].style.display = "inline";
			this.domMain.appendChild(this.domMsg[i]);
		}
		this.init3DObjects();
		// GUI
		this.initGui();
	},
	init3DObjects: function() {
		// Scene
		this.scene = new THREE.Scene();
		// Group
		this.objBase = new THREE.Object3D();
		this.scene.add(this.objBase);
		// Cameras
		this.cameras[0] = new THREE.OrthographicCamera(-WC.camWidth / 2, WC.camWidth / 2, WC.camHeight / 2, -WC.camHeight / 2, 1, WC.camDepth);
		this.cameras[1] = new THREE.PerspectiveCamera(WC.camFOV, window.innerWidth / window.innerHeight, 1, WC.camDepth);
		this.resetCamera();
		// Amb Light
		this.lights[0] = new THREE.AmbientLight(WC.lightAmb);
		this.scene.add(this.lights[0]);
		// Dir Light
		this.lights[1] = new THREE.DirectionalLight(WC.lightDir, 1);
		this.lights[1].position.set(WC.lightDirX, WC.lightDirY, WC.lightDirZ);
		this.lights[1].castShadow = true;
		this.lights[1].shadow.camera.near = -40;
		this.lights[1].shadow.camera.far = 40;
		this.lights[1].shadow.camera.left = -40;
		this.lights[1].shadow.camera.right = 40;
		this.lights[1].shadow.camera.top = 40;
		this.lights[1].shadow.camera.bottom = -40;
		this.lights[1].shadow.mapSize.width = 2048;
		this.lights[1].shadow.mapSize.height = 2048;
		this.objBase.add(this.lights[1]);
		// Spot light
		this.lights[2] = new THREE.SpotLight(WC.lightSpot);
		this.lights[2].position.set(WC.lightSpotX, WC.lightSpotY, WC.lightSpotZ);
		//this.objBase.add(this.lights[2]);
		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialiase: true, alpha: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		// Renderer - Shadow
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMapSoft = false;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.domRenderer = this.renderer.domElement;
		document.body.appendChild(this.domRenderer);
		// Resize;
		this.onResize();
	},
	initGui: function() {
		// GUI
		this.gui = new dat.GUI({ autoPlace: false });
		this.gui.add(this.guiController, "impossibleObject");
		this.gui.add(this.guiController, "perspCamera", true).onChange(World.updateGui);
		this.gui.add(this.guiController, "spotLight", false).onChange(World.updateGui);
		this.gui.add(this.guiController, "axes", false).onChange(World.updateGui);
		this.gui.add(this.guiController, "turnObject");
		this.gui.add(this.guiController, "resetCamera");
		this.gui.add(this.guiController, "next");
		document.getElementById("gui").appendChild(this.gui.domElement);
		if (this.isMobile()) this.gui.close();
		this.updateGui();
	},
	updateGui: function() {
		var gui = World.gui;
		var gc = World.guiController;
		World.setCamera(gc.perspCamera);
		World.setLight(gc.spotLight);
		World.setAxes(gc.axes);
		// Update
		for (var i in gui.__controllers) {
			gui.__controllers[i].updateDisplay();
		}
	},
	resetCamera: function(animation) {
		this.lastCameraMove = 0;
		if (animation != true) {
			this.cameraAngXZ = WC.camDefXZ;
			this.cameraAngY = WC.camDefY;
			this.adjustCamera();
		}
		else {
			this.resettingCamera = true;
		}
	},
	adjustCamera: function() {
		var camY = WC.camDist * Math.sin(this.cameraAngY);
		var camX = WC.camDist * Math.cos(this.cameraAngY) * Math.cos(this.cameraAngXZ);
		var camZ = WC.camDist * Math.cos(this.cameraAngY) * Math.sin(this.cameraAngXZ);
		// Iso Camera
		this.cameras[0].position.set(camX, camY, camZ);
		this.cameras[0].lookAt(new THREE.Vector3(0, 0, 0));
		this.cameras[0].updateProjectionMatrix();
		// Perspective Camera
		this.cameras[1].position.set(camX, camY, camZ);
		this.cameras[1].lookAt(new THREE.Vector3(0, 0, 0));
		this.cameras[1].updateProjectionMatrix();		
	},
	render: function() {
		// Update Controller
		Controller.update();
		// Render
		var delta = this.clock.getDelta();
		// Light Animation
		if (this.curLight == 1) {
			this.lightRad += delta * this.lightRadSpeed;
			this.lights[2].position.set(WC.lightSpotRad*Math.cos(this.lightRad),
										WC.lightSpotRad*Math.sin(this.lightRad),
										0);
		}
		// Turn Animation
		if (this.turnRadSpeed != -0) {
			this.turnRad += delta * this.turnRadSpeed;
			if (this.turnRad > Math.PI || this.turnRad < 0) {
				this.turnRad = 0;
				this.turnRadSpeed = 0;
			}
		}
		this.objBase.rotation.y = (Math.sin(this.turnRad - Math.PI / 2) + 1) * Math.PI;
		// Camera resetting
		if (this.resettingCamera) {
			if (Math.abs(WC.camDefXZ - this.cameraAngXZ) < 0.005)
				this.cameraAngXZ = WC.camDefXZ;
			else 
				this.cameraAngXZ += (WC.camDefXZ - this.cameraAngXZ) / 10;
			if (Math.abs(WC.camDefY - this.cameraAngY) < 0.005)
				this.cameraAngY = WC.camDefY;
			else 
				this.cameraAngY += (WC.camDefY - this.cameraAngY) / 10;
			if (this.cameraAngXZ == WC.camDefXZ && this.cameraAngY == WC.camDefY)
				this.resettingCamera = false;
			this.adjustCamera();				
		}
		// Auto reset
		if (this.lastCameraMove != 0 && this.clock.getElapsedTime() - this.lastCameraMove > WC.camResetDelay) {
			this.resetCamera(true);
		}
		// Dynamic Obj Updates
		for (var i = 0; i < this.objDynamic.length; i++) {
			var obj = this.objDynamic[i];
			if (obj.update(delta)) {
				this.objBase.remove(obj.mesh);
				this.objDynamic.splice(i, 1);
				i--;
			}
		}
		// Render
		this.renderer.render(this.scene, this.cameras[this.curCamera]);
	},
	onResize: function() {
		// Iso
		var ratio1 = WC.camWidth / WC.camHeight;
		var ratio2 = window.innerWidth / window.innerHeight;
		var w2, h2;
		if (ratio2 >= ratio1) {
			w2 = WC.camHeight * ratio2 / 2;
			h2 = WC.camHeight / 2; 
		}
		else {
			w2 = WC.camWidth / 2; 
			h2 = WC.camWidth / ratio2 / 2;
		}
		this.cameras[0].left = -w2;
		this.cameras[0].right = w2;
		this.cameras[0].top = h2;
		this.cameras[0].bottom = -h2;
		this.cameras[0].updateProjectionMatrix();
		// Perspective
		this.cameras[1].aspect = window.innerWidth / window.innerHeight;
		this.cameras[1].updateProjectionMatrix();
		// Renderer	
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		// Gui
		var navBar = $(".navbar");
		var guiDiv = $("#gui");
		guiDiv.css({
			left: navBar.width() - guiDiv.width(),
    		top: navBar.height() + 2,
		});
	},
	onKey: function(keyCode) {
		if (keyCode == 67) { // C
			this.guiController.perspCamera = !this.guiController.perspCamera;
			this.updateGui();
		}
		else if (keyCode == 76) { // L
			this.guiController.spotLight = !this.guiController.spotLight;
			this.updateGui();
		}
		else if (keyCode == 88) { // X
			this.guiController.axes = !this.guiController.axes;
			this.updateGui();
		}
		else if (keyCode == 84) { // T
			this.turnObj();
		}
		else if (keyCode == 27) { // ESCAPE
			this.resetCamera(true); 
		}
	},
	onMouseDown: function(evt) {
		this.resettingCamera = false;
		this.mouseDrag = true;
		this.mouseLastPos.set(evt.clientX, evt.clientY)
	},
	onMouseMove: function(evt) {
		if (this.mouseDrag) {
			var delta = new THREE.Vector2(event.clientX - this.mouseLastPos.x, event.clientY - this.mouseLastPos.y);
			delta.multiplyScalar(Math.PI / 300);
			this.mouseLastPos.set(evt.clientX, evt.clientY)
			this.cameraAngXZ += delta.x;
			this.cameraAngY += delta.y;
			this.adjustCamera();
		}
	},
	onMouseUp: function(evt) {
		this.lastCameraMove = this.clock.getElapsedTime();
		this.mouseDrag = false;
	},
	onMouseOut: function(evt) {
		this.lastCameraMove = this.clock.getElapsedTime();
		this.mouseDrag = false;
	},
	onMouseDblClick: function(evt) {
		this.resetCamera(true);
	},
	animate: function() {
		requestAnimationFrame(World.animate);
		World.render();
	},
	addStaticObj: function(obj) {
		this.objStatic.push(obj);
		this.objBase.add(obj);
	},
	clearStaticObj: function() {
		while (this.objStatic.length) {
			this.objBase.remove(this.objStatic.pop());
		}
	},
	addDynamicObj: function(obj) {
		this.objDynamic.push(obj);
		this.objBase.add(obj.mesh);
	},
	clearDynamicObj: function() {
		while (this.objDynamic.length) {
			this.objBase.remove(this.objDynamic.pop().mesh);
		}
	},
	showMsg: function(main, msg, fadeOut) {
		// JQuery
		var msgElem = main ? $("#msgMain") : $("#msgSub"); 
		msgElem.text(msg);
		msgElem.fadeIn(0);
		msgElem.stop();
		if (fadeOut) {
			msgElem.fadeOut(2000);
		}
	},
	setCamera: function(persp) {
		this.curCamera = 0;
		if (persp) 
			this.curCamera = 1;
	},
	setLight: function(spot) {
		this.curLight = spot ? 1 : 0;
		this.objBase.remove(this.lights[this.curLight == 0 ? 2 : 1]);
		this.objBase.add(this.lights[this.curLight == 0 ? 1 : 2]);
		this.lightRad = 0;
		this.lightRadSpeed = Math.PI / 2;
	},
	setAxes: function(on) {
		if (this.objHelper.length > 0) {
			while (this.objHelper.length) {
				this.objBase.remove(this.objHelper.pop());
			}
		}
		if (on) {
			var clr = [0xff0000, 0x00ff00, 0x0000ff];
			var coord = [[-WC.axisLength, 0, 0], [WC.axisLength, 0, 0], 
						 [0, -WC.axisLength, 0], [0, WC.axisLength, 0], 
						 [0, 0, -WC.axisLength], [0, 0, WC.axisLength]];
			for (var i = 0; i < 3; i++) {
				var m = new THREE.LineBasicMaterial({ color: clr[i], linewidth: 2, linecap: "square", opacity: 0.5 });
				var g = new THREE.Geometry();
				g.vertices.push(new THREE.Vector3(coord[i*2][0], coord[i*2][1], coord[i*2][2]), 
								new THREE.Vector3(coord[i*2 + 1][0], coord[i*2 + 1][1], coord[i*2 + 1][2]));
				var l = new THREE.Line(g, m);
				this.objHelper.push(l);
				this.objBase.add(l);
			} 
		}
	},
	turnObj: function(rev) {
		if (rev == true) {
			this.turnRad = Math.PI;
			this.turnRadSpeed = -Math.PI / 2;
		}
		else {
			this.turnRad = 0;
			this.turnRadSpeed = Math.PI / 2;
		}
	},
	turnObjReset: function() {
		this.turnRad = 0;
		this.turnRadSpeed = 0;
	},
};

// Event Handlers and Main function
function onResize() {
    World.onResize();
	Controller.onResize();
}

function onKeyDown(evt) {
	if (evt.repeat) return;
	World.onKey(evt.keyCode);
	Controller.onKey(evt.keyCode);
}

function onMouseDown(evt) {
	evt.preventDefault();
	World.onMouseDown(evt);
}

function onMouseMove(evt) {
	evt.preventDefault();
	World.onMouseMove(evt);
}

function onMouseUp(evt) {
	evt.preventDefault();
	World.onMouseUp(evt);
}

function onMouseOut(evt) {
	evt.preventDefault();
	World.onMouseOut(evt);
}

function onMouseDblClick(evt) {
	evt.preventDefault();
	World.onMouseDblClick(evt);
}

function onTouchStart(evt) {
	evt.preventDefault();
	Controller.nextStage();
}

window.onload = function() {
	World.init();
	Controller.init();
	onResize();
	World.animate();

	// Event Handler
	window.addEventListener('resize', onResize, false);
	window.addEventListener('keydown', onKeyDown, false);
	World.domRenderer.addEventListener('mousedown', onMouseDown, false);
	World.domRenderer.addEventListener('mousemove', onMouseMove, false);
	World.domRenderer.addEventListener('mouseup', onMouseUp, false);
	World.domRenderer.addEventListener('mouseout', onMouseOut, false);
	World.domRenderer.addEventListener('dblclick', onMouseDblClick, false);
	if (World.isMobile())
		World.domRenderer.addEventListener('touchstart', onTouchStart, false);
}
