"use strict";

// Controller Constants
var CC = {
	blockColor1: 0x5588ee,
	blockColor2: 0xee6655,
	ballColor: 0xff2020,
	ballRad: 0.2,
	ballSpeed: 5,
	waterColor: 0x2020ff,
	waterRad: 0.092,
	waterSpeed: 4,
	waterNoise: 0.2,
	waterParticleCount: 250,
	waterEffectRad: 0.08,
	waterEffectColor: 0x5050ff,
	waterEffectSpeed: 0.15,
	waterWheelRad1: 1.8,
	waterWheelRad2: 2,
	waterWheelTeeth: 10,
	waterWheelDepth: 0.8,
	waterWheelSpeed: 5,
	waterWheelColor: 0x909090,
};

// orbits : [{s: Vector3, d: Vector3, g: gravity, eff: effect}, ...]
var ObjWaterParticle = (function() {
    function ObjWaterParticle(r, clr, speed, noise, orbits) {
		// Info
		this.speed = speed;
		this.orbits = orbits;
		this.orbitNo = this.orbits.length;
		this.run = Math.random() * 50;
		this.noise = noise;
		this.noiseVector = new THREE.Vector3(Math.random() * 2 * this.noise - this.noise, 0, Math.random() * 2 * this.noise - this.noise);
		this.setOrbitInfo(0);
		// 3D Object
		var geometry = new THREE.BoxGeometry(2 * r, 2 * r, 2 * r);
		var material = new THREE.MeshLambertMaterial({ color: clr, overdraw: 0.5, transparent: true });
		material.opacity = 0.5;
		this.mesh = new THREE.Mesh(geometry, material);
    }
	ObjWaterParticle.prototype.update = function(delta) {
		var eff = false;
			this.run += this.speed * delta;
		if (this.gravity) {
			this.gravityTimer += delta / 4;
			this.run += 3 * this.gravityTimer;
		}
		while (this.run >= this.curDist) {
			this.run -= this.curDist;
			var oldGravity = this.gravity;
			this.setOrbitInfo((this.curOrbit + 1) % this.orbitNo);
			if (this.orbits[this.curOrbit].eff)
				eff = true;
		}
		// Noise
		if (Math.random() < 0.05) {
			this.noiseVector.x = Math.min(Math.max(-this.noise, this.noiseVector.x + ((Math.random() * 2 * this.noise - this.noise) / 5)), this.noise)
			this.noiseVector.z = Math.min(Math.max(-this.noise, this.noiseVector.z + ((Math.random() * 2 * this.noise - this.noise) / 5)), this.noise)
		}  
		// Set position
		this.mesh.position.copy(this.curDisp);
		this.mesh.position.addScaledVector(this.curDir, this.run);
		this.mesh.position.add(this.noiseVector);
		// Make Effect if needed
		if (eff) {
			if (Math.random() < 0.25) {
				World.addDynamicObj(new ObjWaterEffect(CC.waterEffectRad, CC.waterEffectColor, this.mesh.position, CC.waterEffectSpeed));
			}
		}
		return false;
	};
	ObjWaterParticle.prototype.setOrbitInfo = function(orbit) {
		this.curOrbit = orbit;
		this.curDisp = this.orbits[this.curOrbit].s;
		this.curDir = new THREE.Vector3()
		this.curDir.subVectors(this.orbits[this.curOrbit].d, this.orbits[this.curOrbit].s); 
		this.curDist = this.curDir.length();
		this.gravity = this.orbits[this.curOrbit].g;
		this.gravityTimer = 0;
		this.curDir.normalize();
	};
    return ObjWaterParticle;
})();

