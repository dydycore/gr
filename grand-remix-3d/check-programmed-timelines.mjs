import assert from 'node:assert/strict';
import {createShowTimelines} from './programmed-timelines.js';
import {sampleFixtureTimeline,timelineDuration} from './fixture-timeline.js';
import {sanitizeFx,wheel} from './fixture-profiles.js';

const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-7,`${message}: ${a} != ${b}`);
const fixtures=[...['101','102','103','104','105','111','112','106'].map(id=>({id,kind:'moving',notUsed:id==='106'})),
 {id:'3',kind:'source'},{id:'201',kind:'colorado'},{id:'202',kind:'colorado'},{id:'203',kind:'colorado'},{id:'204',kind:'colorado'},{id:'207',kind:'colorado'},{id:'SL1',kind:'sl1'},
 ...Array.from({length:6},(_,i)=>({id:`S${i+1}`,kind:'par'})),{id:'M2',kind:'mini',notUsed:true}];
const prefs=Object.fromEntries(fixtures.map(f=>[f.id,sanitizeFx({dimmer:f.id==='SL1'?0:f.id==='201'?45:f.id==='3'?18:90,gobo:3,movement:'eight',rotation:12,period:7,amplitude:24},f.kind)]));
const colors=Object.fromEntries(fixtures.map(f=>[f.id,f.id==='201'?'#b8fff2':['101','104','111','112','202','204','207','M2'].includes(f.id)?'#ff40cb':['102','103','105','203'].includes(f.id)?'#35dcff':'#ffffff']));
const room=['102','103','104','105','111','112'];
const before=JSON.stringify({fixtures,prefs,colors});

