import * as THREE from 'three';
import {createFogVolume} from './fog-volume.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const xyz=p=>Array.isArray(p)?[...p]:[p.x,p.y,p.z];

// Visual parcels, not CFD or photometric calibration. The warmed F-1 has a
// fixed assumed fan here; output changes NEW aerosol, never existing clouds.
export function createFogDynamics({origin,capacity=72,seed=91,bounds=null,solids=[]}){
 const nozzle=xyz(origin),random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const ground=bounds?.min[1]??Math.max(0,nozzle[1]-.17),supports=solids.filter(s=>s.support);
 const supportHeight=position=>{
  let height=ground;
  for(const s of supports)if(position[0]>=s.min[0]&&position[0]<=s.max[0]&&position[2]>=s.min[2]&&position[2]<=s.max[2]&&position[1]>=s.max[1]-.04)height=Math.max(height,s.max[1]);
  return height;
 };
 const particles=Array.from({length:capacity},()=>({active:false,age:0,life:0,position:[...nozzle],velocity:[0,0,0],radius:.1,opacity:0,mass:0,phase:0,spin:0,band:'high',spread:1,vertical:1}));
 let on=false,rate=.06,pump=0,credit=0,time=0,remainder=0,density=0,emitted=0;
 function birth(){
  const p=particles.find(p=>!p.active);if(!p)return;
  p.active=true;p.age=0;p.life=48+random()*8;p.phase=random()*Math.PI*2;p.spin=(random()-.5)*.07;
  // Two parcels in five remain low, the others gradually entrain upward.
  // Stable membership avoids switching a cloud's trajectory mid-flight.
  p.band=emitted++%5<2?'low':'high';p.spread=1;p.vertical=1;
  // Low output stays a fine mist; the upper half adds clearly denser parcels.
  p.mass=(.04+.96*Math.pow(rate,1.25))*(.8+random()*.4);p.radius=.09;p.opacity=0;
  p.position[0]=nozzle[0]+(random()-.5)*.025;p.position[1]=nozzle[1]+(random()-.5)*.016;p.position[2]=nozzle[2];
  p.velocity[0]=.025+(random()-.5)*.03;p.velocity[1]=.035;p.velocity[2]=.8+(random()-.5)*.12;
 }
 function advance(dt){
  time+=dt;pump+=(Number(on)-pump)*(1-Math.exp(-dt/(on?1.05:.38)));
  if(!on&&pump<.001)pump=0;
  // Longer-lived parcels fill the room gradually. The lower birth rate keeps
  // the same bounded pool, including at sustained maximum output.
  credit+=pump*1.3*dt;while(credit>=1){birth();credit-=1;}
  let aerosol=0;
  for(const p of particles){
   if(!p.active)continue;p.age+=dt;
   if(p.age>=p.life){p.active=false;p.opacity=0;continue;}
   const age=p.age,previous=[...p.position],blend=1-Math.exp(-dt*.78),turbulence=smooth(.3,4,age);
   // Both bands share the nozzle jet before gently separating into drifting
   // low haze and rising entrainment. Coherent eddies prevent two rigid jets.
   const low=p.band==='low',flow=[.14+.035*Math.sin(time*.19+p.position[2]*.65+p.phase),.095+.06*Math.exp(-age/8),.22+.04*Math.cos(time*.14+p.phase)];
   flow[0]+=((low?.13:.075)*Math.sin(p.phase)+.055*Math.sin(age*.7+p.phase))*turbulence;
   if(low){
    const height=supportHeight(p.position)+.15+.035*Math.sin(time*.35+p.phase);
    flow[1]=clamp((height-p.position[1])*.65,-.14,.10)+.012*Math.cos(age*.58+p.phase)*turbulence;
    flow[2]-=.025*turbulence;
   }else flow[1]+=.024*Math.cos(age*.58+p.phase)*turbulence;
   for(let axis=0;axis<3;axis++){p.velocity[axis]+=(flow[axis]-p.velocity[axis])*blend;p.position[axis]+=p.velocity[axis]*dt;}
   if(bounds)for(let axis=0;axis<3;axis++){
    const low=bounds.min[axis]+.025,high=bounds.max[axis]-.025;
    if(p.position[axis]<low){p.position[axis]=low;p.velocity[axis]=Math.max(0,p.velocity[axis])*.2;}
    if(p.position[axis]>high){p.position[axis]=high;p.velocity[axis]=Math.min(0,p.velocity[axis])*.2;}
   }
   for(const solid of solids){
    if(!p.position.every((v,i)=>v>solid.min[i]&&v<solid.max[i]))continue;
    let axis=-1,edge=0,distance=Infinity;
    for(let i=0;i<3;i++)for(const side of ['min','max']){
     const outside=side==='min'?previous[i]<=solid.min[i]:previous[i]>=solid.max[i],delta=Math.abs(p.position[i]-solid[side][i]);
     if(outside&&delta<distance){axis=i;edge=solid[side][i]+(side==='min'?-.015:.015);distance=delta;}
    }
    if(axis>=0){p.position[axis]=edge;p.velocity[axis]=0;}
   }
   // Entrainment widens neighbouring parcels into one plume instead of
   // leaving isolated little puffs. Age, not output, controls this spread.
   p.radius=Math.min(2.6,.12+.038*age+.014*Math.pow(age,1.18));
   p.spread=1+(low?.4:.14)*turbulence;p.vertical=1+(low?-.58:.10)*turbulence;
   if(!on)p.mass*=Math.exp(-dt/30);
   const tail=1-smooth(p.life*.55,p.life,age),mass=p.mass*Math.exp(-age/22)*tail;
   p.opacity=.80*mass*smooth(0,.38,age)/(1+age*.05);aerosol+=mass;
  }
  density+=(clamp(aerosol/17,0,1)-density)*(1-Math.exp(-dt/.8));
  if(!on&&pump===0&&!particles.some(p=>p.active)){density=0;credit=0;}
 }
 return {
  particles,
  reset(){on=false;rate=.06;pump=0;credit=0;time=0;remainder=0;density=0;emitted=0;for(const p of particles){p.active=false;p.opacity=0;}},
  get state(){return {on,rate};},get density(){return density;},get emission(){return pump;},
  set(value){on=!!value?.on;const n=Number(value?.rate);if(Number.isFinite(n))rate=clamp(n,.05,1);},
  toggle(){on=!on;},
  update(dt){if(!Number.isFinite(dt)||dt<=0)return;remainder+=Math.min(dt,.25);while(remainder>=1/60-1e-10){advance(1/60);remainder-=1/60;}},
  sampleDensity(point){
   const q=Array.isArray(point)?point:null;let sum=0;
   const x=q?q[0]:point.x,y=q?q[1]:point.y,z=q?q[2]:point.z;
   if(y<ground)return 0;
   for(const s of solids)if(x>s.min[0]&&x<s.max[0]&&y>s.min[1]&&y<s.max[1]&&z>s.min[2]&&z<s.max[2])return 0;
   for(const p of particles){
    if(!p.active||p.opacity<.00001)continue;
    const dx=(x-p.position[0])/p.spread,dy=(y-p.position[1])/p.vertical,dz=(z-p.position[2])/p.spread;
    const radius=p.radius*1.5,d2=(dx*dx+dy*dy+dz*dz)/(radius*radius);
    if(d2<9)sum+=p.opacity*5*Math.exp(-d2*1.5);
   }
   return clamp(sum,0,1);
  }
 };
}

