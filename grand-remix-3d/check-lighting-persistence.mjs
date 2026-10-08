import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import layout from './implantation.json' with {type:'json'};
import published from './published-lighting.json' with {type:'json'};

// Exercise the real save/load controller without a GPU. Only the drawing and
// timeline widget are stubbed; cleaning, merging, storage and callbacks are real.
const compiled=await build({entryPoints:[fileURLToPath(new URL('./lighting-editor.js',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{
 name:'headless-widgets',setup(build){
  build.onResolve({filter:/\/(gobo-preview|timeline-editor)\.js$/},args=>({path:args.path,namespace:'test-widgets'}));
  build.onLoad({filter:/.*/,namespace:'test-widgets'},args=>({contents:args.path.includes('gobo-preview')
   ?'export const createGoboPreview=()=>({ready:Promise.resolve(),texture:{dispose(){}},drawThumbnail(){}});'
   :'export const createTimelineEditor=()=>({sync(){},step(){return null},index(){return 0},updatePlayhead(){},resetSelection(){}});'}));
 }
}]});
const store=new Map();let failStorage=false,storageReads=0,storageWrites=0;
const localStorage={getItem:key=>{storageReads++;return store.get(key)??null;},setItem:(key,value)=>{storageWrites++;if(failStorage)throw Error('Storage full');store.set(key,String(value));}};
function openEditor({transient=false,captureState={}}={}){
 const nodes=new Map();
 class Element{
  constructor(tag='div'){this.tagName=tag;this.value='';this.children=[];this.dataset={};this.style={setProperty(){}};this.listeners={};}
  set innerHTML(value){this.html=value;for(const match of value.matchAll(/<([a-z]+)\b([^>]*)>/gi)){const id=/\bid="([^"]+)"/.exec(match[2]);if(id){const node=new Element(match[1]);node.id=id[1];node.value=/\bvalue="([^"]*)"/.exec(match[2])?.[1]??'';nodes.set(node.id,node);}}}
  appendChild(child){this.children.push(child);if(child.id)nodes.set(child.id,child);if(this.tagName==='select'&&this.children.length===1)this.value=child.value;return child;}
  append(...children){children.forEach(child=>this.appendChild(child));}
  replaceChildren(){this.children=[];this.value='';}
  before(){} after(){} querySelectorAll(){return [];} setAttribute(name,value){this[name]=value;}
  addEventListener(name,handler){this.listeners[name]=handler;}
 }
 const events={};
 const document={addEventListener:(name,handler)=>{events[name]=handler;},createElement:tag=>new Element(tag),head:new Element('head'),getElementById:id=>nodes.get(id)||null,querySelectorAll:()=>[],querySelector:selector=>{const id=selector.slice(1);if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);}};
 const context={module:{exports:{}},exports:{},document,localStorage,console,performance:{now:()=>0},setTimeout,queueMicrotask};
 vm.runInNewContext(compiled.outputFiles[0].text,context);
 let colors={},selected=null,restored=null;
 const fixtures=layout.fixtures.map(f=>({...f,g:{userData:{details:{}}}}));
 const editor=context.module.exports.createLightingEditor({transient,fixtures,colors:{moving:'#ffffff',source:'#ffffff',colorado:'#ffffff',par:'#ffffff',mini:'#ffffff',sl1:'#ffffff',zoom:'#ffffff'},geometryId:layout.geometryId,getColors:()=>colors,setColors:value=>{colors=value;},apply(){},select(){},defaultAngles:()=>({pan:0,tilt:0}),roomPreset(){},capture:()=>({mode:'setup',level:1,artistVisible:true,videoOn:false,flashes:false,camera:[0,2,10],target:[0,1,0],fog:{on:false,rate:.25},...captureState}),restore:value=>{restored=value;},onSceneSelected:item=>{selected=item;}});
 return {editor,nodes,events,get colors(){return colors;},get selected(){return selected;},get restored(){return restored;}};
}

