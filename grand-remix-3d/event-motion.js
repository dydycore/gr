import {drawOcean,drawConflict,drawHoliday,drawLove} from './visual-scenes-colour.js';
import {drawCalamine} from './calamine-visual.js';

const TAU=Math.PI*2,LOOP=30,C=256;
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=v=>{const u=clamp(v);return u*u*(3-2*u);};
const phaseAt=t=>t/LOOP*TAU;
const greetings=['BIENVENUE','ENTREZ','DANSONS'];
const logoCache=new WeakMap(),textWidths=new WeakMap();
const mix=(a,b,u)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-u)+parseInt(b.slice(i,i+2),16)*u).toString(16).padStart(2,'0')).join('');

function circle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,TAU);}
function background(ctx,inner,outer){
 const gradient=ctx.createRadialGradient(C,C,18,C,C,270);
 gradient.addColorStop(0,inner);gradient.addColorStop(1,outer);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
}
function type(ctx,text,x,y,maxWidth,size,color,weight=800,family='Arial, sans-serif',italic=false){
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=`${italic?'italic ':''}${weight} ${size}px ${family}`;
 let widths=textWidths.get(ctx);if(!widths){widths=new Map();textWidths.set(ctx,widths);}
 const key=ctx.font+'|'+text;let width=widths.get(key);
 if(width===undefined){width=ctx.measureText(text).width;widths.set(key,width);}
 if(width>maxWidth)ctx.font=`${italic?'italic ':''}${weight} ${size*maxWidth/width}px ${family}`;
 ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function filteredLogo(logo,sourceY,sourceWidth,sourceHeight){
 if(typeof OffscreenCanvas!=='function')return null;
 const source=logo.currentSrc||logo.src||'',saved=logoCache.get(logo);
 if(saved?.source===source&&saved.width===sourceWidth&&saved.height===sourceHeight)return saved.canvas;
 try{
  const canvas=new OffscreenCanvas(Math.ceil(sourceWidth),Math.ceil(sourceHeight)),cacheCtx=canvas.getContext('2d');
  if(!cacheCtx)return null;
  cacheCtx.filter='invert(1) hue-rotate(180deg)';
  cacheCtx.drawImage(logo,0,sourceY,sourceWidth,sourceHeight,0,0,canvas.width,canvas.height);
  logoCache.set(logo,{canvas,source,width:sourceWidth,height:sourceHeight});return canvas;
 }catch{return null;}
}
function logoMark(ctx,logo,x,y,width,height,alpha=1){
 if(!logo?.complete||!(logo.naturalWidth>0))return;
 const naturalHeight=logo.naturalHeight||logo.naturalWidth;
 const sourceY=naturalHeight*.275,sourceWidth=logo.naturalWidth,sourceHeight=naturalHeight*.455;
 const scale=Math.min(width/sourceWidth,height/sourceHeight);
 const cached=filteredLogo(logo,sourceY,sourceWidth,sourceHeight);
 ctx.save();ctx.globalAlpha*=clamp(alpha);
 if(cached)ctx.drawImage(cached,x-sourceWidth*scale/2,y-sourceHeight*scale/2,sourceWidth*scale,sourceHeight*scale);
 else{ctx.filter='invert(1) hue-rotate(180deg)';ctx.drawImage(logo,0,sourceY,sourceWidth,sourceHeight,x-sourceWidth*scale/2,y-sourceHeight*scale/2,sourceWidth*scale,sourceHeight*scale);}
 ctx.restore();
}
function textPass(t,style='arrival'){
 const local=t%10,fast=style==='hiphop',enter=smooth(local/(fast?.85:1.8)),exit=smooth((local-(fast?9:8.3))/(fast?1:1.7));
 let x=-560*(1-enter)+560*exit;
 if(fast&&local<.85)x=Math.round(x/12)*12;
 const segment=Math.floor(t/10),scale=fast&&segment===0?1+.35*(1-enter)+.1*exit:1,lineShift=fast&&segment===2?440*(1-enter-exit):0;
 if(fast&&segment!==1)x=0;
 return {x,scale,lineShift,alpha:smooth(local/.18)*(1-smooth((local-9.82)/.18)),tilt:style==='dj'?-.035*(1-enter+exit):fast?-.065*(1-enter)+.04*exit:0};
}
function wordCycle(ctx,words,t,y,color,size=32,style='arrival'){
 const passage=textPass(t,style);if(passage.alpha<=0)return;
 const specs={arrival:[350,'"Segoe UI", sans-serif',false],hiphop:[900,'"Arial Black", sans-serif',false]}[style];
 ctx.save();ctx.globalAlpha*=passage.alpha;ctx.translate(C+passage.x,y);ctx.rotate(passage.tilt);ctx.scale(passage.scale,passage.scale);
 type(ctx,words[Math.floor(t/10)],0,0,340,size,color,...specs);ctx.restore();
}
function fineRing(ctx,r,start,length,color,width=1){
 ctx.beginPath();ctx.arc(C,C,r,start,start+length);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}

function drawArrival(ctx,logo,t){
 const p=phaseAt(t);background(ctx,'#0b3039','#020a15');
 ctx.save();
 for(let ring=0;ring<6;ring++){
  ctx.globalAlpha=.18+ring*.035;
  fineRing(ctx,207+ring*5,p*(ring%2?-1:1)+ring*.74,TAU*(.52+ring*.055),ring%2?'#84ebd9':'#258d9b',ring===3?1.7:.8);
 }
 for(let i=0;i<32;i++){
  const a=i*2.399963+p,r=207+21*Math.sin(i*4.7),pulse=.5+.5*Math.sin(p*2+i);
  ctx.globalAlpha=.14+pulse*.5;ctx.fillStyle=i%5?'#49e2d0':'#e1fff8';
  circle(ctx,C+Math.cos(a)*r,C+Math.sin(a)*r,.9+pulse*.6);ctx.fill();
 }
 ctx.restore();
 for(let j=0;j<5;j++){
  ctx.beginPath();for(let i=0;i<=64;i++){
   const x=24+i*7.25,y=274+j*8+Math.sin(x/110+p+j*.21)*17;
   i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.strokeStyle=j%2?'#124455':'#206878';ctx.lineWidth=.7;ctx.stroke();
 }
 type(ctx,'LE GRAND REMIX',C,130,280,15,'#98c9c7',600);
 logoMark(ctx,logo,C,218+Math.sin(p)*2,380,194);
 wordCycle(ctx,greetings,t,342,'#c7fff1',42);
 type(ctx,'SLAM  ·  MUSIQUE  ·  PROJECTION',C,376,320,12,'#6faaa9',500);
 ctx.strokeStyle='#37acaa';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(204,401);ctx.lineTo(308,401);ctx.stroke();
}

function drawOpening(ctx,logo,t){
 const p=phaseAt(t),reveal=.3+.7*smooth(Math.min(t,30-t)/5);
 background(ctx,'#093843','#01080e');
 for(let i=0;i<14;i++){
  const side=i%2?-1:1,d=82+Math.floor(i/2)*24,wave=Math.sin(p*2+i*.37)*9;
  ctx.save();ctx.globalAlpha=.1+.16*(.5+.5*Math.sin(p*2+i*.5));
  ctx.beginPath();ctx.moveTo(C+side*(d+40),-10);ctx.lineTo(C+side*(d+wave),234);ctx.lineTo(C+side*(d+20),522);
  ctx.strokeStyle=i%3?'#37baa9':'#b2fff0';ctx.lineWidth=i%3?1:2;ctx.stroke();ctx.restore();
 }
 fineRing(ctx,213,p+1.2,2.25,'#43dccc',1.5);
 fineRing(ctx,226,-p+.4,2.5,'#174650',.8);
 fineRing(ctx,226,-p+3.6,1.6,'#296b74',.8);
 ctx.save();ctx.beginPath();ctx.rect(C-210*reveal,116,420*reveal,202);ctx.clip();
 logoMark(ctx,logo,C,215,392,222,.7+.3*reveal);ctx.restore();
 const scan=125+262*(.5-.5*Math.cos(p));
 ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle='#adfff1';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(90,scan);ctx.lineTo(422,scan);ctx.stroke();ctx.restore();
 type(ctx,'GRAND REMIX',C,331,342,39,'#e2fff8',400,'Impact, "Arial Narrow", sans-serif');
 type(ctx,'LA VOIX PREND LA LUMIÈRE',C,370,306,13,'#48c5bd',600);
 type(ctx,'LE MINISTÈRE',C,402,190,11,'#7dabae',500);
}

function drawDJ(ctx,logo,t){
 const p=phaseAt(t);ctx.fillStyle='#010307';ctx.fillRect(0,0,512,512);
 // A transparent logo floats over black; no white disc or baked background.
 for(let row=0;row<9;row++){
  const upper=row<4,base=upper?100+row*11:349+(row-4)*11;
  ctx.beginPath();for(let i=0;i<=80;i++){
   const x=16+i*6,y=base+Math.sin(x/64+p*3+row*.42)*(10+row)+Math.sin(x/131-p*2)*8;
   i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.save();ctx.globalAlpha=.18+row*.045;ctx.strokeStyle=row%2?'#915bf3':'#32e0d0';ctx.lineWidth=row%3?1:1.8;ctx.stroke();ctx.restore();
 }
 for(let i=0;i<48;i++){
  const angle=Math.PI*.04+i/47*Math.PI*.92,pulse=.5+.5*Math.sin(p*8+i*.68),height=7+29*pulse+10*(.5+.5*Math.sin(p*3-i*.8));
  ctx.save();ctx.translate(C,C);ctx.rotate(angle);ctx.fillStyle=i%3?'#2adaca':'#9654ee';
  ctx.globalAlpha=.5+.45*pulse;ctx.fillRect(201,-2,height,4);ctx.restore();
 }
 for(let i=0;i<3;i++)fineRing(ctx,204+i*13,p*(i%2?-2:2)+i*2.1,.42,i%2?'#a267ff':'#4ef9df',1.2);
 logoMark(ctx,logo,C,228,408,242,.94+.06*Math.sin(p*4));
 type(ctx,'REMIX EN DIRECT',C,324,324,27,'#b4fff1',800,'"Trebuchet MS", sans-serif',true);
 type(ctx,'LE SON NOUS RASSEMBLE',C,359,302,12,'#9b85d1',600);
}

// All geometry is drawn in a 512-square coordinate system and cropped to the
// circular screen. The only persistent state belongs to the caller's canvas.
export function drawEventVisual(ctx,logo,t,size=512,ambience='opening'){
 const time=Number.isFinite(t)?((t%LOOP)+LOOP)%LOOP:0;
 const edge=Number.isFinite(size)&&size>0?size:512;
 ctx.save();
 try{
  ctx.scale(edge/512,edge/512);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.shadowColor='transparent';ctx.setLineDash([]);ctx.lineCap='round';ctx.lineJoin='round';
  ctx.fillStyle='#000000';ctx.fillRect(0,0,512,512);
  circle(ctx,C,C,256);ctx.clip();
  switch(ambience){
   case'arrival':drawArrival(ctx,logo,time);break;
   case'dream':drawOcean(ctx,time);break;
   case'red_alert':drawConflict(ctx,time);break;
   case'warm':drawHoliday(ctx,time);break;
   case'pinky':drawLove(ctx,time);break;
   case'dj':drawDJ(ctx,logo,time);break;
   case'hiphop':drawCalamine(ctx,time);break;
   default:drawOpening(ctx,logo,time);
  }
 }finally{ctx.restore();}
}
