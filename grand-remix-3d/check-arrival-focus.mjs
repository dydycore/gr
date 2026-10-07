import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coneHitsSphere,profiles} from './fixture-profiles.js';
import {distributionFor} from './optical-distributions.js';
import {createAmbience} from './ambiences.js';

// Full-cone checks against indicative geometry, not venue certification or
// calibrated illuminance. A white 100% command is not a promise of uniform lux.
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const layout=read('./implantation.json'),focus=read('./arrival-focus.json');
const ids=['102','103','104','105','111'];
assert.deepEqual(Object.keys(focus).sort(),ids,'Exactly five arrival-only moving-head focuses');
const screen=[layout.screen.x,layout.screen.z,-layout.screen.y];
const reserve=layout.screen.reservationDiameter/2+.15;
assert.ok(Math.abs(reserve-1.2)<1e-9,'Keep screen reserve R1.20 m');
assert.equal(layout.lightingProtection.screenSphereRadius,1.2,'Do not reduce protection');
const bar=layout.bar;
const boxes=[{
 name:'bar',min:[bar.x-bar.width/2,0,-bar.y-bar.depth/2],
 max:[bar.x+bar.width/2,bar.top,-bar.y+bar.depth/2]
},...layout.columns.map((column,index)=>({
 name:`column ${index+1}`,min:[column.x-column.width/2,0,-column.y-column.depth/2],
 max:[column.x+column.width/2,layout.venue.ceiling,-column.y+column.depth/2]
})),{
 name:'stage',min:[-layout.venue.width/2,0,-layout.venue.stageDepth],
 max:[layout.venue.width/2,layout.venue.stageHeight,0]
}];
// Closed spheres cover every point of <=16 cm cells in each obstacle. The
// shared cone helper retains its extra 35 mm padding. Including the entire
// stage volume rejects spill on its top, edges and front, not just axis hits.
const cells=[];
for(const box of boxes){
 const count=box.min.map((value,axis)=>Math.ceil((box.max[axis]-value)/.16));
 const size=box.min.map((value,axis)=>(box.max[axis]-value)/count[axis]);
 const radius=Math.hypot(...size)/2;
 for(let x=0;x<count[0];x++)for(let y=0;y<count[1];y++)for(let z=0;z<count[2];z++){
  cells.push({name:box.name,radius,center:[x,y,z].map((cell,axis)=>box.min[axis]+size[axis]*(cell+.5))});
 }
}

const reports=[];
for(const id of ids){
 const fixture=layout.fixtures.find(f=>f.id===id),aim=focus[id];
 assert.equal(fixture.kind,'moving',`${id}: existing moving head`);
 assert.equal(fixture.notUsed,false,`${id}: usable fixture`);
 assert.ok(aim.target.every(Number.isFinite)&&aim.target.length===3,`${id}: finite target`);
 assert.equal(aim.target[2],0,`${id}: room floor target`);
 assert.ok(aim.target[1]<0,`${id}: target is in the public area`);
 assert.ok(aim.zoom>=profiles.moving.zoom[0]&&aim.zoom<=profiles.moving.zoom[1],`${id}: real optical zoom range`);
 assert.ok(Math.abs(aim.pan)<=270&&Math.abs(aim.tilt)<=135,`${id}: mechanical limits`);
 const origin=[fixture.x,fixture.z,-fixture.y];
 const delta=[aim.target[0]-origin[0],aim.target[2]-origin[1],-aim.target[1]-origin[2]];
 const distance=Math.hypot(...delta),expected=delta.map(value=>value/distance);
 const p=aim.pan*Math.PI/180,t=aim.tilt*Math.PI/180;
 const direction=[Math.sin(p)*Math.sin(t),-Math.cos(t),Math.cos(p)*Math.sin(t)];
 assert.ok(Math.hypot(...direction.map((value,axis)=>value-expected[axis]))<1e-7,`${id}: stored angles reproduce the PDF target`);
 const alpha=distributionFor('moving',aim.zoom).field*Math.PI/360,slope=Math.tan(alpha);
 const u0=[direction[2],0,-direction[0]],uLength=Math.hypot(...u0),u=u0.map(value=>value/uLength);
 const w=[direction[1]*u[2]-direction[2]*u[1],direction[2]*u[0]-direction[0]*u[2],direction[0]*u[1]-direction[1]*u[0]];
 const footprint=[[Infinity,-Infinity],[Infinity,-Infinity]];
 // At grazing angles, the far edge reaches much farther than the center ray.
 // The analytic minimum vertical direction gives a conservative finite cone
 // length enclosing every ray until it hits the floor. Do not truncate at
 // the center's floor impact, which can miss a subsequent bar intersection.
 const highestEdge=direction[1]*Math.cos(alpha)+Math.sqrt(1-direction[1]**2)*Math.sin(alpha);
 assert.ok(highestEdge<0,`${id}: every edge reaches the floor`);
 const completeLength=(-origin[1]/highestEdge)*Math.cos(alpha)+.01;
 for(let sample=0;sample<1440;sample++){
  const phase=sample*2*Math.PI/1440;
  const ray=direction.map((value,axis)=>value*Math.cos(alpha)+(u[axis]*Math.cos(phase)+w[axis]*Math.sin(phase))*Math.sin(alpha));
  const rayLength=-origin[1]/ray[1];
  const floor=[origin[0]+ray[0]*rayLength,-(origin[2]+ray[2]*rayLength)];
  for(let axis=0;axis<2;axis++){
   footprint[axis][0]=Math.min(footprint[axis][0],floor[axis]);
   footprint[axis][1]=Math.max(footprint[axis][1],floor[axis]);
  }
 }
 assert.ok(footprint[0][0]>-layout.venue.width/2+.05&&footprint[0][1]<layout.venue.width/2-.05,`${id}: floor ellipse stays between side walls`);
 assert.ok(footprint[1][0]>-layout.venue.roomDepth+.05,`${id}: floor ellipse does not disappear behind the rear wall`);
 assert.ok(footprint[1][1]<-.2,`${id}: floor footprint stays clear of the stage edge`);
 assert.equal(coneHitsSphere(origin,direction,completeLength,slope,screen,reserve),false,`${id}: full cone clears the screen`);
 const obstruction=cells.find(cell=>coneHitsSphere(origin,direction,completeLength,slope,cell.center,cell.radius));
 assert.equal(obstruction,undefined,`${id}: full cone intersects the conservative ${obstruction?.name} cover`);
 const v=screen.map((value,axis)=>value-origin[axis]),axial=v.reduce((sum,value,axis)=>sum+value*direction[axis],0);
 const radial=Math.sqrt(Math.max(0,v.reduce((sum,value)=>sum+value*value,0)-axial**2));
 const margin=radial-Math.max(0,axial)*slope-reserve*Math.sqrt(1+slope*slope)-.035;
 assert.ok(margin>.12,`${id}: retain at least 12 cm beyond the screen reserve and padding`);
 reports.push({id,margin,footprint});
}

