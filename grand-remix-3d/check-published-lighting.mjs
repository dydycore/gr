import assert from 'node:assert/strict';
import publicLighting from './published-lighting.json' with {type:'json'};
import {mergeSceneCatalogue,keepLocalSceneChanges,keepLocalPresetChanges,replaceLocalScene} from './published-lighting-state.mjs';
const expectedIds=['arrival','opening','dream','red_alert','warm','dj','hiphop'];
assert.equal(publicLighting.format,'grand-remix-published-lighting');
assert.equal(publicLighting.version,1);
assert.equal(publicLighting.geometryId,'294317811a38');
assert.deepEqual(Object.keys(publicLighting.presetOverrides).sort(),expectedIds.sort());
assert.deepEqual(publicLighting.scenes.map(s=>s.name),['pinky love','Ouverture — copie']);
assert.equal(publicLighting.scenes.length,2);
assert.equal(publicLighting.holdDuration,30);
for(const scene of publicLighting.scenes){
 assert.equal(scene.duration,30);
 assert.equal(scene.view.camera.length,3);
 assert.equal(scene.view.target.length,3);
}
for(const preset of Object.values(publicLighting.presetOverrides)){
 assert.equal(preset.duration,30);
 assert.ok(preset.prefs&&preset.colors&&preset.timelines);
}
assert.equal(publicLighting.presetOverrides.dream.fog.rate,1);
assert.equal(publicLighting.presetOverrides.red_alert.timelines.SL1.steps.filter(s=>s.flashHz===8).length,4);
assert.equal(publicLighting.presetOverrides.hiphop.fog.rate,.85);
const published=publicLighting.scenes;
const duplicated=published.map(x=>structuredClone(x));
assert.deepEqual(keepLocalSceneChanges(published,duplicated),[]);
assert.equal(mergeSceneCatalogue(published,duplicated).length,2);
const edited=structuredClone(published[0]);edited.duration=17;
assert.equal(keepLocalSceneChanges(published,[edited]).length,1);
assert.equal(mergeSceneCatalogue(published,[edited])[0].duration,17);
assert.equal(mergeSceneCatalogue(published,[{...edited,name:'Une nouvelle scène'}]).length,3);
const replaced=replaceLocalScene([{...edited,name:'Autre'}],'Autre',{...edited,name:'Nouveau'});
assert.deepEqual(replaced.map(x=>x.name),['Nouveau']);
assert.deepEqual(keepLocalPresetChanges(publicLighting.presetOverrides,structuredClone(publicLighting.presetOverrides)),{});
const custom=structuredClone(publicLighting.presetOverrides.dream);custom.fog.rate=.55;
assert.deepEqual(Object.keys(keepLocalPresetChanges(publicLighting.presetOverrides,{dream:custom})),['dream']);
console.log('PASS : 7 ambiances publiques, 2 scènes communes, zéro doublon et modifications locales préservées.');
