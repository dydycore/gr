// Les réglages publics restent la source commune; les modifications locales
// ne changent que le navigateur qui les a enregistrées.
const same=(a,b)=>{
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));
};

// Old public copies should disappear from the personal list after promotion.
// An edited copy remains personal. Names alone are never enough to delete it.
export function migratePromotedLighting(local,published){
 if(!local||typeof local!=='object')return local;
 if((local.catalogueVersion||1)>=(published.catalogueVersion||1))return local;
 const promoted=published.migration?.promotedScenes||[];
 const presetOverrides=Object.fromEntries(Object.entries(local.presetOverrides||{}).filter(([id,preset])=>!same(preset,published.migration?.previousPresetOverrides?.[id])));
 const scenes=[],promotedSceneBackups=[...(local.promotedSceneBackups||[])];
 const key=name=>typeof name==='string'?name.trim().toLocaleLowerCase('fr-CA'):'';
 for(const scene of Array.isArray(local.scenes)?local.scenes:[]){
  const source=promoted.find(item=>key(item.name)===key(scene.name)),preset=source&&published.presetOverrides[source.presetId];
  if(!preset){scenes.push(scene);continue;}
  const original={name:scene.name,duration:preset.duration,prefs:preset.prefs,colors:preset.colors,timelines:preset.timelines,view:source.previousView};
  if(same(scene,original))continue;
  // A customized former shared scene becomes the personal version of the
  // main preset, never a second Pinky button. Keep its complete old snapshot
  // in local/export data in case an existing personal preset takes priority.
  if(!promotedSceneBackups.some(saved=>same(saved,scene)))promotedSceneBackups.push(scene);
  if(!presetOverrides[source.presetId])presetOverrides[source.presetId]={...preset,name:preset.name,duration:scene.duration,prefs:scene.prefs,colors:scene.colors,timelines:scene.timelines,fog:scene.view?.fog,artistVisible:scene.view?.artistVisible,videoOn:scene.view?.videoOn,flashes:scene.view?.flashes,videoMode:source.presetId,view:{...scene.view,ambience:source.presetId,videoMode:source.presetId}};
 }
 return {...local,catalogueVersion:published.catalogueVersion||1,scenes,presetOverrides,promotedSceneBackups};
}

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

// Saving a copy or renaming must never replace another scene implicitly.
// Keep the suffix inside the same 70-character name limit used by the editor.
export function uniqueSceneName(requested,scenes){
 const base=(typeof requested==='string'?requested.trim():'').slice(0,70)||'Mon ambiance';
 const names=new Set(scenes.map(scene=>scene.name));
 if(!names.has(base))return base;
 for(let number=2;;number++){
  const suffix=` (${number})`,candidate=base.slice(0,70-suffix.length)+suffix;
  if(!names.has(candidate))return candidate;
 }
}