var ObjWaterEffect = (function() {
    function ObjWaterEffect(r, clr, pos, speed) {
		// Info
		this.created = World.clock.getElapsedTime();
		var horz = Math.random() * 2 * Math.PI;
		var vert = Math.PI / 4 + Math.random() * Math.PI / 4;
		this.vel = new THREE.Vector3(Math.cos(vert) * Math.sin(horz),
					Math.sin(vert), Math.cos(vert) * Math.cos(horz));
		this.vel.multiplyScalar(speed);
		// 3D Object
		var geometry = new THREE.BoxGeometry(2 * r, 2 * r, 2 * r);
		var material = new THREE.MeshLambertMaterial({ color: clr, overdraw: 0.5, transparent: true });
		material.opacity = 0.5;
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.copy(pos);
    }
	ObjWaterEffect.prototype.update = function(delta) {
		this.vel.y -= delta;
		this.mesh.position.add(this.vel);
		return World.clock.getElapsedTime() - this.created > 0.25;
	};
    return ObjWaterEffect;
})();

var ObjWaterWheel = (function() {
    function ObjWaterWheel(r1, r2, teeth, depth, clr, pos, speed) {
		this.speed = speed;

		var shape = new THREE.Shape();
		var rad = 0;
		var radGrid = 2 * Math.PI / teeth;
		shape.moveTo(r2, 0);
		for (var i = 0; i < teeth; i++) {
			rad += radGrid;
			var bx = Math.cos(rad);
			var by = Math.sin(rad);
			shape.lineTo(r1 * bx, r1 * by);
			shape.lineTo(r2 * bx, r2 * by);
		}
		shape.moveTo(1, 1);
		shape.lineTo(1, -1);
		shape.lineTo(-1, -1);
		shape.lineTo(-1, 1);
		shape.lineTo(1, 1);

		var extrudeSettings = {
			steps: 1,
			amount: depth,
			bevelEnabled: true,
			bevelThickness: depth / 6,
			bevelSize: depth / 6,
			bevelSegments: 1,
		};

		var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
		// z-centering
		for (var i = 0, l = geometry.vertices.length; i < l ; i++)
			geometry.vertices[i].z -= depth / 2;
		var material = new THREE.MeshLambertMaterial( { color: clr, overdraw: 0.5 } );
		this.mesh = new THREE.Mesh( geometry, material );
		this.mesh.rotation.y = Math.PI / 2;
		this.mesh.position.copy(pos);
    }
	ObjWaterWheel.prototype.update = function(delta) {
		this.mesh.rotation.x += delta * this.speed;
		return false;
	};
    return ObjWaterWheel;
})();