const publicBefore=JSON.stringify(published),first=openEditor(),baseName=published.presetOverrides.pinky.name;
const suspendedPlayer=openEditor({transient:true});
suspendedPlayer.nodes.get('scene-hold').value=20;
suspendedPlayer.editor.saveAs('A');suspendedPlayer.editor.saveAs('B');
suspendedPlayer.nodes.get('scene-list').value=0;suspendedPlayer.nodes.get('scene-play').onclick();
assert.equal(suspendedPlayer.selected.name,'A');
const writesBeforeSuspend=storageWrites;
suspendedPlayer.editor.shiftPlaybackClock(60000);suspendedPlayer.editor.shiftPlaybackClock(NaN);suspendedPlayer.editor.shiftPlaybackClock(-1);
suspendedPlayer.editor.tick(79999);assert.equal(suspendedPlayer.selected.name,'A','An offscreen minute does not skip the current saved scene');
suspendedPlayer.editor.tick(80001);assert.equal(suspendedPlayer.selected.name,'B','Saved-scene playback resumes with its remaining time');
assert.equal(storageWrites,writesBeforeSuspend,'Freezing playback clocks never mutates user storage');
assert.equal(first.editor.sceneSummaries().length,0,'Fresh browser has no duplicated shared copies');
first.nodes.get('scene-hold').value=100;
const copy1=first.editor.saveAs(baseName),copy2=first.editor.saveAs(baseName);
assert.equal(copy1.name,baseName+' (2)');assert.equal(copy2.name,baseName+' (3)');
assert.equal(first.editor.sceneSummaries().length,2);
assert.equal(first.editor.updateSaved(0,'Scène renommée'),true);
assert.equal(first.selected.index,1,'Controller reports the new index after a local-scene rename');
assert.equal(first.selected.name,'Scène renommée');
assert.equal(first.editor.updateSaved(first.selected.index,copy2.name),true);
assert.equal(first.selected.name,copy2.name+' (2)','Rename collision keeps the existing scene');
const persisted=JSON.parse(store.get('grand-remix-lighting-studio-v1'));
assert.equal(persisted.catalogueVersion,2);assert.equal(persisted.scenes.length,2);
assert.ok(persisted.scenes.every(s=>s.duration===30),'Save clamps duration to 30 seconds');
assert.deepEqual(persisted.scenes.map(s=>s.name),[copy2.name,first.selected.name]);
const reloaded=openEditor();
assert.equal(reloaded.editor.sceneSummaries().length,2);
reloaded.editor.loadSaved(1);
assert.equal(reloaded.selected.name,first.selected.name);assert.equal(reloaded.restored.videoOn,false);assert.equal(reloaded.restored.flashes,false);
reloaded.editor.applyPreset({id:'pinky'});
assert.equal(reloaded.restored.videoMode,'pinky');assert.equal(reloaded.restored.ambience,'pinky');
assert.equal(reloaded.editor.fx(layout.fixtures.find(f=>f.id==='201')).dimmer,published.presetOverrides.pinky.prefs['201'].dimmer);
reloaded.editor.applyPreset({id:'opening'});
assert.equal(reloaded.restored.videoMode,'opening');
assert.equal(reloaded.editor.savePresetOverride('dream','Bleu personnel'),true);
const withPreset=openEditor();
assert.equal(withPreset.editor.presetName('dream',''), 'Bleu personnel');
assert.equal(withPreset.editor.presetVideo('dream',true),false);assert.equal(withPreset.editor.presetFlashes('dream',true),false);
const beforeFailure=JSON.stringify(withPreset.editor.sceneSummaries());
failStorage=true;
assert.equal(withPreset.editor.saveAs('Copie impossible'),null);
assert.equal(withPreset.editor.updateSaved(0,'Renommage impossible'),false);
assert.equal(JSON.stringify(withPreset.editor.sceneSummaries()),beforeFailure,'Failed writes roll back catalogue changes');
failStorage=false;
const legacyScenes=published.migration.promotedScenes.map(source=>{const p=published.presetOverrides[source.presetId];return {name:source.name,duration:p.duration,prefs:p.prefs,colors:p.colors,timelines:p.timelines,view:source.previousView};});
const legacy={version:1,geometryId:layout.geometryId,scenes:legacyScenes,presetOverrides:published.migration.previousPresetOverrides};
store.set('grand-remix-lighting-studio-v1',JSON.stringify(legacy));
assert.equal(openEditor().editor.sceneSummaries().length,0,'Old unchanged shared copies are removed during migration');
const edited=structuredClone(legacy);edited.scenes[0].prefs['201'].dimmer=37;
store.set('grand-remix-lighting-studio-v1',JSON.stringify(edited));
const recovered=openEditor();assert.equal(recovered.editor.sceneSummaries().length,0,'A customized old Pinky becomes the main preset instead of a duplicate');
recovered.editor.applyPreset({id:'pinky'});assert.equal(recovered.restored.videoMode,'pinky');assert.equal(recovered.editor.fx(layout.fixtures.find(f=>f.id==='201')).dimmer,37);
const recoveredAgain=openEditor();recoveredAgain.editor.applyPreset({id:'pinky'});assert.equal(recoveredAgain.editor.fx(layout.fixtures.find(f=>f.id==='201')).dimmer,37,'Migrated personal work survives a second reload');
assert.equal(JSON.parse(store.get('grand-remix-lighting-studio-v1')).promotedSceneBackups[0].prefs['201'].dimmer,37,'Original custom snapshot is retained for recovery/export');
assert.equal(JSON.stringify(published),publicBefore,'No public preset was mutated');
console.log('PASS : véritable éditeur, huit presets sans doublons, migration prudente, Enregistrer sous, renommage, rechargement, vidéo Pinky et rollback du stockage.');

