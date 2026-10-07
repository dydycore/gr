import {profiles,wheel,sanitizeFx} from './fixture-profiles.js';

// Plain JSON in, plain JSON out. There is no clock, DOM, storage or scene state here.
export const TIMELINE_LIMITS=Object.freeze({
 maxSteps:10,minDuration:.25,maxDuration:30,minStepDuration:.25,maxStepDuration:30,maxTotalDuration:30,maxFlashHz:2
});
export const previewFlashLimit=kind=>profiles[kind]?.previewFlashMaxHz??TIMELINE_LIMITS.maxFlashHz;
const validatedTimelines=new WeakMap();
const seal=(timeline,kind)=>{
 for(const step of timeline.steps){Object.freeze(step.fx);Object.freeze(step);}
 Object.freeze(timeline.steps);Object.freeze(timeline);
 validatedTimelines.set(timeline,kind);return timeline;
};
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const bounded=(value,min,max)=>Math.max(min,Math.min(max,value));
const fixtureKind=kind=>Object.hasOwn(profiles,kind)?kind:'source';
const wheelColors=new Set(wheel.map(([,color])=>color));

export function sanitizeTimelineColor(value,kind='moving'){
 const color=typeof value==='string'&&/^#[a-f\d]{6}$/i.test(value)?value.toLowerCase():'#ffffff';
 const colorMode=profiles[fixtureKind(kind)].color;
 if(color==='#000000')return color;
 if(colorMode==='gel')return '#ffffff';
 if(colorMode==='wheel'&&!wheelColors.has(color))return '#ffffff';
 return color;
}

export function sanitizeFixtureTimeline(raw,kind='moving'){
 kind=fixtureKind(kind);
 if(!record(raw)||!Array.isArray(raw.steps))return seal({enabled:false,steps:[]},kind);
 const steps=[],ids=new Set();let durationUsed=0;
 // Bound the input traversal too: a hostile import must not iterate millions of entries.
 for(const step of raw.steps.slice(0,TIMELINE_LIMITS.maxSteps)){
  if(!record(step)||!Number.isFinite(step.duration))continue;
  const remaining=TIMELINE_LIMITS.maxTotalDuration-durationUsed;
  if(remaining<TIMELINE_LIMITS.minDuration)break;
  const duration=Math.min(remaining,bounded(step.duration,TIMELINE_LIMITS.minDuration,TIMELINE_LIMITS.maxDuration));
  let id=typeof step.id==='string'?step.id.trim().slice(0,80):'';
  if(!id||ids.has(id)){let suffix=steps.length+1;do{id=`step-${suffix++}`;}while(ids.has(id));}
  ids.add(id);
  const color=sanitizeTimelineColor(step.color,kind);
  const fx=sanitizeFx(record(step.fx)?step.fx:{dimmer:0},kind);
  if(color==='#000000')fx.dimmer=0;
  const transition=step.transition==='fade'?'fade':'cut';
  const fadeIn=transition==='fade'?bounded(Number.isFinite(step.fadeIn)?step.fadeIn:.5,0,duration):0;
  const fadeOut=bounded(Number.isFinite(step.fadeOut)?step.fadeOut:0,0,duration-fadeIn);
  steps.push({id,duration,transition,fadeIn,fadeOut,color,fx,
   flashHz:Number.isFinite(step.flashHz)?bounded(step.flashHz,0,previewFlashLimit(kind)):0,
   flashPattern:step.flashPattern==='random'?'random':'steady',flashOnly:step.flashOnly===true});
  durationUsed+=duration;
 }
 return seal({enabled:raw.enabled===true&&steps.length>0,steps},kind);
}

export function timelineDuration(timeline){
 const clean=validatedTimelines.has(timeline)?timeline:sanitizeFixtureTimeline(timeline);
 return clean.steps.reduce((sum,step)=>sum+step.duration,0);
}

