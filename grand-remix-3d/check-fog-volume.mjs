import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFogDynamics,createFogPreview} from './fog-preview.js';
import {createFogField} from './fog-volume.js';
const bounds={min:[-4.27,0,-3.66],max:[4.27,3.81,10.67]},origin=[-3.46,.78,-1.25];
const solids=[{min:[-4.27,0,-3.66],max:[4.27,.6096,0],support:true},{min:[-3.9,.61,-2.475],max:[-2.1,1.51,-1.725]}];
const tick=(fog,seconds)=>{for(let i=0;i<seconds*60;i++)fog.update(1/60);};
const sum=f=>f.values.reduce((total,v,i)=>total+(i%4===3?v:0),0);
const density=[];
for(const rate of [.05,.15,1]){
 const fog=createFogDynamics({origin,bounds,solids});fog.set({on:true,rate});tick(fog,45);
 const field=createFogField({bounds,solids});field.build(fog.particles,()=>[.15,.25,.4]);
 density.push(sum(field));assert.ok(field.bytes.some(v=>v>0));
 assert.ok(field.values.every(v=>Number.isFinite(v)&&v>=0));
 const initial=sum(field);fog.set({on:false,rate});tick(fog,10);field.build(fog.particles,()=>[.15,.25,.4]);
 assert.ok(sum(field)>.1*initial,'Stop preserves a visible residual at 10 seconds');
 assert.ok(sum(field)<initial,'The residual disperses progressively');
 tick(fog,50);field.build(fog.particles,()=>[.15,.25,.4]);assert.equal(sum(field),0);
}
assert.ok(density[1]>density[0]);assert.ok(density[2]>density[1]*4,'Maximum output is clearly denser than a 15% ambience');
const occupied=createFogField({bounds:{min:[-1,0,-1],max:[1,2,1]},solids:[{min:[-1,0,-1],max:[1,2,1]}]});
occupied.build([{active:true,position:[0,1,0],opacity:1,radius:1,spread:1,vertical:1}],()=>[1,1,1]);assert.equal(sum(occupied),0,'Solids contain no aerosol');
// Exercise the public clear command: all volume textures and dynamics disappear,
// emission stops, and the selected rate survives for the next start.
const scene=new THREE.Scene(),preview=createFogPreview({scene,origin:new THREE.Vector3(...origin)});
preview.set({on:true,rate:.17});tick(preview,15);assert.ok(preview.density>0);
preview.clear();assert.deepEqual(preview.state,{on:false,rate:.17});assert.equal(preview.density,0);
let rendered=0;preview.render({render(){rendered++;}},null,null);assert.equal(rendered,0);
tick(preview,4);assert.equal(preview.density,0,'Clear cannot emit a delayed puff');
preview.toggle();tick(preview,5);assert.ok(preview.density>0,'The machine can restart at the retained rate');
assert.equal(scene.getObjectByProperty('isSprite',true),undefined,'No camera-facing fog images remain');
console.log('PASS: continuous 3D field, density contrast, solid exclusion, natural OFF residue, instant clear with retained rate, restart and no sprites.');
