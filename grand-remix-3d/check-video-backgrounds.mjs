import assert from 'node:assert/strict';
import {createVideoBackgroundPlayer,VIDEO_BACKGROUNDS} from './video-backgrounds.js';

class FakeVideo{
 constructor(){this.listeners={};this.paused=true;this.readyState=0;this.videoWidth=0;this.videoHeight=0;this.duration=NaN;this.loads=[];this.seeks=[];this.plays=0;this.pauses=0;this.clock=0;this.seeking=false;}
 setAttribute(){} addEventListener(name,fn){(this.listeners[name]??=new Set()).add(fn);} removeEventListener(name,fn){this.listeners[name]?.delete(fn);}
 emit(name){for(const fn of [...this.listeners[name]||[]])fn();}
 load(){this.loads.push(this.src);this.readyState=0;this.clock=0;this.duration=NaN;this.videoWidth=0;this.videoHeight=0;}
 ready(duration=30){this.duration=duration;this.readyState=1;this.videoWidth=1920;this.videoHeight=1080;this.emit('loadedmetadata');this.readyState=2;this.emit('loadeddata');this.emit('canplay');}
 set currentTime(value){this.seeks.push(value);this.clock=value;} get currentTime(){return this.clock;}
 play(){this.plays++;this.paused=false;} pause(){this.pauses++;this.paused=true;}
}
let created=0,now=0;const video=new FakeVideo();
const player=createVideoBackgroundPlayer({createVideo:()=>{created++;return video;},now:()=>now});
assert.equal(created,0,'No decoder created at startup');
player.sync({mode:'opening',enabled:true,playing:true,time:0});assert.equal(created,0,'Logo ambiences never load a video');
player.sync({mode:'dream',enabled:false,playing:true,time:0});assert.equal(created,0,'Projector off never loads a background');
player.sync({mode:'dream',enabled:true,playing:true,time:0});
assert.equal(created,1);assert.deepEqual(video.loads,[VIDEO_BACKGROUNDS.dream]);
assert.equal(video.muted,true);assert.equal(video.playsInline,true);assert.equal(video.preload,'metadata');
assert.equal(player.frame('dream',0),null,'Use fallback while no decoded frame is ready');
assert.equal(player.status.ready,false);
assert.equal(player.status.frameReady,false,'A new source is gated until it has actually decoded');
const beforeReady=player.revision;video.ready();assert.ok(player.revision>beforeReady,'Loading changes the paused-canvas revision');
assert.equal(player.frame('dream',0),video);
assert.equal(player.status.ready,true);video.seeking=true;assert.equal(player.status.ready,false);assert.equal(player.status.frameReady,true);assert.equal(player.frame('dream',0),video,'Live playback may hold a decoded frame from the same source during a seek');video.seeking=false;
const seeks=video.seeks.length;
for(let frame=1;frame<=300;frame++){
 now=frame*1000/30;video.clock=frame/30;
 player.sync({mode:'dream',enabled:true,playing:true,time:frame/30});assert.equal(player.frame('dream',frame/30),video);
}
assert.equal(video.seeks.length,seeks,'Ten seconds at30 FPS use native playback without per-frame seeking');
player.sync({mode:'dream',enabled:true,playing:false,time:10});assert.equal(video.paused,true);assert.equal(video.autoplay,false);
const pausedSeeks=video.seeks.length;
for(let i=0;i<30;i++)player.sync({mode:'dream',enabled:true,playing:false,time:10});
assert.equal(video.seeks.length,pausedSeeks,'Paused drawing does not repeatedly seek');
player.sync({mode:'dream',enabled:true,playing:true,time:10});assert.equal(video.paused,false);
player.sync({mode:'dream',enabled:true,playing:true,time:0});assert.equal(video.currentTime,0,'Rejouer seeks once to the start');
player.sync({mode:'warm',enabled:true,playing:true,time:4});assert.equal(created,1,'Only one video decoder is reused across ambiences');
assert.deepEqual(video.loads,[VIDEO_BACKGROUNDS.dream,VIDEO_BACKGROUNDS.warm]);assert.equal(player.frame('warm',4),null,'Never show the previous clip while loading');
assert.equal(player.status.frameReady,false,'The preceding source cannot open the new-source gate');
video.ready(60);assert.equal(video.currentTime,4);video.clock=30.01;
player.sync({mode:'warm',enabled:true,playing:true,time:30.01});assert.ok(video.currentTime<.02,'Longer assets are limited to a30-second loop');
player.sync({mode:'warm',enabled:false,playing:true,time:31});assert.equal(video.paused,true);assert.equal(player.frame('warm',31),null);
player.sync({mode:'dj',enabled:true,playing:true,time:0});assert.equal(video.paused,true,'An inactive video ambience does not keep decoding');
player.sync({mode:'pinky',enabled:true,playing:false,time:7});video.ready(12);assert.equal(video.paused,true,'A clip loaded while paused must remain paused');
assert.equal(video.currentTime,7);assert.equal(player.frame('pinky',7),video);
video.emit('error');assert.equal(player.frame('pinky',7),null,'Missing or failed footage falls back cleanly');
const attempts=video.loads.length;for(let i=0;i<90;i++)player.sync({mode:'pinky',enabled:true,playing:true,time:7+i/30});assert.equal(video.loads.length,attempts,'No repeated failed download on every frame');
console.log('Native video backgrounds: lazy single decoder, muted playback, metadata,30 FPS without continuous seeks, pause/off, restart, switch,30-second cap and fallback passed.');

