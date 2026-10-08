import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ambienceDefinitions,createAmbience,ambienceDuration} from './ambiences.js';
import {profiles,wheel,motionAngles,coneHitsSphere} from './fixture-profiles.js';
import publishedLighting from './published-lighting.json' with {type:'json'};

const layout=JSON.parse(readFileSync(new URL('./implantation.json',import.meta.url),'utf8'));
const fixtures=layout.fixtures;
const expected=['arrival','opening','dream','red_alert','warm','pinky','dj','hiphop'];
const authored=new Set(['opening','pinky']);
const inputBefore=JSON.stringify(fixtures);
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;}
freeze(fixtures);
const definitions=ambienceDefinitions.map(d=>d.id);
assert.equal(new Set(definitions).size,definitions.length,'Ambience IDs must be unique');
assert.deepEqual([...definitions].sort(),[...expected].sort(),'Exactly the eight requested ambiences');
const fixtureIDs=fixtures.map(f=>f.id).sort();
const active=(s,id)=>s.prefs[id].dimmer>0&&s.colors[id]!=='#000000';
const color=(s,id)=>s.colors[id]||'#ffffff';
const scenes=Object.fromEntries(expected.map(id=>[id,createAmbience(id,fixtures)]));

for(const [id,s] of Object.entries(scenes)){
 assert.equal(s.id,id);
 assert.ok(typeof s.name==='string'&&s.name.trim(),`${id}: readable name`);
 assert.ok(['setup','slam','dance'].includes(s.mode),`${id}: valid focus mode`);
 assert.equal(typeof s.videoOn,'boolean',`${id}: explicit video state`);
 assert.deepEqual(Object.keys(s.prefs).sort(),fixtureIDs,`${id}: explicit intensity for every fixture`);
 for(const id of Object.keys(s.colors))assert.ok(fixtureIDs.includes(id),`${s.id}: unknown color fixture ${id}`);
 for(const f of fixtures){
  const p=s.prefs[f.id],c=color(s,f.id),cue=s.mode==='dance'?'dance':'slam';
  assert.ok(Number.isFinite(p.dimmer)&&p.dimmer>=0&&p.dimmer<=100,`${id}/${f.id}: bounded dimmer`);
  assert.match(c,/^#[\da-f]{6}$/i,`${id}/${f.id}: valid color`);
  if(profiles[f.kind].color==='gel')assert.ok(['#ffffff','#000000'].includes(c),`${id}/${f.id}: no invented gel`);
  if(f.kind==='moving')assert.ok(c==='#000000'||wheel.some(([,hex])=>hex===c),`${id}/${f.id}: real color wheel`);
  else{
   assert.equal(p.gobo,0,`${id}/${f.id}: fixed fixture cannot have a gobo`);
   assert.equal(p.movement,'static',`${id}/${f.id}: fixed fixture cannot move`);
  }
  if(!authored.has(id)&&(f.notUsed||!f.focus[cue+'On']))assert.equal(p.dimmer,0,`${id}/${f.id}: excluded fixture must remain off`);
 }
 if(id!=='arrival')assert.ok(active(s,'101'),`${id}: DJ retains fixture 101`);
}

const arrival=scenes.arrival;
assert.equal(arrival.videoOn,true,'Arrival includes its welcome projection');
for(const f of fixtures){
 if(f.id==='201'){assert.equal(arrival.prefs[f.id].dimmer,45,'DJ decks retain their steady task light');continue;}
 if(/^S[1-6]$/.test(f.id)){assert.equal(arrival.prefs[f.id].dimmer,100,'Arrival white PARs full intensity');assert.equal(color(arrival,f.id),'#ffffff');}
 else if(['102','103','104','105','111'].includes(f.id)){assert.equal(arrival.prefs[f.id].dimmer,100,'Bright arrival');assert.equal(color(arrival,f.id),'#ffffff','Arrival matches default white');assert.equal(arrival.prefs[f.id].movement,'static');assert.equal(arrival.prefs[f.id].gobo,0);assert.equal(arrival.timelines[f.id],undefined);}
 else assert.equal(arrival.prefs[f.id].dimmer,0,`Arrival stage fixture ${f.id} is off`);
}

const opening=scenes.opening;
for(const id of authored){
 const original=publishedLighting.presetOverrides[id];
 for(const key of ['prefs','colors','timelines','view'])assert.deepEqual(scenes[id][key],original[key],id+': promoted user settings stay exact');
 assert.equal(scenes[id].videoMode,id);
}
assert.equal(color(opening,'101'),'#ff40cb','Opening DJ magenta');
assert.equal(opening.prefs['1'].dimmer,0,'White fixture 1 must not wash out DJ magenta');
for(const id of ['2','3','4']){
 assert.ok(active(opening,id),`Opening artist front ${id}`);
 assert.equal(color(opening,id),'#ffffff',`Opening white artist front ${id}`);
}
for(const id of ['S1','S2','S3','S4','S5','S6','102','103','104','105','111','112'])
 assert.equal(opening.prefs[id].dimmer,0,`Opening public fixture ${id} is off`);

for(const id of ['hiphop']){
 const colours=new Set(fixtures.filter(f=>f.id!=='201'&&active(scenes[id],f.id)).map(f=>color(scenes[id],f.id)).filter(c=>c!=='#ffffff'));
 assert.deepEqual([...colours].sort(),['#35dcff','#ff40cb'].sort(),`${id}: only two dominant colours, with neutral face fill`);
}

const hiphop=scenes.hiphop;
assert.equal(hiphop.prefs['112'].zoom,12);
assert.equal(hiphop.prefs['112'].amplitude,6);
assert.equal(hiphop.prefs['112'].gobo,7);
for(const s of Object.values(scenes).filter(s=>!authored.has(s.id)))assert.equal(active(s,'112'),!['arrival','opening'].includes(s.id),s.id+': 112 follows moving room gobos, off for arrival and opening');
assert.equal(hiphop.prefs['2'].dimmer,0,'Hip-hop avoids multiple white keys');
assert.equal(hiphop.prefs['4'].dimmer,0,'Hip-hop avoids multiple white keys');
assert.ok(hiphop.prefs['3'].dimmer<=20,'Hip-hop retains only a gentle white face fill');
for(const id of ['102','103','104','111']){
 assert.ok(hiphop.prefs[id].period<scenes.warm.prefs[id].period,'Hip-hop head motion faster than slam');
 assert.ok(Math.abs(hiphop.prefs[id].rotation)>Math.abs(scenes.warm.prefs[id].rotation),'Hip-hop gobos faster than slam');
}
assert.ok(new Set(['102','103','104','111'].map(id=>hiphop.prefs[id].period)).size>=3,'Concurrent head speeds differ');
for(const id of ['102','103','104','111'])assert.ok(hiphop.prefs[id].amplitude>=22,`${id}: room sweeps visibly widened`);

assert.equal(JSON.stringify(fixtures),inputBefore,'Creating ambiences does not mutate the implantation');
const first=createAmbience('opening',fixtures),original=createAmbience('opening',fixtures);
first.prefs['101'].dimmer=0;first.colors['101']='#000000';
assert.deepEqual(createAmbience('opening',fixtures),original,'Each call returns independent scene data');
assert.equal(JSON.stringify(fixtures),inputBefore,'Editing an ambience cannot mutate the implantation');
// A moving preset should not repeatedly enter the screen exclusion and visibly
// blink as the protection cuts it. Sample its complete cycle conservatively to
// the room floor; nearer scenery can only shorten the beam in the renderer.
const screenCenter=[layout.screen.x,layout.screen.z,-layout.screen.y];
const reserve=layout.screen.reservationDiameter/2+.15;
// The authored tracks retain the renderer's geometric cutout. Do not claim
// these custom orientations have the original generated presets' clearance.
for(const s of Object.values(scenes).filter(s=>!authored.has(s.id)))for(const f of fixtures){
 if(f.kind!=='moving'||!active(s,f.id))continue;
 const origin=[f.x,f.z,-f.y],target=f.focus[s.mode==='dance'?'danceTarget':'slamTarget'];
 const delta=[target[0]-origin[0],target[2]-origin[1],-target[1]-origin[2]];
 const length=Math.hypot(...delta),direction=delta.map(v=>v/length),fx=s.prefs[f.id];
 const basePan=Math.atan2(direction[0],direction[2])*180/Math.PI;
 const baseTilt=Math.acos(-direction[1])*180/Math.PI;
 for(let step=0;step<=1440;step++){
  const a=motionAngles(fx.pan??basePan,fx.tilt??baseTilt,fx,step*fx.period/1440);
  const pan=a.pan*Math.PI/180,tilt=a.tilt*Math.PI/180;
  const aim=[Math.sin(pan)*Math.sin(tilt),-Math.cos(tilt),Math.cos(pan)*Math.sin(tilt)];
  const distance=aim[1]<0?-origin[1]/aim[1]:15;
  assert.equal(coneHitsSphere(origin,aim,distance,Math.tan(fx.zoom*Math.PI/360),screenCenter,reserve),false,
   `${s.id}/${f.id}: moving beam enters screen reserve at cycle sample ${step}/1440`);
 }
}
assert.equal(ambienceDuration,30,'30-second ambience maximum');
for(const s of Object.values(scenes)){
 assert.equal(s.duration,30);
 assert.equal(s.prefs['201'].dimmer,authored.has(s.id)?publishedLighting.presetOverrides[s.id].prefs['201'].dimmer:45,s.id+': preserved DJ decks intensity');
 if(!authored.has(s.id))assert.ok(['#b8fff2','#ffc1e7','#ffc1d0','#e8fff7','#b8ccff','#adcaff','#ae8bff','#ffe0ad','#ff6060'].includes(s.colors['201']),s.id+': deck colour follows the ambience');
 assert.equal(s.timelines['201'],undefined,s.id+': DJ work light never flashes');
 for(const track of Object.values(s.timelines)){
  assert.ok(track.steps.length<=10,'At most ten visible blocks');
  const duration=track.steps.reduce((t,b)=>t+b.duration,0);
  assert.ok(authored.has(s.id)?duration<=30:Math.abs(duration-30)<1e-9,'Maximum thirty seconds for authored tracks; generated loops remain thirty seconds');
 }
 if(!authored.has(s.id)&&s.id!=='arrival')for(const id of ['102','103','104','105','111']){
  assert.ok(s.timelines[id]?.enabled,`${s.id}/${id}: room movements appear in editable timeline`);
 }
}
for(const id of ['arrival','dj'])assert.equal(scenes[id].artistVisible,false,id+': artist absent');
for(const id of ['opening','dream','warm']){
 assert.equal(scenes[id].prefs['101'].gobo,0,id+': full DJ spot for calmer scenes');
 assert.equal(scenes[id].prefs['101'].movement,'static',id+': steady DJ focus');
}
assert.equal(scenes.dj.prefs['101'].dimmer,100,'DJ transition has full coloured spot');
for(const id of ['202','207'])assert.equal(scenes.dj.prefs[id].dimmer,85,'Strong coloured DJ wash');
for(const id of ['dream','warm'])for(const f of fixtures.filter(f=>active(scenes[id],f.id)))assert.notEqual(color(scenes[id],f.id),'#ffffff',id+': no white source');
assert.equal(scenes.dream.fog.rate,.06);assert.equal(scenes.red_alert.fog.rate,.07);assert.equal(scenes.warm.fog.rate,.05);
for(const scene of Object.values(scenes))assert.ok(scene.fog.rate>=0&&scene.fog.rate<=.07,'All ambiences capped at 7%');
for(const id of ['102','103','104','105','111','112'])assert.ok(scenes.red_alert.prefs[id].period<scenes.warm.prefs[id].period,'Red faster than warm');
for(const [id,gobo] of Object.entries({dream:6,red_alert:7,warm:2})){
 const scene=scenes[id],moving=fixtures.filter(f=>f.kind==='moving'&&active(scene,f.id));
 assert.deepEqual([...new Set(moving.map(f=>scene.prefs[f.id].gobo).filter(index=>index>0))],[gobo],id+': exactly one factory gobo motif');
 const sequenceGobos=new Set();
 for(const f of moving){
  const expectedGobo=f.id==='101'&&id!=='red_alert'?0:gobo;
  assert.equal(scene.prefs[f.id].gobo,expectedGobo,id+'/'+f.id+': scene motif or intentionally open DJ');
  const timeline=scene.timelines[f.id];assert.ok(timeline?.enabled,id+'/'+f.id+': editable sequence exists');
  for(const step of timeline.steps){
   assert.equal(step.fx.gobo,expectedGobo,id+'/'+f.id+': motif remains unchanged through all 30 seconds');
   if(step.fx.gobo>0)sequenceGobos.add(step.fx.gobo);
  }
 }
 assert.deepEqual([...sequenceGobos],[gobo],id+': timeline palette contains one gobo shape');
}
assert.deepEqual(scenes.dj.timelines['101'].steps.map(step=>step.fx.gobo),[0,6,0],'DJ full/gobo/full sequence unchanged');
for(const [fid,gobo]of Object.entries({'101':6,'102':2,'103':4,'104':6,'105':3,'111':1,'112':7}))assert.equal(scenes.hiphop.prefs[fid].gobo,gobo,'Hip-hop varied motifs unchanged');
console.log('Ambiences: 8 presets, promoted Pinky/opening data unchanged, 30-second editable timelines; generated presets retain their original screen-clearance checks.');

for(const fid of ['101','102','103','104','105','111','112'])assert.equal(scenes.dream.colors[fid],'#35dcff');
for(const fid of ['202','207']){assert.equal(scenes.dream.colors[fid],'#0078ff');assert.equal(scenes.dream.prefs[fid].dimmer,65,'Steady blue DJ wash at65%');}
for(const fid of ['203','204','208','209','210','251','252'])assert.equal(scenes.dream.colors[fid],'#005eff');
assert.equal(scenes.red_alert.prefs.SL1.dimmer,80);
assert.equal(scenes.dream.name,'Bleu océan');
assert.equal(scenes.dream.colors['201'],'#adcaff','Ocean-blue deck fill stays pale blue');
assert.deepEqual([...new Set(fixtures.filter(f=>active(scenes.dream,f.id)).map(f=>color(scenes.dream,f.id)))].sort(),['#005eff','#0078ff','#35dcff','#adcaff'].sort(),'Ocean-blue scene contains only physical cyan and blue RGB fills, with no magenta or red');
console.log('Final palette: physical cyan gobos, blue DJ, vivid blue RGB and pale blue decks; SL1 red-scene peak80%.');
