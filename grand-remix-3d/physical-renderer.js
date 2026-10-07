import * as THREE from 'three';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

// Accumulate direct lights in linear HDR batches. Each light can cast a real
// shadow without exhausting WebGL's per-fragment texture sampler limit.
export function createPhysicalRenderer(renderer,scene,camera,lights){
 const batchSize=6,batchCount=Math.ceil(lights.length/batchSize);
 // Avoid multisampled floating-point resolves: some WebGL drivers produce
 // black tiles where transparent beam volumes overlap. Full-float buffers
 // also keep bright near-field samples from overflowing during subtraction.
 const targets=Array.from({length:batchCount+1},()=>new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true,samples:0}));
 const uniforms={base:{value:targets[0].texture},toneMappingExposure:{value:1}};
 for(let i=0;i<batchCount;i++)uniforms['batch'+i]={value:targets[0].texture};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,
  vertexShader:'varying vec2 uvOut;void main(){uvOut=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`#include <tonemapping_pars_fragment>
  varying vec2 uvOut;uniform sampler2D base;${Array.from({length:batchCount},(_,i)=>'uniform sampler2D batch'+i+';').join('')}
  void main(){vec3 b=texture2D(base,uvOut).rgb;vec3 c=b;
  ${Array.from({length:batchCount},(_,i)=>'c+=max(texture2D(batch'+i+',uvOut).rgb-b,vec3(0.));').join('')}
  gl_FragColor=sRGBTransferOETF(vec4(ACESFilmicToneMapping(max(c,vec3(0.))),1.));
  }`});
 const output=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material),outputCamera=new THREE.Camera();output.add(quad);
 const composited=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false});
 const antialias=new THREE.ShaderMaterial({uniforms:THREE.UniformsUtils.clone(FXAAShader.uniforms),vertexShader:FXAAShader.vertexShader,fragmentShader:FXAAShader.fragmentShader,depthTest:false,depthWrite:false});
 antialias.uniforms.tDiffuse.value=composited.texture;
 const depthOnly=new THREE.MeshBasicMaterial({colorWrite:false});
 const size=new THREE.Vector2(),lastBatchUse=new Float64Array(batchCount);
 const idleTargetDelay=6000;
 // The scene's renderable objects already exist here. Cache references once,
 // including beam shells whose layer changes only on their first clipping.
 const overlayObjects=[];scene.traverse(o=>{if(o.isMesh||o.isSprite||o.isLine||o.isPoints)overlayObjects.push(o);});
 const hasVisibleOverlay=()=>overlayObjects.some(o=>{
  if(!(o.layers.mask&2)||!o.visible)return false;
  for(let parent=o.parent;parent;parent=parent.parent){if(!parent.visible)return false;if(parent===scene)return true;}
  return false;
 });
 let width=0,height=0;
 return (navigating=false)=>{
  // Keep the same lighting/shadow pipeline when navigating or selecting a
  // fixture. Keep full resolution throughout motion: no visible softening.
  renderer.getDrawingBufferSize(size);
  if(size.x!==width||size.y!==height){width=size.x;height=size.y;targets[0].setSize(width,height);composited.setSize(width,height);antialias.uniforms.resolution.value.set(1/width,1/height);}
  const now=performance.now();
  const visible=lights.map(l=>l.visible),active=lights.filter(l=>l.visible&&l.intensity>0);
  uniforms.toneMappingExposure.value=renderer.toneMappingExposure;
  const mapping=renderer.toneMapping;renderer.toneMapping=THREE.NoToneMapping;
  for(const l of lights)l.visible=false;
  renderer.setRenderTarget(targets[0]);renderer.render(scene,camera);
  for(let b=0;b<batchCount;b++){
   const batch=active.slice(b*batchSize,b*batchSize+batchSize);
   if(!batch.length){
    // Bind a valid base texture before retiring an idle allocation. Brief
    // strobe gaps keep their buffers warm instead of reallocating every flash.
    uniforms['batch'+b].value=targets[0].texture;
    if(now-lastBatchUse[b]>idleTargetDelay&&(targets[b+1].width!==1||targets[b+1].height!==1))targets[b+1].setSize(1,1);
    continue;
   }
   const target=targets[b+1];lastBatchUse[b]=now;
   if(target.width!==width||target.height!==height)target.setSize(width,height);
   for(const l of batch)l.visible=true;
   renderer.setRenderTarget(target);renderer.render(scene,camera);
   uniforms['batch'+b].value=target.texture;
   for(const l of batch)l.visible=false;
  }
  lights.forEach((l,i)=>l.visible=visible[i]);renderer.toneMapping=mapping;
  // Transparent haze billboards and beam shells are not additive light data.
  // Draw them only once, after the opaque lighting accumulation. Rebuild the
  // screen depth first so haze cannot show through the DJ booth or the floor.
  renderer.setRenderTarget(composited);renderer.render(output,outputCamera);
  renderer.setRenderTarget(null);
  if(!hasVisibleOverlay()){
   // Without haze there is nothing to depth-test after the composite. The
   // full-resolution FXAA output is identical; omit two whole-scene passes.
   quad.material=antialias;renderer.render(output,outputCamera);quad.material=material;
   return;
  }
  const background=scene.background,override=scene.overrideMaterial;
  scene.overrideMaterial=depthOnly;renderer.render(scene,camera);
  scene.overrideMaterial=override;renderer.autoClear=false;
  quad.material=antialias;renderer.render(output,outputCamera);quad.material=material;
  scene.background=null;camera.layers.set(1);renderer.render(scene,camera);
  camera.layers.set(0);scene.background=background;renderer.autoClear=true;
 };
}