// An export is a detached snapshot of all fixtures plus the real camera/effects
// state. Its isolated controller never touches localStorage, even on startup.
const exporting=openEditor({captureState:{ambience:'pinky',videoMode:'pinky',elapsed:12.5,motion:true,shell:false,beams:true,people:true,fog:{on:true,rate:.85}}});
exporting.editor.applyPreset({id:'pinky'});exporting.nodes.get('scene-hold').value=24;
const beforeCapture={reads:storageReads,writes:storageWrites},snapshot=exporting.editor.captureCurrentScene('Pinky export');
assert.equal(snapshot.name,'Pinky export');assert.equal(snapshot.duration,24);assert.equal(snapshot.view.videoMode,'pinky');
assert.equal(snapshot.view.elapsed,12.5);assert.equal(snapshot.view.fog.rate,.85);assert.equal(snapshot.view.people,true);
assert.equal(Object.keys(snapshot.prefs).length,layout.fixtures.length);assert.equal(Object.keys(snapshot.colors).length,layout.fixtures.length);assert.equal(Object.keys(snapshot.timelines).length,layout.fixtures.length);
assert.deepEqual({reads:storageReads,writes:storageWrites},beforeCapture,'Capturing does not persist or reread storage');
const untouchedStore=JSON.stringify([...store]),beforeTransient={reads:storageReads,writes:storageWrites},isolated=openEditor({transient:true});
assert.deepEqual({reads:storageReads,writes:storageWrites},beforeTransient,'Transient startup does not even read the personal catalogue');
const restored=isolated.editor.restoreTemporaryScene(snapshot);
assert.equal(isolated.restored.videoMode,'pinky');assert.equal(isolated.restored.fog.rate,.85);assert.equal(isolated.nodes.get('scene-hold').value,24);
const moving=layout.fixtures.find(f=>f.id==='101');
assert.equal(isolated.editor.fx(moving).dimmer,snapshot.prefs['101'].dimmer);
assert.equal(isolated.colors['101'],snapshot.colors['101']);
assert.equal(isolated.editor.hasTimeline(moving),snapshot.timelines['101'].enabled);
snapshot.prefs['101'].dimmer=1;snapshot.view.camera[0]=999;snapshot.view.fog.rate=.05;
assert.notEqual(isolated.editor.fx(moving).dimmer,1);assert.notEqual(isolated.restored.camera[0],999);assert.equal(isolated.restored.fog.rate,.85,'Restore is detached from the sender');
restored.prefs['101'].dimmer=2;assert.notEqual(isolated.editor.fx(moving).dimmer,2,'Returned copy cannot mutate the renderer');
assert.equal(isolated.editor.sceneSummaries().length,0,'Temporary restore does not add a saved scene');
isolated.editor.applyPreset({id:'dream'});isolated.editor.saveAs('Copie export temporaire');isolated.editor.savePresetOverride('dream','Temp');
assert.deepEqual({reads:storageReads,writes:storageWrites},beforeTransient,'Even editor actions stay in the transient memory store');
assert.equal(JSON.stringify([...store]),untouchedStore);
const beforeInvalid=isolated.editor.fx(moving).dimmer;
assert.throws(()=>isolated.editor.restoreTemporaryScene({name:'Broken',view:{camera:[]}}),/Scène invalide/);
assert.equal(isolated.editor.fx(moving).dimmer,beforeInvalid,'Invalid payload is rejected before touching the running scene');
const mainBefore={reads:storageReads,writes:storageWrites},savedCount=exporting.editor.sceneSummaries().length;
exporting.editor.restoreTemporaryScene({...exporting.editor.captureCurrentScene(),duration:100});
assert.equal(exporting.nodes.get('scene-hold').value,30);assert.equal(exporting.editor.sceneSummaries().length,savedCount);
assert.deepEqual({reads:storageReads,writes:storageWrites},mainBefore,'Temporary restore never persists, even in a normal editor');
console.log('PASS : export détaché complet, restauration temporaire validée, durée maximale 30 s et stockage totalement isolé.');