const channels=color=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16));
const interpolate=(a,b,fraction)=>a+(b-a)*fraction;
const mixColor=(a,b,fraction)=>{
 const next=channels(b);return '#'+channels(a).map((channel,index)=>
  Math.round(interpolate(channel,next[index],fraction)).toString(16).padStart(2,'0')).join('');
};
const hashUnit=text=>{
 let hash=2166136261;
 for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;
 hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
 return (hash>>>0)/4294967296;
};
const randomFlashGate=(step,time)=>{
 const clock=Number.isFinite(time)?time:0,window=Math.floor(clock/5),seed=`${step.id}:${window}`;
 const start=window*5+.3+hashUnit(seed+':offset')*3.5;
 const duration=.5+hashUnit(seed+':duration')*.5;
 const rate=Math.min(step.flashHz,hashUnit(seed+':rate')<.5?1:2);
 const local=clock-start,active=local>=0&&local<duration;
 return active?(local*rate)%1<.5:!step.flashOnly;
};

/**
 * Each transition belongs to the entering step. Independent entry/exit fades
 * fit inside the step without overlap. Motion/gobo choices switch at the boundary;
 * the renderer retains its global motion time and applies screen protection.
 * A physical colour wheel changes colour at zero intensity, never by RGB mixing.
 * Flash is applied last, directly to fx.dimmer, within the profile's preview limit.
 * Random bursts are deterministic per block and absolute five-second window:
 * scrubbing is repeatable, but successive 30-second loops differ naturally.
 */
export function sampleFixtureTimeline(raw,time,kind='moving',options={flashes:true}){
 kind=fixtureKind(kind);
 // Validated objects are frozen: editor changes create a new timeline. Avoid
 // sanitising every block again for every fixture at every animation frame.
 const timeline=validatedTimelines.get(raw)===kind?raw:sanitizeFixtureTimeline(raw,kind);
 if(!timeline.enabled)return null;
 const totalDuration=timeline.steps.reduce((sum,step)=>sum+step.duration,0);
 const position=Number.isFinite(time)?((time%totalDuration)+totalDuration)%totalDuration:0;
 let stepIndex=0,start=0;
 while(stepIndex<timeline.steps.length-1&&position>=start+timeline.steps[stepIndex].duration){
  start+=timeline.steps[stepIndex++].duration;
 }
 const step=timeline.steps[stepIndex],localTime=position-start;
 const previous=timeline.steps[(stepIndex+timeline.steps.length-1)%timeline.steps.length];
 const fx={...step.fx};let color=step.color;
 const fadeDuration=step.fadeIn;
 if(step.transition==='fade'&&localTime<fadeDuration){
  const fraction=localTime/fadeDuration;
  const previousLevel=previous.fadeOut>0?0:previous.fx.dimmer;
  if(profiles[kind].color==='rgb'){
   color=mixColor(previous.color,step.color,fraction);
   fx.dimmer=interpolate(previousLevel,step.fx.dimmer,fraction);
  }else if(previous.fadeOut>0){
   // The previous block already closed: move its wheel in darkness, then open.
   color=step.color;fx.dimmer=step.fx.dimmer*fraction;
  }else if(previous.color!==step.color){
   // Close on the old colour, change the wheel while dark, then reopen.
   color=fraction<.5?previous.color:step.color;
   fx.dimmer=fraction<.5?previous.fx.dimmer*(1-fraction*2):step.fx.dimmer*(fraction*2-1);
  }else fx.dimmer=interpolate(previousLevel,step.fx.dimmer,fraction);
 }
 if(step.fadeOut>0&&localTime>step.duration-step.fadeOut)fx.dimmer*=Math.max(0,(step.duration-localTime)/step.fadeOut);
 if(options?.flashes===false){if(step.flashOnly)fx.dimmer=0;}
 else if(step.flashHz>0){
  const gate=step.flashPattern==='random'?randomFlashGate(step,time):((localTime*step.flashHz)%1)<.5;
  if(!gate)fx.dimmer=0;
 }else if(step.flashOnly)fx.dimmer=0;
 return {fx,color,stepIndex,localTime,totalDuration};
}
