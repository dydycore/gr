import assert from 'node:assert/strict';
import {createFogDynamics} from './fog-preview.js';
const origin=[-3.46,.7796,-1.2525];
const tick=(fog,seconds,hz=60)=>{for(let i=0;i<Math.round(seconds*hz);i++)fog.update(1/hz);};
const active=fog=>fog.particles.filter(p=>p.active);
const fog=createFogDynamics({origin});
assert.deepEqual(fog.state,{on:false,rate:.35});tick(fog,20);
assert.equal(active(fog).length,0);assert.equal(fog.density,0);assert.equal(fog.sampleDensity(origin),0);
fog.set({on:true,rate:.6});assert.equal(active(fog).length,0,'Starting cannot fill the room instantly');
fog.update(.1);assert.ok(fog.emission>0&&fog.emission<.2,'Fan output ramps in');
tick(fog,5);assert.ok(active(fog).length>0&&active(fog).length<20,'Local progressive release');
assert.ok(active(fog).every(p=>Math.hypot(...p.position.map((v,i)=>v-origin[i]))<4),'No distant instantaneous cloud');
assert.ok(active(fog).some(p=>p.position[1]>origin[1]+.15),'Buoyancy raises the plume');
assert.ok(active(fog).some(p=>p.age>3&&p.velocity[2]<.3),'Fan jet slows into room drift');
assert.equal(fog.sampleDensity([8,2,9]),0,'A distant point has no haze');
const cloud=active(fog)[0];assert.ok(fog.sampleDensity(cloud.position)>0,'Local concentration exists in a parcel');
const oldMass=cloud.mass,oldOpacity=cloud.opacity;fog.set({on:true,rate:.05});
assert.equal(cloud.mass,oldMass);assert.equal(cloud.opacity,oldOpacity,'A rate change does not alter existing clouds');
tick(fog,30);assert.ok(active(fog).length<=72,'Bounded 72-parcel pool');
for(const p of active(fog)){
 assert.ok(p.position.every(Number.isFinite)&&p.velocity.every(Number.isFinite));
 assert.ok(p.radius>0&&p.opacity>=0&&p.opacity<=1);
}
fog.set({on:false,rate:.05});const residual=active(fog).length;
assert.ok(residual>0);fog.update(.1);assert.ok(active(fog).length>0,'Stop leaves a residual plume');
assert.ok(fog.emission>0,'Fan output ramps down');
tick(fog,35);assert.ok(active(fog).length>0,'OFF leaves a slowly dissipating residual instead of clearing the room early');
tick(fog,25);assert.equal(active(fog).length,0);assert.equal(fog.density,0,'Long-lived residual eventually dissipates');
fog.toggle();tick(fog,5);fog.reset();assert.deepEqual(fog.state,{on:false,rate:.35});assert.equal(active(fog).length,0);assert.equal(fog.sampleDensity(origin),0);

const simulate=hz=>{const f=createFogDynamics({origin});f.set({on:true,rate:.5});tick(f,10,hz);return f;};
const rates=[.05,.35,.7,1].map(rate=>{const f=createFogDynamics({origin});f.set({on:true,rate});tick(f,8);return f;});
for(let i=1;i<rates.length;i++){
 assert.equal(rates[i].particles.length,72,'More fog does not allocate more particles');
 assert.equal(active(rates[i]).length,active(rates[i-1]).length,'Rate changes density, not the particle budget');
 const opacity=f=>active(f).reduce((sum,p)=>sum+p.opacity,0);
 assert.ok(opacity(rates[i])>opacity(rates[i-1]),'The rate slider increases cloud opacity monotonically');
 const sample=active(rates[i-1])[0].position;
 assert.ok(rates[i].sampleDensity(sample)>=rates[i-1].sampleDensity(sample),'Beam density follows the denser cloud');
}
const at30=simulate(30),at60=simulate(60),at120=simulate(120);
assert.deepEqual(at30.particles,at60.particles,'Same dynamics at 30 and 60 fps');
assert.deepEqual(at120.particles,at60.particles,'Same dynamics at 120 and 60 fps');

// Reproduce the raised stage and nearby booth: low clouds must settle along
// the support, then descend only after leaving its edge. Upper clouds retain
// gradual buoyancy instead of teleporting into a uniform room haze.
const stage={min:[-4.2672,0,-3.6576],max:[4.2672,.6096,0],support:true};
const booth={min:[-3.9,.6096,-2.475],max:[-2.1,1.5096,-1.725]};
function stageCloud(hz){
 const f=createFogDynamics({origin,bounds:{min:[-4.2672,0,-3.6576],max:[4.2672,3.81,10.668]},solids:[stage,booth]});
 const bands=new Map();f.set({on:true,rate:.6});
 for(let frame=0;frame<15*hz;frame++){
  f.update(1/hz);
  for(const p of active(f)){
   if(bands.has(p))assert.equal(p.band,bands.get(p),'A parcel never changes band mid-flight');
   else bands.set(p,p.band);
   for(const solid of [stage,booth])assert.ok(!p.position.every((value,axis)=>value>solid.min[axis]&&value<solid.max[axis]),'No parcel passes through the stage or booth');
  }
 }
 return f;
}
const layered=stageCloud(60),layered30=stageCloud(30),layered120=stageCloud(120);
assert.deepEqual(layered30.particles,layered.particles,'Layered flow stays identical at 30 and 60 fps');
assert.deepEqual(layered120.particles,layered.particles,'Layered flow stays identical at 120 and 60 fps');
const all=active(layered),low=all.filter(p=>p.band==='low'),high=all.filter(p=>p.band==='high');
assert.ok(low.length/all.length>=.35&&low.length/all.length<=.45,'Approximately 40% low / 60% rising parcels');
const matureLow=low.filter(p=>p.age>=5),matureHigh=high.filter(p=>p.age>=5);
const averageHeight=parcels=>parcels.reduce((sum,p)=>sum+p.position[1],0)/parcels.length;
assert.ok(matureLow.length>=5&&matureHigh.length>=5,'Both spatial groups exist after 15 seconds');
assert.ok(averageHeight(matureLow)<.5,'Mature low haze remains close to the audience floor after leaving the stage');
assert.ok(averageHeight(matureHigh)>1.3,'Mature upper haze rises gradually above the nozzle');
assert.ok(averageHeight(matureHigh)-averageHeight(matureLow)>.8,'The two components occupy distinct heights');
assert.ok(Math.max(...matureLow.map(p=>p.position[0]))-Math.min(...matureLow.map(p=>p.position[0]))>.8,'Low parcels spread laterally');
assert.ok(matureLow.every(p=>p.spread>p.vertical),'Low density kernels and rendered puffs are wider than tall');
assert.equal(layered.sampleDensity([-3.3,.4,-.5]),0,'No density inside the raised stage');
assert.equal(layered.sampleDensity([-3,1,-2]),0,'No density inside the DJ booth');
assert.equal(layered.sampleDensity([0,-.1,1]),0,'No density under the room floor');
layered.set({on:false,rate:.6});tick(layered,1);
assert.ok(active(layered).some(p=>p.band==='low')&&active(layered).some(p=>p.band==='high'),'OFF preserves both residual components');
tick(layered,60);assert.equal(active(layered).length,0,'Both long-lived residual components eventually dissipate');
layered.reset();assert.equal(layered.density,0);assert.deepEqual(layered.state,{on:false,rate:.35});

