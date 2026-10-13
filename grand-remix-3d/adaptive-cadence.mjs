// Adjust frame cadence only. Image size, geometry and lighting stay untouched.
const STEPS=Object.freeze([30,24,20,15]);
const WINDOW_MS=2000,STALL_MS=250,DOWN_COOLDOWN_MS=6000,UP_COOLDOWN_MS=12000;

export function createAdaptiveCadence(preferred=30){
 let preferredFps=preferred===60?60:30,fps=preferredFps,minimum=15;
 let start=null,last=null,frames=0,work=0,bad=0,good=0,lastChange=-Infinity;
 function clearWindow(){start=null;last=null;frames=0;work=0;}
 function reset(){clearWindow();bad=0;good=0;return fps;}
 function setFps(value){
  if(value!==30&&value!==60)return false;
  const changed=preferredFps!==value||fps!==value;
  preferredFps=value;fps=value;lastChange=-Infinity;reset();return changed;
 }
 function setFloor(value){
  if(!STEPS.includes(value)||minimum===value)return false;
  minimum=value;
  const next=Math.max(fps,Math.min(preferredFps,minimum)),changed=next!==fps;
  if(changed){fps=next;lastChange=last??-Infinity;}
  reset();return changed;
 }
 function record(now,workMs){
  if(!Number.isFinite(now)||now<0||!Number.isFinite(workMs)||workMs<0)return false;
  if(preferredFps===60)return false;
  if(last!==null&&(now<=last||now-last>STALL_MS)||workMs>STALL_MS){reset();return false;}
  if(start===null){start=now;last=now;return false;}
  last=now;frames++;work+=workMs;
  const duration=now-start;
  if(duration<WINDOW_MS||frames<8)return false;
  const delivered=frames*1000/duration,averageWork=work/frames,index=STEPS.indexOf(fps);
  const overloaded=averageWork>1000/fps*.94||delivered<fps*.88;
  // Recovery needs headroom for the *next* cadence, not merely the current one.
  const next=index>0?STEPS[index-1]:fps;
  const comfortable=!overloaded&&index>0&&averageWork<1000/next*.7&&delivered>=fps*.95;
  bad=overloaded?Math.min(2,bad+1):0;good=comfortable?Math.min(3,good+1):0;
  start=now;frames=0;work=0;
  let nextFps=fps;
  if(bad>=2&&index<STEPS.length-1&&STEPS[index+1]>=minimum&&now-lastChange>=DOWN_COOLDOWN_MS)nextFps=STEPS[index+1];
  else if(good>=3&&index>0&&now-lastChange>=UP_COOLDOWN_MS)nextFps=STEPS[index-1];
  if(nextFps===fps)return false;
  fps=nextFps;lastChange=now;bad=0;good=0;return true;
 }
 return {get preferredFps(){return preferredFps;},get fps(){return fps;},setFps,setFloor,reset,record};
}
