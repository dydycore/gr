// Checked against the venue inventory and manufacturer documentation, 2026-10-07.
export const wheel=[['Blanc','#ffffff'],['Orange','#ff992b'],['Vert lime','#b8ff35'],['Cyan','#35dcff'],['Rouge','#ff3030'],['Vert','#38e65c'],['Magenta','#ff40cb'],['Jaune','#ffe53b']];
export const profiles={
 moving:{label:'Intimidator Spot 375Z IRC',motorized:true,zoom:[10,23],angle:15,color:'wheel',note:'LED 150 W · pan 540° / tilt 270° · zoom motorisé 10–23° · roue 7 couleurs + blanc · 7 gobos rotatifs. Les zéros de montage et vitesses réelles restent à calibrer. Prismes non simulés. Accents de flashs à 2 Hz approximatifs ; shutter DMX non reproduit.',url:'https://fr.chauvetdj.com/wp-content/uploads/2017/07/Intimidator_Spot_375Z_IRC_UM_Rev6.pdf'},
 source:{label:'ETC Source Four 36°',angle:36,color:'gel',note:'575 W selon la salle · optique 36° · orientation manuelle, couteaux et gélatine. Champ nominal 36°, bord net ; couteaux non réglés dans cet aperçu.',url:'https://www.etcconnect.com/Products/Entertainment-Fixtures/Source-Four/'},
 zoom:{label:'ETC Source Four Zoom 25–50°',angle:36,color:'gel',note:'750 W selon la salle · zoom manuel nominal 25–50° · gélatine et couteaux. Aperçu ouvert à 25° ; ce modèle ne se déplace pas par DMX.',url:'https://www.etcconnect.com/Products/Entertainment-Fixtures/Source-Four/Source-Four/Documentation.aspx'},
 colorado:{label:'COLORado 1-Tri Tour',angle:15,color:'rgb',note:'Mélange RGB · appareil fixe · faisceau 15°, champ 28° (manuel v2 rev. 4). Version et diffuseur à confirmer. ARC.1 : 3 canaux RGB ; intensité visuelle par mise à l’échelle RGB.',url:'https://storage.googleapis.com/web-congoblue/2016/01/COLORado-Tri-Tour-Manual-1.pdf'},
 sl1:{label:'DMG SL1 MIX',color:'rgb',previewFlashMaxHz:8,note:'Panneau diffus fixe 200 W · 6 LED : rouge, vert, bleu, lime, ambre et blanc · blanc 1 700–10 000 K. Sans moteur ni gobo. Strobe natif 0,1–25 Hz dans les profils compatibles (ex. Full 8 bits, 12 canaux, canal 11). Le patch Color 8 bits à 4 canaux indiqué par la salle ne possède pas de canal strobe dédié : mode et patch à confirmer avec le DT. Ici : séquence éditable, flashs jusqu’à 8 Hz, sans pilotage DMX. Mélange RGB et diffusion approximatifs.',url:'https://emea.rosco.com/sites/default/files/content/resource/2022-12/DMG_DMX_Profiles_PDF_nov22.pdf'},
 mini:{label:'DMG MINI MIX',color:'rgb',note:'100 W · panneau fixe MIX à 6 couleurs · blanc 1 700–10 000 K. RGB affiché comme approximation du mélange spectral ; diffusion large approximative, accessoires inconnus.',url:'https://ca.rosco.com/sites/default/files/content/resource/2019-06/DMG%20MINI%20and%20SL1%20MIX%20User%20Guide.pdf'},
 par:{label:'PAR 56 WFL',color:'gel',note:'500 W WFL selon l’inventaire · appareil fixe à gélatine. Référence d’ampoule non fournie : angle et forme ovale réels inconnus. Gabarit illustratif conservé.',url:'https://leministere.ca/assets/documents/Le-Minist%C3%A8re_Fiche-technique_Audio-LX.pdf'}
};
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function sanitizeFx(raw={},kind='moving'){
 const n=(key,fallback,min,max)=>Number.isFinite(raw[key])?clamp(raw[key],min,max):fallback;
 const moving=kind==='moving';
 return {dimmer:n('dimmer',100,0,100),pan:moving&&Number.isFinite(raw.pan)?clamp(raw.pan,-270,270):null,tilt:moving&&Number.isFinite(raw.tilt)?clamp(raw.tilt,-135,135):null,zoom:n('zoom',15,10,23),gobo:moving?Math.round(n('gobo',0,0,7)):0,rotation:moving?n('rotation',0,-30,30):0,movement:moving&&['sweep','tilt','circle','eight'].includes(raw.movement)?raw.movement:'static',amplitude:n('amplitude',15,0,45),period:n('period',8,3,30)};
}
export function motionAngles(basePan,baseTilt,settings,time){
 const phase=2*Math.PI*time/settings.period,a=settings.amplitude;
 let panOffset=0,tiltOffset=0;
 switch(settings.movement){
 case 'sweep':panOffset=Math.sin(phase)*a;break;
 case 'tilt':tiltOffset=Math.sin(phase)*a;break;
 case 'circle':panOffset=Math.sin(phase)*a;tiltOffset=Math.cos(phase)*a*.5;break;
 case 'eight':panOffset=Math.sin(phase)*a;tiltOffset=Math.sin(phase*2)*a*.5;break;
 }
 return {pan:clamp(basePan+panOffset,-270,270),tilt:clamp(baseTilt+tiltOffset,-135,135)};
}
// Finite cone against a conservative sphere. False positives are acceptable;
// a pass is only a geometric aid, never venue clearance certification.
export function coneHitsSphere(origin,direction,length,slope,center,radius){
 const v=center.map((x,i)=>x-origin[i]),axial=v.reduce((s,x,i)=>s+x*direction[i],0);
 if(axial < -radius || axial > length+radius)return false;
 const radial=Math.sqrt(Math.max(0,v.reduce((s,x)=>s+x*x,0)-axial*axial));
 return radial <= Math.max(0,axial)*slope+radius*Math.sqrt(1+slope*slope)+.035;
}
