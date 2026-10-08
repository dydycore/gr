import {preloadVisualFonts} from './visual-scenes-colour.js';
import {drawVideoBackground} from './video-backgrounds.js';
let fontRequested=false;
// Original stage motion design by DMTeam. References: Calamine's official
// biography (Bravo musique) and Rétrograde, linked from her official Linktree.
// No artist photograph, videoclip, lyrics or audio is reproduced.
const TAU=Math.PI*2;
const smooth=x=>{const a=Math.max(0,Math.min(1,x));return a*a*(3-2*a);};
function title(ctx,text,y,size,color,width=400,family='"GR Graff", cursive'){
 ctx.save();ctx.font=`400 ${size}px ${family}`;ctx.textAlign='center';ctx.textBaseline='middle';
 const measured=ctx.measureText(text).width;if(measured>width)ctx.font=`400 ${size*width/measured}px ${family}`;
 ctx.strokeStyle='#070a0c';ctx.lineWidth=3;ctx.strokeText(text,256,y);ctx.fillStyle=color;ctx.fillText(text,256,y);ctx.restore();
}
export function drawCalamine(ctx,t){
 if(!fontRequested&&globalThis.document?.fonts?.load){fontRequested=true;void preloadVisualFonts('hiphop').catch(()=>{fontRequested=false;});}
 const p=t/30*TAU,chapter=Math.floor(t/10),local=t%10;
 const ink='#101619',paper='#e6e4d9',accent='#a87850',steel='#91a6af';
 const ready=drawVideoBackground(ctx,'hiphop',t);
 if(!ready){ctx.fillStyle=ink;ctx.fillRect(0,0,512,512);}
 // Original aerosol marks and rough paint strokes, with slow breathing motion.
 const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
 ctx.save();
 for(let i=0;i<60;i++){
  const x=random(i+1)*512,y=random(i+901)*512;
  ctx.globalAlpha=.04+random(i+1401)*.16;ctx.fillStyle=i%7?steel:accent;
  ctx.beginPath();ctx.arc(x+1.5*Math.sin(p+i),y+1.5*Math.cos(p+i),.3+random(i+1701)*1.4,0,TAU);ctx.fill();
 }
 ctx.restore();
 for(let j=0;j<2;j++){
  ctx.save();ctx.globalAlpha=.18+j*.025;ctx.strokeStyle=j%2?steel:accent;ctx.lineWidth=j===2?4:1.2;
  ctx.beginPath();for(let i=0;i<16;i++){const a=.8+i*.31,r=183+j*6+Math.sin(i*4+j)*9,x=256+Math.cos(a)*r,y=250+Math.sin(a)*r+3*Math.sin(p+j);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.restore();
 }
 // Fine paint runs live behind the tag; no bouncing or strobing letters.
 ctx.save();ctx.strokeStyle=steel;ctx.globalAlpha=.22;
 for(let i=0;i<10;i++){const x=95+i*34,y=266+random(i+40)*20,length=18+random(i+56)*46;ctx.lineWidth=.7+random(i+80)*2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1.3,y+length*(.94+.06*Math.sin(p)));ctx.stroke();}
 ctx.restore();
 ctx.save();ctx.translate(256+2*Math.sin(p),243+7*Math.sin(p*2));ctx.rotate(-.07+.018*Math.sin(p*2));
 const breathing=.97+.035*Math.sin(p);ctx.scale(breathing,breathing);
 ctx.strokeStyle='rgba(67,86,94,.28)';ctx.lineWidth=76;ctx.beginPath();ctx.moveTo(-187,9);ctx.lineTo(-90,-3);ctx.lineTo(64,7);ctx.lineTo(186,-3);ctx.stroke();
 ctx.translate(-256,-243);title(ctx,'CALAMINE',243,104,paper,420);ctx.restore();
 const words=['LUCIDE','LIBRE','DEBOUT'];
 const entry=smooth(local/1.25),exit=smooth((local-8.6)/1.4),opacity=entry*(1-exit);
 ctx.save();ctx.globalAlpha=opacity;
 ctx.translate(chapter===0?0:chapter===1?10*(1-entry):0,chapter===2?12*(1-entry):0);
 ctx.translate(256,326);ctx.rotate(chapter===0?-.045:chapter===1?.035:0);ctx.scale(.94+.06*entry,.94+.06*entry);ctx.translate(-256,-326);
 title(ctx,words[chapter],330,49,paper,335);ctx.restore();
 title(ctx,'GRAND REMIX',404,15,steel,210);
 if(!ready){ctx.save();ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillStyle=paper;ctx.fillText('Chargement de la vidéo…',256,438);ctx.restore();}
 // Periodic tapes are part of the composition; the loop joins at the same phase.
 for(let i=0;i<2;i++){
  ctx.save();ctx.translate(256,250);ctx.rotate((i?1:-1)*(.62+.03*Math.sin(p)));ctx.fillStyle=i?steel:accent;ctx.globalAlpha=.7;
  ctx.fillRect(-24,i?185:-198,48,9);ctx.restore();
 }
}
