import assert from 'node:assert/strict';
import {sanitizeFixtureTimeline,sampleFixtureTimeline,timelineDuration,TIMELINE_LIMITS} from './fixture-timeline.js';
import {wheel} from './fixture-profiles.js';

const near=(actual,expected,label='')=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} != ${expected}`);
const block=(extra={})=>({id:'a',duration:2,transition:'cut',color:'#ffffff',fx:{dimmer:100},flashHz:0,...extra});
const track=(steps,enabled=true)=>({enabled,steps});

for(const raw of [null,undefined,[],{},true,{enabled:true,steps:'bad'}]){
 assert.deepEqual(sanitizeFixtureTimeline(raw),{enabled:false,steps:[]});
 assert.equal(sampleFixtureTimeline(raw,0),null);
}
assert.equal(sampleFixtureTimeline(track([block()],false),0),null);
assert.equal(sampleFixtureTimeline(track([]),0),null);
assert.equal(sampleFixtureTimeline({...track([block()]),enabled:'true'},0),null);
assert.equal(sanitizeFixtureTimeline(track([null,{},block({duration:NaN}),block({duration:'3'}),block({duration:Infinity})])).steps.length,0);
assert.equal(sampleFixtureTimeline(track([block({fx:null})]),0).fx.dimmer,0,'Malformed fx fails dark');
const limits=sanitizeFixtureTimeline(track([block({duration:-5}),block({duration:1e7})]));
assert.equal(limits.steps[0].duration,TIMELINE_LIMITS.minDuration);
assert.equal(limits.steps[1].duration,TIMELINE_LIMITS.maxTotalDuration-TIMELINE_LIMITS.minDuration);
assert.equal(sanitizeFixtureTimeline(track([block({duration:1e7})])).steps[0].duration,30,'Single block capped at 30 seconds');
assert.equal(TIMELINE_LIMITS.maxStepDuration,30);assert.equal(TIMELINE_LIMITS.maxDuration,30);assert.equal(TIMELINE_LIMITS.maxTotalDuration,30);
const many=sanitizeFixtureTimeline(track(Array.from({length:100},()=>block({duration:.25}))));
assert.equal(many.steps.length,10);assert.equal(new Set(many.steps.map(s=>s.id)).size,10,'Duplicate IDs repaired');
assert.equal(TIMELINE_LIMITS.maxSteps,10,'At most ten editable blocks');
assert.equal(timelineDuration(track(Array.from({length:64},()=>block({duration:60})))),30,'Legacy long imports capped at 30 seconds');
const limited=sanitizeFixtureTimeline(track([block({duration:29.9}),...Array.from({length:9},()=>block({duration:60})),block({duration:60})]));
assert.ok(timelineDuration(limited)<=30);assert.ok(limited.steps.every(s=>s.duration>=.25));
assert.equal(limited.steps.length,1,'Do not add a block shorter than .25 s to fill remaining time');
const truncated=sanitizeFixtureTimeline(track([block({duration:28.5}),block({duration:5}),block({duration:2})]));
assert.deepEqual(truncated.steps.map(s=>s.duration),[28.5,1.5]);assert.equal(timelineDuration(truncated),30);
const maxLoop=track([block({duration:10,color:'#ff3030'}),block({id:'last',duration:20,color:'#35dcff'})]);
assert.equal(sampleFixtureTimeline(maxLoop,29.999).color,'#35dcff');assert.equal(sampleFixtureTimeline(maxLoop,30).color,'#ff3030');

const two=track([block({id:'first',duration:2,color:'#ff3030',fx:{dimmer:80,gobo:2}}),block({id:'second',duration:3,color:'#35dcff',fx:{dimmer:40,gobo:7}})]);
assert.equal(timelineDuration(two),5);
for(const [time,index] of [[0,0],[1.999,0],[2,1],[4.999,1],[5,0],[7,1],[-1,1],[-5,0]])assert.equal(sampleFixtureTimeline(two,time).stepIndex,index,`Step at ${time}`);
for(const time of [NaN,Infinity,-Infinity])assert.equal(sampleFixtureTimeline(two,time).stepIndex,0);
for(let time=-10;time<=50;time+=.13){
 const a=sampleFixtureTimeline(two,time),b=sampleFixtureTimeline(two,time+5);
 assert.equal(a.color,b.color);near(a.fx.dimmer,b.fx.dimmer);assert.equal(a.stepIndex,b.stepIndex);near(a.localTime,b.localTime);
}
const before=JSON.stringify(two);sampleFixtureTimeline(two,2);sanitizeFixtureTimeline(two);assert.equal(JSON.stringify(two),before,'Input never mutated');
const compiled=sanitizeFixtureTimeline(two);
assert.ok(Object.isFrozen(compiled)&&Object.isFrozen(compiled.steps)&&Object.isFrozen(compiled.steps[0].fx));
assert.deepEqual(sampleFixtureTimeline(compiled,2.2),sampleFixtureTimeline(two,2.2),'Frozen validated fast path matches raw sampling');
assert.equal(timelineDuration(null),0);

for(const kind of ['source','zoom','par','unrecognised']){
 const sample=sampleFixtureTimeline(track([block({color:'#ff3030',fx:{dimmer:80,pan:45,tilt:30,gobo:7,movement:'eight',rotation:20}})]),1,kind);
 assert.equal(sample.color,'#ffffff');assert.equal(sample.fx.pan,null);assert.equal(sample.fx.tilt,null);assert.equal(sample.fx.movement,'static');assert.equal(sample.fx.gobo,0);assert.equal(sample.fx.rotation,0);
}
for(const kind of ['source','moving','colorado']){
 const sample=sampleFixtureTimeline(track([block({color:'#000000',fx:{dimmer:100}})]),1,kind);
 assert.equal(sample.color,'#000000');assert.equal(sample.fx.dimmer,0,'Black always dark');
 assert.equal(sampleFixtureTimeline(track([block({color:'red'})]),1,kind).color,'#ffffff');
}
assert.equal(sampleFixtureTimeline(track([block({color:'#3478ff'})]),1,'moving').color,'#ffffff','Unavailable wheel colour rejected');
assert.equal(sampleFixtureTimeline(track([block({color:'#FF3030'})]),1,'moving').color,'#ff3030');
assert.equal(sampleFixtureTimeline(track([block({color:'#3478ff'})]),1,'colorado').color,'#3478ff');
for(const [,color]of wheel)assert.equal(sampleFixtureTimeline(track([block({color})]),1,'moving').color,color);

const fade=track([block({duration:1,color:'#ff0000',fx:{dimmer:20}}),block({id:'b',duration:3,color:'#0000ff',transition:'fade',fx:{dimmer:80,movement:'eight',gobo:3}})]);
const rgbStart=sampleFixtureTimeline(fade,1,'colorado'),rgbMiddle=sampleFixtureTimeline(fade,1.25,'colorado'),rgbEnd=sampleFixtureTimeline(fade,1.5,'colorado');
assert.equal(rgbStart.color,'#ff0000');near(rgbStart.fx.dimmer,20);
assert.equal(rgbMiddle.color,'#800080');near(rgbMiddle.fx.dimmer,50);
assert.equal(rgbEnd.color,'#0000ff');near(rgbEnd.fx.dimmer,80);
const wheelFade=track([block({duration:1,color:'#ff3030',fx:{dimmer:80}}),block({id:'b',duration:3,color:'#35dcff',transition:'fade',fx:{dimmer:60,movement:'eight',gobo:3}})]);
const closing=sampleFixtureTimeline(wheelFade,1.125),dark=sampleFixtureTimeline(wheelFade,1.25),opening=sampleFixtureTimeline(wheelFade,1.375);
assert.equal(closing.color,'#ff3030');near(closing.fx.dimmer,40);
assert.equal(dark.color,'#35dcff');near(dark.fx.dimmer,0);
assert.equal(opening.color,'#35dcff');near(opening.fx.dimmer,30);
assert.equal(closing.fx.gobo,3);assert.equal(closing.fx.movement,'eight','Motion/gobo switch immediately, no numeric blending');
for(let t=1;t<1.6;t+=.013)assert.ok(wheel.some(w=>w[1]===sampleFixtureTimeline(wheelFade,t).color),'Wheel fade never invents an RGB colour');
const loopFade=track([block({duration:3,color:'#35dcff',transition:'fade',fx:{dimmer:20}}),block({id:'b',duration:1,color:'#35dcff',fx:{dimmer:80}})]);
near(sampleFixtureTimeline(loopFade,0).fx.dimmer,80,'Loop starts with last step level');
near(sampleFixtureTimeline(loopFade,.25).fx.dimmer,50);near(sampleFixtureTimeline(loopFade,.5).fx.dimmer,20);
near(sampleFixtureTimeline(loopFade,4.25).fx.dimmer,50);
const short=track([block({duration:.3,transition:'fade',fadeIn:.1,fx:{dimmer:20}}),block({id:'b',duration:1,fx:{dimmer:80}})]);
near(sampleFixtureTimeline(short,.05).fx.dimmer,50,'Custom .1 s entry fade');near(sampleFixtureTimeline(short,.1).fx.dimmer,20);
const fadeDefaults=sanitizeFixtureTimeline(track([block({duration:3,transition:'fade'}),block({duration:.3,transition:'fade'}),block()]));
assert.equal(fadeDefaults.steps[0].fadeIn,.5);assert.equal(fadeDefaults.steps[0].fadeOut,0);
assert.equal(fadeDefaults.steps[1].fadeIn,.3);assert.equal(fadeDefaults.steps[2].fadeIn,0);
const overlap=sanitizeFixtureTimeline(track([block({duration:2,transition:'fade',fadeIn:1.5,fadeOut:4}),block({duration:2,transition:'fade',fadeIn:-1,fadeOut:4})]));
assert.equal(overlap.steps[0].fadeIn,1.5);assert.equal(overlap.steps[0].fadeOut,.5,'Exit fade clamped to unused time');
assert.equal(overlap.steps[1].fadeIn,0);assert.equal(overlap.steps[1].fadeOut,2);
for(const step of overlap.steps)assert.ok(step.fadeIn+step.fadeOut<=step.duration);
const malformedFades=sanitizeFixtureTimeline(track([block({transition:'fade',fadeIn:NaN,fadeOut:Infinity}),block({transition:'cut',fadeIn:1,fadeOut:1})]));
assert.equal(malformedFades.steps[0].fadeIn,.5);assert.equal(malformedFades.steps[0].fadeOut,0);
assert.equal(malformedFades.steps[1].fadeIn,0);assert.equal(malformedFades.steps[1].fadeOut,1,'Exit fade works on a cut block');
const exitOnly=track([block({duration:3,transition:'cut',fadeOut:1,fx:{dimmer:80}})]);
near(sampleFixtureTimeline(exitOnly,2).fx.dimmer,80);near(sampleFixtureTimeline(exitOnly,2.5).fx.dimmer,40);near(sampleFixtureTimeline(exitOnly,2.999).fx.dimmer,.08);
const continuous=track([block({duration:3,transition:'fade',fadeIn:1,fadeOut:1,color:'#35dcff',fx:{dimmer:80}}),block({id:'b',duration:3,transition:'fade',fadeIn:1,fadeOut:1,color:'#ff3030',fx:{dimmer:60}})]);
for(const kind of ['moving','colorado','source']){
 near(sampleFixtureTimeline(continuous,3,kind).fx.dimmer,0,'A previous exit fade starts next entry at zero');
 near(sampleFixtureTimeline(continuous,3.5,kind).fx.dimmer,30,'Next entry fade rises from zero');
 near(sampleFixtureTimeline(continuous,0,kind).fx.dimmer,0,'Loop entry also starts at zero');
 assert.ok(sampleFixtureTimeline(continuous,2.99999,kind).fx.dimmer<.001,'Previous fade ends continuously at zero');
 assert.ok(sampleFixtureTimeline(continuous,3.00001,kind).fx.dimmer<.001,'Next fade starts continuously at zero');
}
assert.equal(sampleFixtureTimeline(continuous,3,'moving').color,'#ff3030','Wheel changes immediately while previous block is dark');
assert.equal(sampleFixtureTimeline(continuous,3.5,'colorado').color,'#9a8698','RGB colour interpolates independently of dimmer');
const fullFade=track([block({duration:2,transition:'fade',fadeIn:1,fadeOut:1,fx:{dimmer:80}})]);
near(sampleFixtureTimeline(fullFade,0).fx.dimmer,0);near(sampleFixtureTimeline(fullFade,.5).fx.dimmer,40);
near(sampleFixtureTimeline(fullFade,1).fx.dimmer,80);near(sampleFixtureTimeline(fullFade,1.5).fx.dimmer,40);

assert.equal(sanitizeFixtureTimeline(track([block({flashHz:30})])).steps[0].flashHz,2);
for(const flashHz of [-1,NaN,Infinity,'2'])assert.equal(sanitizeFixtureTimeline(track([block({flashHz})])).steps[0].flashHz,0);
const flashes=track([block({duration:4,flashHz:2,fx:{dimmer:80}})]);
for(const [time,dimmer]of [[0,80],[.1,80],[.25,0],[.4,0],[.5,80],[.75,0],[1,80],[3.9,0]])near(sampleFixtureTimeline(flashes,time).fx.dimmer,dimmer,`Flash at ${time}`);
for(const time of [.25,.4,.75,3.9])near(sampleFixtureTimeline(flashes,time,'moving',{flashes:false}).fx.dimmer,80,'Global flash disable leaves steady level');
const flashFade=track([block({duration:3,color:'#35dcff',transition:'fade',flashHz:2,fx:{dimmer:20}}),block({id:'b',duration:1,color:'#35dcff',fx:{dimmer:80}})]);
near(sampleFixtureTimeline(flashFade,.125).fx.dimmer,65);near(sampleFixtureTimeline(flashFade,.3).fx.dimmer,0,'Flash applied after interpolation');
near(sampleFixtureTimeline(flashFade,.3,'moving',{flashes:false}).fx.dimmer,44,'Global flash disable preserves underlying fade');
const flashExit=track([block({duration:2,transition:'cut',fadeOut:1,flashHz:2,fx:{dimmer:80}})]);
near(sampleFixtureTimeline(flashExit,1.125).fx.dimmer,70,'Flash on follows exit fade');
near(sampleFixtureTimeline(flashExit,1.375).fx.dimmer,0,'Flash off is applied after exit fade');
near(sampleFixtureTimeline(flashExit,1.375,'moving',{flashes:false}).fx.dimmer,50,'Global flash off preserves exit fade');

const randomDefaults=sanitizeFixtureTimeline(track([block(),block({flashPattern:'unexpected',flashOnly:'true'})]));
for(const step of randomDefaults.steps){assert.equal(step.flashPattern,'steady');assert.equal(step.flashOnly,false);}
const randomOnly=sanitizeFixtureTimeline(track([block({id:'S1-burst',duration:30,flashHz:2,flashPattern:'random',flashOnly:true,fx:{dimmer:80}})]),'par');
const randomNormal=sanitizeFixtureTimeline(track([block({id:'S1-burst',duration:30,flashHz:2,flashPattern:'random',fx:{dimmer:80}})]),'par');
const anotherRandom=sanitizeFixtureTimeline(track([block({id:'S2-burst',duration:30,flashHz:2,flashPattern:'random',flashOnly:true,fx:{dimmer:80}})]),'par');
let cyclesDiffer=false,fixturesDiffer=false,normalClosed=false;
for(let window=0;window<18;window++){
 let lit=0,rises=0,wasOn=false;
 for(let tick=0;tick<500;tick++){
  const local=tick*.01+.005,time=window*5+local;
  const a=sampleFixtureTimeline(randomOnly,time,'par'),again=sampleFixtureTimeline(randomOnly,time,'par');
  assert.equal(a.fx.dimmer,again.fx.dimmer,'Random sequence is repeatable at identical time');
  const on=a.fx.dimmer>0;if(on)lit++;if(on&&!wasOn)rises++;wasOn=on;
  if(local<.3||local>=4.8)assert.equal(on,false,'Burst stays in the bounded event window');
  if(a.fx.dimmer!==sampleFixtureTimeline(randomOnly,time+30,'par').fx.dimmer)cyclesDiffer=true;
  if(a.fx.dimmer!==sampleFixtureTimeline(anotherRandom,time,'par').fx.dimmer)fixturesDiffer=true;
  const normal=sampleFixtureTimeline(randomNormal,time,'par');if(normal.fx.dimmer===0)normalClosed=true;
  near(sampleFixtureTimeline(randomOnly,time,'par',{flashes:false}).fx.dimmer,0,'Flash-only stays off when global flashes disabled');
  near(sampleFixtureTimeline(randomNormal,time,'par',{flashes:false}).fx.dimmer,80,'Normal random burst falls back to steady level');
 }
 assert.ok(lit>0&&lit<=51,'One short random burst per five-second window, at most .5 s lit');
 assert.ok(rises>=1&&rises<=2,'Burst contains one or two pulses, never a faster flash rate');
}
assert.ok(cyclesDiffer,'Successive 30-second loops are different');assert.ok(fixturesDiffer,'Fixture/block IDs produce different bursts');assert.ok(normalClosed,'Random normal mode actually closes the light briefly');
const importedRandom=sanitizeFixtureTimeline(JSON.parse(JSON.stringify(randomOnly)),'par');
for(const time of [.125,1.275,8.55,19.23,28.425,36.225])assert.deepEqual(sampleFixtureTimeline(importedRandom,time,'par'),sampleFixtureTimeline(randomOnly,time,'par'),'Random playback survives JSON export/import deterministically');
near(sampleFixtureTimeline(track([block({flashOnly:true,flashPattern:'random',flashHz:0})]),1).fx.dimmer,0,'No flash event means flash-only cannot illuminate');
console.log('Timelines: 30-second maximum, bounded imports, step order and loop, fixed/wheel/RGB limits, fades, 2 Hz flashes and repeatable variable five-second bursts passed.');

// The documented SL1 effect gets faster preview choices without broadening
// traditional lamps or unrelated fixtures.
for(const hz of [1,2,4,8])assert.equal(sanitizeFixtureTimeline(track([block({flashHz:hz})]),'sl1').steps[0].flashHz,hz);
assert.equal(sanitizeFixtureTimeline(track([block({flashHz:25})]),'sl1').steps[0].flashHz,8);
for(const kind of ['moving','colorado','source','par','mini'])assert.equal(sanitizeFixtureTimeline(track([block({flashHz:8})]),kind).steps[0].flashHz,2);
const sl1Strobe=track([block({duration:2,flashHz:8,flashOnly:true})]);
for(let i=0;i<16;i++){
 assert.equal(sampleFixtureTimeline(sl1Strobe,i/8+.02,'sl1').fx.dimmer,100);
 assert.equal(sampleFixtureTimeline(sl1Strobe,i/8+.09,'sl1').fx.dimmer,0);
 assert.equal(sampleFixtureTimeline(sl1Strobe,i/8+.02,'sl1',{flashes:false}).fx.dimmer,0);
}
console.log('SL1 strobe: 1/2/4/8 Hz preview, 8 Hz limit, 16 pulses per 2 seconds; other profiles retain 2 Hz limit.');