// Observe transport over a whole minute, with the actual stage/booth scale.
// Detect gradual arrival at the centre and rear rather than uniform opacity.
const roomCloud=()=>createFogDynamics({origin,bounds:{min:[-4.2672,0,-3.6576],max:[4.2672,3.81,10.668]},solids:[stage,booth]});
const spreading=roomCloud(),checkpoints=new Map();spreading.set({on:true,rate:.6});
for(let frame=1;frame<=3600;frame++){
 spreading.update(1/60);
 for(const p of active(spreading))for(const solid of [stage,booth])
  assert.ok(!p.position.every((value,axis)=>value>solid.min[axis]&&value<solid.max[axis]),'Long transport never enters the stage or booth');
 if([300,900,2700,3600].includes(frame)){
  const visible=active(spreading).filter(p=>p.opacity>.004);
  checkpoints.set(frame/60,{count:visible.length,depth:Math.max(...visible.map(p=>p.position[2])),width:Math.max(...visible.map(p=>p.position[0]))-Math.min(...visible.map(p=>p.position[0])),centre:spreading.sampleDensity([0,1.5,4]),rear:spreading.sampleDensity([1,2.2,8])});
 }
}
assert.equal(checkpoints.get(5).centre,0);assert.equal(checkpoints.get(15).rear,0,'No instant haze at the rear');
assert.ok(checkpoints.get(15).depth>checkpoints.get(5).depth&&checkpoints.get(45).depth>checkpoints.get(15).depth,'Clouds travel gradually away from the nozzle');
assert.ok(checkpoints.get(45).depth>7&&checkpoints.get(45).width>5,'After 45 seconds the plume reaches across the room and towards the rear');
assert.ok(checkpoints.get(60).count>50&&checkpoints.get(60).count<=72,'Sustained haze fills the existing pool progressively');
for(const point of [[0,.2,4],[0,1.5,4],[0,2.8,4],[1,2.2,8]])assert.ok(spreading.sampleDensity(point)>.02,'Low, middle, upper and rear room volumes coexist');
assert.equal(spreading.sampleDensity([-3,1,-2]),0,'Broader kernels still exclude the DJ booth');
for(const hz of [30,120]){const f=roomCloud();f.set({on:true,rate:.6});tick(f,60,hz);assert.deepEqual(f.particles,spreading.particles,'Long-lived, recycled parcels stay frame-rate independent');}

const constrained=createFogDynamics({origin:[0,.7,0],bounds:{min:[-1,0,-1],max:[1,2,2]},solids:[{min:[-.9,0,.5],max:[.9,1.5,.8]}]});
constrained.set({on:true,rate:1});
for(let i=0;i<3600;i++){
 constrained.update(1/60);
 for(const p of active(constrained)){
  assert.ok(p.position[0]>=-1&&p.position[0]<=1&&p.position[1]>=0&&p.position[1]<=2&&p.position[2]>=-1&&p.position[2]<=2,'Room boundary');
  assert.ok(!(p.position[0]>-.9&&p.position[0]<.9&&p.position[1]>0&&p.position[1]<1.5&&p.position[2]>.5&&p.position[2]<.8),'Parcel cannot enter the booth boundary');
 }
}
const sample={x:0,y:1.5,z:3},start=performance.now();let sum=0;
for(let n=0;n<80000;n++)sum+=at60.sampleDensity(sample);
assert.ok(Number.isFinite(sum));
console.log('Fog: OFF, progressive nozzle jet, buoyancy, drift, local density, bounded pool, rate independence, OFF residue, dissipation, reset, frame-rate independence and coarse solid boundaries passed.');
console.log('Layered plume: approximately 40% low spreading haze / 60% rising haze at 15 s, stage/booth exclusion, both OFF residues and 30/60/120 fps equivalence passed.');
console.log('Room filling: gradual centre/rear arrival over 45-60 s, coexisting low/high haze, unchanged 72-parcel limit and long-run 30/60/120 fps equivalence passed.');
console.log('80,000 local density queries in '+Math.round(performance.now()-start)+' ms (Node CPU check; not a browser frame-rate measurement).');
