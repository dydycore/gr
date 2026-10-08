import * as THREE from 'three';

// Coarse, continuous world-space aerosol field. Parcels deposit density in a
// volume, never camera-facing pictures. The GPU integrates this field in depth.
export function createFogField({bounds,solids=[],size=[36,20,56]}){
 const [nx,ny,nz]=size,count=nx*ny*nz,values=new Float32Array(count*4),bytes=new Uint8Array(count*4),blocked=new Uint8Array(count);
 const span=bounds.max.map((v,i)=>v-bounds.min[i]),cell=span.map((v,i)=>v/size[i]);
 const axes=size.map((n,a)=>Float32Array.from({length:n},(_,i)=>bounds.min[a]+(i+.5)*cell[a]));
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const q=[axes[0][x],axes[1][y],axes[2][z]];
  if(solids.some(s=>q.every((v,a)=>v>s.min[a]&&v<s.max[a])))blocked[x+nx*(y+ny*z)]=1;
 }
 const kernel=Float32Array.from({length:513},(_,i)=>Math.exp(-i/512*6));
 const bound=(v,n)=>Math.max(0,Math.min(n-1,v));
 return {size,bytes,values,build(particles,colour){
  values.fill(0);
  for(const p of particles){
   if(!p.active||p.opacity<.0001)continue;
   const radius=Math.max(.14,p.radius*1.4),r=[radius*p.spread,radius*p.vertical,radius*p.spread];
   const lo=r.map((v,a)=>bound(Math.floor((p.position[a]-v*1.6-bounds.min[a])/cell[a]),size[a]));
   const hi=r.map((v,a)=>bound(Math.ceil((p.position[a]+v*1.6-bounds.min[a])/cell[a]),size[a]));
   const c=colour(p);
   for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++){
    const yz=((axes[1][y]-p.position[1])/r[1])**2+((axes[2][z]-p.position[2])/r[2])**2;
    if(yz>4)continue;
    for(let x=lo[0];x<=hi[0];x++){
     const j=x+nx*(y+ny*z);if(blocked[j])continue;
     const d=yz+((axes[0][x]-p.position[0])/r[0])**2;if(d>=4)continue;
     const mass=p.opacity*kernel[Math.min(512,Math.floor(d*128))]*1.8,i=j*4;
     values[i]+=c[0]*mass;values[i+1]+=c[1]*mass;values[i+2]+=c[2]*mass;values[i+3]+=mass;
    }
   }
  }
  for(let j=0;j<count;j++){
   const i=j*4,d=values[i+3];
   for(let c=0;c<3;c++)bytes[i+c]=d>0?Math.round(Math.min(1,values[i+c]/3)*255):0;
   bytes[i+3]=Math.round(Math.min(1,d/3)*255);
  }
  return bytes;
 }};
}

