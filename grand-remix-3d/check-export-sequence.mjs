import assert from 'node:assert/strict';
import {createExportPlan,exportFrameAt} from './export-sequence.js';
import {offlineSceneTiming} from './offline-scene-recorder.js';
const scenes=Array.from({length:8},(_,i)=>({name:'Ambiance '+i,duration:30,view:{ambience:String(i)}}));
const plan=createExportPlan({name:'Toutes',scenes});
assert.equal(plan.durationSeconds,240);
assert.equal(offlineSceneTiming(240,240).frameCount,7200);
assert.equal(offlineSceneTiming(1000,240).frameCount,7200);
assert.equal(offlineSceneTiming(240).frameCount,900,'Single-ambience default still caps at 30 s');
const counts=Array(8).fill(0);
for(let index=0;index<7200;index++){
 const sample=exportFrameAt(plan,index/30);counts[sample.index]++;
 assert.ok(sample.time>=0&&sample.time<30);
 if(index%900===0)assert.equal(sample.time,0,'Every ambience starts from frame zero');
}
assert.deepEqual(counts,Array(8).fill(900));
scenes[0].view.ambience='mutated';assert.equal(plan.scenes[0].scene.view.ambience,'0','Frozen copy');
const mixed=createExportPlan({scenes:[{view:{},duration:2},{view:{},duration:4.5},{view:{},duration:10}]});
assert.equal(mixed.durationSeconds,16.5);assert.equal(exportFrameAt(mixed,6.5).index,2);assert.equal(exportFrameAt(mixed,6.5).time,0);
assert.throws(()=>createExportPlan({scenes:[]}),/huit/);
assert.throws(()=>createExportPlan({scenes:Array(9).fill({view:{}})}),/huit/);
assert.throws(()=>createExportPlan({scenes:[{}]}),/incomplets/);
console.log('PASS: 7200 sequential frames / 240s, all eight segments, exact boundaries, variable durations, isolated snapshots and invalid input.');
