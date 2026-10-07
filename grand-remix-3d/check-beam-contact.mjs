import assert from 'node:assert/strict';import * as THREE from 'three';import {createBeamClipper} from './beam-volume.js';
const ground=new THREE.Mesh(new THREE.BoxGeometry(100,.2,100));ground.position.y=-.1;ground.updateMatrixWorld(true);
const clip=createBeamClipper([ground]);
for(const aim of [new THREE.Vector3(0,-1,0),new THREE.Vector3(.6,-1,.3).normalize()]){
 const origin=new THREE.Vector3(0,3,0),g=new THREE.Group(),cone=new THREE.Mesh(new THREE.CylinderGeometry());g.add(cone);const beam={origin,g,cone};clip(beam,aim,.25);const p=cone.geometry.attributes.position;
 for(let i=1;i<p.count;i+=2){const y=p.getY(i)+3;assert(y<=0&&y>-.013,`beam end floating: ${y}`);}
}
const table=new THREE.Mesh(new THREE.BoxGeometry(10,.1,10));table.position.y=1;table.updateMatrixWorld(true);const origin=new THREE.Vector3(0,3,0),g=new THREE.Group(),cone=new THREE.Mesh(new THREE.CylinderGeometry());g.add(cone);const beam={origin,g,cone};createBeamClipper([ground,table])(beam,new THREE.Vector3(0,-1,0),.15);const p=cone.geometry.attributes.position;for(let i=1;i<p.count;i+=2)assert(p.getY(i)+3>1.03&&p.getY(i)+3<1.05);
console.log('Beam contact: vertical and oblique floor contact, furniture occlusion passed.');
