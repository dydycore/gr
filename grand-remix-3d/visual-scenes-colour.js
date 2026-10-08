import art from './visual-art-data.js';
import {drawVideoBackground,getVideoBackgroundStatus} from './video-backgrounds.js';

// Real MP4 footage supplies each background. Before decoding, show only a
// quiet solid colour: retired photographic/procedural backgrounds never return.
const TAU=Math.PI*2,SIZE=512;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const v=clamp((x-a)/(b-a));return v*v*(3-2*v);};
const loop=t=>Number.isFinite(t)?((t%30)+30)%30:0;
const wordCache=new Map();let wordWidths=new WeakMap(),fontRevision=0;
const requestedFonts=new Map();
export const getVisualFontRevision=()=>fontRevision;
function loadFont(font,text){
 if(!globalThis.document?.fonts?.load)return Promise.resolve([]);
 if(requestedFonts.has(font))return requestedFonts.get(font);
 const pending=document.fonts.load(font,text).then(faces=>{if(faces.length){fontRevision++;wordCache.clear();wordWidths=new WeakMap();}else requestedFonts.delete(font);return faces;}).catch(()=>{requestedFonts.delete(font);return [];});
 requestedFonts.set(font,pending);return pending;
}
// Export starts at t=0, where words are transparent and do not request fonts.
// Prepare every face in the clip now, including the second warm word's face.
export async function preloadVisualFonts(mode){
 if(!globalThis.document?.fonts?.load)return;
 const requests={hiphop:[['400 104px "GR Graff"','CALAMINE LUCIDE LIBRE DEBOUT GRAND REMIX']],dream:[['italic 700 100px "GR Ocean"','Mer MARÉE Écume']],warm:[['600 100px "GR Holiday"','Vacances Soleil'],['500 100px "GR Joy"','JOIE']],pinky:[['400 100px "GR Love"','Amour Tendresse Ensemble']]}[mode]||[];
 const loaded=await Promise.all(requests.map(([font,text])=>loadFont(font,text)));
 if(loaded.some(faces=>!faces.length))throw new Error('La police du visuel ne se charge pas. Réessayez.');
}
let collageImage=null;
function imageFor(id){
 if(id!=='red_alert'||typeof Image!=='function'||!art.red_alert)return null;
 if(!collageImage){collageImage=new Image();collageImage.decoding='async';collageImage.src=art.red_alert;}
 return collageImage.complete&&collageImage.naturalWidth>0?collageImage:null;
}
const rasterScale=ctx=>{const m=ctx.getTransform?.();return Math.max(1,Math.min(4,Math.ceil(Math.hypot(m?.a??2,m?.b??0)-.0001)));};
function raster(width,height,scale,paint){
 if(typeof OffscreenCanvas!=='function')return null;
 try{const canvas=new OffscreenCanvas(Math.ceil(width*scale),Math.ceil(height*scale)),ctx=canvas.getContext('2d');if(!ctx)return null;ctx.scale(scale,scale);paint(ctx);return canvas;}catch{return null;}
}
function remember(map,key,value,limit){if(value){if(map.size>=limit)map.delete(map.keys().next().value);map.set(key,value);}return value;}