// Explicit spatial spread: two front focuses, one middle focus, two rear
// focuses on opposite sides, with at least 2.4 m between target centers.
const targets=Object.values(focus).map(value=>value.target);
assert.equal(targets.filter(t=>t[1]>=-2.5).length,2,'Two front audience zones');
assert.equal(targets.filter(t=>t[1]<=-3.5&&t[1]>=-5.5).length,1,'One middle audience zone');
const rear=targets.filter(t=>t[1]<=-6.5);
assert.equal(rear.length,2,'Two rear audience zones');
assert.ok(rear.some(t=>t[0]<=-1.5)&&rear.some(t=>t[0]>=1),'Rear lighting covers left and right');
assert.ok(targets.some(t=>t[0]<=-2.5)&&targets.some(t=>t[0]>=1),'Left and right audience spread');
for(let a=0;a<targets.length;a++)for(let b=a+1;b<targets.length;b++){
 assert.ok(Math.hypot(targets[a][0]-targets[b][0],targets[a][1]-targets[b][1])>=2.4,'Avoid piling all head axes onto one area');
}

// Verify the actual preset consumes the shared JSON, without moving fixtures
// or changing the PAR targets. The explicit exception is 201 at 45% so the
// DJ can see the decks; other stage sources remain off.
const arrival=createAmbience('arrival',layout.fixtures);
const activeIds=new Set([...ids,'S1','S2','S3','S4','S5','S6']);
for(const fixture of layout.fixtures){
 const fx=arrival.prefs[fixture.id];
 assert.equal(fx.dimmer,fixture.id==='201'?45:activeIds.has(fixture.id)?100:0,`${fixture.id}: arrival intensity`);
 if(activeIds.has(fixture.id))assert.equal(arrival.colors[fixture.id],'#ffffff',`${fixture.id}: arrival white`);
 if(ids.includes(fixture.id)){
  assert.equal(fx.movement,'static',`${fixture.id}: fixed arrival focus`);
  assert.equal(fx.gobo,0,`${fixture.id}: no arrival gobo`);
  assert.equal(fx.rotation,0,`${fixture.id}: no arrival rotation`);
  for(const property of ['pan','tilt','zoom'])assert.equal(fx[property],focus[fixture.id][property],`${fixture.id}: JSON ${property} applied`);
 }
}
assert.equal(arrival.videoOn,true,'Screen projector shows the welcome visual during arrival');
console.log(`Arrival PASS: five static white heads + six white PARs at 100%; 201 deck light at 45%, other stage sources and 112 off; shared JSON angles match targets.`);
console.log(`Full cones to farthest floor edge: 0 screen/bar/column/stage intersections (${cells.length} covering cells); all 7,200 sampled footprint edges remain inside the room.`);
console.log(`Screen R1.20 m unchanged; extra margins ${reports.map(r=>`${r.id}=${r.margin.toFixed(4)}`).join(' / ')} m. Spread: two front, one middle, rear left + right; target separation >=2.4 m.`);
console.log('Limits: indicative venue dimensions, sampled footprint edges, no calibrated lux/uniformity or physical installation validation.');