// Download/import uses the same archive schema and adds detached custom scenes,
// including unsaved edits, without replacing canonical or personal presets.
store.clear();
const source=openEditor({captureState:{ambience:'dream',videoMode:'dream',roomDark:true,motion:true,people:true,beams:true,fog:{on:true,rate:.91}}});
source.editor.applyPreset({id:'dream'});
source.editor.savePresetOverride('dream','Bleu personnel');
source.editor.saveAs('Mon modèle');
source.editor.applyPreset({id:'dream'});
const live=source.editor.captureCurrentScene('Bleu ajusté sans enregistrer');
live.colors['210']='#005eff';live.prefs['210'].dimmer=73;
live.timelines['101']={enabled:true,steps:[{id:'transfer-a',duration:12,transition:'fade',fadeIn:1,fadeOut:.5,color:'#35dcff',flashHz:0,fx:{dimmer:61,gobo:6,rotation:12,movement:'sweep',period:8,amplitude:9,pan:-20,tilt:40,zoom:12}},{id:'transfer-b',duration:8,transition:'cut',fadeIn:0,fadeOut:1,color:'#e83145',flashHz:2,fx:{dimmer:82,gobo:7,rotation:-12,movement:'circle',period:9,amplitude:5,pan:-20,tilt:40,zoom:14}}]};
source.editor.restoreTemporaryScene(live);
const beforeDownload=JSON.stringify([...store]);
const archive=source.editor.exportSettings();
assert.equal(archive.format,'grand-remix-lighting');assert.equal(archive.version,1);
assert.equal(archive.scenes.length,1,'Existing personal scene is included');
assert.equal(Object.keys(archive.presetOverrides).length,8,'Download includes all eight ambiences');
assert.equal(archive.presetOverrides.dream.prefs['210'].dimmer,73,'Download captures unsaved settings');
assert.equal(archive.presetOverrides.dream.timelines['101'].steps[0].fadeIn,1);
assert.equal(archive.presetOverrides.dream.view.fog.rate,.91);
assert.equal(JSON.stringify([...store]),beforeDownload,'Download never saves or alters the catalogue');
const receiver=openEditor({transient:true});
const imported=receiver.editor.importSettings(JSON.parse(JSON.stringify(archive)));
assert.equal(imported.added,1);assert.equal(receiver.editor.sceneSummaries().length,1);
assert.equal(receiver.editor.presetName('dream',''),'Bleu ajusté sans enregistrer','Import updates the original blue button');
receiver.editor.applyPreset({id:'dream'});
assert.equal(receiver.editor.fx(layout.fixtures.find(f=>f.id==='210')).dimmer,73);
assert.equal(receiver.colors['210'],'#005eff');assert.equal(receiver.restored.fog.rate,.91);assert.equal(receiver.restored.videoMode,'dream');
assert.equal(receiver.editor.sample(moving,3).fx.gobo,6);assert.equal(receiver.editor.sample(moving,15).fx.gobo,7);
const importedAgain=receiver.editor.importSettings(archive);
assert.equal(importedAgain.added,0);assert.equal(importedAgain.updated,0);assert.equal(importedAgain.unchanged,9);
assert.equal(receiver.editor.sceneSummaries().length,1,'Repeated imports never duplicate scenes');
const renamed=structuredClone(archive);renamed.scenes[0].name='Mon modèle renommé';renamed.scenes[0].prefs['201'].dimmer=31;
assert.equal(receiver.editor.importSettings(renamed).updated,1);
assert.equal(receiver.editor.sceneSummaries().length,1,'Stable ID follows renamed custom scene');
receiver.editor.loadSaved(0);assert.equal(receiver.editor.fx(layout.fixtures.find(f=>f.id==='201')).dimmer,31);
const copyArchive=structuredClone(renamed);copyArchive.scenes[0].sceneId='deliberately-new-copy';
assert.equal(receiver.editor.importSettings(copyArchive).added,1,'A newly created copy is added even if its name collides');
assert.equal(receiver.editor.sceneSummaries().length,2);
const beforeBad=JSON.stringify(receiver.editor.sceneSummaries());
const beforeBadPreset=receiver.editor.presetName('dream','');
const malformed=JSON.parse(JSON.stringify(archive));malformed.scenes.push({name:'Broken',view:{camera:[]}});
assert.throws(()=>receiver.editor.importSettings(malformed),/Scène invalide/);
assert.throws(()=>receiver.editor.importSettings({...archive,geometryId:'unrelated'}),/incompatible/);
assert.throws(()=>receiver.editor.importSettings({...archive,presetOverrides:{dream:'broken'}}),/Ambiance invalide/);
assert.equal(JSON.stringify(receiver.editor.sceneSummaries()),beforeBad,'Malformed archive commits nothing');
assert.equal(receiver.editor.presetName('dream',''),beforeBadPreset);
const legacyTransfer=receiver.editor.importSettings({format:'grand-remix-lighting',...legacy});
assert.equal(typeof legacyTransfer.added,'number','Legacy archive remains importable');
const legacyCustom=structuredClone(renamed);delete legacyCustom.scenes[0].sceneId;
assert.equal(receiver.editor.importSettings(legacyCustom).added,0,'Old JSON files match existing exact names');
const persistedReceiver=openEditor();
const storedBeforeImport=JSON.stringify([...store]),listBeforeImport=JSON.stringify(persistedReceiver.editor.sceneSummaries()),presetBeforeImport=persistedReceiver.editor.presetName('pinky','');
failStorage=true;assert.throws(()=>persistedReceiver.editor.importSettings(archive),/aucune modification importée/);failStorage=false;
assert.equal(JSON.stringify([...store]),storedBeforeImport);assert.equal(JSON.stringify(persistedReceiver.editor.sceneSummaries()),listBeforeImport,'Storage failure rolls back the entire import');
assert.equal(persistedReceiver.editor.presetName('pinky',''),presetBeforeImport);
persistedReceiver.editor.importSettings(archive);
const afterReload=openEditor();
assert.ok(afterReload.editor.sceneSummaries().some(s=>s.name===archive.scenes[0].name),'Imported scenes survive reload');
assert.equal(afterReload.editor.presetName('dream',''),'Bleu ajusté sans enregistrer');
assert.equal(JSON.stringify(published),publicBefore,'Published source is unchanged');
assert.equal(source.nodes.get('scene-export').textContent,'Télécharger mes réglages');
assert.equal(source.nodes.get('scene-import-button').textContent,'Importer des ambiances');
const beforeSequence=JSON.stringify([...store]),sequence=source.editor.captureAmbienceSequence();
assert.equal(sequence.scenes.length,8);assert.equal(new Set(sequence.scenes.map(s=>s.view.ambience)).size,8);
assert.equal(sequence.scenes[2].prefs['210'].dimmer,73,'All-ambience export contains live edits');
assert.ok(sequence.scenes.every(s=>JSON.stringify(s.view.camera)===JSON.stringify(sequence.scenes[0].view.camera)),'Export keeps one camera');
assert.equal(JSON.stringify([...store]),beforeSequence,'Sequence capture never selects presets or persists');
console.log('PASS : full JSON backup; preset updates, custom scene identity, repeat import without duplicates, rollback, legacy names, reload, detached eight-ambience export.');

