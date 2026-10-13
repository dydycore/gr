import assert from 'node:assert/strict';
import {AMBIENCE_FADE_SECONDS,ambienceFadeFraction,blendAmbienceFixture} from './ambience-transition.js';
import {sanitizeFx,wheel} from './fixture-profiles.js';

const sample=(color,dimmer,extra={})=>({color,fx:sanitizeFx({dimmer,...extra}),pan:extra.pan??0,tilt:extra.tilt??45,goboAngle:extra.goboAngle??0});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
assert.equal(AMBIENCE_FADE_SECONDS,1.5);assert.equal(ambienceFadeFraction(0),0);assert.equal(ambienceFadeFraction(1.5),1);assert.equal(ambienceFadeFraction(30),1);near(ambienceFadeFraction(.75),.5);
assert.equal(ambienceFadeFraction(-1),0);assert.equal(ambienceFadeFraction(NaN),0);
assert.ok(ambienceFadeFraction(.05)<.01,'A new scene opens gradually instead of jumping on');
const a=sample('#ff3030',40,{pan:-60,tilt:30,zoom:12,gobo:2}),b=sample('#35dcff',80,{pan:70,tilt:60,zoom:22,gobo:7});
const before=JSON.stringify([a,b]);
assert.deepEqual(blendAmbienceFixture(a,b,'moving',0),a);assert.deepEqual(blendAmbienceFixture(a,b,'moving',1),b);
const rgb=blendAmbienceFixture(a,b,'colorado',.5);assert.equal(rgb.color,'#9a8698');assert.equal(rgb.fx.dimmer,60);assert.equal(rgb.fx.zoom,17);assert.equal(rgb.pan,5);assert.equal(rgb.tilt,45);
for(const p of [.1,.25,.499,.5,.501,.75,.9]){
 const result=blendAmbienceFixture(a,b,'moving',p);
 assert.ok(wheel.some(([,color])=>color===result.color),'A wheel never displays a synthetic RGB colour');
 assert.equal(result.fx.gobo,p<.5?2:7,'Gobo changes at the closed shutter');
 assert.equal(result.color,p<.5?a.color:b.color);
 assert.ok(result.fx.dimmer>=0&&result.fx.dimmer<=80);
}
near(blendAmbienceFixture(a,b,'moving',.5).fx.dimmer,0);
near(blendAmbienceFixture(a,b,'moving',.25).fx.dimmer,20);near(blendAmbienceFixture(a,b,'moving',.75).fx.dimmer,40);
const sameColorDifferentGobo={...b,color:a.color};assert.equal(blendAmbienceFixture(a,sameColorDifferentGobo,'moving',.5).fx.dimmer,0);
// Real regression: after switching wheels, a target flash OFF used to restore
// the outgoing red/gobo2 at15.2%, then jump back to cyan/gobo7 while illuminated.
const flashing=[blendAmbienceFixture(a,b,'moving',.60),blendAmbienceFixture(a,{...b,fx:{...b.fx,dimmer:0}},'moving',.62),blendAmbienceFixture(a,b,'moving',.64)];
for(const result of flashing){assert.equal(result.color,b.color);assert.equal(result.fx.gobo,7);}
near(flashing[0].fx.dimmer,8.32);near(flashing[1].fx.dimmer,0);near(flashing[2].fx.dimmer,15.30368);
for(const p of [.1,.49,.5,.62,.95]){
 const dark=blendAmbienceFixture(a,{...b,fx:{...b.fx,dimmer:0}},'moving',p);
 assert.equal(dark.color,p<.5?a.color:b.color);assert.equal(dark.fx.gobo,p<.5?2:7);
 if(p>=.5)assert.equal(dark.fx.dimmer,0,'An OFF pulse never revives the outgoing light after the shutter switch');
}
const unchanged=sample('#ff3030',45,{gobo:2});for(let t=0;t<=1.5;t+=.01)near(blendAmbienceFixture(unchanged,unchanged,'moving',ambienceFadeFraction(t)).fx.dimmer,45);
const deskA=sample('#b8fff2',45),deskB=sample('#f3c6ff',45);for(let t=0;t<=1.5;t+=.01)near(blendAmbienceFixture(deskA,deskB,'mini',ambienceFadeFraction(t)).fx.dimmer,45,'Stable DJ work light never blacks out');
const off=sample('#000000',0);const opening=blendAmbienceFixture(off,b,'moving',.5);assert.equal(opening.color,b.color);assert.equal(opening.fx.dimmer,40);
const closing=blendAmbienceFixture(a,off,'moving',.5);assert.equal(closing.color,a.color);assert.equal(closing.fx.dimmer,20);
assert.equal(closing.fx.gobo,a.fx.gobo,'An outgoing lit gobo stays in place until its beam is dark');
const flashPeak=sample('#ffffff',100);assert.ok(blendAmbienceFixture(off,flashPeak,'sl1',ambienceFadeFraction(.1)).fx.dimmer<2,'Initial flashes ramp in with the new ambience');
const initialHalf=blendAmbienceFixture(a,b,'colorado',.4),third=sample('#ff40cb',20,{pan:110,tilt:20,gobo:5});
assert.deepEqual(blendAmbienceFixture(initialHalf,third,'colorado',0),initialHalf,'A rapid change starts from the currently displayed blend');
assert.deepEqual(blendAmbienceFixture(null,b,'moving',.3),b,'Fresh deterministic export can render the target without a previous scene');
assert.equal(JSON.stringify([a,b]),before,'Transient display never changes the saved programmes');
const wrapped=blendAmbienceFixture(sample('#ffffff',80,{gobo:2,goboAngle:Math.PI*1.9}),sample('#ffffff',80,{gobo:2,goboAngle:Math.PI*.1}),'moving',.5);near(wrapped.goboAngle,Math.PI*2);
console.log('Ambience fade:1.5s easing, RGB mix, physical wheel/gobo shutter, continuous DJ, gradual flashes, movement/zoom, rapid rebase, no preset mutation and direct export passed.');
