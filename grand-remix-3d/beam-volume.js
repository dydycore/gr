import * as THREE from 'three';

// Room, bar and DJ furniture are static. Reuse their centre-ray intersection
// until a fixture changes position or aim; moving lights still recast normally.
export function createStaticLightRay(obstacles){
 const ray=new THREE.Raycaster(),cache=new WeakMap();
 return (fixture,origin,direction)=>{
  let entry=cache.get(fixture);
  if(entry&&entry.origin.equals(origin)&&entry.direction.equals(direction))return entry.hit;
  ray.set(origin,direction);const hit=ray.intersectObjects(obstacles,true)[0];
  if(!entry){entry={origin:new THREE.Vector3(),direction:new THREE.Vector3()};cache.set(fixture,entry);}
  entry.origin.copy(origin);entry.direction.copy(direction);entry.hit=hit;return hit;
 };
}

// A low-opacity shell is only a haze preview, not a volumetric transport solve.
// Fade its silhouette and emitter end instead of drawing a hard transparent tube.
function softenBeam(material){
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
varying vec3 vHazeNormal;
varying vec3 vHazeView;
varying float vHazeDistance;`);
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
vHazeNormal = normalMatrix * normal;
vHazeView = -mvPosition.xyz;
vHazeDistance = length(position);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vHazeNormal;
varying vec3 vHazeView;
varying float vHazeDistance;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 hazeNormal = vHazeNormal / max(length(vHazeNormal), 0.00001);
vec3 hazeView = vHazeView / max(length(vHazeView), 0.00001);
float hazeEdge = smoothstep(0.0, 0.65, abs(dot(hazeNormal, hazeView)));
float hazeSource = smoothstep(0.24, 0.62, vHazeDistance);
float hazeFalloff = 1.0 / (1.0 + 0.035 * vHazeDistance * vHazeDistance);
diffuseColor.a = min(0.12, diffuseColor.a * hazeEdge * hazeSource * hazeFalloff);`);
 };
 material.customProgramCacheKey=()=> 'soft-clipped-haze-v1';
 material.needsUpdate=true;
}

// Clip the outer rays individually. An oblique beam ends along the floor or
// furniture surface, rather than at a disk perpendicular to its centre line.
export function createBeamClipper(obstacles,{segments=48}={}){
 const ray=new THREE.Raycaster(),axis=new THREE.Vector3(),u=new THREE.Vector3(),v=new THREE.Vector3(),radial=new THREE.Vector3(),start=new THREE.Vector3(),direction=new THREE.Vector3();
 return (beam,aim,slope)=>{
  const signature=[...aim.toArray(),slope].map(x=>x.toFixed(5)).join(',');if(beam.clipSignature===signature)return;beam.clipSignature=signature;
  if(!beam.clippedGeometry){
   softenBeam(beam.cone.material);
   beam.cone.layers.set(1);beam.cone.geometry.dispose();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((segments+1)*6),3));const indices=[];
   for(let i=0;i<segments;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}g.setIndex(indices);beam.cone.geometry=g;beam.clippedGeometry=true;
  }
  axis.copy(aim);u.set(0,1,0);if(Math.abs(axis.dot(u))>.98)u.set(1,0,0);u.cross(axis).normalize();v.crossVectors(axis,u).normalize();
  const positions=beam.cone.geometry.attributes.position;
  for(let i=0;i<=segments;i++){
   const angle=i/segments*Math.PI*2;radial.copy(u).multiplyScalar(Math.cos(angle)).addScaledVector(v,Math.sin(angle));
   start.copy(beam.origin).addScaledVector(axis,.24).addScaledVector(radial,.035+slope*.24);
   direction.copy(axis).addScaledVector(radial,slope).normalize();ray.set(start,direction);const hit=ray.intersectObjects(obstacles,false)[0];const length=hit?hit.distance+.012:20;
   positions.setXYZ(i*2,start.x-beam.origin.x,start.y-beam.origin.y,start.z-beam.origin.z);
   start.addScaledVector(direction,length).sub(beam.origin);positions.setXYZ(i*2+1,start.x,start.y,start.z);
  }
  positions.needsUpdate=true;
  beam.cone.geometry.computeVertexNormals();
  // The ring closes with duplicate vertices: average their normals to avoid
  // a bright vertical seam when the camera passes the first angular segment.
  const normals=beam.cone.geometry.attributes.normal;
  for(let i=0;i<2;i++){
   const last=segments*2+i;
   radial.set(normals.getX(i)+normals.getX(last),normals.getY(i)+normals.getY(last),normals.getZ(i)+normals.getZ(last)).normalize();
   normals.setXYZ(i,radial.x,radial.y,radial.z);normals.setXYZ(last,radial.x,radial.y,radial.z);
  }
  normals.needsUpdate=true;
  beam.cone.geometry.computeBoundingSphere();beam.g.quaternion.identity();beam.cone.scale.set(1,1,1);
 };
}