// Group edits are a single reversible transaction, restricted to the same model.
const groupEditor=openEditor({transient:true}),gn=groupEditor.nodes;
const settings=()=>JSON.stringify(groupEditor.editor.captureCurrentScene('Test'));
const sourceFixture=layout.fixtures.find(f=>f.id==='102');
groupEditor.editor.select(sourceFixture);
gn.get('fixture-dimmer').listeners.input({target:{value:'61'}});
gn.get('fixture-gobo').listeners.input({target:{value:'5'}});
const beforeGroup=settings();gn.get('fixture-apply-kind').onclick();
const afterGroup=settings();assert.notEqual(afterGroup,beforeGroup);
for(const f of layout.fixtures.filter(f=>f.kind==='moving'&&!f.notUsed)){
 assert.equal(groupEditor.editor.fx(f).dimmer,61);assert.equal(groupEditor.editor.fx(f).gobo,5);
}
assert.equal(groupEditor.editor.fx(layout.fixtures.find(f=>f.id==='201')).dimmer,45,'Other models remain untouched');
gn.get('lighting-undo').onclick();assert.equal(settings(),beforeGroup,'One undo reverses the whole group');
gn.get('lighting-redo').onclick();assert.equal(settings(),afterGroup);
let prevented=0;const shortcut={ctrlKey:true,key:'z',target:{tagName:'BUTTON'},preventDefault(){prevented++;}};
groupEditor.events.keydown(shortcut);assert.equal(settings(),beforeGroup);assert.equal(prevented,1);
groupEditor.events.keydown({...shortcut,shiftKey:true});assert.equal(settings(),afterGroup);
groupEditor.events.keydown({...shortcut,target:{tagName:'INPUT',type:'text'}});assert.equal(settings(),afterGroup,'Native text undo is preserved');
// A continuous slider movement is undone in one step.
gn.get('color-editor').listeners.pointerdown({target:{id:'fixture-dimmer',type:'range'}});
for(const value of ['40','31','23'])gn.get('fixture-dimmer').listeners.input({target:{value}});
groupEditor.events.pointerup();gn.get('lighting-undo').onclick();assert.equal(settings(),afterGroup);
// Real published timelines are copied independently, keeping target orientations.
groupEditor.editor.applyPreset({id:'dream'});groupEditor.editor.select(sourceFixture);
const timelineBefore=JSON.parse(settings());gn.get('fixture-apply-kind').onclick();const timelineAfter=JSON.parse(settings());
for(const f of layout.fixtures.filter(f=>f.kind==='moving'&&!f.notUsed&&f.id!=='102')){
 assert.equal(timelineAfter.timelines[f.id].enabled,timelineAfter.timelines['102'].enabled);
 assert.equal(timelineAfter.timelines[f.id].steps.length,timelineAfter.timelines['102'].steps.length);
 assert.equal(timelineAfter.prefs[f.id].pan,timelineBefore.prefs[f.id].pan);
}
gn.get('lighting-undo').onclick();assert.deepEqual(JSON.parse(settings()),timelineBefore);
groupEditor.editor.select(layout.fixtures.find(f=>f.id==='202'));const safeBefore=JSON.parse(settings());gn.get('fixture-apply-kind').onclick();const safeAfter=JSON.parse(settings());
for(const id of ['205','206'])assert.deepEqual(safeAfter.prefs[id],safeBefore.prefs[id],'Unused fixtures remain untouched');
groupEditor.editor.select(layout.fixtures.find(f=>f.id==='SL1'));assert.equal(gn.get('fixture-apply-kind').disabled,true);
groupEditor.editor.applyPreset({id:'pinky'});assert.equal(gn.get('lighting-undo').disabled,true,'A new ambience starts a fresh history');
console.log('PASS : same-model group copy, timeline and orientation preservation, excluded fixtures, single-step group undo/redo, Ctrl+Z, native text undo and slider gestures.');

