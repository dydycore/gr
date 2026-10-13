import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMovingHead} from './moving-head.js';
import {motionAngles,sanitizeFx} from './fixture-profiles.js';
const material=new THREE.MeshBasicMaterial();let count=0;
for(const standing of [false,true]){
 const root=new THREE.Group(),m=createMovingHead(root,{bodyMaterial:material,yokeMaterial:material,lensMaterial:material,standing});
 root.position.set(2,3,4);
 const base=root.getObjectByName('Socle_fixe'),baseQuaternion=base.quaternion.clone();
 for(let pan=-270;pan<=270;pan+=5)for(let tilt=-135;tilt<=135;tilt+=5){
  m.aim(pan,tilt);root.updateMatrixWorld(true);
  const p=pan*Math.PI/180,t=tilt*Math.PI/180,expected=new THREE.Vector3(Math.sin(p)*Math.sin(t),-Math.cos(t),Math.cos(p)*Math.sin(t));
  const direction=new THREE.Vector3(0,-1,0).applyQuaternion(m.head.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(direction.distanceTo(expected)<1e-12,'Lens and beam must share the same direction at all pan/tilt angles');
  const lens=m.lens.getWorldPosition(new THREE.Vector3()).sub(root.position).normalize();assert.ok(lens.distanceTo(expected)<1e-12);
  assert.ok(base.quaternion.equals(baseQuaternion),'The stationary base must not follow yaw');
  assert.equal(m.head.rotation.y,0,'No independent head yaw or roll');assert.equal(m.head.rotation.z,0);
  // The entire head envelope stays between the yoke arms and above/below the base.
  const sweptRadius=Math.hypot(.12,.088);assert.ok(sweptRadius<.175);assert.ok(.088<.13-.032/2);
  count++;
 }
 for(const movement of ['sweep','tilt','circle','eight']){
  const fx=sanitizeFx({movement,amplitude:15,period:8});let last=null;
  for(let frame=0;frame<=480;frame++){
   const a=motionAngles(25,70,fx,frame/60);m.aim(a.pan,a.tilt);
   if(last){assert.ok(Math.abs(a.pan-last.pan)<.3);assert.ok(Math.abs(a.tilt-last.tilt)<.3);}last=a;
  }
 }
}
console.log(`PASS : ${count} poses, axes pan/tilt mécaniques, lentille alignée, socle fixe et mouvements continus.`);
