import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchStaticSurfaces} from './static-batching.js';

const scene=new THREE.Group(),group=new THREE.Group(),other=new THREE.Group();
scene.position.set(3,1,-2);scene.rotation.set(.1,.3,-.2);scene.scale.set(1.2,.8,1.1);
group.name='Owned';group.position.set(1,-2,3);group.rotation.set(.2,-.15,.1);scene.add(group,other);
const material=new THREE.MeshStandardMaterial({color:'#abcdef',side:THREE.DoubleSide});
function surface(parent,x,geometry=new THREE.PlaneGeometry(1.5,1.2),mat=material){
 const mesh=new THREE.Mesh(geometry,mat);mesh.name=`Surface ${x}`;mesh.position.set(x,0,0);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
const a=surface(group,-2),b=surface(group,2);a.rotation.z=.3;a.scale.set(1.2,.7,1);b.rotation.z=-.2;
a.userData.note={name:'retain metadata'};const originalArray=a.geometry.attributes.position.array.slice();
const box=surface(group,5,new THREE.BoxGeometry(1,1,1));
const differentMaterial=surface(group,8,undefined,material.clone());
const otherShadow=surface(group,11);otherShadow.castShadow=false;
const interactive=surface(group,14);interactive.userData.details={title:'Keep clickable'};
const withChild=surface(group,17);withChild.add(new THREE.Group());
const nonIndexed=surface(group,20,new THREE.PlaneGeometry(1,1).toNonIndexed());
const withoutUV=surface(group,23);withoutUV.geometry.deleteAttribute('uv');
const transparent=surface(group,26,undefined,new THREE.MeshStandardMaterial({transparent:true,opacity:.5}));
const nested=new THREE.Group();group.add(nested);const innerA=surface(nested,29),innerB=surface(nested,32);
const outsideA=surface(other,-2),outsideB=surface(other,2);
const mirrored=surface(group,35);mirrored.scale.x=-1;
scene.updateMatrixWorld(true);
const beforeBox=new THREE.Box3().setFromObject(scene,true);
const rays=[a,b].map(mesh=>{
 const origin=new THREE.Vector3(mesh.position.x,0,5).applyMatrix4(group.matrixWorld);
 const direction=new THREE.Vector3(0,0,-1).transformDirection(group.matrixWorld);
 const ray=new THREE.Raycaster(origin,direction);return {ray,distance:ray.intersectObject(group,true)[0].distance};
});
const untouched=[box,differentMaterial,otherShadow,interactive,withChild,nonIndexed,withoutUV,transparent,mirrored];
const stats=batchStaticSurfaces([group,group]);
assert.equal(stats.reduced,1);assert.equal(stats.batches,1);assert.equal(stats.before-stats.after,1);
for(const mesh of untouched)assert.equal(mesh.parent,group,`${mesh.name} stays separate`);
assert.equal(nested.parent,group);assert.equal(innerA.parent,nested);assert.equal(innerB.parent,nested);
assert.equal(outsideA.parent,other);assert.equal(outsideB.parent,other);
assert.deepEqual(a.geometry.attributes.position.array,originalArray,'Source geometry is not transformed or disposed');
const merged=group.children.find(mesh=>mesh.userData.staticBatch);
assert.ok(merged);assert.equal(merged.material,material);assert.equal(merged.castShadow,true);assert.equal(merged.receiveShadow,true);
assert.deepEqual(merged.userData.staticBatch.sources.map(source=>source.name),[a.name,b.name]);
assert.equal(merged.userData.staticBatch.sources[0].userData,a.userData);
scene.updateMatrixWorld(true);
const afterBox=new THREE.Box3().setFromObject(scene,true);
for(const key of ['min','max'])assert.ok(beforeBox[key].distanceTo(afterBox[key])<1e-5,`World ${key} bounds preserved`);
for(const {ray,distance} of rays)assert.ok(Math.abs(ray.intersectObject(group,true)[0].distance-distance)<1e-5,'World raycast distance preserved');
assert.deepEqual(batchStaticSurfaces([group]),{before:stats.after,after:stats.after,reduced:0,batches:0},'Repeated batching is a no-op');
console.log('Static batching: matching direct surfaces merged; world bounds/raycasts and metadata preserved; boxes, materials, shadows, incompatible layouts, child groups and unrelated groups unchanged.');
