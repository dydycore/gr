import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRenderProfile, previewPixelRatio, createMobileQuality} from './mobile-rendering.mjs';
import {createFogVolume} from './fog-volume.js';
import {createBeamClipper,createStaticLightRay} from './beam-volume.js';

const desktops = [
 {userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform:'Win32',maxTouchPoints:10},
 {userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform:'MacIntel',maxTouchPoints:0},
 {userAgent:'Mozilla/5.0 (X11; Linux x86_64)', platform:'Linux x86_64'}
];
const mobiles = [
 {userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'},
 {userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile'},
 {userAgent:'Mozilla/5.0 (Linux; Android 14; SM-X710)'},
 {userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'},
 {userAgent:desktops[1].userAgent,platform:'MacIntel',maxTouchPoints:5},
 {userAgent:'',userAgentData:{mobile:true}}
];
const desktop = createRenderProfile(desktops[0]);
assert.deepEqual(desktop,{mobile:false,exporting:false,antialias:true,maxPixelRatio:2,maxPixels:4800000,shadowSize:1024,sunShadowSize:2048,visualSize:1024,goboSize:512,beamSegments:48});
for (const device of desktops) {
 assert.deepEqual(createRenderProfile(device),desktop,'Desktop quality is independent of touch support');
 for (const [w,h,dpr] of [[320,480,3],[1920,1080,2],[3840,2160,2],[800,600,1]]) {
  assert.equal(previewPixelRatio(desktop,w,h,dpr,.7),Math.min(dpr,2,Math.sqrt(4800000/(w*h))),'Exact original PC resolution, even in a narrow window');
 }
}
for (const device of mobiles) {
 const profile=createRenderProfile(device);
 assert.equal(profile.mobile,true);
 for (const [w,h] of [[390,600],[1024,768],[2732,2048]]) {
  const ratio=previewPixelRatio(profile,w,h,3);
  assert.ok(ratio<=1 && w*h*ratio**2<=720000.001,'Mobile HDR targets stay within their pixel budget');
 }
 const exported=createRenderProfile(device,{exporting:true});
 assert.deepEqual(exported,{...desktop,exporting:true});
 assert.equal(previewPixelRatio(exported,1280,720,3,.7),1);
}
const quality=createMobileQuality(true),pc=createMobileQuality(false);
let time=0,changes=0;
for (;time<12500;time+=50) {changes+=Number(quality.record(time,40,30));pc.record(time,40,30);}
assert.equal(changes,2);assert.equal(quality.scale,.7);assert.equal(pc.scale,1);
quality.reset();assert.equal(quality.scale,.7,'A resume does not reset quality and reintroduce lag');
for (;time<59000;time+=1000/30) quality.record(time,5,30);
assert.equal(quality.scale,1,'Sustained spare capacity restores resolution');
quality.reset();quality.record(time+10000,100,30);assert.equal(quality.scale,1,'One resume/compile stall cannot reduce quality');

// Actual fog uniforms/shader and target sizes with a renderer test double.
const bounds={min:[-2,0,-2],max:[2,4,2]},particles=[{active:true,position:[0,1,0],opacity:.8,radius:1,spread:1,vertical:1}];
for (const mobile of [false,true]) {
 const volume=createFogVolume({bounds,solids:[],particles,colour:()=>[.2,.3,.4],compact:true,mobile});
 assert.deepEqual(volume.gridSize,mobile?[24,16,40]:[28,18,44]);
 volume.update(.3);
 let target=null,draws=[];
 const renderer={autoClear:true,getRenderTarget:()=>null,getClearAlpha:()=>1,getClearColor:c=>c.set(0),getDrawingBufferSize:v=>v.set(900,600),setClearColor(){},setRenderTarget:v=>{target=v;},render:pass=>draws.push({material:pass.children[0].material,width:target?.width,height:target?.height})};
 const camera=new THREE.PerspectiveCamera();camera.updateMatrixWorld();
 volume.render(renderer,null,camera);
 assert.equal(draws.length,2);assert.equal(draws[0].width,mobile?300:450);assert.equal(draws[0].height,mobile?200:300);
 const shader=draws[0].material.fragmentShader;
 assert.ok(shader.includes(`const int STEPS=${mobile?24:32}`));
 assert.ok(shader.includes(`const int LIGHT_STEPS=${mobile?4:8}`));
 assert.ok(shader.includes('projectorTransmission(surface)') && shader.includes('projectorScatter(p,ray)'),'Both projection extinction and in-air scattering remain active');
 volume.reset();draws=[];volume.render(renderer,null,camera);assert.equal(draws.length,0);
}
// Reduced beam tessellation must still meet floor/furniture surfaces.
const ground=new THREE.Mesh(new THREE.BoxGeometry(100,.2,100));ground.position.y=-.1;ground.updateMatrixWorld(true);
for (const segments of [20,48]) {
 const cone=new THREE.Mesh(new THREE.CylinderGeometry()),beam={origin:new THREE.Vector3(0,3,0),g:new THREE.Group(),cone};
 createBeamClipper([ground],{segments})(beam,new THREE.Vector3(.6,-1,.3).normalize(),.25);
 const p=cone.geometry.attributes.position;assert.equal(p.count,(segments+1)*2);
 for(let i=1;i<p.count;i+=2)assert.ok(p.getY(i)+3<=0 && p.getY(i)+3>-.013);
}
console.log('Mobile rendering: phone/tablet detection, exact PC/export defaults, bounded/adaptive resolution, volumetric projection and reduced beam contact verified.');

// Static hit caching also remembers misses; independent lamps cannot share hits.
let casts=0;
const originalRaycast=ground.raycast.bind(ground);
ground.raycast=(...args)=>{casts++;return originalRaycast(...args);};
const cast=createStaticLightRay([ground]),fixture={},fixture2={};
const origin=new THREE.Vector3(0,3,0),down=new THREE.Vector3(0,-1,0);
const hit=cast(fixture,origin,down);assert.equal(casts,1);assert.ok(Math.abs(hit.distance-3)<1e-6);
assert.equal(cast(fixture,origin.clone(),down.clone()),hit);assert.equal(casts,1);
cast(fixture2,origin,down);assert.equal(casts,2);
cast(fixture,origin.clone().setY(4),down);assert.equal(casts,3);
const up=new THREE.Vector3(0,1,0);assert.equal(cast(fixture,origin,up),undefined);assert.equal(casts,4);
assert.equal(cast(fixture,origin,up),undefined);assert.equal(casts,4);
console.log('Static light intersections: cached fixed aims/misses; recast changed positions, aims and independent fixtures.');
