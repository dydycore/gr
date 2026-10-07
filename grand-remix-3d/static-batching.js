import {Mesh} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

function geometrySignature(geometry){
 if(!geometry?.isBufferGeometry||geometry.type==='BoxGeometry')return null;
 const position=geometry.attributes.position;
 if(!position||Object.keys(geometry.morphAttributes).length)return null;
 const count=geometry.index?.count??position.count;
 if(geometry.drawRange.start!==0||geometry.drawRange.count<count)return null;
 const attributes=[];
 for(const name of Object.keys(geometry.attributes).sort()){
  const attribute=geometry.attributes[name];
  if(attribute.isInterleavedBufferAttribute||attribute.isInstancedBufferAttribute||!attribute.array||attribute.count!==position.count)return null;
  attributes.push([name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name,attribute.gpuType]);
 }
 const index=geometry.index;
 return JSON.stringify([index?[index.itemSize,index.normalized,index.array.constructor.name]:null,attributes]);
}

/** Merge only compatible, directly owned static surfaces. Boxes remain available to collision code. */
export function batchStaticSurfaces(groups){
 const owners=[...new Set(groups)].filter(group=>group?.isObject3D);
 const count=()=>owners.reduce((sum,group)=>sum+group.children.filter(child=>child.isMesh).length,0);
 const before=count();let batches=0;
 for(const parent of owners){
  const byMaterial=new Map();
  for(const mesh of [...parent.children]){
   const material=mesh.material;
   if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||mesh.children.length||!mesh.visible||!mesh.matrixAutoUpdate||
    mesh.customDepthMaterial||mesh.customDistanceMaterial||mesh.raycast!==Mesh.prototype.raycast||Object.hasOwn(mesh,'onBeforeRender')||Object.hasOwn(mesh,'onBeforeShadow')||
    Object.hasOwn(mesh.userData,'details')||mesh.userData.staticBatch||!material?.isMeshStandardMaterial||
    material.transparent||material.opacity!==1||!material.visible)continue;
   const signature=geometrySignature(mesh.geometry);if(signature===null)continue;
   mesh.updateMatrix();
   // A mirrored transform changes front-face winding; leave it untouched.
   const determinant=mesh.matrix.determinant();if(!Number.isFinite(determinant)||determinant<=0)continue;
   const key=JSON.stringify([signature,mesh.castShadow,mesh.receiveShadow,mesh.layers.mask,mesh.renderOrder,mesh.frustumCulled]);
   let compatible=byMaterial.get(material);if(!compatible)byMaterial.set(material,compatible=new Map());
   let bucket=compatible.get(key);if(!bucket)compatible.set(key,bucket=[]);
   bucket.push(mesh);
  }
  for(const [material,compatible] of byMaterial)for(const meshes of compatible.values()){
   if(meshes.length<2)continue;
   const copies=[];let geometry;
   try{
    for(const mesh of meshes)copies.push(mesh.geometry.clone().applyMatrix4(mesh.matrix));
    geometry=mergeGeometries(copies,false);
   }finally{for(const copy of copies)copy.dispose();}
   if(!geometry)continue;
   geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const first=meshes[0],merged=new Mesh(geometry,material);
   merged.name=`Static surfaces · ${parent.name||parent.uuid}`;
   merged.castShadow=first.castShadow;merged.receiveShadow=first.receiveShadow;
   merged.layers.mask=first.layers.mask;merged.renderOrder=first.renderOrder;merged.frustumCulled=first.frustumCulled;
   merged.userData.staticBatch={sources:meshes.map(mesh=>({uuid:mesh.uuid,name:mesh.name,userData:mesh.userData,matrix:mesh.matrix.toArray()}))};
   // Keep source geometries/materials alive: other code may share them.
   parent.remove(...meshes);parent.add(merged);batches++;
  }
 }
 const after=count();return {before,after,reduced:before-after,batches};
}
