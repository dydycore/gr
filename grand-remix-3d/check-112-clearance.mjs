import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ambienceDefinitions,createAmbience} from './ambiences.js';
import {coneHitsSphere,motionAngles,sanitizeFx} from './fixture-profiles.js';

// Geometric regression aid, not an installation or eye-safety certificate.
// The screen, bar and column coordinates are approximate venue-plan values.
// Each moving cycle is sampled at 1,441 times; time between samples, unknown
// scenery, indirect spill, people and real focus/calibration remain unverified.
const layout=JSON.parse(readFileSync(new URL('./implantation.json',import.meta.url),'utf8'));
const fixture=layout.fixtures.find(f=>String(f.id)==='112');
assert.ok(fixture,'Fixture 112 exists');
assert.equal(fixture.notUsed,false,'112 must be explicitly reactivated');
const origin=[fixture.x,fixture.z,-fixture.y];
const screen=[layout.screen.x,layout.screen.z,-layout.screen.y];
const screenVector=screen.map((value,axis)=>value-origin[axis]);
const reservation=layout.screen.reservationDiameter/2+.15;
assert.ok(Math.abs(reservation-1.2)<1e-9,'Preserve the 1.20 m screen reserve');
assert.equal(layout.lightingProtection.screenSphereRadius,1.2,'Protection radius must stay unchanged');
const sourceDistance=Math.hypot(...screenVector);
assert.ok(sourceDistance>reservation,'112 is outside the screen reserve');

// Cover the complete solid bar and columns by closed spheres around <=16 cm
// cells. Every point of every AABB belongs to a sphere; rejecting the cone
// against all those spheres is conservative, including the fixture-profiles
// helper additional 35 mm padding. This checks beam edges, not just its axis.
const bar=layout.bar;
const boxes=[{
 name:'bar',min:[bar.x-bar.width/2,0,-bar.y-bar.depth/2],
 max:[bar.x+bar.width/2,bar.top,-bar.y+bar.depth/2]
},...layout.columns.map((column,index)=>({
 name:`column ${index+1}`,
 min:[column.x-column.width/2,0,-column.y-column.depth/2],
 max:[column.x+column.width/2,layout.venue.ceiling,-column.y+column.depth/2]
}))];
const obstacles=[];
for(const box of boxes){
 const count=box.min.map((value,axis)=>Math.ceil((box.max[axis]-value)/.16));
 const size=box.min.map((value,axis)=>(box.max[axis]-value)/count[axis]);
 const radius=Math.hypot(...size)/2;
 for(let x=0;x<count[0];x++)for(let y=0;y<count[1];y++)for(let z=0;z<count[2];z++){
  const center=[x,y,z].map((cell,axis)=>box.min[axis]+size[axis]*(cell+.5));
  obstacles.push({name:box.name,center,radius});
 }
}

function baseAngles(target){
 assert.ok(Array.isArray(target)&&target.length===3,'Explicit plan target');
 const delta=[target[0]-origin[0],target[2]-origin[1],-target[1]-origin[2]];
 const length=Math.hypot(...delta);
 return {pan:Math.atan2(delta[0],delta[2])*180/Math.PI,
  tilt:Math.acos(-delta[1]/length)*180/Math.PI};
}

