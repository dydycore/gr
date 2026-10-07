import {profiles,sanitizeFx} from './fixture-profiles.js';
import {sanitizeFixtureTimeline} from './fixture-timeline.js';

const roomIds=['102','103','104','105','111','112'];
const phases=[['#ff40cb','#35dcff'],['#ff992b','#35dcff'],['#ff3030','#b8ff35']];
const sharedAccents=['#ff40cb','#35dcff','#ff3030'];
const redAlertBlocks=[4,2,4,2,6,2,8,2];
const showIds=new Set(['dream','red_alert','warm','dj','hiphop']);

// Presets use the same editable data as custom scenes: no hidden dimmer cue
// competes with the ten squares shown in the fixture's timeline editor.
export function createShowTimelines(id,fixtures,prefs,colors){
 if(!showIds.has(id))return {};
 const timelines={},festive=id==='hiphop'||id==='dj';
 for(const fixture of fixtures){
  const fid=String(fixture.id),kind=fixture.kind,fx=sanitizeFx(prefs?.[fid]??{dimmer:0},kind);
  if(fixture.notUsed||fx.dimmer<=0||fid==='201')continue; // Steady DJ deck work light, outside the show chases.
  const baseColor=colors?.[fid]||'#ffffff',roomIndex=roomIds.indexOf(fid);
  const colorAt=phase=>festive?phases[phase][baseColor.toLowerCase()==='#35dcff'?1:0]:baseColor;
  const steps=[];
  const add=(duration,phase,level,transition='cut',flashHz=0,paint=colorAt(phase),fades={},effect={})=>{
   steps.push({id:`${fid}-${steps.length+1}`,duration,transition,color:paint,fx:{...fx,dimmer:fx.dimmer*level,...effect},flashHz,...fades});
  };
  if(id==='dj'&&fid==='101'&&kind==='moving'){
   // Show the DJ clearly with a full coloured beam before and after the gobo
   // passage. Keep the same DJ aim; only the middle block adds a small circle.
   for(let phase=0;phase<3;phase++)add(10,phase,1,'cut',0,colorAt(phase),{},phase===1?
    {gobo:6,movement:'circle',amplitude:6,period:6,rotation:fx.rotation||18}:
    {gobo:0,movement:'static',amplitude:0,rotation:0});
  }else if(id==='dream'&&(kind==='moving'||profiles[kind]?.color==='rgb')){
   const paint=kind==='moving'?'#35dcff':['202','207'].includes(fid)?'#0078ff':'#005eff';
   const levels=kind==='moving'&&fid!=='101'?[.85,1,.9]:[1,1,1];
   // Keep the whole audience cyan: only its intensity breathes. The artist
   // stays in vivid blue, and the DJ has a separate steady blue fill.
   for(let phase=0;phase<3;phase++)add(10,phase,levels[phase],'fade',0,paint,{fadeIn:2,fadeOut:0});
  }else if(id==='warm'&&(kind==='moving'||profiles[kind]?.color==='rgb')){
   const pair=['#ffe53b','#ff3030'];
   const group=baseColor.toLowerCase()===pair[1]?1:0,levels=[.75,.9,.8];
   // RGB colours blend continuously. Physical wheels close, change colour in
   // darkness and reopen through the common timeline sampler. Keep every gobo.
   for(let phase=0;phase<3;phase++)add(10,phase,levels[phase],'fade',0,pair[(phase+group)%2],{fadeIn:8,fadeOut:0});
  }else if(id==='red_alert'&&fid==='SL1'&&kind==='sl1'){
   // The SL1 alone supplies the fast white accents over a dimmed red backdrop.
   // Flash-only keeps it dark when the global Flashs switch is off.
   redAlertBlocks.forEach((duration,index)=>add(duration,0,index%2,'cut',index%2?8:0,'#ffffff',
    {fadeIn:0,fadeOut:0,flashPattern:'steady',flashOnly:true}));
  }else if(id==='red_alert'&&(kind==='moving'||profiles[kind]?.color==='rgb')){
   // Keep red visible under white accents: room gobos at 60% of their preset,
   // RGB stage washes at 25%. Only the DJ moving head cuts out completely.
   const accentLevel=roomIndex>=0?.6:profiles[kind]?.color==='rgb'?.25:0;
   redAlertBlocks.forEach((duration,index)=>add(duration,0,index%2?accentLevel:1,'cut',0,'#ff3030',{fadeIn:0,fadeOut:0}));
  }else if(festive&&roomIndex>=0&&kind==='moving'){
   const hold=8+roomIndex*.15,off=9-hold;
   for(let phase=0;phase<3;phase++){
    add(hold,phase,1,'fade',2,colorAt(phase),{fadeIn:.35,fadeOut:.2,flashPattern:'random'});
    // All six colour wheels settle in darkness before the shared accent.
    // Close at different times, then reopen together at second 9 of each phase.
    add(off,phase,0,'cut',0,sharedAccents[phase]);
    add(1,phase,1,'fade',2,sharedAccents[phase],{fadeIn:.12,fadeOut:.18});
   }
  }else if(id==='red_alert'&&/^S[1-6]$/.test(fid)){
   // Traditional PARs never provide the fast white strobe, including when a
   // caller still supplies an older preset with their intensity above zero.
   add(30,0,0,'cut',0,'#ffffff');
  }else if(festive&&/^S[1-6]$/.test(fid)){
   // Independent short bursts, placed anew inside each five-second window.
   // The fixture/block ID decorrelates PARs; absolute time varies the next loop.
   for(let window=0;window<6;window++)add(5,Math.floor(window/2),1,'fade',2,'#ffffff',
    {fadeIn:.06,fadeOut:.08,flashPattern:'random',flashOnly:true});
  }else if(festive&&profiles[kind]?.color!=='gel'&&!['#ffffff','#000000'].includes(baseColor.toLowerCase())){
   // Keep coloured artist/DJ illumination steady while following the room's
   // shared two-colour palette. The neutral white face light has no timeline.
   for(let phase=0;phase<3;phase++)add(10,phase,1);
  }
  if(steps.length)timelines[fid]=sanitizeFixtureTimeline({enabled:true,steps},kind);
 }
 return timelines;
}
