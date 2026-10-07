import art from './visual-art-data.js';

// Photographic 30 s projection loops. The old procedural layers are a loading
// fallback only; loaded photography stays visible beneath restrained details.
const TAU=Math.PI*2,SIZE=512;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const v=clamp((x-a)/(b-a));return v*v*(3-2*v);};
const loop=t=>Number.isFinite(t)?((t%30)+30)%30:0;
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453123;return v-Math.floor(v);};
const grain=Array.from({length:240},(_,i)=>({x:noise(i+2)*SIZE,y:noise(i+407)*SIZE,r:.5+noise(i+811)*1.5,a:.035+noise(i+61)*.12}));
const grainCache=new Map(),wordCache=new Map(),wordWidths=new WeakMap(),tornEdges=new Map();
const artImages=new Map();
function imageFor(id){
 if(typeof Image!=='function'||!art[id])return null;
 let image=artImages.get(id);
 if(!image){image=new Image();image.decoding='async';image.src=art[id];artImages.set(id,image);}
 return image.complete&&image.naturalWidth>0?image:null;
}
for(const id of ['dream','red_alert','warm'])imageFor(id);
const rasterScale=ctx=>{const m=ctx.getTransform?.();return Math.max(1,Math.min(4,Math.ceil(Math.hypot(m?.a??2,m?.b??0)-.0001)));};
function raster(width,height,scale,paint){
 if(typeof OffscreenCanvas!=='function')return null;
 try{const canvas=new OffscreenCanvas(Math.ceil(width*scale),Math.ceil(height*scale)),ctx=canvas.getContext('2d');if(!ctx)return null;ctx.scale(scale,scale);paint(ctx);return canvas;}catch{return null;}
}
function remember(map,key,value,limit){if(value){if(map.size>=limit)map.delete(map.keys().next().value);map.set(key,value);}return value;}

function begin(ctx){ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.setLineDash([]);ctx.lineCap='round';ctx.lineJoin='round';}
function verticalGradient(ctx,stops){const g=ctx.createLinearGradient(0,0,0,SIZE);for(const [at,color]of stops)g.addColorStop(at,color);ctx.fillStyle=g;ctx.fillRect(0,0,SIZE,SIZE);}
function texture(ctx,color,opacity=1){
 const scale=rasterScale(ctx),key=`${color}|${opacity}|${scale}`;
 const paint=target=>{target.fillStyle=color;for(const p of grain){target.globalAlpha=p.a*opacity;target.fillRect(p.x,p.y,p.r,p.r);}target.globalAlpha=1;};
 const cached=grainCache.get(key)||remember(grainCache,key,raster(SIZE,SIZE,scale,paint),12);
 if(cached)ctx.drawImage(cached,0,0,SIZE,SIZE);else paint(ctx);
}
function vignette(ctx,color){const g=ctx.createRadialGradient(256,248,95,256,248,365);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,color);ctx.fillStyle=g;ctx.fillRect(0,0,SIZE,SIZE);}
function photograph(ctx,id,phase){
 const image=imageFor(id);if(!image)return null;
 const width=image.naturalWidth,height=image.naturalHeight||width;
 const time=phase/TAU*30,shot=Math.min(2,Math.floor(time/10)),blend=smooth(9,10,time%10);
 const frames=id==='dream'?[[1.04,.35,.35],[1.29,.78,.22],[1.15,.20,.82]]:id==='red_alert'?[[1.12,.25,.32],[1.36,.78,.62],[1.04,.52,.48]]:[[1.04,.52,.38],[1.28,.28,.28],[1.19,.81,.65]];
 const frame=index=>{const [zoom,anchorX,anchorY]=frames[index],extent=Math.min(width,height)/(zoom+.012*Math.sin(phase));return {extent,x:(width-extent)*clamp(anchorX+.035*Math.sin(phase)),y:(height-extent)*clamp(anchorY+.035*Math.cos(phase))};};
 const current=frame(shot),next=frame((shot+1)%3);
 const drawFrame=frame=>{
  if(id!=='dream'){ctx.drawImage(image,frame.x,frame.y,frame.extent,frame.extent,0,0,SIZE,SIZE);return;}
  // Small water refractions copy narrow source bands, never33 full canvases.
  // Subpixel drift keeps the photograph detailed while the surface breathes.
  for(let band=0;band<32;band++){
   const ripple=(.7*Math.sin(phase*2+band*.38)+.25*Math.sin(phase*4+band*.11))*frame.extent/SIZE;
   const sx=clamp(frame.x+ripple,0,width-frame.extent);
   ctx.drawImage(image,sx,frame.y+band*frame.extent/32,frame.extent,frame.extent/32,0,band*16,SIZE,16);
  }
 };
 drawFrame(current);
 if(blend>0){ctx.save();ctx.globalAlpha=blend;drawFrame(next);ctx.restore();}
 const shade=ctx.createRadialGradient(256,250,48,256,250,252);
 shade.addColorStop(0,id==='red_alert'?'rgba(7,3,7,.38)':id==='warm'?'rgba(81,29,8,.18)':'rgba(0,17,39,.26)');shade.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=shade;ctx.fillRect(0,0,SIZE,SIZE);
 return {image,...current};
}
function atmosphericSpecks(ctx,phase,color,opacity){
 ctx.save();ctx.fillStyle=color;
 for(let i=0;i<22;i++){
  const a=i*2.399963+.08*Math.sin(phase),r=158+noise(i+39)*83,x=256+Math.cos(a)*r,y=256+Math.sin(a)*r+Math.sin(phase*2+i)*4;
  ctx.globalAlpha=opacity*(.25+.75*(.5+.5*Math.sin(phase*2+i)));ctx.beginPath();ctx.arc(x,y,.6+noise(i+12)*1.7,0,TAU);ctx.fill();
 }
 ctx.restore();
}