function begin(ctx){ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.setLineDash([]);ctx.lineCap='round';ctx.lineJoin='round';}
function word(ctx,t,words,{color,shadow,accent,y=260,conflict=false,theme='ocean'}){
 const n=Math.min(2,Math.floor(t/10)),local=t-n*10;
 const fade=conflict?.18:.95;
 const alpha=smooth(0,fade,local)*(1-smooth(10-fade,10,local));
 if(alpha<=0)return;
 const phase=t/30*TAU,enter=smooth(0,1.2,local),exit=smooth(8.8,10,local);
 const jitter=conflict?1.4*Math.sin(phase*17)*Math.pow(Math.max(0,Math.sin(phase*3)),8):0;
 const drift=1-enter,out=exit,resolution=rasterScale(ctx);
 let travel=0,rise=0,zoom=1,tilt=0;
 if(theme==='love'){if(n===0){zoom=.91+.09*enter+.05*out;rise=22*drift-22*out;}else if(n===1){rise=100*drift-100*out;}else{travel=-420*drift+420*out;tilt=-.035*drift+.035*out;}}
 else if(theme==='ocean'){if(n===0){rise=135*drift-110*out;zoom=1-.06*drift;}else if(n===1)travel=560*drift-560*out;}
 else if(conflict){if(n===0){zoom=1+.8*drift+.22*out;tilt=.08*drift-.04*out;}}
 else if(n===0)rise=145*drift-140*out;
 else if(n===1){zoom=.25+.75*enter+.2*out;tilt=.14*Math.sin(enter*Math.PI)*(1-out);}
 else{travel=450*drift-450*out;rise=-165*drift+165*out;tilt=.04*drift;}
 ctx.save();ctx.translate(256+travel+jitter,y+Math.sin(phase*2)*2+rise);
 ctx.rotate(tilt);ctx.scale(zoom,zoom);ctx.globalAlpha=alpha;
 if(theme==='love'&&n===1){
  ctx.beginPath();ctx.rect(-245,-110+220*(1-enter),490,220*enter*(1-out));ctx.clip();
 }else if(theme==='ocean'&&n===2){
  const threshold=110-220*enter+220*out;ctx.beginPath();ctx.moveTo(-245,140);
  for(let x=-245;x<=245;x+=14)ctx.lineTo(x,threshold+Math.sin(x*.035+phase*2)*8*(drift+out));
  ctx.lineTo(245,140);ctx.closePath();ctx.clip();
 }else if(conflict&&n===2){
  const left=-270+540*out,right=-270+540*enter;ctx.beginPath();ctx.moveTo(left-40,-140);ctx.lineTo(right-40,-140);ctx.lineTo(right+40,140);ctx.lineTo(left+40,140);ctx.closePath();ctx.clip();
 }
 const family=conflict?'Impact, "Arial Black", sans-serif':theme==='holiday'?(n===1?'"GR Joy", "Trebuchet MS", sans-serif':'"GR Holiday", "Segoe Print", cursive'):theme==='love'?'"GR Love", "Brush Script MT", cursive':'"GR Ocean", Georgia, serif';
 const weight=conflict?900:theme==='ocean'?700:theme==='love'?400:theme==='holiday'&&n!==1?600:500,prefix=theme==='ocean'?'italic ':'';
 const nominal=conflict?100:theme==='holiday'?[126,120,132][n]:theme==='love'?[138,126,128][n]:[136,106,128][n];
 if(!conflict)loadFont(`${prefix}${weight} 100px ${family.split(',')[0]}`,words[n]);
 ctx.font=`${prefix}${weight} ${nominal}px ${family}`;
 let widths=wordWidths.get(ctx);if(!widths){widths=new Map();wordWidths.set(ctx,widths);}
 const widthKey=ctx.font+'|'+words[n];let measured=widths.get(widthKey);if(measured===undefined){measured=ctx.measureText(words[n]).width;widths.set(widthKey,measured);}
 const fitted=Math.floor(nominal*(theme==='love'?400:390)/measured);
 const size=theme==='ocean'?fitted:Math.min(nominal,fitted);ctx.font=`${prefix}${weight} ${size}px ${family}`;
 ctx.textAlign='center';ctx.textBaseline='middle';
 const font=ctx.font,scale=resolution,key=`${words[n]}|${font}|${color}|${shadow}|${scale}|${fontRevision}`;
 const paint=target=>{
  target.save();target.font=font;target.textAlign='center';target.textBaseline='middle';
  // Rouge intense keeps its previously approved Impact lettering unchanged.
  if(conflict){target.strokeStyle=shadow;target.lineWidth=5;target.strokeText(words[n],0,0);target.shadowColor=shadow;target.shadowBlur=18;target.shadowOffsetY=3;target.fillStyle=color;target.fillText(words[n],0,0);target.restore();return;}
  // Ocean, sun and love use delicate shadows, never a common black outline.
  target.shadowColor=theme==='love'?'rgba(93,15,78,.65)':theme==='holiday'?'rgba(118,57,6,.48)':shadow;
  target.shadowBlur=conflict?4:theme==='ocean'?9:theme==='love'?12:5;target.shadowOffsetY=conflict?2:1;
  target.fillStyle=theme==='holiday'&&n===1?'#ffe877':color;
  if(theme==='ocean'){target.fillStyle='#073a70';target.shadowColor='rgba(0,17,43,.48)';target.shadowBlur=4;target.shadowOffsetY=2;}
  if(theme==='holiday'&&n===0){target.shadowColor='rgba(255,207,96,.72)';target.shadowBlur=14;target.shadowOffsetY=0;}
  if(theme==='ocean'){target.strokeStyle='#ffffff';target.lineWidth=3.5;target.strokeText(words[n],0,0);}
  if(theme==='love'&&n===2){const ink=target.createLinearGradient(-170,-40,170,45);ink.addColorStop(0,'#fff4fc');ink.addColorStop(1,'#ffc0e3');target.fillStyle=ink;}
  target.fillText(words[n],0,0);target.shadowBlur=0;target.shadowOffsetY=0;
  if(theme==='love'&&n!==1){target.strokeStyle=n===0?'rgba(255,211,238,.72)':'rgba(255,181,223,.6)';target.lineWidth=.65;target.beginPath();target.moveTo(-90,48);target.bezierCurveTo(-20,57,20,35,100,45);target.stroke();}
  target.restore();
 };
 const width=conflict?460:480,height=conflict?200:theme==='ocean'?320:260;
 const cached=wordCache.get(key)||remember(wordCache,key,raster(width,height,scale,target=>{target.translate(width/2,height/2);paint(target);}),36);
 const softAmount=theme==='ocean'?.8*(1-enter+exit):0;
 const soft=softAmount>0?(wordCache.get(key+'|soft')||remember(wordCache,key+'|soft',raster(width,height,scale,target=>{target.translate(width/2,height/2);target.filter='blur(1.1px)';paint(target);}),36)):null;
 const draw=()=>{if(cached){
  if(soft){ctx.globalAlpha=alpha*(1-softAmount);ctx.drawImage(cached,-width/2,-height/2,width,height);ctx.globalAlpha=alpha*softAmount;ctx.drawImage(soft,-width/2,-height/2,width,height);ctx.globalAlpha=alpha;}
  else ctx.drawImage(cached,-width/2,-height/2,width,height);
 }else paint(ctx);};
 if(conflict&&n===1&&(drift>0||out>0))for(let strip=0;strip<3;strip++){
  ctx.save();ctx.beginPath();ctx.rect(-560,-75+strip*50,1120,50);ctx.clip();
  ctx.translate((strip%2?1:-1)*Math.round((drift-out)*450/12)*12,0);draw();ctx.restore();
 }else draw();
 // A small, restrained tear through the word belongs only to the conflict
 // visual. It never replaces the readable base or flashes the whole frame.
 if(conflict){ctx.save();ctx.beginPath();ctx.rect(-198,-7,396,3);ctx.clip();ctx.fillStyle=accent;ctx.fillText(words[n],jitter+2,0);ctx.restore();}
 ctx.restore();
}

