import {Matrix4,Mesh,MeshStandardMaterial} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Share these only between the static audience; performer/DJ materials remain independent. */
export function createAudienceMaterials(){
 return {
  body:new MeshStandardMaterial({color:'#86969e',roughness:.8,metalness:0}),
  eyes:new MeshStandardMaterial({color:'#4c5961',roughness:.8,metalness:0})
 };
}

function geometrySignature(geometry){
 if(!geometry?.isBufferGeometry||!geometry.attributes.position||Object.keys(geometry.morphAttributes).length)return null;
 const position=geometry.attributes.position,count=geometry.index?.count??position.count;
 if(geometry.drawRange.start!==0||geometry.drawRange.count<count)return null;
 const attributes=[];
 for(const name of Object.keys(geometry.attributes).sort()){
  const a=geometry.attributes[name];
  if(a.isInterleavedBufferAttribute||a.isInstancedBufferAttribute||!a.array||a.count!==position.count)return null;
  attributes.push([name,a.itemSize,a.normalized,a.array.constructor.name,a.gpuType]);
 }
 // mergeGeometries promotes indices to Uint32 when the combined mesh requires it.
 return JSON.stringify([!!geometry.index,attributes]);
}

function staticBranch(object,root){
 for(let node=object;node&&node!==root;node=node.parent){
  if(!node.visible||node.animations.length||Object.hasOwn(node.userData,'details')||node.userData.audienceBatch||
   Object.hasOwn(node,'onBeforeRender')||Object.hasOwn(node,'onBeforeShadow')||
   (!node.isMesh&&node.renderOrder!==0))return false;
 }
 return true;
}

/**
 * Bake static crowd leaves into the audience group's local coordinates, then merge
 * equal material/shadow/layer combinations. No simplification or material changes.
 * Call after posing the crowd; subsequently move/hide the audience group, not an
 * individual person. Hidden or interactive branches are deliberately left intact.
 */
export function batchAudience(audience){
 if(!audience?.isObject3D)return {before:0,after:0,reduced:0,batches:0,skipped:0};
 const meshes=[];audience.traverse(node=>{if(node.isMesh)meshes.push(node);});
 const before=meshes.length;let batches=0,consumed=0;
 audience.updateWorldMatrix(true,true);
 const determinant=audience.matrixWorld.determinant();
 if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-12)return {before,after:before,reduced:0,batches:0,skipped:before};
 const inverse=new Matrix4().copy(audience.matrixWorld).invert(),byMaterial=new Map();
 for(const mesh of meshes){
  const material=mesh.material;
  if(mesh.isInstancedMesh||mesh.isSkinnedMesh||mesh.children.length||!staticBranch(mesh,audience)||
   mesh.customDepthMaterial||mesh.customDistanceMaterial||mesh.raycast!==Mesh.prototype.raycast||
   !material?.isMeshStandardMaterial||material.transparent||material.opacity!==1||!material.visible)continue;
  const signature=geometrySignature(mesh.geometry);if(signature===null)continue;
  const matrix=new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),det=matrix.determinant();
  // Mirrored leaves need triangle winding changes; leave those meshes untouched.
  if(!Number.isFinite(det)||det<=0)continue;
  const key=JSON.stringify([signature,mesh.castShadow,mesh.receiveShadow,mesh.layers.mask,mesh.renderOrder,mesh.frustumCulled]);
  let compatible=byMaterial.get(material);if(!compatible)byMaterial.set(material,compatible=new Map());
  let bucket=compatible.get(key);if(!bucket)compatible.set(key,bucket=[]);
  bucket.push({mesh,matrix});
 }
 for(const [material,compatible] of byMaterial)for(const entries of compatible.values()){
  if(entries.length<2)continue;
  const copies=[];let geometry;
  try{
   for(const {mesh,matrix} of entries)copies.push(mesh.geometry.clone().applyMatrix4(matrix));
   geometry=mergeGeometries(copies,false);
  }finally{for(const copy of copies)copy.dispose();}
  if(!geometry)continue;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const first=entries[0].mesh,merged=new Mesh(geometry,material);
  merged.name=`Public · ${material.name|| (first.castShadow?'silhouettes':'visages')}`;
  merged.castShadow=first.castShadow;merged.receiveShadow=first.receiveShadow;
  merged.layers.mask=first.layers.mask;merged.renderOrder=first.renderOrder;merged.frustumCulled=first.frustumCulled;
  merged.userData.audienceBatch={sources:entries.map(({mesh,matrix})=>({
   uuid:mesh.uuid,name:mesh.name,parent:mesh.parent?.name||'',userData:mesh.userData,matrix:matrix.toArray()
  }))};
  // Do not dispose source resources: other objects may share their geometry/material.
  for(const {mesh} of entries)mesh.removeFromParent();
  audience.add(merged);consumed+=entries.length;batches++;
 }
 const after=before-consumed+batches;
 return {before,after,reduced:before-after,batches,skipped:before-consumed};
}