var Controller = {
	stage: 0,
	init: function() {
		World.objBase.scale.set(1.4, 1.4, 1.4);	
		StaticObjCreator.setShadow(true, false);
		this.nextStage();
	},
	update: function() {

	},
	// Making Objects
	makeObj1: function(stage) {
		StaticObjCreator.setColor(CC.blockColor2);
		World.addStaticObj(StaticObjCreator.createBox(0, -1, -2, -1, -4, 8));
		World.addStaticObj(StaticObjCreator.createBox(2, -8, 2, 3, 1, 0));
		World.addStaticObj(StaticObjCreator.createUnitSizedCorner(0, 2, 2.5, 2.5, 0.5));
	},
	makeObj2: function(stage) {
		var dd = 0.20; // ditch depth
		StaticObjCreator.setColor(CC.blockColor1);
		World.addStaticObj(StaticObjCreator.createBox(-2, -1, 0, 1 - dd, -10, 1));
		World.addStaticObj(StaticObjCreator.createBox(-2, 10, 0, 1 - dd, 1, 2));
		// Ditch
		World.addStaticObj(StaticObjCreator.createBox(-2, -2 + dd, 1 - dd, 1, -10, 2));
		World.addStaticObj(StaticObjCreator.createBox(-1 - dd, -1, 1 - dd, 1, -9, 1));
		World.addStaticObj(StaticObjCreator.createBox(-2, 10, 1 - dd, 1, 2 - dd, 2));
		World.addStaticObj(StaticObjCreator.createBox(-1 - dd, 10, 1 - dd, 1, 1, 1 + dd));
		World.addStaticObj(StaticObjCreator.createBox(10 - dd, 10, 1 - dd, 1, 1, 2));
		World.addStaticObj(StaticObjCreator.createBox(-2, -1, 1 - dd, 1, -10, -10 + dd));
	},
	makeBall: function() {
		var r = CC.ballRad;
		var orbits = [
		{s: new THREE.Vector3(-0.5, -1 + r, 8), d: new THREE.Vector3(-0.5, -1 + r, -3.5)},
		{s: new THREE.Vector3(3.5, 3 + r, 0.5), d: new THREE.Vector3(-8, 3 + r, 0.5)},
		{s: new THREE.Vector3(-8, 3 + r, 0.5), d: new THREE.Vector3(3.5, 3 + r, 0.5)},
		{s: new THREE.Vector3(-0.5, -1 + r, -3.5), d: new THREE.Vector3(-0.5, -1 + r, 7.5)},
		];
		World.addDynamicObj(new ObjBall(CC.ballRad, CC.ballColor, CC.ballSpeed, orbits, 0, false));
	},
	makeWater: function() {
		var lift = 0.5;
		var orbits = [
		{s: new THREE.Vector3(9.5 + lift, 1 + lift, 1.5 + lift), d: new THREE.Vector3(-1.5 + lift, 1 + lift, 1.5 + lift), g: false, eff: true},
		{s: new THREE.Vector3(-1.5 + lift, 1 + lift, 1.5 + lift), d: new THREE.Vector3(-1.5 + lift, 1 + lift, -9.5 + lift), g: false, eff: false},
		{s: new THREE.Vector3(-1.5 + lift, 1 + lift, -9.5 + lift), d: new THREE.Vector3(-1 + lift, 1 + lift, -9.5 + lift), g: false, eff: false},
		{s: new THREE.Vector3(-1 + lift, 1 + lift, -9.5 + lift), d: new THREE.Vector3(9.5 + lift, 1 + lift, 1.5 + lift), g: true, eff: false},
		];
		for (var i = 0; i < CC.waterParticleCount; i++) {
			World.addDynamicObj(new ObjWaterParticle(CC.waterRad, CC.waterColor, CC.waterSpeed, CC.waterNoise, orbits));
		}
	},
	makeWheel: function() {
		World.addDynamicObj(new ObjWaterWheel(CC.waterWheelRad1, CC.waterWheelRad2, CC.waterWheelTeeth, CC.waterWheelDepth, CC.waterWheelColor, 
				new THREE.Vector3(5, 0, -5), CC.waterWheelSpeed));
	},
	onResize: function() {
	},
	onKey: function(keyCode) {
		if (keyCode == 13 || keyCode == 32) { // RETURN & SPACE 
			this.nextStage();
		}
	},
	nextStage: function() {
		World.showMsg(false, "");
		switch (this.stage) {
		case 0:
			World.showMsg(true, "Waterfall");
			World.showMsg(false, "Press enter to continue");
			World.guiController.spotLight = false;
			World.guiController.perspCamera = false
			World.guiController.axes = false;
			World.updateGui();
			break;
		case 1:
			World.showMsg(true, "Create seemingly connected objects", true);
			this.makeObj1();
			break;
		case 2:
			World.showMsg(true, "Create a crossed water way", true);
			this.makeObj2();
			break;
		case 3:
			World.showMsg(true, "Roll a ball", true);
			this.makeBall();
			break;
		case 4:
			World.showMsg(true, "Let the water flow", true);
			this.makeWater();
			break;
		case 5:
			World.showMsg(true, "Perpetual energy invented", true);
			this.makeWheel();
			break;
		case 6:
			World.showMsg(true, "Waterfall");
			World.showMsg(false, "Drag to move camera");
			World.turnObj(true);
			break;
		case 7:
			World.showMsg(true, "Thank you");
			World.showMsg(false, "Return to Penrose triangle");
			break;
		case 8:
			window.location.href = "penrosetriangle.html";
			break;
		}
		this.stage++;	
	}
};
