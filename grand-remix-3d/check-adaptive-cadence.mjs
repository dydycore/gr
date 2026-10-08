import assert from 'node:assert/strict';
import {createAdaptiveCadence} from './adaptive-cadence.mjs';

function harness(preferred=30){
 const cadence=createAdaptiveCadence(preferred),changes=[];let now=0;
 return {cadence,changes,get now(){return now;},
  run(duration,cost){
   const until=now+duration;
   while(now<until){
    const work=typeof cost==='function'?cost(now):cost;
    now+=Math.max(1000/cadence.fps,work);
    if(cadence.record(now,work))changes.push({time:now,fps:cadence.fps});
   }
  },
  stall(ms){now+=ms;cadence.record(now,1);}
 };
}

// Sustained 65ms work needs 15fps; no reaction to only one 2s window.
const heavy=harness();heavy.run(2500,65);assert.equal(heavy.cadence.fps,30);
heavy.run(20000,65);assert.equal(heavy.cadence.fps,15);
assert.deepEqual(heavy.changes.map(c=>c.fps),[24,20,15]);
for(let i=1;i<heavy.changes.length;i++)assert.ok(heavy.changes[i].time-heavy.changes[i-1].time>=6000);
const recoveredAt=heavy.now;heavy.run(5500,8);assert.equal(heavy.cadence.fps,15);
heavy.run(45000,8);assert.equal(heavy.cadence.fps,30);
const recovery=heavy.changes.filter(c=>c.time>recoveredAt);
assert.deepEqual(recovery.map(c=>c.fps),[20,24,30]);
for(let i=1;i<recovery.length;i++)assert.ok(recovery[i].time-recovery[i-1].time>=12000);

// Isolated stalls, short bursts and modest timing noise do not reduce cadence.
const isolated=harness();isolated.run(4500,10);isolated.stall(1300);isolated.run(12000,10);
assert.equal(isolated.cadence.fps,30);assert.equal(isolated.changes.length,0);
const burst=harness();burst.run(3000,8);burst.run(1300,70);burst.run(12000,8);
assert.equal(burst.cadence.fps,30);
const noisy=harness();noisy.run(45000,t=>14+Math.sin(t/71)*6);
assert.equal(noisy.changes.length,0);

// Delivered cadence also detects load not visible in the CPU work measurement.
const gpu=createAdaptiveCadence();let gpuChanges=0;
for(let t=0;t<20000;t+=66.7)if(gpu.record(t,4))gpuChanges++;
assert.equal(gpu.fps,15);assert.equal(gpuChanges,3);

// A transient visibility reset clears the evidence, without raising the cap.
const resumed=harness();resumed.run(13000,65);const cap=resumed.cadence.fps;
resumed.cadence.reset();assert.equal(resumed.cadence.fps,cap);
resumed.run(2500,65);assert.equal(resumed.cadence.fps,cap);

// The explicit 60fps choice always wins; changing preference is immediate.
const fixed=harness(60);fixed.run(50000,80);
assert.equal(fixed.cadence.fps,60);assert.equal(fixed.cadence.preferredFps,60);assert.equal(fixed.changes.length,0);
assert.equal(fixed.cadence.setFps(30),true);assert.equal(fixed.cadence.fps,30);
assert.equal(fixed.cadence.setFps(60),true);assert.equal(fixed.cadence.fps,60);

// A temporary strobe floor wins over adaptation, and raises a lower cap at once.
const strobe=harness();strobe.cadence.setFloor(24);strobe.run(45000,70);
assert.equal(strobe.cadence.fps,24);assert.deepEqual(strobe.changes.map(c=>c.fps),[24]);
assert.equal(strobe.cadence.setFloor(15),false);strobe.run(22000,70);assert.equal(strobe.cadence.fps,15);
assert.equal(strobe.cadence.setFloor(24),true);assert.equal(strobe.cadence.fps,24);
strobe.cadence.reset();strobe.run(15000,70);assert.equal(strobe.cadence.fps,24);
assert.equal(strobe.cadence.setFloor(30),true);assert.equal(strobe.cadence.fps,30);
strobe.run(15000,70);assert.equal(strobe.cadence.fps,30);
fixed.cadence.setFloor(24);assert.equal(fixed.cadence.fps,60);

// Invalid samples/settings cannot pollute evidence or invent another cadence.
const safe=createAdaptiveCadence(NaN);assert.equal(safe.fps,30);
for(const value of [0,15,24,NaN,Infinity,'60',undefined])assert.equal(safe.setFps(value),false);
for(const value of [0,16,60,NaN,Infinity,'24',undefined])assert.equal(safe.setFloor(value),false);
for(const args of [[NaN,1],[Infinity,1],[-1,1],[1,NaN],[1,Infinity],[1,-1]])assert.equal(safe.record(...args),false);
safe.record(100,5);safe.record(99,5);assert.equal(safe.fps,30);
safe.record(500,500);assert.equal(safe.fps,30);
console.log('PASS adaptive cadence: sustained load, recovery, stalls, noise, cooldowns, reset, strobe floor, fixed 60fps and invalid inputs.');
