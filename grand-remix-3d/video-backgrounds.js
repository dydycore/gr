// One native decoder, created only when a video ambience is actually selected.
// These paths are real MP4 assets, never recordings of the photo fallback.
export const VIDEO_BACKGROUNDS=Object.freeze(Object.fromEntries(
 ['dream','red_alert','warm','pinky','hiphop'].map(id=>[id,`media/backgrounds/${id}.mp4`])
));
const validTime=value=>Number.isFinite(value)?Math.max(0,value):0;
const modulo=(value,length)=>((value%length)+length)%length;

export function createVideoBackgroundPlayer({createVideo=()=>typeof document==='object'?document.createElement('video'):null,createStill=()=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(1024,1024):typeof document==='object'?document.createElement('canvas'):null,now=()=>typeof performance==='object'?performance.now():0}={}){
 let video=null,activeMode=null,failed=false,playPending=false,playBlocked=false,revision=0,generation=0;
 let decodedGeneration=-1,still=null,stillGeneration=-1;
 let state={enabled:true,playing:true,mode:null,time:0},external=false,lastTime=null,lastCheck=-Infinity,frameRequest=0;
 const duration=()=>Number.isFinite(video?.duration)&&video.duration>0?Math.min(30,video.duration):30;
 const desired=()=>modulo(state.time,duration());
 const ready=()=>!!(state.enabled&&state.mode===activeMode&&!failed&&!(playBlocked&&state.playing)&&video&&video.readyState>=2&&video.videoWidth&&video.videoHeight&&!video.seeking);
 const frameReady=()=>!!(state.enabled&&state.mode===activeMode&&!failed&&decodedGeneration===generation&&video&&(video.readyState>=2||stillGeneration===generation));
 function holdFrame(){
  if(!video||video.readyState<2||!video.videoWidth||!video.videoHeight||decodedGeneration!==generation)return;
  try{
   if(!still){still=createStill();if(!still)return;still.width=1024;still.height=1024;}
   const ctx=still.getContext('2d');if(!ctx)return;
   const side=Math.min(video.videoWidth,video.videoHeight);
   ctx.drawImage(video,(video.videoWidth-side)/2,(video.videoHeight-side)/2,side,side,0,0,1024,1024);stillGeneration=generation;
  }catch{/* A native ready frame remains usable when a canvas is unavailable. */}
 }
 function decoded(){if(video?.readyState>=2&&video.videoWidth&&video.videoHeight){decodedGeneration=generation;if(stillGeneration!==generation)holdFrame();}}
 function seek(force=false){
  if(!video||video.readyState<1)return;
  const target=desired();
  if(force||Math.abs(video.currentTime-target)>.12){holdFrame();try{video.currentTime=target;}catch{}}
 }
 function pause(){if(video&&!video.paused)video.pause();}
 function play(){
  if(!video||failed||playPending||playBlocked||!state.enabled||!state.playing||state.mode!==activeMode||!video.paused)return;
  try{
   const token=generation,promise=video.play();
   if(promise?.then){playPending=true;promise.then(()=>{if(token!==generation)return;playPending=false;if(!state.enabled||!state.playing||state.mode!==activeMode)pause();},error=>{if(token!==generation)return;playPending=false;playBlocked=state.enabled&&state.playing&&error?.name!=='AbortError';});}
  }catch{playBlocked=true;}
 }
 function select(mode){
  if(!VIDEO_BACKGROUNDS[mode]||!state.enabled){pause();return;}
  if(mode===activeMode)return;
  if(!video){
   video=createVideo();if(!video)return;
   video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;video.preload='metadata';video.autoplay=true;video.disablePictureInPicture=true;
   video.setAttribute?.('muted','');video.setAttribute?.('playsinline','');
   // Keep the single media element observable for playback diagnostics without
   // displaying a second player or controls in the interface.
   video.hidden=true;video.setAttribute?.('aria-hidden','true');video.setAttribute?.('data-projection-background','');
   if(typeof document==='object'&&document.body&&video instanceof HTMLVideoElement)document.body.appendChild(video);
   video.addEventListener('loadedmetadata',()=>{revision++;seek(true);if(!state.playing||!state.enabled)pause();else play();});
   video.addEventListener('loadeddata',()=>{revision++;decoded();});
   video.addEventListener('seeking',holdFrame);
   video.addEventListener('seeked',()=>{revision++;decoded();});
   video.addEventListener('canplay',()=>{revision++;decoded();if(!state.playing||!state.enabled)pause();else play();});
   video.addEventListener('playing',()=>{if(!state.playing||!state.enabled||state.mode!==activeMode)pause();});
   video.addEventListener('error',()=>{revision++;failed=true;pause();});
  }
  pause();activeMode=mode;revision++;generation++;decodedGeneration=-1;stillGeneration=-1;failed=false;playPending=false;playBlocked=false;lastTime=null;lastCheck=-Infinity;
  video.src=VIDEO_BACKGROUNDS[mode];video.load();
 }
 function update(next,controlled){
  if(controlled)external=true;
  const previous=state;state={...state,...next,time:validTime(next.time??state.time)};
  select(state.mode);
  if(video)video.autoplay=state.enabled&&state.playing&&!!VIDEO_BACKGROUNDS[state.mode];
  if(!state.enabled||!VIDEO_BACKGROUNDS[state.mode]){pause();lastTime=state.time;return;}
  const restarted=lastTime!==null&&(state.time<lastTime-.05||state.time-lastTime>1.25);
  const resumed=(!previous.enabled&&state.enabled)||(!previous.playing&&state.playing);
  if(restarted||resumed){playBlocked=false;seek(true);lastCheck=now();}
  if(!state.playing){pause();if(previous.playing||restarted)seek();}
  else{
   // Native playback owns the clock between sparse corrections. In particular,
   // never seek on every canvas draw: that stalls hardware decoding.
   const stamp=now();
   if(video?.readyState>=2&&video.currentTime>=duration())seek(true);
   if(video?.readyState>=2&&stamp-lastCheck>=2000){
    const span=duration(),difference=Math.abs(video.currentTime-desired());
    if(video.currentTime>=span||Math.min(difference,Math.abs(span-difference))>.75)seek(true);
    lastCheck=stamp;
   }
   play();
  }
  lastTime=state.time;
 }
 function waitFor(condition,token,request,timeoutMs){
  return new Promise((resolve,reject)=>{
   let timer=null,poll=null,callback=null,settled=false;
   const events=['loadedmetadata','loadeddata','canplay','seeked','error','emptied'];
   function finish(error){
    if(settled)return;settled=true;clearTimeout(timer);clearTimeout(poll);
    for(const name of events)video?.removeEventListener?.(name,check);
    if(callback!==null)video?.cancelVideoFrameCallback?.(callback);
    if(error)reject(error);else resolve(video);
   }
   function check(){
    if(settled)return;
    if(token!==generation||request!==frameRequest||!state.enabled||state.mode!==activeMode){finish(Error('La vidéo demandée a changé.'));return;}
    if(failed){finish(Error('Vidéo indisponible : '+activeMode));return;}
    if(condition()){finish();return;}
    clearTimeout(poll);poll=setTimeout(check,16);
   }
   for(const name of events)video?.addEventListener?.(name,check);
   timer=setTimeout(()=>finish(Error('Délai dépassé : aucune image vidéo décodée.')),timeoutMs);
   if(typeof video?.requestVideoFrameCallback==='function')callback=video.requestVideoFrameCallback(()=>{callback=null;check();});
   check();
  });
 }
 async function awaitFrame(mode,time,{timeoutMs=15000}={}){
  const request=++frameRequest;
  update({enabled:true,playing:false,mode,time},true);
  if(!VIDEO_BACKGROUNDS[mode])return null;
  if(!video)throw Error('Décodeur vidéo indisponible.');
  const token=generation,budget=Number.isFinite(timeoutMs)?Math.max(1,timeoutMs):15000;
  await waitFor(()=>video.readyState>=1,token,request,budget);
  const target=desired();
  // Offline capture intentionally seeks each requested timestamp. Live playback
  // above still lets the native clock run without per-frame seeking.
  if(Math.abs(video.currentTime-target)>.000001){
   holdFrame();try{video.currentTime=target;}catch(error){throw Error('Position vidéo inaccessible : '+error.message);}
  }
  await waitFor(()=>ready()&&Math.abs(video.currentTime-target)<.0001,token,request,budget);
  return video;
 }
 return {
  sync(next){update(next,true);},
  awaitFrame,
  frame(mode,time){
   if(!external)update({mode,time},false);
   if(state.mode!==mode||activeMode!==mode||!frameReady())return null;
   if(ready()){
    // Retain only the first frame, the short lead-in to a native loop, and
    // frames just before explicit seeks. There is no full-time extra blit.
    if(stillGeneration!==generation||video.currentTime>duration()-.25)holdFrame();
    return video;
   }
   return stillGeneration===generation?still:video.readyState>=2?video:null;
  },
  pause(){state={...state,enabled:false};pause();},
  get revision(){return revision;},
  get status(){return {mode:activeMode,loaded:!!video,ready:ready(),frameReady:frameReady(),failed,paused:video?.paused??true,duration:duration()};}
 };
}

const player=createVideoBackgroundPlayer();
export function syncVideoBackgroundPlayback(state){player.sync(state);}
export function getVideoBackgroundRevision(){return player.revision;}
export function getVideoBackgroundStatus(){return player.status;}
export function awaitVideoBackgroundFrame(mode,time,options){return player.awaitFrame(mode,time,options);}
export function drawVideoBackground(ctx,mode,time,size=512){
 const video=player.frame(mode,time);if(!video)return false;
 const width=video.videoWidth||video.width,height=video.videoHeight||video.height,side=Math.min(width,height);
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;
 ctx.drawImage(video,(width-side)/2,(height-side)/2,side,side,0,0,size,size);
 ctx.restore();return true;
}
