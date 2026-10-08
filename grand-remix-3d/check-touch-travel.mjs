import assert from 'node:assert/strict';
import {bindTouchTravel} from './touch-travel.js';
class Target{events={};dataset={};attrs={};addEventListener(n,f){(this.events[n]??=[]).push(f);}emit(n,e={}){for(const f of this.events[n]||[])f({button:0,pointerId:1,preventDefault(){},...e});}setAttribute(k,v){this.attrs[k]=v;}focus(){}setPointerCapture(){}}
const forward=new Target(),back=new Target(),window=new Target(),document=new Target();forward.dataset.travel='forward';back.dataset.travel='back';
const keys=new Set();let distance=0,invalidations=0;
const step=dt=>{if(keys.has('TouchForward'))distance+=dt;if(keys.has('TouchBack'))distance-=dt;};
bindTouchTravel({buttons:[forward,back],keys,step,invalidate:()=>invalidations++,window,document});
forward.emit('pointerdown');assert.equal(keys.has('TouchForward'),true);step(.5);assert.ok(distance>.5);
forward.emit('pointerup');const released=distance;step(.5);assert.equal(distance,released);assert.equal(forward.attrs['aria-pressed'],'false');
back.emit('pointerdown');step(.5);assert.ok(distance<released);back.emit('pointercancel');assert.equal(keys.size,0);
forward.emit('pointerdown');forward.emit('lostpointercapture');assert.equal(keys.size,0);
forward.emit('pointerdown');back.emit('pointerdown');window.emit('blur');assert.equal(keys.size,0);
back.emit('pointerdown');document.hidden=true;document.emit('visibilitychange');assert.equal(keys.size,0);
const before=distance;forward.emit('click',{detail:0});assert.equal(distance,before+.11);assert.equal(keys.size,0);
forward.emit('click',{detail:1});assert.equal(distance,before+.11,'Pointer click cannot double the press movement');
assert.ok(invalidations>0);
console.log('PASS: touch forward/back, held travel, release, cancellation, capture loss, blur, hidden page and accessible click.');