const sceneIds=['arrival','opening','dream','red_alert','warm','dj','hiphop'];
assert.equal(sceneIds.length,7);
for(const id of ['arrival','opening','artist','dance','slam_white','slam_blue','slam_amber','unknown'])assert.deepEqual(createShowTimelines(id,fixtures,prefs,colors),{});
for(const id of sceneIds.slice(2)){
 const gentle=id==='dream'||id==='warm',newScene=gentle||id==='red_alert';
 const presetPrefs=Object.fromEntries(fixtures.map(f=>[f.id,newScene?sanitizeFx({...prefs[f.id],
  dimmer:id==='red_alert'&&f.id==='SL1'?80:id==='dream'&&['203','204'].includes(f.id)?100:id==='dream'&&f.id==='101'?60:f.id==='3'||gentle&&f.kind==='par'?0:prefs[f.id].dimmer,
  ...(f.kind==='moving'?{period:gentle?30:5,rotation:gentle?1.5:18,gobo:{dream:6,red_alert:7,warm:2}[id]}: {}),
  ...(gentle&&f.id==='101'?{gobo:0,movement:'static',rotation:0,amplitude:0}: {})},f.kind):
  id==='dj'&&f.id==='101'?sanitizeFx({...prefs[f.id],dimmer:100,gobo:6,movement:'circle',amplitude:6,period:6,rotation:18},f.kind):prefs[f.id]]));
 const presetColors=newScene?
  Object.fromEntries(fixtures.map(f=>[f.id,f.kind==='par'||f.kind==='source'||f.id==='SL1'?'#ffffff':id==='red_alert'?'#ff3030':id==='warm'?(colors[f.id]==='#ff40cb'?'#ff3030':'#ffe53b'):f.kind==='moving'?'#35dcff':['202','207'].includes(f.id)?'#0078ff':'#005eff'])):colors;
 const timelines=createShowTimelines(id,fixtures,presetPrefs,presetColors);
 assert.equal(timelines['106'],undefined);assert.ok(timelines['112']?.enabled,'Reactivated 112 has a room programme');assert.equal(timelines.M2,undefined);assert.equal(timelines['3'],undefined,'White face level remains stable');
 assert.equal(timelines['201'],undefined,'DJ deck task light is constant in every scene');
 for(const [fid,timeline]of Object.entries(timelines)){
  assert.ok(timeline.enabled);assert.ok(timeline.steps.length<=10);near(timelineDuration(timeline),30,`${id}/${fid}: 30 s loop`);
  const fixture=fixtures.find(f=>f.id===fid);
  for(const step of timeline.steps){
   assert.ok(step.fx.dimmer>=0&&step.fx.dimmer<=presetPrefs[fid].dimmer);assert.ok(step.flashHz<=(fid==='SL1'?8:2));
   assert.ok(step.fadeIn>=0&&step.fadeOut>=0&&step.fadeIn+step.fadeOut<=step.duration);
   if(fixture.kind==='moving'){
    if(!(id==='dj'&&fid==='101')){
     assert.equal(step.fx.movement,presetPrefs[fid].movement);assert.equal(step.fx.gobo,presetPrefs[fid].gobo);
     assert.equal(step.fx.rotation,presetPrefs[fid].rotation);assert.equal(step.fx.period,presetPrefs[fid].period);assert.equal(step.fx.amplitude,presetPrefs[fid].amplitude);
    }
    assert.ok(wheel.some(([,color])=>color===step.color),'Actual wheel colour');
   }else{assert.equal(step.fx.gobo,0);assert.equal(step.fx.movement,'static');}
  }
 }
 for(const fid of room){
  let lit=0;
  for(let i=0;i<3000;i++)if(sampleFixtureTimeline(timelines[fid],i*.01+.005,'moving',{flashes:false}).fx.dimmer>0)lit++;
  assert.ok(lit/3000>=(id==='red_alert'?1:.89),`${id}/${fid}: room gobos remain visible throughout red strobe accents`);
 }
 if(gentle){
  for(const step of timelines['101'].steps){assert.equal(step.fx.gobo,0);assert.equal(step.fx.movement,'static');assert.equal(step.fx.rotation,0);assert.equal(step.fx.amplitude,0);}
  for(const fixture of fixtures.filter(f=>f.kind==='moving'&&!f.notUsed||['202','203','204','207'].includes(f.id))){
   const timeline=timelines[fixture.id],pair=id==='warm'?['#ffe53b','#ff3030']:fixture.kind==='moving'?['#35dcff']:['202','207'].includes(fixture.id)?['#0078ff']:['#005eff'];
   assert.equal(timeline.steps.length,3);
   for(const step of timeline.steps){assert.equal(step.duration,10);assert.equal(step.fadeIn,id==='dream'?2:8);assert.equal(step.fadeOut,0);assert.equal(step.flashHz,0);assert.equal(step.flashOnly,false);assert.ok(pair.includes(step.color));}
   if(id==='warm')assert.notEqual(timeline.steps[0].color,timeline.steps[1].color,'Alternating warm colour targets');
   if(fixture.kind==='moving'&&id==='warm'){
    assert.equal(sampleFixtureTimeline(timeline,14,'moving').fx.dimmer,0,'Wheel changes colour only with shutter closed');
    assert.ok(sampleFixtureTimeline(timeline,15,'moving').fx.dimmer>0,'Wheel opens after physical colour change');
   }else for(let i=0;i<300;i++)assert.ok(sampleFixtureTimeline(timeline,i*.1,fixture.kind).fx.dimmer>0,'RGB remains lit throughout smooth colour changes');
  }
  for(const fixture of fixtures.filter(f=>f.kind==='par'))assert.equal(timelines[fixture.id],undefined,'Gentle scenes do not add white accents');
 }
 if(id==='dream'){
  for(const fid of room)for(const step of timelines[fid].steps)assert.equal(step.fx.gobo,6,'Ocean-blue scene retains the wave motif');
  for(const fid of room)for(let tick=0;tick<3000;tick++){
   const sample=sampleFixtureTimeline(timelines[fid],tick*.01,'moving');assert.equal(sample.color,'#35dcff');
   assert.ok(sample.fx.dimmer>=presetPrefs[fid].dimmer*.85-1e-9,'Cyan audience never falls below85% of preset intensity');
  }
  for(const fid of ['101','202','203','204','207'])for(let tick=0;tick<300;tick++){
   const fixture=fixtures.find(f=>f.id===fid),sample=sampleFixtureTimeline(timelines[fid],tick*.1,fixture.kind);
   assert.equal(sample.fx.dimmer,presetPrefs[fid].dimmer,'Artist/DJ level stays constant');
   assert.equal(sample.color,fid==='101'?'#35dcff':['202','207'].includes(fid)?'#0078ff':'#005eff');
  }
  for(const fid of ['203','204'])assert.equal(presetPrefs[fid].dimmer,100);
  assert.equal(presetPrefs['101'].dimmer,60);
 }
 if(id==='red_alert'){
  const durations=[4,2,4,2,6,2,8,2],accentWindows=[[4,6],[10,12],[18,20],[28,30]],redFixtures=fixtures.filter(f=>f.kind==='moving'&&!f.notUsed||['202','203','204','207'].includes(f.id));
  for(const fixture of redFixtures){
   const timeline=timelines[fixture.id],accentLevel=room.includes(fixture.id)?.6:fixture.kind==='colorado'?.25:0;assert.deepEqual(timeline.steps.map(step=>step.duration),durations);
   timeline.steps.forEach((step,index)=>{assert.equal(step.color,'#ff3030');assert.equal(step.flashHz,0);assert.equal(step.flashOnly,false);assert.equal(step.transition,'cut');assert.equal(step.fadeIn,0);assert.equal(step.fadeOut,0);near(step.fx.dimmer,presetPrefs[fixture.id].dimmer*(index%2?accentLevel:1),'Red room and stage RGB stay visible during accents');if(fixture.kind==='moving')assert.equal(step.fx.gobo,7);});
   for(let i=0;i<3000;i++){
    const time=i*.01+.005,accent=accentWindows.some(([start,end])=>time>=start&&time<end);
    const sample=sampleFixtureTimeline(timeline,time,fixture.kind);
    near(sample.fx.dimmer,presetPrefs[fixture.id].dimmer*(accent?accentLevel:1),'Room stays red at60%, RGB at25%, DJ moving head off during strobe');
    if(fixture.kind==='moving'){assert.equal(sample.fx.gobo,7);assert.equal(sample.fx.movement,presetPrefs[fixture.id].movement);}
   }
  }
  for(const fixture of fixtures.filter(f=>f.kind==='par')){
   const timeline=timelines[fixture.id];assert.equal(timeline.steps.length,1);assert.equal(timeline.steps[0].fx.dimmer,0);assert.equal(timeline.steps[0].flashHz,0);
   for(let i=0;i<300;i++)assert.equal(sampleFixtureTimeline(timeline,i*.1,'par').fx.dimmer,0,'No white tungsten PAR emission in red alert');
  }
  const strobe=timelines.SL1;assert.deepEqual(strobe.steps.map(step=>step.duration),durations);
  strobe.steps.forEach((step,index)=>{assert.equal(step.color,'#ffffff');assert.equal(step.flashOnly,true);assert.equal(step.flashPattern,'steady');assert.equal(step.flashHz,index%2?8:0);assert.equal(step.fx.dimmer,index%2?80:0);assert.equal(step.fadeIn,0);assert.equal(step.fadeOut,0);});
  for(let i=0;i<30000;i++){
   const time=i*.001+.0005,accent=accentWindows.some(([start,end])=>time>=start&&time<end),sample=sampleFixtureTimeline(strobe,time,'sl1');
   if(!accent)assert.equal(sample.fx.dimmer,0,'SL1 stays off in red hold blocks');
   assert.equal(sampleFixtureTimeline(strobe,time,'sl1',{flashes:false}).fx.dimmer,0,'Global Flashs off always disables SL1');
  }
  for(const [start]of accentWindows){
   let pulses=0,wasOn=false;for(let tick=0;tick<2000;tick++){const on=sampleFixtureTimeline(strobe,start+tick*.001+.0005,'sl1').fx.dimmer>0;if(on&&!wasOn)pulses++;wasOn=on;}
   assert.equal(pulses,16,'Eight white SL1 pulses per second, two-second accent');
  }
 }
 if(id==='hiphop'||id==='dj'){
  const duos=[['#ff40cb','#35dcff'],['#ff992b','#35dcff'],['#ff3030','#b8ff35']];
  for(const time of [0,.125,7.875,9.999,10,10.125,19.999,20,20.125,29.999]){
   const duo=duos[Math.floor(time/10)];
   for(const fixture of fixtures.filter(f=>timelines[f.id]&&!/^S/.test(f.id))){
    const sample=sampleFixtureTimeline(timelines[fixture.id],time,fixture.kind,{flashes:false});
    assert.ok(duo.includes(sample.color),`${id}/${fixture.id} at ${time}: synchronized palette ${sample.color}`);
   }
  }
  for(const fid of ['101','203','204']){
   assert.equal(timelines[fid].steps.length,3);
   for(const step of timelines[fid].steps){near(step.fx.dimmer,presetPrefs[fid].dimmer,'Stable face/DJ');assert.equal(step.flashHz,0);}
  }
  if(id==='dj'){
   const steps=timelines['101'].steps;
   assert.deepEqual(steps.map(step=>step.fx.gobo),[0,6,0],'DJ alternates full beam, gobo, full beam');
   assert.deepEqual(steps.map(step=>step.fx.movement),['static','circle','static']);
   assert.deepEqual(steps.map(step=>step.fx.rotation),[0,18,0]);
   assert.deepEqual(steps.map(step=>step.fx.amplitude),[0,6,0]);
   assert.equal(steps[1].fx.period,6);
   for(const step of steps){assert.equal(step.duration,10);assert.equal(step.fx.dimmer,100);assert.notEqual(step.color,'#ffffff');assert.equal(step.flashHz,0);assert.equal(step.fx.pan,presetPrefs['101'].pan);assert.equal(step.fx.tilt,presetPrefs['101'].tilt);}
   for(const [time,gobo]of [[0,0],[9.99,0],[10,6],[19.99,6],[20,0],[29.99,0],[30,0]]){const sample=sampleFixtureTimeline(timelines['101'],time,'moving');assert.equal(sample.fx.gobo,gobo);assert.equal(sample.fx.dimmer,100,'DJ stays strongly lit without flash dips');}
  }
  for(let phase=0;phase<3;phase++){
   const accent=['#ff40cb','#35dcff','#ff3030'][phase];
   for(const offset of [.12,.2,.3,.55,.7,.8]){
    const samples=room.map(fid=>sampleFixtureTimeline(timelines[fid],phase*10+9+offset,'moving'));
    assert.ok(samples.every(s=>s.color===accent),'All room gobos share the accent colour');
    const on=samples[0].fx.dimmer>0;
    assert.ok(samples.every(s=>(s.fx.dimmer>0)===on),'Room gobo flash gates are synchronized');
   }
   for(const fid of room){
   const step=timelines[fid].steps[phase*3+2];assert.equal(step.duration,1);assert.equal(step.flashHz,2);assert.ok(step.fadeIn>0&&step.fadeOut>0);
    assert.equal(step.flashPattern,'steady','Common final accent stays synchronized');
    const hold=timelines[fid].steps[phase*3];assert.equal(hold.flashPattern,'random');assert.equal(hold.flashOnly,false);
    assert.ok(sampleFixtureTimeline(timelines[fid],phase*10+9.3,'moving',{flashes:false}).fx.dimmer>0,'Flash disable restores underlying accent');
   }
  }
  for(const fixture of fixtures.filter(f=>f.kind==='par')){
   const timeline=timelines[fixture.id];let litWithFlash=0,litWithoutFlash=0;
   for(const step of timeline.steps){assert.equal(step.color,'#ffffff');assert.equal(step.fx.movement,'static');}
   for(let i=0;i<3000;i++){
    const time=i*.01+.005;
    if(sampleFixtureTimeline(timeline,time,'par').fx.dimmer>0)litWithFlash++;
    if(sampleFixtureTimeline(timeline,time,'par',{flashes:false}).fx.dimmer>0)litWithoutFlash++;
   }
   assert.ok(litWithFlash>0&&litWithFlash/3000<=.101);assert.equal(litWithoutFlash,0,'PAR flash-only does not become continuous white');
  }
 }
}
assert.equal(JSON.stringify({fixtures,prefs,colors}),before,'No input mutation');
const offPrefs={...prefs,'105':sanitizeFx({dimmer:0},'moving')};
assert.equal(createShowTimelines('hiphop',fixtures,offPrefs,colors)['105'],undefined,'Never activates a fixture disabled by preset');
console.log('Programmed timelines: 7 scene IDs, removed presets inactive, 10 squares/30 seconds max, dream/warm fades, red alert, DJ full/gobo/full sequence, constant DJ task light and shared show accents passed.');