export function createFogPreview({scene,origin,projectionSource}){
 const floor=scene.getObjectByName('Sol_salle'),ceiling=scene.getObjectByName('Plafond');
 let bounds=null;const solids=[];
 if(floor){floor.updateWorldMatrix(true,false);const box=new THREE.Box3().setFromObject(floor);bounds={min:[box.min.x,box.max.y,box.min.z],max:[box.max.x,ceiling?ceiling.position.y-.06:origin.y+3,box.max.z]};}
 scene.traverse(o=>{
  if(!o.isMesh||o.geometry.type!=='BoxGeometry')return;
  const selected=o.name.startsWith('Scene_')||['Table_1.80x0.75','Facade_DJ','Colonne_bois_repere_photo'].includes(o.name)||(o.parent?.name==='Bar_cote_droit_public_indicatif'&&o.geometry.parameters.width>.3&&o.geometry.parameters.depth>3);
  if(selected){o.updateWorldMatrix(true,false);const b=new THREE.Box3().setFromObject(o);solids.push({min:b.min.toArray(),max:b.max.toArray(),support:o.name.startsWith('Scene_')});}
 });
 const dynamics=createFogDynamics({origin,bounds,solids});
 // Sampling precedes HDR rendering; its final step restores every light's
 // visibility. We therefore never read a leftover six-light batch.
 let lights=null;
 function lightSamples(){
  if(!lights){lights=[];scene.traverse(light=>{if(light.isSpotLight||light.isPointLight)lights.push({light,position:new THREE.Vector3(),direction:new THREE.Vector3()});});}
  const live=[];
  for(const item of lights){const light=item.light;if(!light.visible||light.intensity<=0)continue;light.getWorldPosition(item.position);if(light.isSpotLight){light.target.getWorldPosition(item.direction);item.direction.sub(item.position).normalize();}live.push(item);}
  return live;
 }
 function illuminate(p,lights){
  let red=0,green=0,blue=0;
  for(const {light,position,direction} of lights){
   const dx=p.position[0]-position.x,dy=p.position[1]-position.y,dz=p.position[2]-position.z,d2=Math.max(.04,dx*dx+dy*dy+dz*dz),distance=Math.sqrt(d2);
   if(light.distance>0&&distance>=light.distance)continue;
   let power=light.intensity/Math.pow(distance,light.decay||2)*(light.isPointLight?.22:1);
   if(light.distance>0)power*=Math.pow(Math.max(0,1-Math.pow(distance/light.distance,4)),2);
   if(light.isSpotLight){
    const cosine=(dx*direction.x+dy*direction.y+dz*direction.z)/distance,spread=Math.atan2(p.radius*.35,distance);
    const outer=Math.cos(Math.min(Math.PI*.49,light.angle+spread)),inner=Math.cos(Math.max(.001,light.angle*(1-light.penumbra)));
    if(cosine<=outer)continue;power*=smooth(outer,Math.max(inner,outer+.0001),cosine);
   }
   red+=power*light.color.r;green+=power*light.color.g;blue+=power*light.color.b;
  }
  const level=Math.max(red,green,blue),illumination=1-Math.exp(-level*.032),safe=Math.max(.00001,level);
  // The concentrated young jet remains legible in weak ambient light, then
  // loses that visibility as it disperses. Coloured spots still dominate it.
  // This is a small visual ambient-scattering floor, never an emitted light.
  const youngJet=1-smooth(.5,4,p.age),ambient=.018+.040*youngJet;
  return [ambient+.52*red/safe*illumination,ambient+.52*green/safe*illumination,ambient+.003+.52*blue/safe*illumination].map(v=>Math.pow(Math.max(0,v),1/2.2));
 }
 let lit=[];
 const volume=createFogVolume({projectionSource,bounds:bounds||{min:[origin.x-5,0,origin.z-3],max:[origin.x+5,origin.y+4,origin.z+15]},solids,particles:dynamics.particles,colour:p=>illuminate(p,lit),compact:typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches});
 return {
  reset(){dynamics.reset();volume.reset();},
  clear(){const rate=dynamics.state.rate;this.reset();dynamics.set({on:false,rate});},
  setVisible(value){volume.setVisible(value);},get state(){return dynamics.state;},
  set(value){dynamics.set(value);},toggle(){dynamics.toggle();},get density(){return dynamics.density;},
  sampleDensity:point=>dynamics.sampleDensity(point),
  render:(renderer,depth,camera)=>volume.render(renderer,depth,camera),
  update(dt){dynamics.update(dt);lit=lightSamples();volume.update(dt);}
 };
}
