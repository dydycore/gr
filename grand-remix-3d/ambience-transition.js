import {profiles} from './fixture-profiles.js';

export const AMBIENCE_FADE_SECONDS=1.5;
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const mix=(a,b,p)=>a+(b-a)*p;
export function ambienceFadeFraction(seconds){const p=clamp(Number.isFinite(seconds)?seconds/AMBIENCE_FADE_SECONDS:0);return p*p*(3-2*p);}
const copy=state=>({...state,fx:{...state.fx}});
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
function blendColor(a,b,p){const right=rgb(b);return '#'+rgb(a).map((c,i)=>Math.round(mix(c,right[i],p)).toString(16).padStart(2,'0')).join('');}

// The caller supplies actual moving-head angles and master-scaled intensities.
// Geometric beam/screen protection is deliberately applied AFTER this blend.
export function blendAmbienceFixture(from,to,kind,amount){
 const p=clamp(amount);if(!from||p>=1)return copy(to);if(p<=0)return copy(from);
 const result=copy(to),colorMode=profiles[kind]?.color||'gel';
 const a=from.color==='#000000'?0:from.fx.dimmer,b=to.color==='#000000'?0:to.fx.dimmer;
 result.fx.dimmer=mix(a,b,p);
 if(colorMode==='rgb')result.color=a===0?to.color:b===0?from.color:blendColor(from.color,to.color,p);
 // A shutter flash at zero does not put the colour/gobo wheel back in its
 // previous position. Only explicit black is a fade to extinction.
 else if(a>0&&to.color!=='#000000'&&(from.color!==to.color||from.fx.gobo!==to.fx.gobo)){
  const closing=p<.5,q=closing?p*2:(p-.5)*2,s=q*q*(3-2*q);
  result.color=closing?from.color:to.color;result.fx.gobo=closing?from.fx.gobo:to.fx.gobo;
  result.fx.dimmer=closing?a*(1-s):b*s;
  result.goboAngle=closing?from.goboAngle:to.goboAngle;
 }else{
  result.color=b===0?from.color:to.color;
  if(b===0){result.fx.gobo=from.fx.gobo;result.goboAngle=from.goboAngle;}
 }
 for(const key of ['pan','tilt'])if(Number.isFinite(from[key])&&Number.isFinite(to[key]))result[key]=mix(from[key],to[key],p);
 result.fx.zoom=mix(from.fx.zoom,to.fx.zoom,p);
 if(result.goboAngle===to.goboAngle&&from.fx.gobo===to.fx.gobo&&Number.isFinite(from.goboAngle)&&Number.isFinite(to.goboAngle)){
  const difference=((to.goboAngle-from.goboAngle+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  result.goboAngle=from.goboAngle+difference*p;
 }
 return result;
}
