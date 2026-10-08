import {sanitizeFx,wheel} from './fixture-profiles.js';
import {createShowTimelines} from './programmed-timelines.js';
import arrivalFocus from './arrival-focus.json' with {type:'json'};
import publishedLighting from './published-lighting.json' with {type:'json'};
const color=name=>wheel.find(([n])=>n===name)[1];
export const ambienceDefinitions=[
 {id:'arrival',name:'Entrée du public',description:'Salle claire et répartie · scène éteinte · sans flash',mode:'dance',videoOn:true,artistVisible:false,fog:{on:false,rate:.06}},
 {id:'opening',name:'Ouverture',description:'DJ magenta · artiste blanc · salle éteinte',mode:'slam',videoOn:true,fog:{on:false,rate:.06}},
 {id:'dream',name:'Bleu océan',description:'Bleu franc · ondes cyan lentes · DJ bleu · brouillard',mode:'dance',videoOn:true,fog:{on:true,rate:.06}},
 {id:'red_alert',name:'Rouge intense',description:'Fond rouge · anneaux rapides · accents blancs du SL1',mode:'dance',videoOn:true,fog:{on:true,rate:.07}},
 {id:'warm',name:'Jaune et rouge',description:'Chaleur · gobos souples · aucun blanc',mode:'dance',videoOn:true,fog:{on:true,rate:.05}},
 {id:'pinky',name:'Pinky love',description:'Rose, magenta et violet · amour et douceur',mode:'dance',videoOn:true,videoMode:'pinky',artistVisible:true,fog:{on:true,rate:.07}},
 {id:'dj',name:'Transition DJ',description:'DJ seule bien éclairée · couleurs vives · pleins et gobos',mode:'dance',videoOn:true,artistVisible:false,fog:{on:true,rate:.07}},
 {id:'hiphop',name:'Finale hip-hop',description:'Grande finale · duos évolutifs · piste en mouvement et boucane',mode:'dance',videoOn:true,fog:{on:true,rate:.07}}
];
export function createAmbience(id,fixtures){
 const definition=ambienceDefinitions.find(p=>p.id===id);if(!definition)throw new Error('Ambiance inconnue : '+id);
 // These two scenes were composed and published by the user. Promote them
 // verbatim; regenerating their tracks would lose those authored settings.
 if(['opening','pinky'].includes(id))return {...definition,...structuredClone(publishedLighting.presetOverrides[id])};
 const prefs=Object.fromEntries(fixtures.map(f=>[f.id,sanitizeFx({dimmer:0},f.kind)])),colors={};
 function on(ids,dimmer,hex='#ffffff',extra={}){for(const id of ids.split(' ')){const f=fixtures.find(f=>f.id===id);if(!f||f.notUsed)continue;prefs[id]=sanitizeFx({dimmer,...extra},f.kind);colors[id]=hex;}}
 const dj=(d=55)=>{const energetic=['dj','hiphop','red_alert'].includes(id);on('101',d,color('Magenta'),{gobo:energetic?6:0,rotation:id==='red_alert'?24:energetic?18:0,movement:energetic?'circle':'static',amplitude:energetic?6:0,period:id==='red_alert'?4:energetic?6:26,zoom:18});on('201 202 207',35,'#ff40cb');};
 const face=(d=80)=>{on('2 3 4',d);on('210',d*.45);};
 const red=()=>{on('251 252',75,'#ff3030');on('208 209 210',50,'#ff3030');on('203 204',35,'#ff3030');};
 const room=(power=70,period=12,amplitude=8)=>{
  const speed=12/period,span=amplitude/10;
  // Broader audience sweeps, including the rear, tested over their full cycle.
  // These are cue orientations; the installation and default focus stay intact.
  on('102',power,color('Cyan'),{gobo:2,rotation:12*speed,movement:'eight',pan:20,tilt:42,amplitude:22*span,period:period*.72,zoom:18});
  on('103',power,color('Cyan'),{gobo:4,rotation:-8*speed,movement:'eight',pan:7.736,tilt:66.961,amplitude:22*span,period:period*1.25,zoom:18});
  on('104',power,color('Magenta'),{gobo:6,rotation:4*speed,movement:'circle',pan:-44.693,tilt:74,amplitude:24*span,period:period*1.8,zoom:23});
  on('105',power*.85,color('Magenta'),{gobo:3,rotation:-15*speed,movement:'circle',pan:-80,tilt:53,amplitude:18*span,period:period*.9,zoom:15});
  on('111',Math.min(power,85),color('Magenta'),{gobo:1,rotation:-5*speed,movement:'sweep',pan:38.113,tilt:73.251,amplitude:30*span,period:period*1.5,zoom:23});
  // 112 stays under E1; its narrow arc lights the first rows without crossing E1 or the bar.
  on('112',power,color('Cyan'),{gobo:7,rotation:9*speed,movement:'sweep',pan:-30,tilt:58,amplitude:6*span,period:period*1.1,zoom:12});
 };
 switch(id){
 case 'arrival':
  on('S1 S2 S3 S4 S5 S6',100);
  for(const [fid,{pan,tilt,zoom}] of Object.entries(arrivalFocus))on(fid,100,'#ffffff',{pan,tilt,zoom});
  break;
 case 'opening':dj(65);face(95);break;
 case 'dream':
  dj(60);room(90,30,5);
  on('203 204 208 209 210 251 252',100,'#005eff');on('202 207',65,'#0078ff');
  for(const fid of ['101','102','103','104','105','111','112'])if(prefs[fid]?.dimmer>0){prefs[fid].period=30;prefs[fid].rotation=Math.sign(prefs[fid].rotation||1)*1.2;}
  break;
 case 'red_alert':
  dj(65);red();room(90,4.8,10);on('SL1',80);
  on('202 203 204 207 208 209 210 251 252',75,color('Rouge'));break;
 case 'warm':
  dj(48);room(65,16,7);
  on('202 203 208 210 251',65,color('Jaune'));on('204 207 209 252',55,color('Rouge'));break;
 case 'dj':dj(100);on('202 207',85,color('Magenta'));room(85,9,8.5);break;
 case 'hiphop':dj(55);on('3',18);on('251 252 210',65,'#ff40cb');on('203',80,'#35dcff');on('204 208',80,'#ff40cb');on('209',75,'#35dcff');room(100,6,10);on('S1 S2 S3 S4 S5 S6',45);break;
 }
 const paint=(ids,hex)=>{for(const fid of ids.split(' '))if(prefs[fid]?.dimmer>0)colors[fid]=hex;};
 if(id==='dream')paint('101 102 103 104 105 111 112',color('Cyan'));
 if(id==='red_alert')paint('101 102 103 104 105 111 112',color('Rouge'));
 if(id==='warm'){paint('101 102 103 112',color('Jaune'));paint('104 105 111',color('Rouge'));}
 // Stable work light on the decks. Gobo 101 stays independent of this fill.
 const deckColors={arrival:'#b8fff2',opening:'#ffc1e7',dream:'#adcaff',red_alert:'#ff6060',warm:'#ffe0ad',dj:'#b8fff2',hiphop:'#b8fff2'};
 on('201',45,deckColors[id]);
 // One factory pattern per colour ambience, retained throughout its sequence.
 // Keep the deliberately open DJ spot (gobo 0) open in the calmer ambiences.
 const sceneGobo={dream:6,red_alert:7,warm:2}[id];
 if(sceneGobo)for(const f of fixtures)if(f.kind==='moving'&&prefs[f.id].gobo>0)prefs[f.id].gobo=sceneGobo;
 return {...definition,duration:30,prefs,colors,timelines:createShowTimelines(id,fixtures,prefs,colors)};
}
export const ambienceDuration=30;