// Loading personal ambiences must retain the viewer's current framing.
const liveView={camera:[1,2,9],target:[0,1,-1],view:'overview',shell:true};
const framingEditor=openEditor({transient:true,captureState:liveView});
framingEditor.editor.saveAs('Cadrage test');
liveView.camera=[3,4,7];liveView.target=[1,2,-2];liveView.view='public';liveView.shell=false;
framingEditor.editor.loadSaved(0);
for(const key of ['camera','target','view','shell'])assert.equal(JSON.stringify(framingEditor.restored[key]),JSON.stringify(liveView[key]),'Personal ambience keeps '+key);
const fn=framingEditor.nodes;
framingEditor.editor.setSceneName('   ');assert.equal(fn.get('scene-save').disabled,true);
fn.get('scene-save').onclick();assert.equal(framingEditor.editor.sceneSummaries().length,1);
framingEditor.editor.setSceneName('Nouveau thème');assert.equal(fn.get('scene-save').disabled,false);
fn.get('scene-save').onclick();assert.equal(framingEditor.editor.sceneSummaries().length,2);
const beforeRetire=JSON.stringify(framingEditor.editor.captureCurrentScene('État'));
fn.get('scene-list').value=0;fn.get('scene-remove').onclick();assert.equal(framingEditor.editor.sceneSummaries().length,1);
assert.equal(fn.get('scene-restore').hidden,false);
fn.get('scene-restore').onclick();assert.equal(framingEditor.editor.sceneSummaries().length,2);
for(const key of ['prefs','colors','timelines','view'])assert.equal(JSON.stringify(framingEditor.editor.captureCurrentScene('État')[key]),JSON.stringify(JSON.parse(beforeRetire)[key]),'Retiring/restoring retains '+key);
console.log('PASS: personal ambience camera preservation, required theme name, reversible personal-scene removal.');
