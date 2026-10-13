import * as THREE from 'three';

// One mechanical yaw axis for the yoke, one pitch axis through the head.
// Dimensions are a visual envelope, not a manufacturer CAD model.
export function createMovingHead(parent,{bodyMaterial,yokeMaterial,lensMaterial,standing=false}){
 const pan=new THREE.Group();pan.name='Etrier_pan';parent.add(pan);
 const head=new THREE.Group();head.name='Tete_tilt';pan.add(head);
 function mesh(geometry,material,position,owner,name){
  const m=new THREE.Mesh(geometry,material);m.name=name;m.position.fromArray(position);
  m.castShadow=m.receiveShadow=true;owner.add(m);return m;
 }
 const side=standing?-1:1;
 mesh(new THREE.BoxGeometry(.28,.06,.22),bodyMaterial,[0,side*.205,0],parent,'Socle_fixe');
 mesh(new THREE.CylinderGeometry(.073,.073,.035,20),yokeMaterial,[0,side*.16,0],pan,'Axe_pan');
 for(const x of [-.13,.13]){
  mesh(new THREE.BoxGeometry(.032,.175,.058),yokeMaterial,[x,side*.075,0],pan,'Bras_etrier');
  const axle=mesh(new THREE.CylinderGeometry(.035,.035,.026,16),bodyMaterial,[x,0,0],pan,'Axe_tilt');axle.rotation.z=Math.PI/2;
 }
 mesh(new THREE.BoxGeometry(.26,.032,.058),yokeMaterial,[0,side*.153,0],pan,'Traverse_etrier');
 mesh(new THREE.CylinderGeometry(.088,.079,.205,24),bodyMaterial,[0,0,0],head,'Corps_tete');
 mesh(new THREE.CylinderGeometry(.076,.076,.018,24),yokeMaterial,[0,-.107,0],head,'Bague_optique');
 const lens=mesh(new THREE.CylinderGeometry(.065,.065,.008,24),lensMaterial,[0,-.119,0],head,'Lentille');lens.castShadow=false;
 return {pan,head,lens,aim(panDegrees,tiltDegrees){pan.rotation.y=THREE.MathUtils.degToRad(panDegrees);head.rotation.x=-THREE.MathUtils.degToRad(tiltDegrees);}};
}
