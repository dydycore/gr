import assert from 'node:assert/strict';
import {createRenderScheduler} from './render-scheduler.mjs';
let now=0,active=true,animating=false,revision=0,frames=0,id=0,complete=true;
const raf=new Map(),timers=new Map(),resume=[],suspend=[];
const scheduler=createRenderScheduler({now:()=>now,canRun:()=>active,isAnimating:()=>animating,revision:()=>revision,
 onFrame(){frames++;return complete;},onSuspend:time=>suspend.push(time),onResume:(duration,time)=>resume.push([duration,time]),
 requestFrame:fn=>{raf.set(++id,fn);return id;},cancelFrame:key=>raf.delete(key),
 setTimer:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},clearTimer:key=>timers.delete(key)});
function advance(ms){const end=now+ms;while(now<end){now=Math.min(end,now+1000/60);const callbacks=[...raf.values()];raf.clear();callbacks.forEach(fn=>fn(now));for(const [key,item]of [...timers])if(item.at<=now){timers.delete(key);item.fn();}}}
scheduler.invalidate();advance(1000);assert.equal(frames,1,'A paused scene uses one GPU frame, not30 repeated identical frames');
assert.equal(raf.size,0);assert.equal(timers.size,1,'Idle assets use one bounded low-frequency poll');
revision++;advance(250);assert.equal(frames,2,'An asynchronously loaded logo/video/font wakes a paused scene');
scheduler.invalidate();advance(20);assert.equal(frames,3,'A settings edit wakes immediately rather than waiting for the idle poll');
animating=true;scheduler.invalidate();advance(1000);assert.ok(frames>50,'A moving scene receives animation frames for its independent cadence limiter');
active=false;scheduler.reconcile();const stopped=frames;advance(60000);assert.equal(frames,stopped);assert.equal(raf.size,0);assert.equal(timers.size,0,'Offscreen/hidden scenes schedule neither GPU frames nor idle polling');
active=true;scheduler.reconcile();assert.equal(resume.at(-1)[0],60000,'Resume exposes suspension duration so animation clocks can be frozen');advance(20);assert.ok(frames>stopped);
animating=false;complete=false;scheduler.invalidate();advance(40);assert.ok(raf.size,'A cadence-skipped dirty frame is retried, not lost');
complete=true;advance(40);assert.equal(raf.size,0);assert.equal(timers.size,1);
scheduler.dispose();assert.equal(raf.size+timers.size,0);scheduler.invalidate();advance(1000);assert.equal(raf.size+timers.size,0);
console.log('Render scheduler: zero repeated idle GPU passes, bounded asset polling, immediate interaction wake, full offscreen suspension, frozen-clock resume and dirty-frame retry passed.');
