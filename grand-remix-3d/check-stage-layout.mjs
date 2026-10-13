import assert from 'node:assert/strict';
import layout from './implantation.json' with {type:'json'};
import published from './published-lighting.json' with {type:'json'};
import {coneHitsSphere,motionAngles,sanitizeFx} from './fixture-profiles.js';
import {distributionFor} from './optical-distributions.js';
import {sampleFixtureTimeline} from './fixture-timeline.js';
import {restoredFixtureIds} from './stage-lighting.mjs';
import {migratePromotedLighting} from './published-lighting-state.mjs';

assert.equal(layout.projector.id,'P0');
assert.equal(layout.projector.x,0);
assert.ok(Math.abs(layout.projector.y-(275-110)/70.55)<1e-6,'Original venue LX position, not B4');
assert.equal(layout.projector.mountBar,null);
assert.equal(layout.screen.x,0);
assert.equal(layout.slam.x,0);
assert.ok(Math.abs(layout.screen.diameter-20*.3048/Math.PI)<1e-6,'20 ft circumference');
assert.ok(layout.screen.y>3.2&&layout.screen.y<layout.venue.stageDepth-.18-.055-.072-.03,'Screen at rear, wholly in front of curtain folds');
assert.equal(layout.fixtures.length,42);
assert.equal(layout.removedFixtures.length,0);
assert.ok(layout.fixtures.every(f=>!f.notUsed&&f.focus.slamOn&&f.focus.danceOn));
assert.equal(published.geometryId,layout.geometryId);

const screen=[layout.screen.x,layout.screen.z,-layout.screen.y];
const reserve=layout.lightingProtection.screenSphereRadius;
assert.equal(reserve,1.2,'Keep the conservative screen reserve');
let samples=0;
function checkBeam(f,fx,time,mode,label){
 if(fx.dimmer<=0)return;
 const origin=[f.x,f.z,-f.y],target=f.focus[mode==='dance'?'danceTarget':'slamTarget'];
 const delta=[target[0]-origin[0],target[2]-origin[1],-target[1]-origin[2]],length=Math.hypot(...delta),direction=delta.map(v=>v/length);
 const pan0=Math.atan2(direction[0],direction[2])*180/Math.PI,tilt0=Math.acos(-direction[1])*180/Math.PI;
 const a=motionAngles(fx.pan??pan0,fx.tilt??tilt0,fx,time),pan=a.pan*Math.PI/180,tilt=a.tilt*Math.PI/180;
 const aim=[Math.sin(pan)*Math.sin(tilt),-Math.cos(tilt),Math.cos(pan)*Math.sin(tilt)];
 const field=distributionFor(f.kind,fx.zoom).field;
 assert.equal(coneHitsSphere(origin,aim,aim[1]<0?-f.z/aim[1]:15,Math.tan(field*Math.PI/360),screen,reserve),false,`${label}/${f.id} at ${time}s: screen conflict`);
 samples++;
}
for(const f of layout.fixtures)checkBeam(f,sanitizeFx({dimmer:100},f.kind),0,'slam','default');
for(const [id,scene] of Object.entries(published.presetOverrides)){
 for(const fid of restoredFixtureIds)assert.ok(scene.prefs[fid].dimmer>0&&scene.colors[fid]!=='#000000',`${id}/${fid}: restored fixture active`);
 if(!['arrival','opening'].includes(id)){
  const track=scene.timelines['106'];assert.ok(track?.enabled,id+': editable movement on restored 106');
  const fx=track.steps[0].fx;
  assert.notEqual(fx.movement,'static');assert.ok(fx.amplitude>=4);
  const angles=Array.from({length:33},(_,i)=>motionAngles(0,50,fx,fx.period*i/32));
  assert.ok(Math.max(...angles.map(a=>a.pan))-Math.min(...angles.map(a=>a.pan))>4,id+': 106 really changes its angle over a cycle');
 }
 for(const f of layout.fixtures)for(let i=0;i<600;i++){
  const time=i/20,fx=sampleFixtureTimeline(scene.timelines[f.id],time,f.kind,{flashes:true})?.fx||scene.prefs[f.id];
  checkBeam(f,fx,time,scene.mode, id);
 }
}
const local={catalogueVersion:2,scenes:[{...structuredClone(published.migration.previousLayout.presetOverrides.pinky),name:'Ma scène'}],presetOverrides:structuredClone(published.migration.previousLayout.presetOverrides)};
local.scenes[0].prefs['201'].dimmer=37;
const migrated=migratePromotedLighting(local,published);
assert.deepEqual(migrated.presetOverrides,{},'Old unchanged public copies cannot mask the new layout');
assert.equal(migrated.scenes.length,1,'Personal scenes are retained');
assert.equal(migrated.scenes[0].prefs['201'].dimmer,37,'Personal unrelated settings are retained');
assert.equal(migratePromotedLighting(migrated,published),migrated,'No recurring reset of later edits');
console.log(`Stage layout PASS: original P0, centred 20-ft screen clear of curtain, 42 available fixtures, eight updated ambiences, ${samples} direct-cone samples clear of the screen reserve, personal saves preserved. Physical focus remains to be checked in the venue.`);
