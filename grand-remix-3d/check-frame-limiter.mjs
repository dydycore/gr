import assert from 'node:assert/strict';
import {createFrameLimiter} from './frame-limiter.mjs';

function simulate(refreshHz,limit,durationMs=10000){
 const limiter=createFrameLimiter(limit);
 let count=0;
 for(let i=0;i<refreshHz*durationMs/1000;i++)if(limiter.shouldRender(i*1000/refreshHz))count++;
 const measured=count*1000/durationMs;
 assert.ok(measured>limit-2.5&&measured<=limit+2,`at ${refreshHz}Hz/${limit}fps got ${measured}fps`);
 return measured;
}
for(const limit of [15,20,24,30,60])for(const refresh of [60,75,120,144]){
 console.log(`${refresh}Hz cap ${limit}: ${simulate(refresh,limit)} fps`);
}
const limiter=createFrameLimiter(30);
assert.equal(limiter.shouldRender(100),true);
assert.equal(limiter.shouldRender(110),false);
assert.equal(limiter.shouldRender(134),true);
limiter.reset();
assert.equal(limiter.shouldRender(2000),true);
limiter.setFps(60);
assert.equal(limiter.fps,60);
assert.equal(limiter.shouldRender(2005),true);
assert.equal(limiter.shouldRender(2010),false);
assert.equal(limiter.shouldRender(2022),true);
assert.equal(limiter.shouldRender(Number.NaN),false);
console.log('All frame-limiter tests passed.');
