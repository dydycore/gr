import * as THREE from 'three';
import {manufacturerGoboMasks,gobo1Illustration} from './manufacturer-gobo-masks.js';
// Original manufacturer illustrations, printed p.7 Rev.6; installed set unconfirmed.
// Gobo 1 uses the white-aperture mask; its illustrated magenta tint is not calibrated.
const images=[...manufacturerGoboMasks,gobo1Illustration].map(uri=>{const image=new Image();image.src=uri;return image;});
const imagesReady=Promise.all(images.map(image=>image.decode()));
export function createGoboPreview(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const c=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 let selected=0,rotation=0,loaded=false;
 function draw(index,angle=0){
  selected=Math.max(0,Math.min(7,Math.round(Number(index)||0)));rotation=Number.isFinite(angle)?angle:0;
  c.setTransform(1,0,0,1,0,0);c.fillStyle='#000';c.fillRect(0,0,512,512);
  c.save();c.translate(256,256);c.rotate(rotation);c.beginPath();c.arc(0,0,238,0,Math.PI*2);c.clip();
  if(!selected){c.fillStyle='#fff';c.fillRect(-238,-238,476,476);}
  else if(loaded)c.drawImage(images[selected-1],-238,-238,476,476);
  c.restore();texture.needsUpdate=true;
 }
 const ready=imagesReady.then(()=>{loaded=true;draw(selected,rotation);});
 function drawThumbnail(index){
  draw(index);
  if(index===1&&loaded){c.drawImage(images[7],18,18,476,476);texture.needsUpdate=true;}
 }
 draw(0);return {texture,draw,drawThumbnail,ready};
}
