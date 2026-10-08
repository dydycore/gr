import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchAudience,createAudienceMaterials} from './audience-batching.js';

const shared=createAudienceMaterials();
assert.equal(shared.body.color.getHexString(),'86969e');
assert.equal(shared.eyes.color.getHexString(),'4c5961');
assert.equal(shared.body.roughness,.8);assert.equal(shared.eyes.roughness,.8);
const scene=new THREE.Group(),audience=new THREE.Group(),outside=new THREE.Group();
scene.add(audience,outside);scene.position.set(3,1,-2);scene.rotation.set(.1,.3,-.2);scene.scale.set(1.2,.8,1.1);
audience.name='Public';audience.position.set(1,-2,3);audience.rotation.set(.2,-.15,.1);
const sources=[],heads=[];
function part(parent,geometry,material,position,shadow=true){
 const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(position);
 mesh.castShadow=shadow;mesh.receiveShadow=shadow;parent.add(mesh);return mesh;
}
for(let i=0;i<20;i++){
 const person=new THREE.Group();person.name=`Person ${i+1}`;audience.add(person);
 person.position.set((i%5)*2,0,Math.floor(i/5)*3);person.rotation.y=(i-9)*.08;
 person.scale.set(1+i*.003,1-i*.002,1+i*.004);
 const torso=part(person,new THREE.CapsuleGeometry(.14,.39,12,32),shared.body,new THREE.Vector3(0,1.12,0));
 const head=part(person,new THREE.SphereGeometry(.115,32,24),shared.body,new THREE.Vector3(0,1.57,0));heads.push(head);
 const nose=part(person,new THREE.SphereGeometry(.028,16,12),shared.body,new THREE.Vector3(0,1.555,.111));nose.scale.set(.7,1,1.2);
 for(const side of [-1,1]){
  part(person,new THREE.SphereGeometry(.009,12,8),shared.eyes,new THREE.Vector3(side*.041,1.588,.103),false);
  const leg=part(person,new THREE.CylinderGeometry(.058,.058,.81,32),shared.body,new THREE.Vector3(side*.115,.48,.0225));leg.rotation.z=side*.08;
  const arm=part(person,new THREE.CylinderGeometry(.04,.04,.45,32),shared.body,new THREE.Vector3(side*.21,1.1,.0125));arm.rotation.z=side*.18;
 }
 torso.userData.label=`Retain ${i}`;
 sources.push(...person.children);
}
const independent=part(outside,new THREE.CapsuleGeometry(.14,.39,12,32),shared.body,new THREE.Vector3(-3,1,2));
scene.updateMatrixWorld(true);
const boundsBefore=new THREE.Box3().setFromObject(audience,true);
const verticesBefore=sources.reduce((sum,mesh)=>sum+mesh.geometry.attributes.position.count,0);
const indicesBefore=sources.reduce((sum,mesh)=>sum+mesh.geometry.index.count,0);
const originalArrays=sources.map(mesh=>mesh.geometry.attributes.position.array.slice());
let disposals=0;for(const mesh of sources)mesh.geometry.addEventListener('dispose',()=>disposals++);
const rays=heads.map(head=>{
 const center=head.getWorldPosition(new THREE.Vector3()),direction=new THREE.Vector3(0,0,-1).transformDirection(head.matrixWorld);
 const ray=new THREE.Raycaster(center.clone().addScaledVector(direction,-2),direction);
 const hits=ray.intersectObject(audience,true);assert.ok(hits.length);return {ray,distance:hits[0].distance};
});
const stats=batchAudience(audience);
assert.deepEqual(stats,{before:180,after:2,reduced:178,batches:2,skipped:0});
assert.equal(independent.parent,outside);assert.equal(disposals,0,'Shared source resources stay alive');
assert.equal(audience.children.filter(mesh=>mesh.isMesh).length,2);
const batches=audience.children.filter(mesh=>mesh.isMesh);
assert.equal(batches.reduce((sum,mesh)=>sum+mesh.geometry.attributes.position.count,0),verticesBefore);
assert.equal(batches.reduce((sum,mesh)=>sum+mesh.geometry.index.count,0),indicesBefore);
const body=batches.find(mesh=>mesh.material===shared.body),eyes=batches.find(mesh=>mesh.material===shared.eyes);
assert.ok(body.castShadow&&body.receiveShadow);assert.ok(!eyes.castShadow&&!eyes.receiveShadow);
assert.equal(Math.max(...body.geometry.index.array.slice(-2000))<body.geometry.attributes.position.count,true,'Indices stay inside complete geometry');
assert.equal(body.userData.audienceBatch.sources.length,140);assert.equal(eyes.userData.audienceBatch.sources.length,40);
for(let i=0;i<sources.length;i++)assert.deepEqual(sources[i].geometry.attributes.position.array,originalArrays[i]);
scene.updateMatrixWorld(true);
const boundsAfter=new THREE.Box3().setFromObject(audience,true);
for(const key of ['min','max'])assert.ok(boundsBefore[key].distanceTo(boundsAfter[key])<2e-5,`World ${key} bounds preserved`);
for(const {ray,distance} of rays)assert.ok(Math.abs(ray.intersectObject(audience,true)[0].distance-distance)<2e-5,'Raycast distance preserved');
assert.deepEqual(batchAudience(audience),{before:2,after:2,reduced:0,batches:0,skipped:2},'Idempotent');
audience.visible=false;assert.equal(batches.every(mesh=>mesh.parent.visible===false),true);audience.visible=true;

// Hidden branches, materials, shadow flags, attributes and interactive objects stay separate.
const guard=new THREE.Group(),hidden=new THREE.Group(),interactive=new THREE.Group();guard.add(hidden,interactive);
hidden.visible=false;interactive.userData.details={name:'clickable'};
const surface=(parent,x,material=shared.body)=>part(parent,new THREE.PlaneGeometry(1,1),material,new THREE.Vector3(x,0,0));
const eligible=[surface(guard,0),surface(guard,2)];
const held=[surface(hidden,4),surface(hidden,6),surface(interactive,8),surface(interactive,10),surface(guard,12,shared.body.clone())];
const mirrored=surface(guard,14);mirrored.scale.x=-1;held.push(mirrored);
const child=surface(guard,16);child.add(new THREE.Group());held.push(child);
const callback=surface(guard,18);callback.onBeforeRender=()=>{};held.push(callback);
const noUV=surface(guard,20);noUV.geometry.deleteAttribute('uv');held.push(noUV);
const shadow=surface(guard,22);shadow.castShadow=false;held.push(shadow);
const layer=surface(guard,24);layer.layers.set(1);held.push(layer);
const off=surface(guard,26);off.visible=false;held.push(off);
const transparent=surface(guard,28,new THREE.MeshStandardMaterial({transparent:true,opacity:.5}));held.push(transparent);
const parents=held.map(mesh=>mesh.parent);guard.visible=false;
const guardedStats=batchAudience(guard);assert.equal(guardedStats.reduced,1);assert.equal(guard.visible,false);
for(let i=0;i<held.length;i++)assert.equal(held[i].parent,parents[i]);
for(const mesh of eligible)assert.equal(mesh.parent,null);
const singular=new THREE.Group();singular.scale.set(0,1,1);surface(singular,0);surface(singular,2);
assert.equal(batchAudience(singular).reduced,0);
console.log('Audience batching PASS: 180 → 2 meshes; full geometry, transformed world bounds, 20 raycasts, shadows, visibility, metadata and source resources preserved; independent and incompatible objects unchanged.');
