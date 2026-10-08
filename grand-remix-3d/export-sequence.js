export const MAX_EXPORT_SECONDS=240;

// One frozen scene or exactly one pass of the eight public ambiences. Durations
// are aligned to output frames, so every segment starts with its own frame zero.
export function createExportPlan(snapshot){
 const sources=Array.isArray(snapshot?.scenes)?snapshot.scenes:[snapshot];
 if(!sources.length||sources.length>8)throw new Error('Choisir entre une et huit ambiances à exporter.');
 let durationSeconds=0;
 const scenes=sources.map(source=>{
  if(!source?.view)throw new Error('Réglages de vidéo incomplets.');
  const scene=JSON.parse(JSON.stringify(source));
  const duration=Math.round(Math.max(2,Math.min(30,Number(scene.duration)||30))*30)/30;
  const segment={scene,start:durationSeconds,duration};durationSeconds+=duration;return segment;
 });
 return {name:snapshot.name||'Ambiance',scenes,durationSeconds};
}

export function exportFrameAt(plan,time){
 const t=Math.max(0,Math.min(plan.durationSeconds-1/30,Number(time)||0));
 let index=plan.scenes.length-1;
 for(let i=0;i<plan.scenes.length;i++)if(t<plan.scenes[i].start+plan.scenes[i].duration-1e-7){index=i;break;}
 return {index,time:Math.max(0,t-plan.scenes[index].start),segment:plan.scenes[index]};
}