const checked=new Map();
let references=0,totalSamples=0;
function verify(label,raw,target){
 references++;
 const fx=sanitizeFx(raw,'moving'),base=baseAngles(target);
 const pan=fx.pan??base.pan,tilt=fx.tilt??base.tilt;
 const key=JSON.stringify([pan,tilt,fx.zoom,fx.movement,fx.amplitude]);
 if(checked.has(key))return checked.get(key);
 const slope=Math.tan(fx.zoom*Math.PI/360),steps=fx.movement==='static'?1:1441;
 let minimum=Infinity;
 const range=[[Infinity,-Infinity],[Infinity,-Infinity]];
 for(let index=0;index<steps;index++){
  const angles=motionAngles(pan,tilt,fx,steps===1?0:index*fx.period/(steps-1));
  const p=angles.pan*Math.PI/180,t=angles.tilt*Math.PI/180;
  const direction=[Math.sin(p)*Math.sin(t),-Math.cos(t),Math.cos(p)*Math.sin(t)];
  assert.ok(direction.every(Number.isFinite)&&direction[1]<0,`${label}: finite downward beam`);
  // Include the entire oblique floor ellipse, not just the center's impact.
  // Otherwise an upper beam edge can still strike the bar after the center
  // ray has already reached the floor. The analytic shallowest edge bounds
  // the whole above-floor cone; keep the additional 1 cm numerical padding.
  const alpha=fx.zoom*Math.PI/360;
  const highestEdge=direction[1]*Math.cos(alpha)+Math.sqrt(1-direction[1]**2)*Math.sin(alpha);
  assert.ok(highestEdge<0,`${label}: the complete cone points down to the floor`);
  const length=(-origin[1]/highestEdge)*Math.cos(alpha)+.01;
  assert.equal(coneHitsSphere(origin,direction,length,slope,screen,reservation),false,
   `${label}: screen reserve intersection at ${index}/${steps-1}`);
  const axial=screenVector.reduce((sum,value,axis)=>sum+value*direction[axis],0);
  const radial=Math.sqrt(Math.max(0,sourceDistance**2-axial**2));
  minimum=Math.min(minimum,radial-Math.max(0,axial)*slope-reservation*Math.sqrt(1+slope*slope)-.035);
  const hit=obstacles.find(obstacle=>coneHitsSphere(origin,direction,length,slope,obstacle.center,obstacle.radius));
  assert.equal(hit,undefined,`${label}: conservative ${hit?.name} cover intersection at ${index}/${steps-1}`);
  const centerLength=-origin[1]/direction[1];
  for(const [axis,value] of [origin[0]+direction[0]*centerLength,-(origin[2]+direction[2]*centerLength)].entries()){
   range[axis][0]=Math.min(range[axis][0],value);range[axis][1]=Math.max(range[axis][1],value);
  }
 }
 totalSamples+=steps;
 const result={label,minimum,range};checked.set(key,result);return result;
}

const defaults=[];
for(const mode of ['slam','dance']){
 assert.equal(fixture.focus[mode+'On'],true,`112 enabled in default ${mode} focus`);
 defaults.push(verify(`default ${mode}, static 15 deg`,{zoom:15,movement:'static'},fixture.focus[mode+'Target']));
}
const presetRows=[];
for(const definition of ambienceDefinitions){
 const ambience=createAmbience(definition.id,layout.fixtures),fx=ambience.prefs['112'];
 assert.ok(fx,`${definition.id}: explicit 112 preferences`);
 if(['arrival','opening'].includes(definition.id)){
  assert.equal(fx.dimmer,0,`${definition.id}: fixture 112 remains off by request`);continue;
 }
 assert.ok(fx.dimmer>0,`${definition.id}: fixture 112 is used`);
 const target=fixture.focus[ambience.mode==='dance'?'danceTarget':'slamTarget'];
 presetRows.push(verify(`preset ${definition.id}`,fx,target));
 // Timeline blocks may later change the optics or head motion. Validate every
 // distinct geometry over its whole motion cycle, even during dimmer-off blocks.
 for(const [index,step] of (ambience.timelines?.['112']?.steps??[]).entries()){
  verify(`${definition.id} block ${index+1}`,{...fx,...step.fx},target);
 }
}

const spans=[.4,.5,.7,.85,1].map(span=>{
 const result=verify(`amplitude x${span}`,{
  pan:-30,tilt:58,zoom:12,movement:'sweep',amplitude:6*span,period:10
 },fixture.focus.danceTarget);
 return {span,...result};
});
const worst=Math.min(...[...checked.values()].map(result=>result.minimum));
console.log(`112 PASS: ${ambienceDefinitions.length} presets, timeline blocks, static defaults at 15 deg and five amplitude scales; ${checked.size} distinct geometries / ${totalSamples} samples (${references} references).`);
console.log(`Screen R=${reservation.toFixed(2)} m unchanged; source distance=${sourceDistance.toFixed(3)} m; minimum extra cone margin=${worst.toFixed(4)} m.`);
console.log(`Whole-beam checks through the farthest floor-ellipse edge: 0 intersections with screen or conservative cover of bar + ${layout.columns.length} columns (${obstacles.length} cells).`);
console.log(`Amplitude scales .4/.5/.7/.85/1 margins: ${spans.map(result=>result.minimum.toFixed(4)).join(' / ')} m. Static 15 deg: ${defaults[0].minimum.toFixed(4)} m.`);
console.log('Limits: approximate plan dimensions; sampled motion; no physical rig, optical spill, audience or eye-safety validation.');
