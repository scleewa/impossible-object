"use strict";

// Controller Constants
var CC = {
	cubeColor: 0xaaaaaa,
	blockColor: 0x3399ff,
	ballColor: 0x4040f0,
	ballRad: 0.18,
	ballSpeed: 4,
};

var Controller = {
	stage: 0,
	init: function() {
		World.objBase.scale.set(2, 2, 2);
		this.nextStage();
	},
	update: function() {

	},
	// Making Objects
	makePT: function(stage) {
		StaticObjCreator.setAlpha(1);
		StaticObjCreator.setColor(CC.blockColor);
		StaticObjCreator.setShadow(true, false);
		if (stage == null || stage == 1) {
			World.addStaticObj(StaticObjCreator.createBox(-3, 2, 0, 1, -1, -2));
			World.addStaticObj(StaticObjCreator.createBox(1, 2, 0, 1, 3, -2));
		}
		if (stage == null || stage == 2) {
			World.addStaticObj(StaticObjCreator.createBox(1, 2, 1, 3, 2, 3));
		}
		if (stage == null || stage == 3) {
			World.addStaticObj(StaticObjCreator.createUnitSizedCorner(-1, 0, 1.5, 3.5, 2.5));
		}
	},
	makeBalls: function(three) {
		var r = CC.ballRad + 0.1;
		var orbits = [
		{s: new THREE.Vector3(2 + r, 0.5, 3 + r), d: new THREE.Vector3(2 + r, 0.5, -1.5)},
		{s: new THREE.Vector3(2 + r, 0.5, -1.5), d: new THREE.Vector3(2 + r, 1 + r, -1.5)},
		{s: new THREE.Vector3(2 + r, 1 + r, -1.5), d: new THREE.Vector3(-2.5, 1 + r, -1.5)},
		{s: new THREE.Vector3(-2.5, 1 + r, -1.5), d: new THREE.Vector3(-2.5, 1 + r, -1 + r)},
		{s: new THREE.Vector3(1.5, 5 + r, 3 + r), d: new THREE.Vector3(1.5, 0.5, 3 + r)},
		{s: new THREE.Vector3(1.5, 0.5, 3 + r), d: new THREE.Vector3(2 + r, 0.5, 3 + r)},
		];
		// For smooth shadow
		var orbits2 = [
		{s: new THREE.Vector3(2 + r, 0.5, 3 + r), d: new THREE.Vector3(2 + r, 0.5, -1.5)},
		{s: new THREE.Vector3(2 + r, 0.5, -1.5), d: new THREE.Vector3(2 + r, 1 + r, -1.5)},
		{s: new THREE.Vector3(2 + r, 1 + r, -1.5), d: new THREE.Vector3(-2.5, 1 + r, -1.5)},
		{s: new THREE.Vector3(-2.5, 1 + r, -1.5), d: new THREE.Vector3(-2.5, 1 + r, -1 + r)},
		{s: new THREE.Vector3(-2.5, 1 + r, -1 + r), d: new THREE.Vector3(-2.5, 0, -1 + r)},
		{s: new THREE.Vector3(1.5, 4, 3 + r), d: new THREE.Vector3(1.5, 0.5, 3 + r)},
		{s: new THREE.Vector3(1.5, 0.5, 3 + r), d: new THREE.Vector3(2 + r, 0.5, 3 + r)},
		];
		World.clearDynamicObj();
		World.addDynamicObj(new ObjBall(CC.ballRad, CC.ballColor, CC.ballSpeed, orbits, 0, true));
		World.addDynamicObj(new ObjBall(CC.ballRad, CC.ballColor, CC.ballSpeed, orbits2, 0, true));
		if (three) {
			World.addDynamicObj(new ObjBall(CC.ballRad, CC.ballColor, CC.ballSpeed, orbits, 2, true));
			World.addDynamicObj(new ObjBall(CC.ballRad, CC.ballColor, CC.ballSpeed, orbits2, 2, true));
			World.addDynamicObj(new ObjBall(CC.ballRad, CC.ballColor, CC.ballSpeed, orbits, 4, true));
			World.addDynamicObj(new ObjBall(CC.ballRad, CC.ballColor, CC.ballSpeed, orbits2, 4, true));
		}
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
			World.showMsg(true, "Penrose triangle");
			World.showMsg(false, "Press enter to learn how to create it");
			this.makePT();
			break;
		case 1:
			World.showMsg(true, "It is a type of optical illusion");
			World.showMsg(false, "Press enter to continue");
			World.clearStaticObj();
			World.guiController.spotLight = false;
			World.guiController.perspCamera = false
			World.guiController.axes = false;
			World.updateGui();
			break;
		case 2:
			World.showMsg(true, "Create a base object", true);
			World.resetCamera();
			World.updateGui();
			this.makePT(1);
			World.turnObj();
			break;
		case 3:
			World.showMsg(true, "Then place a rectangular prism on it", true);
			this.makePT(2);
			break;
		case 4:
			World.showMsg(true, "Lastly, generate a wedge on top", true);
			World.showMsg(false, "Drag to move camera");
			this.makePT(3);
			break;
		case 5:
			World.showMsg(true, "Orthographic view is one of the tricks");
			World.showMsg(false, "Perspective camera breaks the magic");
			World.guiController.perspCamera = true;
			World.updateGui();
			break;
		case 6:
			World.showMsg(true, "Lighting is another trick");
			World.showMsg(false, "Rotating spotlight makes the border line visible");
			World.guiController.spotLight = true;
			World.guiController.perspCamera = false;
			World.updateGui();
			break;
		case 7:
			World.showMsg(true, "A moving object");
			World.showMsg(false, "Duplicated balls are for shadow casting");
			World.guiController.spotLight = false;
			World.updateGui();
			World.resetCamera();
			this.makeBalls();
			break;
		case 8:
			World.showMsg(true, "Moving objects");
			World.showMsg(false, "Drag to move camera");
			this.makeBalls(true);
			break;
		case 9:
			World.showMsg(true, "Penrose triangle");
			World.showMsg(false, "Press enter for the next demo");
			World.turnObj(true);
			break;
		case 10:
			window.location.href = "waterfall.html";
			break;
		}
		this.stage++;	
	},
};