function conflictCollageEdges(ctx,phase){
 const image=imageFor('red_alert');if(!image)return;
 // The real moving video remains the background. Only its outer edges carry
 // the symbolic printed collage; no full-frame still is laid over the footage.
 for(const side of [-1,1]){
  ctx.save();ctx.beginPath();
  const edge=x=>side<0?x:SIZE-x;
  ctx.moveTo(edge(-16),-16);ctx.lineTo(edge(64),-16);ctx.lineTo(edge(82),122);ctx.lineTo(edge(67),231);ctx.lineTo(edge(94),371);ctx.lineTo(edge(80),528);ctx.lineTo(edge(-16),528);ctx.closePath();ctx.clip();
  const shift=Math.round(Math.sin(phase*11+side)*2)*2;ctx.globalAlpha=.67;
  ctx.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,shift,Math.sin(phase*3+side)*5,SIZE,SIZE);ctx.restore();
 }
}


const themes={
 dream:{background:'#041a2b',words:['Mer','MARÉE','Écume'],style:{color:'#effff9',shadow:'rgba(0,24,46,.68)',accent:'#75e4e3',y:252}},
 red_alert:{background:'#23040c',words:['GUERRE','VIOLENCE','RÉSISTER'],style:{color:'#ffefdb',shadow:'rgba(21,3,8,.94)',accent:'#ff3a33',conflict:true,theme:'conflict',y:252}},
 warm:{background:'#2e1909',words:['Vacances','JOIE','Soleil'],style:{color:'#fff4cc',shadow:'rgba(91,31,17,.5)',accent:'#ffdb89',y:252,theme:'holiday'}},
 pinky:{background:'#2b1128',words:['Amour','Tendresse','Ensemble'],style:{color:'#fff0f7',shadow:'rgba(42,2,22,.55)',accent:'#f0a1c2',theme:'love',y:256}}
};
function drawScene(ctx,id,time){
 const t=loop(time),theme=themes[id];begin(ctx);
 const ready=drawVideoBackground(ctx,id,t);
 if(!ready){ctx.fillStyle=theme.background;ctx.fillRect(0,0,SIZE,SIZE);}
 else if(id==='red_alert')conflictCollageEdges(ctx,t/30*TAU);
 word(ctx,t,theme.words,theme.style);
 if(!ready){
  const status=getVideoBackgroundStatus();
  ctx.font='14px "Segoe UI", Arial, sans-serif';ctx.fillStyle='#c4c8ce';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(status.mode===id&&status.failed?'Vidéo indisponible':'Chargement de la vidéo…',256,371);
 }
 ctx.restore();
}
export const drawLove=(ctx,time)=>drawScene(ctx,'pinky',time);
export const drawOcean=(ctx,time)=>drawScene(ctx,'dream',time);
export const drawConflict=(ctx,time)=>drawScene(ctx,'red_alert',time);
export const drawHoliday=(ctx,time)=>drawScene(ctx,'warm',time);
