import * as THREE from 'three';

// Open optics, not lux calibration. Field angle bounds the emitted footprint;
// beam angle describes the brighter core. Unknown accessories stay explicit.
export function distributionFor(kind,zoom=15){
 const catalog={
  moving:{field:zoom,penumbra:.08,power:600*(1-Math.cos(THREE.MathUtils.degToRad(7.5)))/(1-Math.cos(THREE.MathUtils.degToRad(zoom/2))),haze:1,label:'Spot à bord net · zoom motorisé'},
  source:{field:36,penumbra:.12,power:80,haze:.5,label:'Découpe 36° · bord net, couteaux non réglés'},
  zoom:{field:25,penumbra:.12,power:160,haze:.5,label:'Découpe · zoom manuel proposé à 25°'},
  colorado:{field:28,penumbra:.68,power:18,haze:.25,label:'Wash RGB · cœur 15°, champ 28°'},
  par:{field:60,penumbra:.85,power:22,haze:.1,label:'PAR WFL · nappe ovale diffuse approximative'},
  sl1:{field:90,penumbra:1,power:12,haze:0,label:'Panneau diffus · répartition large approximative'},
  mini:{field:90,penumbra:1,power:6,haze:0,label:'Panneau diffus · répartition large approximative'}
 };
 return catalog[kind]||catalog.source;
}

// Lamp-dependent oval distribution for PAR; soft wide rectangular diffusion
// for panels. Neither is presented as an IES curve or a measured diffuser.
export function distributionTexture(kind){
 if(!['par','sl1','mini'].includes(kind))return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const context=canvas.getContext('2d'),data=context.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const u=(x-63.5)/63.5,v=(y-63.5)/63.5;
  const r=kind==='par'?u*u+v*v*2.2:Math.pow(Math.abs(u),4)+Math.pow(Math.abs(v)*1.35,4);
  const value=Math.round(255*Math.exp(-3.5*r)*Math.max(0,1-r));
  const i=(y*128+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=255;
 }
 context.putImageData(data,0,0);return new THREE.CanvasTexture(canvas);
}
