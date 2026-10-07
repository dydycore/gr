import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coneHitsSphere,sanitizeFx} from './fixture-profiles.js';
import {distributionFor} from './optical-distributions.js';

// The preview's 90 deg field is retained, not presented as a manufacturer
// photometric measurement. This checks direct geometric clearance only.
const layout=JSON.parse(readFileSync(new URL('./implantation.json',import.meta.url),'utf8'));
const fixture=layout.fixtures.find(f=>f.id==='SL1');
assert.ok(fixture,'SL1 exists');
assert.equal(fixture.kind,'sl1','SL1 remains the fixed DMG soft panel');
assert.deepEqual([fixture.x,fixture.y,fixture.z],[0,.65,3.4],'Keep the installed position');
const fixed=sanitizeFx({movement:'circle',pan:40,tilt:20,gobo:5,rotation:12},'sl1');
assert.equal(fixed.movement,'static');assert.equal(fixed.gobo,0);assert.equal(fixed.rotation,0);
assert.equal(fixed.pan,null);assert.equal(fixed.tilt,null);
const field=distributionFor('sl1').field;
assert.equal(field,90,'Do not narrow the SL1 preview field to bypass the screen protection');
const alpha=field*Math.PI/360,slope=Math.tan(alpha);
const reserve=layout.screen.reservationDiameter/2+.15;
assert.ok(Math.abs(reserve-1.2)<1e-9,'Keep screen sphere radius 1.20 m');
assert.equal(layout.lightingProtection.screenSphereRadius,1.2);
const origin=[fixture.x,fixture.z,-fixture.y];
const screen=[layout.screen.x,layout.screen.z,-layout.screen.y];
const bar=layout.bar;
const boxes=[{
 name:'bar',min:[bar.x-bar.width/2,0,-bar.y-bar.depth/2],
 max:[bar.x+bar.width/2,bar.top,-bar.y+bar.depth/2]
},...layout.columns.map((column,index)=>({
 name:`column ${index+1}`,min:[column.x-column.width/2,0,-column.y-column.depth/2],
 max:[column.x+column.width/2,layout.venue.ceiling,-column.y+column.depth/2]
}))];
const cells=[];
for(const box of boxes){
 const count=box.min.map((value,axis)=>Math.ceil((box.max[axis]-value)/.16));
 const size=box.min.map((value,axis)=>(box.max[axis]-value)/count[axis]);
 const radius=Math.hypot(...size)/2;
 for(let x=0;x<count[0];x++)for(let y=0;y<count[1];y++)for(let z=0;z<count[2];z++){
  cells.push({name:box.name,radius,center:[x,y,z].map((cell,axis)=>box.min[axis]+size[axis]*(cell+.5))});
 }
}

function directionFor(target){
 const delta=[target[0]-origin[0],target[2]-origin[1],-target[1]-origin[2]];
 const distance=Math.hypot(...delta);return {direction:delta.map(value=>value/distance),distance};
}
const original=directionFor([-.375,1.1,1.6096]);
assert.equal(coneHitsSphere(origin,original.direction,original.distance,slope,screen,reserve),true,
 'Regression: the old torso target entered the sphere even before the beam continued toward the floor');

const rows=[];
assert.deepEqual(fixture.focus.slamTarget,fixture.focus.danceTarget,'One manually set focus, no motorized mode change');
for(const mode of ['slam','dance']){
 assert.equal(fixture.focus[mode+'On'],true,`${mode}: SL1 available`);
 const target=fixture.focus[mode+'Target'];
 assert.equal(target[0],layout.slam.x,`${mode}: preserve artist horizontal aim`);
 assert.equal(target[1],layout.slam.y,`${mode}: preserve artist depth aim`);
 const {direction,distance}=directionFor(target);
 const shallowest=direction[1]*Math.cos(alpha)+Math.sqrt(1-direction[1]**2)*Math.sin(alpha);
 assert.ok(shallowest<0,`${mode}: every cone edge points toward a lower surface`);
 let margin=Infinity,completeLength=0;
 for(const offset of [0,.24]){
  const start=origin.map((value,axis)=>value+direction[axis]*offset);
  // Continue to the furthest floor-ellipse edge, not just the artist or the
  // central floor impact. Ignoring nearer stage/wall interception is stricter.
  const length=(-start[1]/shallowest)*Math.cos(alpha)+.01;
  completeLength=Math.max(completeLength,length);
  assert.ok(length>distance-offset,`${mode}: check volume after the artist target`);
  assert.equal(coneHitsSphere(start,direction,length,slope,screen,reserve),false,
   `${mode}: SL1 full 90 deg cone intersects the screen reserve; manually raise aim toward the upper body`);
  const hit=cells.find(cell=>coneHitsSphere(start,direction,length,slope,cell.center,cell.radius));
  assert.equal(hit,undefined,`${mode}: full cone intersects conservative ${hit?.name} cover`);
  const v=screen.map((value,axis)=>value-start[axis]);
  const axial=v.reduce((sum,value,axis)=>sum+value*direction[axis],0);
  const radial=Math.sqrt(Math.max(0,v.reduce((sum,value)=>sum+value*value,0)-axial**2));
  margin=Math.min(margin,radial-Math.max(0,axial)*slope-reserve*Math.sqrt(1+slope*slope)-.035);
 }
 assert.ok(margin>.15,`${mode}: retain at least 15 cm beyond the sphere and numerical padding`);
 rows.push({mode,target,margin,completeLength});
}
console.log(`SL1 PASS: fixed panel at [0, .65, 3.4]; original 90 deg field; one manual target [${rows[0].target.join(', ')}]; no motorized motion or gobo.`);
console.log(`Old target regression correctly blocks. New direct cone margin=${Math.min(...rows.map(r=>r.margin)).toFixed(4)} m beyond unchanged R1.20 m reserve; checked to floor edge up to ${rows[0].completeLength.toFixed(3)} m.`);
console.log(`No screen/bar/column intersection from body or forward emitter (${cells.length} conservative obstacle cells). Stage illumination is intended.`);
console.log('Limits: approximate dimensions and 90-degree preview model; reflected spill, real optics, mounting and physical strobe response are not certified.');