function word(ctx,t,words,{color,shadow,accent,y=260,conflict=false,theme='ocean'}){
 const n=Math.min(2,Math.floor(t/10)),local=t-n*10;
 const alpha=smooth(0,.18,local)*(1-smooth(9.82,10,local));
 if(alpha<=0)return;
 const phase=t/30*TAU,enter=smooth(0,1.2,local),exit=smooth(8.8,10,local);
 const jitter=conflict?1.4*Math.sin(phase*17)*Math.pow(Math.max(0,Math.sin(phase*3)),8):0;
 const drift=1-enter,out=exit,resolution=rasterScale(ctx);
 let travel=0,rise=0,zoom=1,tilt=0;
 if(theme==='ocean'){if(n===0){rise=135*drift-110*out;zoom=1-.06*drift;}else if(n===1)travel=560*drift-560*out;}
 else if(conflict){if(n===0){zoom=1+.8*drift+.22*out;tilt=.08*drift-.04*out;}}
 else if(n===0)rise=145*drift-140*out;
 else if(n===1){zoom=.25+.75*enter+.2*out;tilt=.14*Math.sin(enter*Math.PI)*(1-out);}
 else{travel=450*drift-450*out;rise=-165*drift+165*out;tilt=.04*drift;}
 ctx.save();ctx.translate(256+travel+jitter,y+Math.sin(phase*2)*2+rise);
 ctx.rotate(tilt);ctx.scale(zoom,zoom);ctx.globalAlpha=alpha;
 if(theme==='ocean'&&n===2){
  const threshold=110-220*enter+220*out;ctx.beginPath();ctx.moveTo(-245,140);
  for(let x=-245;x<=245;x+=14)ctx.lineTo(x,threshold+Math.sin(x*.035+phase*2)*8*(drift+out));
  ctx.lineTo(245,140);ctx.closePath();ctx.clip();
 }else if(conflict&&n===2){
  const left=-270+540*out,right=-270+540*enter;ctx.beginPath();ctx.moveTo(left-40,-140);ctx.lineTo(right-40,-140);ctx.lineTo(right+40,140);ctx.lineTo(left+40,140);ctx.closePath();ctx.clip();
 }
 const family=conflict?'Impact, "Arial Black", sans-serif':theme==='holiday'?'"Trebuchet MS", "Segoe UI", sans-serif':'Georgia, "Times New Roman", serif';
 const weight=conflict?900:theme==='holiday'?700:600,prefix=theme==='ocean'?'italic ':'';
 const nominal=theme==='holiday'?92:100;
 ctx.font=`${prefix}${weight} ${nominal}px ${family}`;
 let widths=wordWidths.get(ctx);if(!widths){widths=new Map();wordWidths.set(ctx,widths);}
 const widthKey=ctx.font+'|'+words[n];let measured=widths.get(widthKey);if(measured===undefined){measured=ctx.measureText(words[n]).width;widths.set(widthKey,measured);}
 const size=Math.min(nominal,Math.floor(nominal*390/measured));ctx.font=`${prefix}${weight} ${size}px ${family}`;
 ctx.textAlign='center';ctx.textBaseline='middle';
 const font=ctx.font,scale=resolution,key=`${words[n]}|${font}|${color}|${shadow}|${scale}`;
 const paint=target=>{target.font=font;target.textAlign='center';target.textBaseline='middle';target.strokeStyle=shadow;target.lineWidth=5;target.strokeText(words[n],0,0);target.shadowColor=shadow;target.shadowBlur=18;target.shadowOffsetY=3;target.fillStyle=color;target.fillText(words[n],0,0);target.shadowBlur=0;target.shadowOffsetY=0;};
 const cached=wordCache.get(key)||remember(wordCache,key,raster(460,200,scale,target=>{target.translate(230,100);paint(target);}),36);
 const softAmount=theme==='ocean'?.8*(1-enter+exit):0;
 const soft=softAmount>0?(wordCache.get(key+'|soft')||remember(wordCache,key+'|soft',raster(460,200,scale,target=>{target.translate(230,100);target.filter='blur(1.1px)';paint(target);}),36)):null;
 const draw=()=>{if(cached){
  if(soft){ctx.globalAlpha=alpha*(1-softAmount);ctx.drawImage(cached,-230,-100,460,200);ctx.globalAlpha=alpha*softAmount;ctx.drawImage(soft,-230,-100,460,200);ctx.globalAlpha=alpha;}
  else ctx.drawImage(cached,-230,-100,460,200);
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

function oceanY(x,row,phase){
 return 128+row*49+Math.sin(x*.014+phase*(1+row%2)+row*.77)*(11+row*1.8)
  +Math.sin(x*.032-phase*2+row*1.3)*5.5;
}

export function drawOcean(ctx,time){
 const t=loop(time),phase=t/30*TAU;begin(ctx);
 if(photograph(ctx,'dream',phase)){
  atmosphericSpecks(ctx,phase,'#9ff5ee',.2);
  word(ctx,t,['MER','MARÉE','ÉCUME'],{color:'#effff9',shadow:'rgba(0,24,46,.82)',accent:'#75e4e3',y:252});
  texture(ctx,'#bbf1e8',.2);ctx.restore();return;
 }
 verticalGradient(ctx,[[0,'#031324'],[.31,'#04364d'],[.65,'#087b8f'],[1,'#032a46']]);
 // Submerged daylight shafts drift slowly behind the rolling wave field.
 ctx.globalCompositeOperation='screen';
 for(let i=0;i<5;i++){
  const x=55+i*101+Math.sin(phase+i*.7)*14;
  const g=ctx.createLinearGradient(x,0,x-75,460);g.addColorStop(0,'rgba(113,237,226,.15)');g.addColorStop(1,'rgba(33,164,190,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-12,0);ctx.lineTo(x+17,0);ctx.lineTo(x-33,470);ctx.lineTo(x-112,470);ctx.closePath();ctx.fill();
 }
 ctx.globalCompositeOperation='source-over';
 const shades=['#056178','#078193','#079bab','#0790a4','#076f89','#064a6b','#05394f','#042d44'];
 for(let row=0;row<8;row++){
  const g=ctx.createLinearGradient(0,100+row*49,0,230+row*49);g.addColorStop(0,shades[row]);g.addColorStop(1,row<4?'#06465f':'#031c35');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-20,550);
  for(let x=-20;x<=532;x+=8)ctx.lineTo(x,oceanY(x,row,phase));
  ctx.lineTo(532,550);ctx.closePath();ctx.fill();
  // Broken curling foam catches light along crests, with small trailing lines.
  ctx.strokeStyle=row<3?'#9cf4e5':'#52c9d2';ctx.lineWidth=row<3?2.2:1.3;
  for(let segment=0;segment<8;segment++){
   ctx.lineWidth=row<3?2.2:1.3;
   const start=-32+segment*81+Math.sin(phase+row*.4+segment*.7)*17;
   const width=26+noise(row*31+segment)*31;
   ctx.globalAlpha=.18+.38*(.5+.5*Math.sin(phase*2+segment+row));ctx.beginPath();
   for(let x=start;x<=start+width;x+=4){const y=oceanY(x,row,phase);if(x===start)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
   ctx.stroke();ctx.globalAlpha*=.4;ctx.lineWidth=.8;ctx.beginPath();
   ctx.moveTo(start+9,oceanY(start+9,row,phase)+5);ctx.quadraticCurveTo(start+width*.55,oceanY(start+width*.55,row,phase)+9,start+width-3,oceanY(start+width-3,row,phase)+5);ctx.stroke();
  }
  ctx.globalAlpha=1;
 }
 for(let i=0;i<30;i++){
  const x=20+noise(i+120)*472+Math.sin(phase+i)*7,y=75+noise(i+220)*375+Math.sin(phase*2+i*.6)*12;
  ctx.globalAlpha=.12+.15*(.5+.5*Math.sin(phase+i));ctx.fillStyle='#b6fff0';ctx.beginPath();ctx.arc(x,y,.7+noise(i+45)*1.3,0,TAU);ctx.fill();
 }
 ctx.globalAlpha=1;vignette(ctx,'rgba(0,12,32,.64)');
 word(ctx,t,['MER','MARÉE','ÉCUME'],{color:'#effff9',shadow:'rgba(0,31,53,.82)',accent:'#72ead6',y:252});
 texture(ctx,'#a5e0dc',.36);ctx.restore();
}

function tornBand(ctx,y,width,phase,index){
 let edge=tornEdges.get(index);if(!edge){edge=Array.from({length:25},(_,i)=>({x:-350+i*30,jag:(noise(index*73+i)-.5)*17}));tornEdges.set(index,edge);}
 ctx.beginPath();ctx.moveTo(edge[0].x,y+edge[0].jag);
 for(const p of edge)ctx.lineTo(p.x,y+p.jag+Math.sin(p.x*.018+phase+index)*7);
 for(let i=edge.length-1;i>=0;i--){const p=edge[i];ctx.lineTo(p.x,y+width-p.jag*.8+Math.cos(p.x*.021-phase*2)*5);}
 ctx.closePath();ctx.fill();
}

export function drawConflict(ctx,time){
 const t=loop(time),phase=t/30*TAU;begin(ctx);
 const photo=photograph(ctx,'red_alert',phase);
 if(photo){
  ctx.save();ctx.globalAlpha=.26;
  for(let i=0;i<3;i++){
   const row=89+i*157,shift=Math.round(Math.sin(phase*7+i)*4),height=3+i;
   ctx.drawImage(photo.image,photo.x,photo.y+row/SIZE*photo.extent,photo.extent,height/SIZE*photo.extent,shift,row,SIZE,height);
  }
  ctx.restore();atmosphericSpecks(ctx,phase,'#f26640',.2);
  word(ctx,t,['GUERRE','VIOLENCE','RÉSISTER'],{color:'#ffefdb',shadow:'rgba(21,3,8,.94)',accent:'#ff3a33',conflict:true,theme:'conflict',y:252});
  texture(ctx,'#d38070',.42);ctx.restore();return;
 }
 verticalGradient(ctx,[[0,'#180c10'],[.48,'#381016'],[1,'#090e12']]);
 ctx.save();ctx.translate(256,256);ctx.rotate(-.30+.018*Math.sin(phase));
 for(let i=0;i<5;i++){
  ctx.fillStyle=['#aa1725','#61111b','#c1262c','#751620','#b72829'][i];
  tornBand(ctx,-325+i*130+Math.sin(phase*(i%2+1)+i)*17,62+i%2*17,phase,i);
  ctx.fillStyle='rgba(9,11,16,.27)';tornBand(ctx,-317+i*130+Math.sin(phase*(i%2+1)+i)*17,13,phase,i+15);
 }
 ctx.restore();
 // Branching fractures break the printed red layers into moving fragments.
 for(let i=0;i<8;i++){
  const top=23+i*71,drift=5*Math.sin(phase+i);ctx.strokeStyle=i%3===0?'#f1a080':'#130b0f';ctx.lineWidth=i%3===0?1.05:2.1;ctx.globalAlpha=i%3===0?.28:.6;
  ctx.beginPath();ctx.moveTo(top+drift,-15);
  for(let j=1;j<=9;j++)ctx.lineTo(top+(noise(i*29+j)-.5)*59+drift,j*61-15);
  ctx.stroke();
 }
 ctx.globalAlpha=1;
 for(let i=0;i<38;i++){
  const x=noise(i+620)*512+Math.sin(phase+i)*9,y=noise(i+960)*512+Math.sin(phase*2+i*.37)*17;
  ctx.save();ctx.translate(x,y);ctx.rotate(noise(i+31)*2+phase*(i%2?1:-1));ctx.globalAlpha=.10+noise(i+19)*.2;ctx.fillStyle=i%4?'#090c11':'#eb643c';ctx.fillRect(-1,-1,1+noise(i+77)*7,2+noise(i+45)*12);ctx.restore();
 }
 const shade=ctx.createLinearGradient(0,178,0,331);shade.addColorStop(0,'rgba(11,10,14,0)');shade.addColorStop(.4,'rgba(11,10,14,.62)');shade.addColorStop(.65,'rgba(11,10,14,.62)');shade.addColorStop(1,'rgba(11,10,14,0)');ctx.fillStyle=shade;ctx.fillRect(0,178,512,153);
 texture(ctx,'#e2917c',1.2);vignette(ctx,'rgba(7,5,9,.72)');
 word(ctx,t,['GUERRE','VIOLENCE','RÉSISTER'],{color:'#ffefdb',shadow:'rgba(25,5,10,.9)',accent:'#ff7660',conflict:true,theme:'conflict',y:252});
 ctx.restore();
}

function palm(ctx,x,y,height,lean,phase,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 const crownX=lean+Math.sin(phase)*3,crownY=-height;
 ctx.fillStyle='#341b20';ctx.beginPath();ctx.moveTo(-9,0);ctx.bezierCurveTo(-5,-height*.35,lean-10,-height*.77,crownX-3,crownY);ctx.lineTo(crownX+4,crownY);ctx.bezierCurveTo(lean+1,-height*.69,14,-height*.33,10,0);ctx.closePath();ctx.fill();
 ctx.translate(crownX,crownY);
 const fronds=[[-93,24],[-102,-24],[-62,-64],[-8,-71],[53,-65],[94,-19],[91,33],[48,58]];
 for(let i=0;i<fronds.length;i++){
  const [ex,ey]=fronds[i],sway=Math.sin(phase+i*.4)*3,cx=ex*.43,cy=ey*.66-19+sway;
  ctx.lineWidth=2.1;ctx.strokeStyle='#341b20';ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(cx,cy,ex,ey+sway);ctx.stroke();
  for(let k=1;k<=10;k++){
   const u=k/11,b=1-u,px=2*b*u*cx+u*u*ex,py=2*b*u*cy+u*u*(ey+sway);
   const dx=2*b*cx+2*u*(ex-cx),dy=2*b*cy+2*u*(ey+sway-cy),length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
   const blade=(1-u)*19+3;
   ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+nx*blade-dx/length*8,py+ny*blade-dy/length*8);ctx.lineTo(px+dx/length*5,py+dy/length*5);ctx.closePath();ctx.fill();
   ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-nx*blade-dx/length*8,py-ny*blade-dy/length*8);ctx.lineTo(px+dx/length*5,py+dy/length*5);ctx.closePath();ctx.fill();
  }
 }
 ctx.restore();
}

export function drawHoliday(ctx,time){
 const t=loop(time),phase=t/30*TAU;begin(ctx);
 if(photograph(ctx,'warm',phase)){
  atmosphericSpecks(ctx,phase,'#ffeab2',.22);
  word(ctx,t,['VACANCES','JOIE','SOLEIL'],{color:'#fff4cc',shadow:'rgba(91,31,17,.88)',accent:'#ffdb89',y:252,theme:'holiday'});
  texture(ctx,'#dcb278',.19);ctx.restore();return;
 }
 verticalGradient(ctx,[[0,'#b84938'],[.28,'#eb7844'],[.56,'#ffc76b'],[.72,'#c96d43'],[1,'#693941']]);
 const sunX=286+Math.sin(phase)*9,sunY=167+Math.cos(phase)*5;
 const glow=ctx.createRadialGradient(sunX,sunY,32,sunX,sunY,148);glow.addColorStop(0,'rgba(255,229,137,.56)');glow.addColorStop(1,'rgba(255,195,90,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,512,320);
 ctx.fillStyle='#ffdf88';ctx.beginPath();ctx.arc(sunX,sunY,62,0,TAU);ctx.fill();
 // Thin clouds and a shimmering sunset reflection make the horizon readable.
 for(let i=0;i<4;i++){
  const y=85+i*45+Math.sin(phase+i)*5,x=30+i*81+Math.sin(phase*2+i)*15;
  ctx.strokeStyle='rgba(255,219,164,.22)';ctx.lineWidth=4-i*.5;ctx.beginPath();ctx.moveTo(x-54,y);ctx.bezierCurveTo(x-4,y-5,x+22,y+4,x+117,y-2);ctx.stroke();
 }
 ctx.fillStyle='#c36a48';ctx.fillRect(0,294,512,218);
 for(let row=0;row<15;row++){
  const y=295+row*16+Math.sin(phase*2+row)*3;
  ctx.fillStyle=row%2?'rgba(100,47,61,.28)':'rgba(255,179,103,.25)';ctx.beginPath();ctx.moveTo(-12,550);
  for(let x=-12;x<=524;x+=8)ctx.lineTo(x,y+Math.sin(x*.029+phase*(row%2+1)+row)*(.8+row*.18));
  ctx.lineTo(524,550);ctx.closePath();ctx.fill();
  const width=15+row*5+Math.sin(phase+row*.8)*5,center=sunX+Math.sin(phase*2+row)*6;
  ctx.strokeStyle=`rgba(255,211,124,${.56-row*.027})`;ctx.lineWidth=1.2+row*.1;ctx.beginPath();ctx.moveTo(center-width,y+3);ctx.lineTo(center+width,y+3);ctx.stroke();
 }
 // Foreground silhouettes frame the central word without covering its line.
 palm(ctx,68,520,291,35,phase,1);
 palm(ctx,474,524,254,-37,phase+1.3,.81);
 ctx.fillStyle='#351f29';ctx.beginPath();ctx.moveTo(0,467);ctx.bezierCurveTo(129,491,355,448,512,480);ctx.lineTo(512,512);ctx.lineTo(0,512);ctx.closePath();ctx.fill();
 vignette(ctx,'rgba(79,21,33,.34)');
 word(ctx,t,['VACANCES','JOIE','SOLEIL'],{color:'#fff4cc',shadow:'rgba(123,43,32,.8)',accent:'#ffe18e',y:252,theme:'holiday'});
 texture(ctx,'#562a35',.42);ctx.restore();
}
