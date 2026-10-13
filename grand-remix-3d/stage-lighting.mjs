import {sanitizeFx} from './fixture-profiles.js';

// The screen is now behind the artist. Restore the formerly excluded lights
// in each cue without replacing the user's videos, fog, colours or sequences.
export const restoredFixtureIds=['9','11','13','205','206','M2','6','106','5'];
const stageColour={arrival:'#ffffff',opening:'#ff40cb',dream:'#35dcff',red_alert:'#ff3030',warm:'#ffe53b',pinky:'#ff40cb',dj:'#ff40cb',hiphop:'#35dcff'};

export function applyStageLighting(input,fixtures,id=input.id||input.view?.ambience||'opening'){
 const scene=structuredClone(input);
 scene.prefs??={};scene.colors??={};scene.timelines??={};
 const quiet=['warm','hiphop','dj'].includes(id);
 for(const fixture of fixtures.filter(f=>restoredFixtureIds.includes(f.id))){
  const fid=fixture.id,old=scene.prefs[fid]||{},rgb=['colorado','mini'].includes(fixture.kind);
  // Only revive an extinguished/default track. Existing creative settings
  // remain editable, including later deliberate blackouts made by the user.
  const dimmer=old.dimmer>0?old.dimmer:fixture.kind==='moving'?45:rgb?30:quiet?12:25;
  scene.prefs[fid]=sanitizeFx({...old,dimmer,...(fixture.kind==='moving'?{pan:null,tilt:null,movement:'static',amplitude:0,gobo:0,rotation:0}: {})},fixture.kind);
  if(!scene.colors[fid]||scene.colors[fid]==='#000000')scene.colors[fid]=rgb||fixture.kind==='moving'?stageColour[id]||'#ffffff':'#ffffff';
  if(rgb&&(!old.dimmer||old.dimmer<=0))scene.colors[fid]=stageColour[id]||'#ffffff';
  const track=scene.timelines[fid];
  if(track?.enabled&&!track.steps.some(step=>step.fx?.dimmer>0&&step.color!=='#000000'))delete scene.timelines[fid];
 }
 // Null angles resolve from the shared artist target in the new layout.
 // Audience sweeps and the independent DJ light keep their authored motion.
 for(const fixture of fixtures.filter(f=>f.kind==='moving'&&f.id!=='101')){
  if(id!=='opening')continue;
  if(scene.prefs[fixture.id]){scene.prefs[fixture.id].pan=null;scene.prefs[fixture.id].tilt=null;}
  for(const step of scene.timelines[fixture.id]?.steps||[])if(step.fx){step.fx.pan=null;step.fx.tilt=null;}
 }
 // Keep the existing sweeps but move their centre away from the rear screen.
 for(const fid of ['104','105']){
  const oldPan=fid==='104'?-44.693:-80,newPan=fid==='104'?-28:-68;
  for(const fx of [scene.prefs[fid],...(scene.timelines[fid]?.steps||[]).map(step=>step.fx)])
   if(fx?.pan!=null&&Math.abs(fx.pan-oldPan)<.001)fx.pan=newPan;
 }
 for(const step of scene.timelines['104']?.steps||[])
  if(step.fx?.pan===-52&&step.fx?.tilt===42){step.fx.pan=-32;step.fx.tilt=62;}
 for(const step of scene.timelines['101']?.steps||[])
  if(step.fx?.pan==null&&step.fx?.amplitude>24)step.fx.amplitude=24;
 return scene;
}