class DecodingVideo extends FakeVideo{
 constructor(){super();this.callbacks=new Map();this.nextCallback=0;}
 set currentTime(value){this.seeks.push(value);this.clock=value;this.seeking=true;this.readyState=1;}
 get currentTime(){return this.clock;}
 requestVideoFrameCallback(fn){const id=++this.nextCallback;this.callbacks.set(id,fn);return id;}
 cancelVideoFrameCallback(id){this.callbacks.delete(id);}
 decoded(){this.seeking=false;this.readyState=2;this.emit('seeked');for(const [id,fn]of this.callbacks){this.callbacks.delete(id);fn(0,{mediaTime:this.clock});}}
}
let copies=0;const heldFrame={width:0,height:0,getContext:()=>({drawImage(){copies++;}})};
const liveVideo=new DecodingVideo(),live=createVideoBackgroundPlayer({createVideo:()=>liveVideo,createStill:()=>heldFrame});
live.sync({mode:'dream',enabled:true,playing:true,time:0});assert.equal(live.status.frameReady,false);
liveVideo.ready();liveVideo.decoded();assert.equal(live.status.frameReady,true);assert.equal(live.frame('dream',0),liveVideo);
const initialCopies=copies;for(let i=1;i<=30;i++){liveVideo.clock=i/30;live.frame('dream',i/30);}assert.equal(copies,initialCopies,'No extra copy on every ordinary live frame');
live.sync({mode:'dream',enabled:true,playing:true,time:10});
assert.equal(live.status.ready,false);assert.equal(live.status.frameReady,true);assert.equal(liveVideo.readyState,1);assert.equal(live.frame('dream',10),heldFrame,'Keep the captured native frame while seek drops readyState to1');
liveVideo.decoded();assert.equal(live.frame('dream',10),liveVideo);
liveVideo.clock=29.9;live.frame('dream',29.9);assert.ok(copies>initialCopies,'Retain the video near its native loop boundary');
liveVideo.seeking=true;liveVideo.readyState=1;assert.equal(live.frame('dream',0),heldFrame,'Native loop holds the same-source last frame without a white flash');
live.sync({mode:'warm',enabled:true,playing:false,time:0});assert.equal(live.status.frameReady,false);assert.equal(live.frame('warm',0),null,'Changing source discards its held frame immediately');

const exportVideo=new DecodingVideo(),offline=createVideoBackgroundPlayer({createVideo:()=>exportVideo});
let resolved=false;
const first=offline.awaitFrame('dream',0).then(value=>{resolved=true;return value;});
await Promise.resolve();assert.equal(resolved,false,'First export frame waits for metadata');
exportVideo.ready();await Promise.resolve();await Promise.resolve();
assert.equal(resolved,false,'Ready metadata with a pending seek is insufficient');
exportVideo.decoded();assert.equal(await first,exportVideo);assert.equal(exportVideo.paused,true);assert.equal(offline.status.ready,true);
for(const time of [1/30,2/30,3/30,17.25,0,30+1/30]){
 resolved=false;const frame=offline.awaitFrame('dream',time).then(value=>{resolved=true;return value;});
 await Promise.resolve();await Promise.resolve();
 assert.equal(resolved,false,'A changed timestamp waits for a newly decoded frame');
 assert.ok(Math.abs(exportVideo.currentTime-(time%30))<.0001);assert.equal(exportVideo.seeking,true);
 exportVideo.decoded();assert.equal(await frame,exportVideo);assert.equal(exportVideo.callbacks.size,0,'Frame callbacks are cleaned after completion');
}
const beforeSame=exportVideo.seeks.length;assert.equal(await offline.awaitFrame('dream',30+1/30),exportVideo);assert.equal(exportVideo.seeks.length,beforeSame,'Exact repeated timestamp reuses the decoded frame');
const switchFrame=offline.awaitFrame('warm',2);await Promise.resolve();assert.equal(offline.status.ready,false);exportVideo.ready(12);exportVideo.decoded();assert.equal(await switchFrame,exportVideo);assert.equal(exportVideo.currentTime,2);
const wrapped=offline.awaitFrame('warm',14);await Promise.resolve();exportVideo.decoded();assert.equal(await wrapped,exportVideo,'Timestamp wraps to shorter source duration');
assert.equal(await offline.awaitFrame('opening',0),null,'A logo scene requires no native video');assert.equal(exportVideo.paused,true);
const cancelled=offline.awaitFrame('pinky',3);const cancelledAssertion=assert.rejects(cancelled,/changé/);offline.sync({mode:'warm',enabled:true,playing:false,time:0});await cancelledAssertion;
const missing=offline.awaitFrame('red_alert',0);const missingAssertion=assert.rejects(missing,/indisponible/);exportVideo.emit('error');await missingAssertion;
const timeout=offline.awaitFrame('pinky',0,{timeoutMs:10});await assert.rejects(timeout,/Délai dépassé/);assert.equal(exportVideo.callbacks.size,0,'Timeout releases frame callback');
assert.equal(exportVideo.listeners.seeked.size,1,'Temporary readiness listeners are cleaned');
console.log('Offline video capture: metadata and exact decoded timestamp awaited, no stale seek frame, native pause, loop bounds, decoder reuse, cancellation, error and timeout passed.');