export function createFogVolume({bounds,solids,particles,colour,compact=false,projectionSource=()=>null}){
 const field=createFogField({bounds,solids,size:compact?[28,18,44]:[36,24,56]});
 const textures=[0,1].map(()=>{const t=new THREE.Data3DTexture(new Uint8Array(field.bytes.length),...field.size);t.format=THREE.RGBAFormat;t.type=THREE.UnsignedByteType;t.minFilter=t.magFilter=THREE.LinearFilter;t.unpackAlignment=1;t.needsUpdate=true;return t;});
 const uniforms={previous:{value:textures[0]},current:{value:textures[1]},blend:{value:1},depthMap:{value:null},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},boxMin:{value:new THREE.Vector3(...bounds.min)},boxMax:{value:new THREE.Vector3(...bounds.max)},clock:{value:0}};
 uniforms.projection={value:new THREE.Vector4()};
 uniforms.projectorOrigin={value:new THREE.Vector3()};uniforms.projectedImage={value:null};
 const material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
  vertexShader:'out vec2 uvOut;void main(){uvOut=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`precision highp sampler3D;
  in vec2 uvOut;out vec4 fogColour;uniform sampler3D previous,current;uniform sampler2D depthMap;
  uniform float blend,clock;uniform mat4 inverseProjection,cameraWorld;uniform vec3 boxMin,boxMax,projectorOrigin;uniform vec4 projection;uniform sampler2D projectedImage;
  float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
  float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
   return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  vec3 worldAt(float depth){vec4 v=inverseProjection*vec4(uvOut*2.-1.,depth*2.-1.,1.);return (cameraWorld*vec4(v.xyz/v.w,1.)).xyz;}
  float densityAt(vec3 p){
   vec3 uv=(p-boxMin)/(boxMax-boxMin);if(any(lessThan(uv,vec3(0)))||any(greaterThan(uv,vec3(1))))return 0.;
   float density=mix(texture(previous,uv).a,texture(current,uv).a,blend)*3.;
   float eddy=noise3(p*1.15-vec3(clock*.045,clock*.025,clock*.06));
   float fine=noise3(p*2.8+vec3(clock*.019,-clock*.04,0));
   vec3 edge=min(p-boxMin,boxMax-p);
   return density*(.55+.65*eddy+.16*fine)*smoothstep(0.,.25,min(edge.x,edge.z));
  }
  // Beer-Lambert extinction along the actual lens-to-point path. The same
  // world-space field affects the projected image and the viewer's sightline.
  float projectorTransmission(vec3 point){
   vec3 delta=point-projectorOrigin;float opticalDepth=0.;
   const int LIGHT_STEPS=${compact?8:12};
   for(int j=0;j<LIGHT_STEPS;j++)opticalDepth+=densityAt(projectorOrigin+delta*((float(j)+.5)/float(LIGHT_STEPS)));
   return exp(-opticalDepth*length(delta)*.8/float(LIGHT_STEPS));
  }
  vec3 projectorScatter(vec3 p,vec3 ray){
   if(projection.w<=0.)return vec3(0);
   float fraction=(p.z-projectorOrigin.z)/(projection.z-projectorOrigin.z);
   if(fraction<=.015||fraction>=1.)return vec3(0);
   vec2 offset=(p.xy-mix(projectorOrigin.xy,projection.xy,fraction))/(projection.w*fraction);
   float radius=length(offset);if(radius>=1.)return vec3(0);
   vec3 image=texture(projectedImage,offset*.5+.5).rgb;
   float edge=1.-smoothstep(.94,1.,radius);
   float forward=max(0.,dot(normalize(p-projectorOrigin),-ray));
   // A bounded single-scattering preview, not calibrated projector photometry.
   return image*edge*(.22+.5*pow(forward,4.))*projectorTransmission(p);
  }
  void main(){
   vec3 origin=cameraWorld[3].xyz,ray=normalize(worldAt(1.)-origin);
   vec3 inv=1./(ray+vec3(.000001)),a=(boxMin-origin)*inv,b=(boxMax-origin)*inv;
   vec3 near3=min(a,b),far3=max(a,b);float entry=max(0.,max(near3.x,max(near3.y,near3.z)));
   float exit=min(far3.x,min(far3.y,far3.z));
   float sceneDepth=texture(depthMap,uvOut).x;
   vec3 surface=worldAt(sceneDepth);
   bool projectedSurface=projection.w>0.&&origin.z>projection.z&&abs(surface.z-projection.z)<.02&&length(surface.xy-projection.xy)<projection.w;
   if(sceneDepth<.999999)exit=min(exit,length(worldAt(sceneDepth)-origin));
   if(exit<=entry){discard;}
   const int STEPS=${compact?32:48};float stepSize=(exit-entry)/float(STEPS),transmission=1.;vec3 accumulated=vec3(0.);
   for(int i=0;i<STEPS;i++){
    vec3 p=origin+ray*(entry+(float(i)+.5)*stepSize),uv=(p-boxMin)/(boxMax-boxMin);
    vec4 f0=texture(previous,uv),f1=texture(current,uv);
    float baseDensity=mix(f0.a,f1.a,blend)*3.;
    if(baseDensity<.002)continue;
    vec3 colour=mix(f0.rgb,f1.rgb,blend)/max(.0001,baseDensity/3.);
    float density=densityAt(p);
    colour+=projectorScatter(p,ray);
    float alpha=1.-exp(-density*stepSize*.8);
    accumulated+=transmission*alpha*colour;transmission*=1.-alpha;
    if(transmission<.02)break;
   }
   if(projectedSurface)transmission*=projectorTransmission(surface);
   float alpha=1.-transmission;if(alpha<.001)discard;
   fogColour=vec4(accumulated/max(alpha,.001),alpha);
  }`});
 const pass=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material),camera=new THREE.Camera();pass.add(quad);
 // Only the soft volume is calculated at half resolution. A depth-aware
 // upscale keeps silhouettes sharp; lighting, gobos and video stay native.
 const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false});
 const outputUniforms={fog:{value:target.texture},depthMap:{value:null},resolution:{value:new THREE.Vector2(1,1)},nearFar:{value:new THREE.Vector2()}};
 const composite=new THREE.ShaderMaterial({uniforms:outputUniforms,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
  vertexShader:'varying vec2 uvOut;void main(){uvOut=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`varying vec2 uvOut;uniform sampler2D fog,depthMap;uniform vec2 resolution,nearFar;
  float distanceAt(vec2 uv){float d=texture2D(depthMap,uv).x;return nearFar.x*nearFar.y/(nearFar.y-d*(nearFar.y-nearFar.x));}
  void main(){float depth=distanceAt(uvOut),total=0.;vec4 result=vec4(0.);vec2 pixel=uvOut*resolution-.5,base=floor(pixel),fraction=fract(pixel);
   for(int y=0;y<2;y++)for(int x=0;x<2;x++){
    vec2 cell=vec2(float(x),float(y)),uv=(base+cell+.5)/resolution;
    float bilinear=mix(1.-fraction.x,fraction.x,float(x))*mix(1.-fraction.y,fraction.y,float(y));
    float w=bilinear/(.05+abs(distanceAt(uv)-depth));vec4 sampleFog=texture2D(fog,uv);
    result+=sampleFog*w;total+=w;
   }
   result/=max(total,.00001);gl_FragColor=vec4(result.rgb/max(result.a,.001),result.a);
  }`});
 const screenSize=new THREE.Vector2(),clearColour=new THREE.Color();
 const interval=compact?.25:.2;let age=interval,time=0,visible=true,hasDensity=false;
 return {
  reset(){for(const t of textures){t.image.data.fill(0);t.needsUpdate=true;}age=interval;time=0;hasDensity=false;uniforms.blend.value=1;},
  setVisible(value){visible=value;},
  update(dt){time+=Math.max(0,dt||0);age+=Math.max(0,dt||0);uniforms.clock.value=time;
   if(age>=interval){
    const old=uniforms.previous.value;uniforms.previous.value=uniforms.current.value;uniforms.current.value=old;
    old.image.data.set(field.build(particles,colour));old.needsUpdate=true;age=0;
    hasDensity=particles.some(p=>p.active&&p.opacity>.001);
   }
   uniforms.blend.value=Math.min(1,age/interval);
  },
  render(renderer,depth,viewCamera){if(!visible||!hasDensity)return;
   const source=projectionSource();uniforms.projection.value.set(...(source?.screen||[0,0,0,0]));
   if(source){uniforms.projectorOrigin.value.set(...source.origin);uniforms.projectedImage.value=source.texture;}
   uniforms.depthMap.value=depth;uniforms.inverseProjection.value.copy(viewCamera.projectionMatrixInverse);uniforms.cameraWorld.value.copy(viewCamera.matrixWorld);
   const previousTarget=renderer.getRenderTarget(),clear=renderer.autoClear,clearAlpha=renderer.getClearAlpha();renderer.getClearColor(clearColour);
   renderer.getDrawingBufferSize(screenSize);const w=Math.ceil(screenSize.x/2),h=Math.ceil(screenSize.y/2);
   if(target.width!==w||target.height!==h){target.setSize(w,h);outputUniforms.resolution.value.set(w,h);}
   renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(target);quad.material=material;renderer.render(pass,camera);
   renderer.setClearColor(clearColour,clearAlpha);renderer.setRenderTarget(previousTarget);renderer.autoClear=false;
   outputUniforms.depthMap.value=depth;outputUniforms.nearFar.value.set(viewCamera.near,viewCamera.far);
   quad.material=composite;renderer.render(pass,camera);quad.material=material;renderer.autoClear=clear;
  },
  get gridSize(){return field.size;}
 };
}
