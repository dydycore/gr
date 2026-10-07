import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ambienceDefinitions,createAmbience} from './ambiences.js';
import {profiles,sanitizeFx,coneHitsSphere} from './fixture-profiles.js';
import {distributionFor} from './optical-distributions.js';

// Regression check against the current indicative venue geometry. This does
// not validate physical mounting, real spill, spectators or optical safety.
const layout=JSON.parse(readFileSync(new URL('./implantation.json',import.meta.url),'utf8'));
const fixture=layout.fixtures.find(f=>String(f.id)==='210');
assert.ok(fixture,'Fixture 210 exists');
assert.equal(fixture.kind,'colorado','210 remains the fixed COLORado');
assert.equal(fixture.notUsed,false,'210 is explicitly reactivated');
assert.notEqual(profiles.colorado.motorized,true,'Do not invent pan/tilt motors');
const wantedTarget=[-.375,1.1,2.0];
for(const mode of ['slam','dance']){
 assert.equal(fixture.focus[mode+'On'],true,`210 is available in ${mode}`);
 assert.deepEqual(fixture.focus[mode+'Target'],wantedTarget,`${mode}: same manually focused upper-body target`);
}
const field=distributionFor(fixture.kind).field;
assert.equal(field,28,'Protect the full COLORado field of 28 deg, not only its 15 deg core');
for(const zoom of [10,12,15,18,23]){
 assert.equal(distributionFor(fixture.kind,zoom).field,28,'A generic zoom control cannot narrow a fixed COLORado');
}
function fixedFx(fx,label){
 assert.equal(fx.movement,'static',`${label}: fixed head`);
 assert.equal(fx.pan,null,`${label}: no motorized pan override`);
 assert.equal(fx.tilt,null,`${label}: no motorized tilt override`);
 assert.equal(fx.gobo,0,`${label}: no invented gobo`);
 assert.equal(fx.rotation,0,`${label}: no gobo rotation`);
}
fixedFx(sanitizeFx({movement:'circle',pan:80,tilt:50,gobo:7,rotation:20},'colorado'),'Sanitizer');
let fxReferences=0;
for(const definition of ambienceDefinitions){
 const ambience=createAmbience(definition.id,layout.fixtures),fx=ambience.prefs['210'];
 assert.ok(fx,`${definition.id}: explicit 210 state`);
 fixedFx(fx,definition.id);fxReferences++;
 for(const [index,step] of (ambience.timelines?.['210']?.steps??[]).entries()){
  fixedFx({...fx,...step.fx},`${definition.id} block ${index+1}`);fxReferences++;
 }
}

const reserve=layout.screen.reservationDiameter/2+.15;
assert.ok(Math.abs(reserve-1.2)<1e-9,'Keep the screen reserve at 1.20 m');
assert.equal(layout.lightingProtection.screenSphereRadius,1.2,'Do not weaken protection');
const screen=[layout.screen.x,layout.screen.z,-layout.screen.y];
const origin=[fixture.x,fixture.z,-fixture.y];
const target=[wantedTarget[0],wantedTarget[2],-wantedTarget[1]];
const delta=target.map((value,axis)=>value-origin[axis]);
const targetDistance=Math.hypot(...delta),direction=delta.map(value=>value/targetDistance);
const sourceDistance=Math.hypot(...screen.map((value,axis)=>value-origin[axis]));
assert.ok(sourceDistance>reserve,'Source lies outside the screen reserve');
assert.ok(direction[1]<0,'Upper-body aim points downward');
const slope=Math.tan(field*Math.PI/360);

// Every point of the bar/column boxes is inside a sphere around a <=16 cm
// cell. Cone rejection against all cell spheres conservatively checks the
// whole beam footprint rather than just its centerline. The shared helper
// retains its additional 35 mm padding.
const bar=layout.bar;
const boxes=[{
 name:'bar',min:[bar.x-bar.width/2,0,-bar.y-bar.depth/2],
 max:[bar.x+bar.width/2,bar.top,-bar.y+bar.depth/2]
},...layout.columns.map((column,index)=>({
 name:`column ${index+1}`,min:[column.x-column.width/2,0,-column.y-column.depth/2],
 max:[column.x+column.width/2,layout.venue.ceiling,-column.y+column.depth/2]
}))];
const obstacles=[];
for(const box of boxes){
 const count=box.min.map((value,axis)=>Math.ceil((box.max[axis]-value)/.16));
 const size=box.min.map((value,axis)=>(box.max[axis]-value)/count[axis]);
 const radius=Math.hypot(...size)/2;
 for(let x=0;x<count[0];x++)for(let y=0;y<count[1];y++)for(let z=0;z<count[2];z++){
  obstacles.push({name:box.name,radius,center:[x,y,z].map((cell,axis)=>box.min[axis]+size[axis]*(cell+.5))});
 }
}

let minimum=Infinity;
// Check both the fixture origin used by screen protection and the preview
// light emitter 24 cm forward, extending each cone to the room floor even
// where the artist, DJ booth or stage would intercept it earlier.
for(const offset of [0,.24]){
 const start=origin.map((value,axis)=>value+direction[axis]*offset);
 const length=-start[1]/direction[1];
 assert.ok(length>targetDistance-offset,'Test includes the volume beyond the artist target');
 assert.equal(coneHitsSphere(start,direction,length,slope,screen,reserve),false,`Offset ${offset}: screen clearance`);
 const v=screen.map((value,axis)=>value-start[axis]);
 const axial=v.reduce((sum,value,axis)=>sum+value*direction[axis],0);
 const radial=Math.sqrt(Math.max(0,v.reduce((sum,value)=>sum+value*value,0)-axial*axial));
 minimum=Math.min(minimum,radial-Math.max(0,axial)*slope-reserve*Math.sqrt(1+slope*slope)-.035);
 const hit=obstacles.find(obstacle=>coneHitsSphere(start,direction,length,slope,obstacle.center,obstacle.radius));
 assert.equal(hit,undefined,`Offset ${offset}: cone intersects conservative ${hit?.name} cover`);
}
console.log(`210 PASS: fixed COLORado, full ${field} deg field; target [${wantedTarget.join(', ')}] unchanged in both modes; ${fxReferences} preset/timeline settings have no motorized motion or gobos.`);
console.log(`Screen reserve=${reserve.toFixed(2)} m; source distance=${sourceDistance.toFixed(4)} m; extra cone margin=${minimum.toFixed(4)} m; field radius at artist=${(targetDistance*slope).toFixed(3)} m.`);
console.log(`Cones extended to room floor from body and light emitter: 0 intersections with screen or bar + ${layout.columns.length} columns (${obstacles.length} covering cells).`);
console.log('Limits: indicative venue dimensions and optical preview; real focus, spill, mounting and audience safety require on-site checks.');
