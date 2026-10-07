import assert from 'node:assert/strict';
import {sanitizeFx,motionAngles,coneHitsSphere,wheel} from './fixture-profiles.js';
assert.deepEqual([sanitizeFx({pan:999,tilt:-999,zoom:50,dimmer:-4}).pan,sanitizeFx({pan:999,tilt:-999,zoom:50,dimmer:-4}).tilt,sanitizeFx({zoom:50}).zoom], [270,-135,23]);
assert.equal(sanitizeFx({movement:'circle',gobo:5,pan:20},'source').movement,'static');
assert.equal(sanitizeFx({movement:'circle',gobo:5,pan:20},'source').gobo,0);
assert.equal(sanitizeFx({dimmer:0}).dimmer,0);
assert.equal(sanitizeFx({zoom:NaN}).zoom,15);
for(let t=0;t<60;t+=.1){const a=motionAngles(268,134,sanitizeFx({movement:'circle',amplitude:45}),t);assert.ok(a.pan<=270&&a.pan>=-270&&a.tilt<=135&&a.tilt>=-135);}
const modes=['static','sweep','tilt','circle','eight'];
const near=(actual,expected,note)=>assert.ok(Math.abs(actual-expected)<1e-9,`${note}: ${actual} != ${expected}`);
for(const movement of modes){
 assert.equal(sanitizeFx({movement}).movement,movement,`${movement} accepted on a moving head`);
 for(const kind of ['source','zoom','colorado','sl1','mini','par'])assert.equal(sanitizeFx({movement},kind).movement,'static',`${kind} stays fixed`);
 for(const period of [3,8,30]){
  const settings=sanitizeFx({movement,amplitude:45,period});
  for(const [basePan,baseTilt] of [[0,60],[268,134],[-268,-134]]){
   for(let i=-20;i<=120;i++){
    const time=i*period/100,value=motionAngles(basePan,baseTilt,settings,time),next=motionAngles(basePan,baseTilt,settings,time+period);
    assert.ok(Number.isFinite(value.pan)&&Number.isFinite(value.tilt),`${movement}: finite angles`);
    assert.ok(value.pan>=-270&&value.pan<=270&&value.tilt>=-135&&value.tilt<=135,`${movement}: mechanical bounds`);
    near(value.pan,next.pan,`${movement}: periodic pan`);near(value.tilt,next.tilt,`${movement}: periodic tilt`);
   }
  }
 }
 const settings=sanitizeFx({movement,amplitude:20,period:8});
 const samples=Array.from({length:65},(_,i)=>motionAngles(15,60,settings,i/8));
 const panSpan=Math.max(...samples.map(p=>p.pan))-Math.min(...samples.map(p=>p.pan));
 const tiltSpan=Math.max(...samples.map(p=>p.tilt))-Math.min(...samples.map(p=>p.tilt));
 if(movement==='static')for(const value of samples)assert.deepEqual(value,{pan:15,tilt:60},'Static orientation never changes');
 if(movement==='sweep'){assert.ok(panSpan>35,'Horizontal sweep moves pan');assert.equal(tiltSpan,0,'Horizontal sweep preserves tilt');}
 if(movement==='tilt'){assert.equal(panSpan,0,'Vertical sweep preserves pan');assert.ok(tiltSpan>35,'Vertical sweep moves tilt');}
 if(movement==='circle'||movement==='eight'){assert.ok(panSpan>35&&tiltSpan>15,`${movement}: both axes move`);}
 for(const time of [0,1,4,7.5,8])assert.deepEqual(motionAngles(15,60,{...settings,amplitude:0},time),{pan:15,tilt:60},`${movement}: zero amplitude remains stationary`);
}
assert.equal(sanitizeFx({movement:'unsupported'}).movement,'static');
const eight=sanitizeFx({movement:'eight',amplitude:20,period:8});
for(const time of [0,4,8]){const value=motionAngles(15,60,eight,time);near(value.pan,15,'Figure eight crosses its center');near(value.tilt,60,'Figure eight crosses its center');}
assert.ok(motionAngles(15,60,eight,1).tilt>60&&motionAngles(15,60,eight,3).tilt<60,'Figure eight crosses vertically within each pan excursion');
const ellipse=sanitizeFx({movement:'circle',amplitude:20,period:8});
assert.ok(Math.abs(motionAngles(15,60,ellipse,0).tilt-60)>5,'Ellipse remains distinct from figure eight at the pan center');
assert.equal(coneHitsSphere([0,0,0],[0,0,1],10,.2,[0,0,5],1.2),true);
assert.equal(coneHitsSphere([0,0,0],[0,0,1],10,.2,[4,0,5],1.2),false);
assert.equal(coneHitsSphere([0,0,0],[0,0,1],10,.2,[0,0,-2],1.2),false);
assert.equal(coneHitsSphere([0,0,0],[0,0,1],10,.2,[0,0,12],1.2),false);
assert.equal(wheel.length,8);
console.log('Studio: limites, appareils fixes, noir, 4 mouvements périodiques distincts + fixe, roue et protection écran OK.');
