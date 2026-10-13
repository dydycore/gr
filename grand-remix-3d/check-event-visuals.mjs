import assert from 'node:assert/strict';
import {drawEventVisual} from './event-motion.js';
import {syncVideoBackgroundPlayback} from './video-backgrounds.js';
import {getVisualFontRevision} from './visual-scenes-colour.js';
import {readFileSync,statSync} from 'node:fs';

const round=n=>Math.round(n*1e7)/1e7;
const clean=value=>typeof value==='number'?round(value):Array.isArray(value)?value.map(clean):value;
function recorder(){
 const logs=[],texts=[],stack=[];
 let state={globalAlpha:.47,globalCompositeOperation:'multiply',font:'13px Arial',textAlign:'left',textBaseline:'alphabetic',lineWidth:7,shadowBlur:4,matrix:[1,0,0,1,0,0]};
 const initial=JSON.stringify(state);
 const log=(name,...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${name}: finite geometry`);logs.push([name,...args.map(clean)]);};
 const mul=([a,b,c,d,e,f])=>{
  const [g,h,i,j,k,l]=state.matrix;state.matrix=[g*a+i*b,h*a+j*b,g*c+i*d,h*c+j*d,g*e+i*f+k,h*e+j*f+l];
 };
 const fontSize=()=>Number(state.font.match(/([\d.]+)px/)?.[1]||13);
 const width=text=>[...text].reduce((sum,c)=>sum+(c===' '?.3:'IML1'.includes(c)?.4:.64),0)*fontSize();
 const gradient=(name,args)=>{
  const id=`gradient-${logs.length}`;log(name,...args);
  return {id,addColorStop:(offset,color)=>{assert.ok(offset>=0&&offset<=1);log('addColorStop',id,offset,color);}};
 };
 const methods={
  save(){stack.push({...state,matrix:[...state.matrix]});log('save');},
  restore(){assert.ok(stack.length,'Balanced restore');state=stack.pop();log('restore');},
  scale(x,y){mul([x,0,0,y,0,0]);log('scale',x,y);},
  translate(x,y){mul([1,0,0,1,x,y]);log('translate',x,y);},
  rotate(a){mul([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);log('rotate',a);},
  measureText(text){return {width:width(text)};},
  fillText(text,x,y){
   const w=width(text),h=fontSize(),[a,b,c,d,e,f]=state.matrix;
   const corners=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([dx,dy])=>[a*(x+dx)+c*(y+dy)+e,b*(x+dx)+d*(y+dy)+f]);
   texts.push({text,corners,alpha:state.globalAlpha,font:state.font,fillStyle:state.fillStyle,shadowColor:state.shadowColor,shadowBlur:state.shadowBlur,shadowOffsetY:state.shadowOffsetY});log('fillText',text,x,y);
  },
  drawImage(image,...args){assert.ok(image?.complete&&image.naturalWidth>0||image?.width>0&&image?.height>0||image?.videoWidth>0&&image?.readyState>=2,'Draw only loaded images, videos or raster caches');if(image.__art&&args.length===8){assert.ok(args[0]>=0&&args[1]>=0);assert.ok(args[0]+args[2]<=image.naturalWidth+.0001&&args[1]+args[3]<=image.naturalHeight+.0001,'Photo crop stays inside source');}log('drawImage',image.videoWidth?'video':image.__art?'art':image?.complete?'logo':'bitmap',...args);},
  createRadialGradient(...args){return gradient('radial',args);},
  createLinearGradient(...args){return gradient('linear',args);},
 };
 for(const name of ['beginPath','closePath','clip','fill','stroke','moveTo','lineTo','arc','rect','fillRect','strokeRect','quadraticCurveTo','bezierCurveTo','setLineDash','strokeText'])methods[name]=(...args)=>log(name,...args);
 const ctx=new Proxy(methods,{get(target,key){return key in target?target[key]:state[key];},set(target,key,value){
  if(key==='globalAlpha')assert.ok(value>=0&&value<=1,`Valid opacity ${value}`);
  state[key]=value;log('set',key,value?.id??value);return true;
 }});
 return {ctx,logs,texts,check(){assert.equal(stack.length,0);assert.equal(JSON.stringify(state),initial,'Caller canvas state restored');}};
}
const logo={complete:true,naturalWidth:820,naturalHeight:310};
const scenes=['arrival','opening','dream','red_alert','warm','pinky','dj','hiphop'];
function render(scene,t,size=512,image=logo){const r=recorder();drawEventVisual(r.ctx,image,t,size,scene);r.check();return r;}
const signatures=[];
for(const scene of scenes){
 for(const time of [0,.25,4.5,9.5,10,18.5,29.875]){
  const first=render(scene,time),second=render(scene,time+30);
  assert.deepEqual(first.logs,second.logs,`${scene}: deterministic 30-second loop at ${time}`);
  assert.ok(first.logs.length<6500,`${scene}: bounded geometry, ${first.logs.length} operations`);
  assert.ok(first.logs.some(([op])=>op==='clip'),`${scene}: circular screen clipped`);
  for(const {text,corners,alpha}of first.texts)if(alpha>.02&&time%10>2.3&&time%10<8.05)for(const [x,y]of corners)
   assert.ok(Math.hypot(x-256,y-256)<250,`${scene}: readable text '${text}' inside circular safe area (${x},${y})`);
 }
 const reused=recorder();drawEventVisual(reused.ctx,logo,2,512,scene);reused.check();reused.logs.length=0;
 drawEventVisual(reused.ctx,logo,2,512,scene);reused.check();assert.deepEqual(reused.logs,render(scene,2).logs,`${scene}: no drifting canvas state`);
 render(scene,3,1024);render(scene,2,512,null);render(scene,2,512,{complete:false,naturalWidth:512});
 signatures.push(JSON.stringify(render(scene,5).logs));
 assert.notDeepEqual(render(scene,2).logs,render(scene,6).logs,`${scene}: actually animated`);
}
assert.equal(new Set(signatures).size,8,'Eight distinct visual compositions');
assert.deepEqual(render('saved-custom-scene',2).logs,render('opening',2).logs,'Unknown/custom scenes use opening fallback');
assert.deepEqual(render('opening',NaN).logs,render('opening',0).logs,'Invalid clock falls back to zero');
assert.deepEqual(render('arrival',-1).logs,render('arrival',29).logs,'Negative time wraps safely');
assert.deepEqual(render('opening',0,0).logs,render('opening',0,512).logs,'Invalid size uses 512');
for(const time of [3,13,23])assert.ok(render('hiphop',time).texts.some(item=>item.text==='CALAMINE'));
assert.ok(!render('hiphop',5).texts.some(item=>item.text==='RAP CONSCIENT'),'No unwanted caption');
const hiphopWords=[3,13,23].flatMap(time=>render('hiphop',time).texts.map(item=>item.text));
for(const word of ['CALAMINE','LUCIDE','LIBRE','DEBOUT'])assert.ok(hiphopWords.includes(word));
const arrivalWords=[3,13,23].flatMap(time=>render('arrival',time).texts.map(item=>item.text));
for(const word of ['BIENVENUE','ENTREZ','DANSONS'])assert.ok(arrivalWords.includes(word));
const pinkyWords=[3,13,23].flatMap(time=>render('pinky',time).texts.map(item=>item.text));
for(const word of ['Amour','Tendresse','Ensemble'])assert.ok(pinkyWords.includes(word),'Pinky has its own French love words');
const dj=render('dj',3).logs;assert.equal(dj.filter(([op])=>op==='drawImage').length,1,'DJ uses transparent logo directly');
assert.equal(dj.filter(([op])=>op==='fill').length,0,'DJ has no filled logo medallion');
const primary={arrival:'BIENVENUE',dream:'Mer',red_alert:'GUERRE',warm:'Vacances',pinky:'Amour',hiphop:'CALAMINE'};
const families=[];
for(const [scene,label]of Object.entries(primary)){
 const find=t=>render(scene,t).texts.find(item=>item.text===label);
 const center=item=>item.corners.reduce((sum,[x])=>sum+x,0)/4;
 if(scene==='arrival')assert.ok(center(find(.3))<100,`${scene}: word enters from left`);
 assert.ok(Math.abs(center(find(5))-256)<3,`${scene}: word holds legibly in center`);
 if(scene==='arrival')assert.ok(center(find(9.7))>400,`${scene}: word leaves through right`);
 families.push(find(5).font);
 const plateau=render(scene,5).texts;
 const words=scene==='arrival'?['BIENVENUE','ENTREZ','DANSONS']:scene==='dream'?['Mer','MARÉE','Écume']:scene==='red_alert'?['GUERRE','VIOLENCE','RÉSISTER']:scene==='warm'?['Vacances','JOIE','Soleil']:[];
 if(words.length)assert.equal(new Set(plateau.filter(item=>words.includes(item.text)).map(item=>item.text)).size,1,'Only one cycle word at a time');
}
assert.equal(new Set(families).size,6,'Six distinct word-clip typographic treatments, including calligraphic Pinky');
for(const scene of ['dream','warm','pinky']){
 assert.ok(render(scene,.3).texts[0].alpha<.4,'Calm words fade in over0.95 seconds');
 assert.ok(render(scene,9.7).texts[0].alpha<.4,'Calm words fade out gently before each looped transition');
 assert.equal(render(scene,5).texts[0].alpha,1,'The reading plateau remains fully opaque');
}
assert.equal(render('red_alert',.3).texts[0].alpha,1,'Rouge intense preserves its brisk0.18-second fade');
assert.equal(render('red_alert',9.7).texts[0].alpha,1);
for(const scene of ['warm','pinky'])for(const time of [5,15,25])assert.equal(render(scene,time).logs.filter(([op])=>op==='strokeText').length,0,scene+': no heavy uniform text outline');
assert.notEqual(render('warm',5).texts[0].font,render('warm',15).texts[0].font,'Warm switches handwritten Vacances to rounded JOIE');
assert.ok(render('pinky',5).texts[0].font.includes('GR Love'),'Pinky uses the embedded calligraphic typeface');
for(const time of [5,15,25]){
 const frame=render('dream',time),text=frame.texts[0];
 assert.ok(text.font.startsWith('italic 700'),'Ocean uses genuine bold editorial italics');
 const width=text.corners[1][0]-text.corners[0][0];assert.ok(width>=512*.7&&width<=512*.82,'Blue titles fill70–82% of the circle');
 assert.equal(frame.logs.filter(([op])=>op==='strokeText').length,1);
 assert.equal(text.fillStyle,'#073a70','All three blue words use the same deep blue ink');
 assert.ok(frame.logs.some(([op,key,value])=>op==='set'&&key==='strokeStyle'&&value==='#ffffff'),'All three blue words have the same white outline');
 assert.ok(frame.logs.some(([op,key,value])=>op==='set'&&key==='lineWidth'&&value===3.5));
}
const mer=render('dream',5).texts[0];assert.equal(mer.fillStyle,'#073a70','Mer uses deep blue ink');assert.equal(mer.shadowBlur,4);assert.equal(mer.shadowOffsetY,2,'Mer has only a small drop shadow');
const vacances=render('warm',5).texts[0];assert.equal(vacances.shadowColor,'rgba(255,207,96,.72)');assert.equal(vacances.shadowBlur,14);assert.equal(vacances.shadowOffsetY,0,'Vacances has a soft centred golden halo');
for(const time of [5,15,25]){
 const red=render('red_alert',time);
 assert.ok(red.texts[0].font.startsWith('900 ')&&red.texts[0].font.includes('Impact, "Arial Black"'),'Rouge intense retains the previously approved Impact lettering');
 assert.equal(red.logs.filter(([op])=>op==='strokeText').length,1,'Rouge retains its original shadow outline');
 assert.ok(!red.logs.some(([op,key,value])=>op==='set'&&key==='globalCompositeOperation'&&value==='destination-out'),'No new stencil cuts in Rouge intense');
}
for(const [scene,label]of [['opening','GRAND REMIX'],['dj','REMIX EN DIRECT']]){
 const left=render(scene,.3).texts.find(item=>item.text===label),right=render(scene,9.7).texts.find(item=>item.text===label);
 assert.deepEqual(left.corners,right.corners,'Logo clips keep their existing stationary caption, no added word cycle');
}
for(const scene of ['dream','red_alert','warm','pinky','hiphop']){
 for(const time of [5,15,25]){
  const main=render(scene,time).texts[0];assert.ok(Number(main.font.match(/[\d.]+px/)[0].slice(0,-2))>=(['hiphop','pinky'].includes(scene)?68:70),`${scene}: dominant title`);
 }
 const transitionSignature=time=>render(scene,time).logs.filter(([op])=>['translate','scale','rotate','clip','rect'].includes(op));
 assert.equal(new Set([.3,10.3,20.3].map(t=>JSON.stringify(transitionSignature(t)))).size,3,`${scene}: three distinct word transitions`);
}
assert.ok(!render('dream',.3).logs.some(([op,key,value])=>op==='set'&&key==='filter'&&String(value).startsWith('blur(')),'No per-frame blur filter; cached vapor version only');
assert.ok(!render('dream',5).logs.some(([op,key,value])=>op==='set'&&key==='filter'&&String(value).startsWith('blur(')),'Plateau words stay sharp');
const originalImage=globalThis.Image,images=[];
class FakeArtImage{constructor(){this.__art=true;this.naturalWidth=1254;this.naturalHeight=1254;images.push(this);}set src(value){this.complete=true;this.source=value;}}
globalThis.Image=FakeArtImage;
for(const scene of ['dream','red_alert','warm','pinky'])for(const time of [5,15,25]){
 const frame=render(scene,time);
 assert.equal(frame.logs.filter(([op,source])=>op==='drawImage'&&source==='art').length,0,scene+': never draw a retired photo while video is not ready');
 assert.ok(frame.texts.some(item=>item.text==='Chargement de la vidéo…'),scene+': loading is explicit');
 assert.equal(frame.logs.filter(([op])=>op==='fillRect').length,2,scene+': wrapper clear plus a single solid fill, without animated scenery');
}
assert.equal(images.length,0,'No old background images load at startup');
const originalOffscreen=globalThis.OffscreenCanvas,rasters=[];
globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;this.record=recorder();rasters.push(this);}getContext(){return this.record.ctx;}};
try{
 for(const scene of scenes){render(scene,5);render(scene,.3);}
 const count=rasters.length;
 for(let pass=0;pass<3;pass++)for(const scene of scenes)render(scene,5+pass*.1);
 assert.equal(rasters.length,count,'Logo, static grain and shadowed words rasterize once, not every frame');
 assert.equal(rasters.flatMap(canvas=>canvas.record.logs).filter(([op,key,value])=>op==='set'&&key==='filter'&&value==='invert(1) hue-rotate(180deg)').length,1,'The logo colour filter runs only once');
 assert.ok(!render('dj',5).logs.some(([op,key,value])=>op==='set'&&key==='filter'&&value==='invert(1) hue-rotate(180deg)'),'No per-frame logo filter in cached rendering');
 assert.ok(rasters.flatMap(canvas=>canvas.record.logs).some(([op,key,value])=>op==='set'&&key==='filter'&&value==='blur(1.1px)'),'Vapor text is rasterized once, not filtered every frame');
 assert.equal(render('warm',5).logs.filter(([op])=>op==='fillRect').length,2,'Waiting background remains a single solid fill after wrapper clear');
 for(const scene of ['dream','red_alert','warm','pinky']){
  const frame=render(scene,5.2);
  assert.ok(!frame.logs.some(([op,key])=>op==='set'&&key==='filter'),'Animated material adds no per-frame image filter');
  assert.ok(frame.logs.length<1400,`${scene}: bounded cached frame work (${frame.logs.length} operations)`);
  assert.deepEqual(frame.logs,render(scene,35.2).logs,`${scene}: cached material animation also loops in30 seconds`);
 }
}finally{if(originalOffscreen===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=originalOffscreen;if(originalImage===undefined)delete globalThis.Image;else globalThis.Image=originalImage;}
const originalDocument=globalThis.document;let videoCount=0;
const video={paused:true,readyState:0,videoWidth:0,videoHeight:0,duration:30,currentTime:0,listeners:{},addEventListener(name,handler){this.listeners[name]=handler;},setAttribute(){},load(){this.readyState=0;},play(){this.paused=false;},pause(){this.paused=true;}};
globalThis.document={createElement(tag){assert.equal(tag,'video');videoCount++;return video;}};
globalThis.Image=FakeArtImage; // Only a ready red video may load its side collage.
try{
 for(const scene of ['dream','red_alert','warm','pinky','hiphop']){
  syncVideoBackgroundPlayback({enabled:true,playing:true,mode:scene,time:5});
  video.readyState=2;video.videoWidth=1920;video.videoHeight=1080;video.listeners.loadedmetadata();video.listeners.canplay();
  const frame=render(scene,5),draws=frame.logs.filter(([op])=>op==='drawImage');
  assert.equal(draws.filter(call=>call[1]==='video').length,1,`${scene}: a real decoded video supplies the background`);
  assert.equal(draws.filter(call=>call[1]==='art').length,scene==='red_alert'?2:0,`${scene}: photographic fallback is not drawn over ready video`);
  assert.deepEqual(draws.find(call=>call[1]==='video').slice(2),[420,0,1080,1080,0,0,512,512],'Widescreen video uses a square crop without stretching');
  assert.ok(frame.texts.length>0||draws.slice(draws.findIndex(call=>call[1]==='video')+1).some(call=>call[1]==='bitmap'),`${scene}: the existing readable word stays above the video`);
 }
 assert.equal(videoCount,1,'All five clips reuse one lazy native video element');assert.equal(images.length,1,'Only the red edge collage image is loaded');
 syncVideoBackgroundPlayback({enabled:false,playing:true,mode:'pinky',time:5});assert.equal(video.paused,true);
}finally{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;if(originalImage===undefined)delete globalThis.Image;else globalThis.Image=originalImage;}
console.log('Event visuals: 8 readable loops, native video backgrounds with solid waiting state only, transparent red collage edges, square crop,30-second periodicity and bounded raster caches passed.');

let fontBytes=0;for(const font of ['cormorant-bolditalic','anton','dynapuff','caveat','great-vibes']){const file=new URL('media/fonts/'+font+'.woff2',import.meta.url);assert.equal(readFileSync(file).subarray(0,4).toString(),'wOF2');fontBytes+=statSync(file).size;assert.ok(readFileSync(new URL('media/fonts/'+font+'-OFL.txt',import.meta.url),'utf8').includes('SIL OPEN FONT LICENSE'));}assert.ok(fontBytes<60000,'Embedded subsets stay below60KB total');
const fontDoc=globalThis.document,beforeFonts=getVisualFontRevision();let fontRequests=0;globalThis.document={fonts:{load(){fontRequests++;return Promise.resolve([{}]);}}};render('dream',5);render('dream',5.1);await Promise.resolve();assert.equal(fontRequests,1,'Load a chosen font only once');assert.ok(getVisualFontRevision()>beforeFonts,'Font readiness invalidates cached fallback text and paused-frame key');if(fontDoc===undefined)delete globalThis.document;else globalThis.document=fontDoc;
console.log('Typography: five local OFL subsets, strong thematic contrast, no shared heavy outlines, mixed warm lettering and font-ready cache invalidation passed.');
