import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPhysicalRenderer} from './physical-renderer.js';

const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1.5,.1,100);
scene.position.set(1,0,-2);camera.position.set(3,2,8);
const actor=new THREE.Group();actor.name='Actor';actor.position.set(2,1,-3);scene.add(actor);
const body=new THREE.Mesh(new THREE.BoxGeometry(.5,1,.4),new THREE.MeshStandardMaterial());body.position.y=.6;actor.add(body);
const haze=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({transparent:true}));haze.layers.set(1);scene.add(haze);
const lights=Array.from({length:19},(_,i)=>{
 const light=new THREE.SpotLight(0xffffff,20+i);light.position.set(i*.2,3,-i*.1);light.target.position.set(i*.1,0,-3);
 scene.add(light,light.target);return light;
});
lights[17].intensity=0;lights[18].visible=false;
let sceneUpdates=0,cameraUpdates=0,bodyUpdates=0;
for(const [object,count] of [[scene,()=>sceneUpdates++],[camera,()=>cameraUpdates++],[body,()=>bodyUpdates++]]){
 const update=object.updateMatrixWorld;object.updateMatrixWorld=function(force){count();return update.call(this,force);};
}
const calls=[];let currentTarget=null,fail=false;
const renderer={toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.15,autoClear:true,
 getDrawingBufferSize:value=>value.set(1200,800),
 setRenderTarget:target=>{currentTarget=target;},
 render(renderScene,renderCamera){
  // The actual Three 0.180 renderer performs these updates before collecting
  // lights or meshes. This harness exercises the complete multipass function
  // without requiring a GPU and records its world-space/render-state inputs.
  if(renderScene.matrixWorldAutoUpdate)renderScene.updateMatrixWorld();
  if(renderCamera.parent===null&&renderCamera.matrixWorldAutoUpdate)renderCamera.updateMatrixWorld();
  if(fail)throw new Error('Simulated GPU failure');
  if(renderScene!==scene)return;
  const visible=lights.map((l,i)=>l.visible?i:null).filter(i=>i!==null);
  for(const light of lights.filter(l=>l.visible))light.shadow.updateMatrices(light);
  calls.push({visible,body:body.matrixWorld.toArray(),camera:camera.matrixWorld.toArray(),
   light:lights[0].matrixWorld.toArray(),target:lights[0].target.matrixWorld.toArray(),
   depth:scene.overrideMaterial?.colorWrite===false,layers:camera.layers.mask,
   targetSize:currentTarget?[currentTarget.width,currentTarget.height]:null});
 }
};
const render=createPhysicalRenderer(renderer,scene,camera,lights);
const originalVisibility=lights.map(l=>l.visible);
function resetCounts(){sceneUpdates=cameraUpdates=bodyUpdates=0;calls.length=0;}
function assertSharedMatrices(){
 for(const call of calls)for(const field of ['body','camera','light','target'])assert.deepEqual(call[field],calls[0][field],`${field} identical across every pass`);
 assert.equal(sceneUpdates,1,'One world-scene update per composed frame');
 assert.equal(cameraUpdates,1,'One main-camera update per composed frame');
 assert.equal(bodyUpdates,1,'Child transform updated once, not per pass');
 assert.equal(scene.matrixWorldAutoUpdate,true);assert.equal(camera.matrixWorldAutoUpdate,true);
 assert.deepEqual(lights.map(l=>l.visible),originalVisibility);assert.equal(renderer.toneMapping,THREE.ACESFilmicToneMapping);
}
render();assert.equal(calls.length,6,'Base + three light batches + depth + haze are retained');assertSharedMatrices();
assert.deepEqual(calls.slice(0,4).map(call=>call.visible),[[],[0,1,2,3,4,5],[6,7,8,9,10,11],[12,13,14,15,16]],'Light batching is unchanged');
assert.deepEqual(calls.slice(0,4).map(call=>call.targetSize),Array(4).fill([1200,800]),'Full resolution retained');
assert.equal(calls[4].depth,true);assert.equal(calls[4].layers,1);assert.equal(calls[5].depth,false);assert.equal(calls[5].layers,2);
const previous=calls[0];resetCounts();actor.position.x+=1.25;camera.position.z-=2;lights[0].position.x+=.3;lights[0].target.position.z+=.8;
render(true);assertSharedMatrices();
for(const field of ['body','camera','light','target'])assert.notDeepEqual(calls[0][field],previous[field],`${field} reflects next-frame motion`);
assert.equal(calls[0].body[12],4.25,'Nested actor world position is correct');
resetCounts();haze.visible=false;render();assert.equal(calls.length,4,'Existing no-haze early return preserved');assertSharedMatrices();

// Respect manually managed scene/camera matrices and restore flags on failure.
scene.matrixWorldAutoUpdate=false;camera.matrixWorldAutoUpdate=false;resetCounts();render();
assert.equal(sceneUpdates,0);assert.equal(cameraUpdates,0);assert.equal(bodyUpdates,0);
assert.equal(scene.matrixWorldAutoUpdate,false);assert.equal(camera.matrixWorldAutoUpdate,false);
scene.matrixWorldAutoUpdate=true;camera.matrixWorldAutoUpdate=true;fail=true;
assert.throws(()=>render(),/Simulated GPU failure/);
assert.equal(scene.matrixWorldAutoUpdate,true);assert.equal(camera.matrixWorldAutoUpdate,true);
console.log('Physical renderer PASS: six scene passes reuse one world-matrix update; identical lighting, resolution, depth/haze inputs; movement, no-haze exit, manual flags and exception restoration verified. GPU appearance/performance require browser measurement.');
