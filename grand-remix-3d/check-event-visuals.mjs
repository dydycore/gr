import assert from 'node:assert/strict';
import {drawEventVisual} from './event-motion.js';

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
   texts.push({text,corners,alpha:state.globalAlpha,font:state.font});log('fillText',text,x,y);
  },
  drawImage(image,...args){assert.ok(image?.complete&&image.naturalWidth>0||image?.width>0&&image?.height>0,'Draw only loaded images or raster caches');if(image.__art&&args.length===8){assert.ok(args[0]>=0&&args[1]>=0);assert.ok(args[0]+args[2]<=image.naturalWidth+.0001&&args[1]+args[3]<=image.naturalHeight+.0001,'Photo crop stays inside source');}log('drawImage',image.__art?'art':image?.complete?'logo':'bitmap',...args);},
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
const scenes=['arrival','opening','dream','red_alert','warm','dj','hiphop'];
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
assert.equal(new Set(signatures).size,7,'Seven distinct visual compositions');
assert.deepEqual(render('saved-custom-scene',2).logs,render('opening',2).logs,'Unknown/custom scenes use opening fallback');
assert.deepEqual(render('opening',NaN).logs,render('opening',0).logs,'Invalid clock falls back to zero');
assert.deepEqual(render('arrival',-1).logs,render('arrival',29).logs,'Negative time wraps safely');
assert.deepEqual(render('opening',0,0).logs,render('opening',0,512).logs,'Invalid size uses 512');
for(const time of [3,13,23])assert.ok(render('hiphop',time).texts.some(item=>item.text==='PAROLES'));
const hiphopWords=[3,13,23].flatMap(time=>render('hiphop',time).texts.map(item=>item.text));
for(const word of ['BRUTES','LA VOIX','LE RYTHME','ENSEMBLE'])assert.ok(hiphopWords.includes(word));
const arrivalWords=[3,13,23].flatMap(time=>render('arrival',time).texts.map(item=>item.text));
for(const word of ['BIENVENUE','ENTREZ','DANSONS'])assert.ok(arrivalWords.includes(word));
const dj=render('dj',3).logs;assert.equal(dj.filter(([op])=>op==='drawImage').length,1,'DJ uses transparent logo directly');
assert.equal(dj.filter(([op])=>op==='fill').length,0,'DJ has no filled logo medallion');
const primary={arrival:'BIENVENUE',dream:'MER',red_alert:'GUERRE',warm:'VACANCES',hiphop:'PAROLES'};
const families=[];
for(const [scene,label]of Object.entries(primary)){
 const find=t=>render(scene,t).texts.find(item=>item.text===label);
 const center=item=>item.corners.reduce((sum,[x])=>sum+x,0)/4;
 if(scene==='arrival')assert.ok(center(find(.3))<100,`${scene}: word enters from left`);
 assert.ok(Math.abs(center(find(5))-256)<3,`${scene}: word holds legibly in center`);
 if(scene==='arrival')assert.ok(center(find(9.7))>400,`${scene}: word leaves through right`);
 families.push(find(5).font);
 const plateau=render(scene,5).texts;
 const words=scene==='arrival'?['BIENVENUE','ENTREZ','DANSONS']:scene==='dream'?['MER','MARÉE','ÉCUME']:scene==='red_alert'?['GUERRE','VIOLENCE','RÉSISTER']:scene==='warm'?['VACANCES','JOIE','SOLEIL']:[];
 if(words.length)assert.equal(new Set(plateau.filter(item=>words.includes(item.text)).map(item=>item.text)).size,1,'Only one cycle word at a time');
}
assert.equal(new Set(families).size,5,'Five distinct word-clip typographic treatments');
for(const [scene,label]of [['opening','GRAND REMIX'],['dj','REMIX EN DIRECT']]){
 const left=render(scene,.3).texts.find(item=>item.text===label),right=render(scene,9.7).texts.find(item=>item.text===label);
 assert.deepEqual(left.corners,right.corners,'Logo clips keep their existing stationary caption, no added word cycle');
}
for(const scene of ['dream','red_alert','warm','hiphop']){
 for(const time of [5,15,25]){
  const main=render(scene,time).texts[0];assert.ok(Number(main.font.match(/[\d.]+px/)[0].slice(0,-2))>=(scene==='hiphop'?68:70),`${scene}: dominant title`);
 }
 const transitionSignature=time=>render(scene,time).logs.filter(([op])=>['translate','scale','rotate','clip','rect'].includes(op));
 assert.equal(new Set([.3,10.3,20.3].map(t=>JSON.stringify(transitionSignature(t)))).size,3,`${scene}: three distinct word transitions`);
}
assert.ok(!render('dream',.3).logs.some(([op,key,value])=>op==='set'&&key==='filter'&&String(value).startsWith('blur(')),'No per-frame blur filter; cached vapor version only');
assert.ok(!render('dream',5).logs.some(([op,key,value])=>op==='set'&&key==='filter'&&String(value).startsWith('blur(')),'Plateau words stay sharp');
const originalImage=globalThis.Image,images=[];
globalThis.Image=class{constructor(){this.__art=true;this.naturalWidth=1254;this.naturalHeight=1254;images.push(this);}set src(value){this.complete=true;this.source=value;}};
for(const scene of ['dream','red_alert','warm']){
 const signatures=[];
 for(const time of [5,15,25]){
  const frame=render(scene,time);assert.ok(frame.logs.some(([op,source])=>op==='drawImage'&&source==='art'),`${scene}: loaded photography is drawn`);
  assert.ok(frame.logs.filter(([op])=>op==='lineTo').length<50,`${scene}: no opaque fallback waves/palms drawn over photography`);
  signatures.push(JSON.stringify(frame.logs.find(([op,source])=>op==='drawImage'&&source==='art')));
  assert.deepEqual(frame.logs,render(scene,time+30).logs,`${scene}: photo loop periodic`);
 }
 assert.equal(new Set(signatures).size,3,`${scene}: three background camera framings`);
 assert.ok(render(scene,9.5).logs.filter(([op,source])=>op==='drawImage'&&source==='art').length>=2,`${scene}: background shots crossfade`);
}
assert.equal(images.length,3,'Three photos are loaded once');
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
 assert.ok(render('warm',5).logs.filter(([op])=>op==='fillRect').length<20,'Static grain no longer submits240 rectangles each frame');
}finally{if(originalOffscreen===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=originalOffscreen;if(originalImage===undefined)delete globalThis.Image;else globalThis.Image=originalImage;}
console.log('Event visuals: 7 loops, photographic backgrounds and three camera framings, varied dominant titles, stable logo clips, readable plateaus, 30-second periodicity and one-time raster caches passed.');
