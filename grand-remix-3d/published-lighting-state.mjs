// Les réglages publics restent la source commune; les modifications locales
// ne changent que le navigateur qui les a enregistrées.
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function mergeSceneCatalogue(published,personal){
 const out=[...published];
 for(const scene of personal){
  const index=out.findIndex(candidate=>candidate.name===scene.name);
  if(index===-1)out.push(scene);
  else out[index]=scene;
 }
 return out;
}

export function keepLocalSceneChanges(published,local){
 return local.filter(scene=>{
  const base=published.find(candidate=>candidate.name===scene.name);
  return !base||!same(scene,base);
 });
}

export function keepLocalPresetChanges(published,local){
 return Object.fromEntries(Object.entries(local).filter(([id,preset])=>!same(published[id],preset)));
}

export function replaceLocalScene(local,previousName,next){
 return [...local.filter(scene=>scene.name!==previousName&&scene.name!==next.name),next];
}
