import {createEditHistory} from './edit-history.js';
import {profiles,wheel,sanitizeFx} from './fixture-profiles.js';
import {createGoboPreview} from './gobo-preview.js';
import {sanitizeFixtureTimeline,sampleFixtureTimeline} from './fixture-timeline.js';
import {createTimelineEditor} from './timeline-editor.js';
import {FOG_REFERENCE_MAX} from './fog-scale.mjs';
import {ambienceDefinitions,createAmbience} from './ambiences.js';
import publishedLighting from './published-lighting.json';
import {mergeSceneCatalogue,keepLocalSceneChanges,keepLocalPresetChanges,replaceLocalScene,uniqueSceneName,migratePromotedLighting} from './published-lighting-state.mjs';
const $=s=>document.querySelector(s),key='grand-remix-lighting-studio-v1';
const hex=v=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v);
export const sanitizeSceneDuration=value=>value!==null&&value!==''&&Number.isFinite(Number(value))?Math.max(2,Math.min(30,Number(value))):25;
const goboNames=['Ouvert','Couronne de points','Spirale à 5 branches','Spirale à 3 branches','Rayons pointillés','Quatre disques','Ondes','Anneaux entrelacés'];
const videoMode=(value,fallback='opening')=>ambienceDefinitions.some(p=>p.id===value)?value:fallback;
const movementChoices=[['static','Fixe','M32 12v40M12 32h40'],['sweep','Balayage','M10 32h44m-8-8 8 8-8 8M18 24l-8 8 8 8'],['tilt','Vertical','M32 10v44m-8-8 8 8 8-8M24 18l8-8 8 8'],['circle','Ellipse','M52 32a20 12 0 1 1-6-8m0-8v8h8'],['eight','Huit','M32 32C7 4 0 54 21 43L43 21C64 10 57 60 32 32']];
export function createLightingEditor({fixtures,colors,getColors,setColors,apply,capture,restore,select,defaultAngles,geometryId,compatibleGeometryIds=[],roomPreset,onEdit=()=>{},onScenesChanged=()=>{},onSceneSelected=()=>{},onTimelinePlayback=()=>{},getTimelinePlayback=()=>true,transient=false}){
 // Export frames use an isolated editor: even startup migrations never read or
 // write the viewer's storage. Its normal controls may only touch this memory.
 const memory=new Map(),storage=transient?{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))}:localStorage;
 let timelineUI=null,timelines={},presetOverrides={},personalOverrides={},publishedOverrides={},promotedSceneBackups=[];
 let recoveredGeometry=false;let prefs={},scenes=[],personalScenes=[],publishedScenes=[],playing=false,started=0,current=0,held=0,savedHoldDuration=25,activeSavedName=null,retiredScenes=[];
 const history=createEditHistory();let activeGesture=null;
 const editSnapshot=()=>({prefs:cleanPrefs(prefs),colors:cleanColors(getColors()),timelines:cleanTimelines(timelines)});
 const resetHistory=()=>{history.reset(editSnapshot());activeGesture=null;};
 const peers=f=>fixtures.filter(other=>other.id!==f.id&&other.kind===f.kind&&!other.notUsed);
 const defaultFx=f=>sanitizeFx({dimmer:['S6','112'].includes(f.id)?0:f.id==='201'?45:100,...(f.id==='112'?{zoom:12}: {})},f.kind);
 const cleanPrefs=raw=>Object.fromEntries(fixtures.map(f=>[f.id,raw?.[f.id]?sanitizeFx(raw[f.id],f.kind):defaultFx(f)]));
 const cleanColors=raw=>Object.fromEntries(fixtures.filter(f=>hex(raw?.[f.id])).map(f=>[f.id,profiles[f.kind].color==='gel'?(raw[f.id]==='#000000'?'#000000':'#ffffff'):f.kind==='moving'&&!wheel.some(w=>w[1]===raw[f.id])&&raw[f.id]!=='#000000'?'#ffffff':raw[f.id].toLowerCase()]));
 const emptyTimelines=Object.fromEntries(fixtures.map(f=>[f.id,sanitizeFixtureTimeline(null,f.kind)]));
 const cleanTimelines=raw=>Object.fromEntries(fixtures.filter(f=>raw?.[f.id]).map(f=>[f.id,sanitizeFixtureTimeline({...raw[f.id],enabled:!f.notUsed&&raw[f.id].enabled===true},f.kind)]));
 const cleanFog=raw=>raw&&typeof raw==='object'?{on:raw.on===true,rate:Number.isFinite(raw.rate)?Math.max(0,Math.min(FOG_REFERENCE_MAX,raw.rate)):.06}:null;
 // Preserve retired overrides in exports without bringing retired buttons back.
 const overrideDefinitions=[...ambienceDefinitions,{id:'slam_blue',name:'Slam · nuit bleue'},{id:'slam_amber',name:'Slam · ambre et rythme'},{id:'artist',name:'Premier artiste'},{id:'slam_white',name:'Slam · pulsation blanche'},{id:'dance',name:'Danse · duo contrasté'}];
 const cleanOverrides=raw=>Object.fromEntries(overrideDefinitions.filter(p=>raw?.[p.id]&&typeof raw[p.id]==='object').map(p=>{const saved=raw[p.id];return [p.id,{name:typeof saved.name==='string'?saved.name.slice(0,70):p.name,duration:sanitizeSceneDuration(saved.duration),prefs:cleanPrefs(saved.prefs),colors:cleanColors(saved.colors),timelines:cleanTimelines(saved.timelines),fog:cleanFog(saved.fog),artistVisible:typeof saved.artistVisible==='boolean'?saved.artistVisible:undefined,videoOn:typeof saved.videoOn==='boolean'?saved.videoOn:undefined,flashes:typeof saved.flashes==='boolean'?saved.flashes:undefined,videoMode:videoMode(saved.videoMode,p.id),...(saved.view?{view:cleanScene({...saved,name:saved.name||p.name}).view}:{})}];}));
 const timeline=f=>timelines[f.id]||emptyTimelines[f.id];
 const cleanScene=s=>{if(!s||typeof s.name!=='string'||!s.view||!['setup','slam','dance'].includes(s.view.mode)||!Array.isArray(s.view.camera)||s.view.camera.length!==3||!s.view.camera.every(Number.isFinite)||!Array.isArray(s.view.target)||s.view.target.length!==3||!s.view.target.every(Number.isFinite))throw Error('Scène invalide');return {...(typeof s.sceneId==='string'&&s.sceneId?{sceneId:s.sceneId.slice(0,160)}:{}),name:s.name.slice(0,70),duration:sanitizeSceneDuration(s.duration),prefs:cleanPrefs(s.prefs),colors:cleanColors(s.colors),timelines:cleanTimelines(s.timelines),view:{...s.view,fog:cleanFog(s.view.fog),videoMode:videoMode(s.view.videoMode,videoMode(s.view.ambience)),artistVisible:s.view.artistVisible!==false,level:Math.max(.1,Math.min(1,Number(s.view.level)||.75))}};};
 // Load published presets first. Older local saves become personal overrides,
 // so an update to the public version won't be masked by identical cached copies.
 if(publishedLighting.geometryId===geometryId){
  publishedOverrides=cleanOverrides(publishedLighting.presetOverrides);
  publishedScenes=(publishedLighting.scenes||[]).map(cleanScene);
  savedHoldDuration=sanitizeSceneDuration(publishedLighting.holdDuration);
 }else console.warn('Les ambiances publiques ne correspondent pas à cette géométrie.',publishedLighting.geometryId,geometryId);
 const rebuildScenes=()=>{scenes=mergeSceneCatalogue(publishedScenes,personalScenes);};
 try{
  const raw=JSON.parse(storage.getItem(key)||'null'),data=raw?migratePromotedLighting(raw,publishedLighting):null;
  if(data?.version===1){
   recoveredGeometry=data.geometryId!==geometryId;
   savedHoldDuration=sanitizeSceneDuration(data.holdDuration);
   personalOverrides=keepLocalPresetChanges(publishedOverrides,cleanOverrides(data.presetOverrides));
   personalScenes=keepLocalSceneChanges(publishedScenes,Array.isArray(data.scenes)?data.scenes.slice(0,100).map(cleanScene):[]);
   promotedSceneBackups=Array.isArray(data.promotedSceneBackups)?data.promotedSceneBackups:[];
   retiredScenes=Array.isArray(data.retiredScenes)?data.retiredScenes.map(cleanScene):[];
  }
 }catch(error){console.warn('Impossible de relire les ambiances locales.',error);}
 presetOverrides={...publishedOverrides,...personalOverrides};
 rebuildScenes();
 setColors({'201':'#b8fff2'}); // Fresh opening: white, pale turquoise DJ desk 45%, S6 and 112 off; saved scenes remain available.
 const fx=f=>prefs[f.id]||defaultFx(f);
 const selected=()=>fixtures.find(f=>f.id===$('#fixture-select').value)||fixtures[0];
 const editableStep=f=>f.id===selected().id&&timeline(f).enabled?timelineUI?.step():null;
 const editorFx=f=>editableStep(f)?.fx||fx(f);
 const editorColor=f=>editableStep(f)?.color||getColors()[f.id]||colors[f.kind];
 function updateStep(f,values){const t=timeline(f),i=timelineUI.index();timelines={...timelines,[f.id]:sanitizeFixtureTimeline({...t,steps:t.steps.map((s,n)=>n===i?{...s,...values}:s)},f.kind)};}
 function writeFx(f,value){const next=sanitizeFx(value,f.kind);if(editableStep(f))updateStep(f,{fx:next});else prefs[f.id]=next;}
 const status=text=>$('#scene-status').textContent=text;
 function persist(){try{storage.setItem(key,JSON.stringify({version:1,catalogueVersion:publishedLighting.catalogueVersion||1,geometryId,holdDuration:sanitizeSceneDuration($('#scene-hold')?.value??savedHoldDuration),prefs,timelines,presetOverrides:personalOverrides,scenes:personalScenes,promotedSceneBackups,retiredScenes}));status(transient?'Aperçu temporaire.':'Modifications personnelles conservées dans ce navigateur.');return true;}catch{status('Sauvegarde navigateur indisponible. Télécharger le fichier de scènes.');return false;}}
 $('#color-editor').innerHTML=`<p class="eyebrow">Créer une ambiance</p><label class="note" for="fixture-select">Cliquer sur un spot en 3D ou choisir son numéro</label><select id="fixture-select" aria-label="Spot à régler"></select><p class="note" id="fixture-outline-legend"><span style="color:#b99adb">Mauve : allumé</span> · <span style="color:#62ef9b">vert : sélectionné</span></p><p class="note" id="fixture-type"></p><div class="studio-actions"><button id="lighting-undo" title="Annuler le dernier réglage (Ctrl+Z)">Annuler</button><button id="lighting-redo" title="Rétablir le réglage (Ctrl+Maj+Z)">Rétablir</button></div><div class="row"><label for="fixture-dimmer">Intensité du spot</label><output id="dimmer-value"></output></div><input class="slider" id="fixture-dimmer" type="range" min="0" max="100" value="100"><div id="free-color"><div class="row"><label for="fixture-color">Couleur / gélatine</label><input id="fixture-color" type="color" value="#ffffff"></div><div class="color-palette">${[['Blanc','#ffffff'],['Ambre','#ffcc88'],['Rouge','#ff3030'],['Rose','#ff4dbe'],['Violet','#a066ff'],['Bleu','#3478ff'],['Turquoise','#32e0d0'],['Vert','#50e580']].map(([name,c])=>`<button data-swatch="${c}" style="--swatch:${c}" aria-label="${name}" title="${name}"></button>`).join('')}</div></div><div id="white-color"><button id="fixture-white">Blanc — allumer</button></div><div id="wheel-color"><p class="note">Couleur</p><div id="fixture-wheel-swatches" class="color-palette" role="group" aria-label="Couleurs de la lyre">${wheel.map(([n,c])=>`<button data-wheel-color="${c}" style="--swatch:${c}" aria-label="${n} · lyre" title="${n}" aria-pressed="false"></button>`).join('')}</div></div><button id="fixture-black" aria-label="Noir — éteindre ce spot">● Noir — éteindre</button><p class="note" id="fixture-color-value"></p><details id="moving-controls" open><summary>Mouvement et gobos</summary><p class="note effect-grid-label">Mouvement de la lyre</p><input id="fixture-movement" type="hidden" value="static"><div id="movement-choices" class="movement-choices" role="group" aria-label="Mouvement de la lyre">${movementChoices.map(([value,name,path])=>`<button type="button" data-movement="${value}" aria-label="Mouvement : ${name}" aria-pressed="false"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="${path}"/></svg><span>${name}</span></button>`).join('')}</div><p class="note effect-grid-label">Motif du gobo</p><input id="fixture-gobo" type="hidden" value="0"><div id="gobo-choices" class="gobo-choices" role="group" aria-label="Motif du gobo">${goboNames.map((name,i)=>`<button type="button" data-gobo="${i}" aria-label="${i?i+' · ':''}${name}" aria-pressed="false" title="${name}"><canvas width="128" height="128" aria-hidden="true"></canvas><span>${i?i:'Ouvert'}</span></button>`).join('')}</div><div class="row"><label for="fixture-pan">Pan · orientation</label><output id="pan-value"></output></div><input class="slider" id="fixture-pan" type="range" min="-270" max="270" step="1"><div class="row"><label for="fixture-tilt">Tilt · inclinaison</label><output id="tilt-value"></output></div><input class="slider" id="fixture-tilt" type="range" min="-135" max="135" step="1"><p class="note">Angles de la maquette, zéro vers le bas. Réglages DMX à calibrer au montage.</p><div class="row"><label for="fixture-zoom">Zoom</label><output id="zoom-value"></output></div><input class="slider" id="fixture-zoom" type="range" min="10" max="23" step=".5"><div class="row"><label for="fixture-rotation">Rotation gobo</label><output id="rotation-value"></output></div><input class="slider" id="fixture-rotation" type="range" min="-30" max="30" value="0"><div class="row"><label for="fixture-amplitude">Amplitude</label><output id="amplitude-value"></output></div><input class="slider" id="fixture-amplitude" type="range" min="0" max="45" value="15"><div class="row"><label for="fixture-period">Durée d’un cycle</label><output id="period-value"></output></div><input class="slider" id="fixture-period" type="range" min="3" max="30" value="8"></details><p class="note" id="color-fixture-note" role="status"></p><div class="spot-save-actions"><button id="color-reset" type="button">Rétablir ce spot</button><button id="fixture-save" type="button">Enregistrer</button></div><div class="section"><button id="fixture-apply-kind" style="width:100%">Appliquer aux lampes du même type</button><p id="fixture-group-hint" class="note"></p><label id="fixture-copy-direction-label" class="row" for="fixture-copy-direction">Inclure l’orientation<input type="checkbox" id="fixture-copy-direction"></label><p class="note" id="fixture-edit-status" role="status" aria-live="polite"></p></div><details><summary>Capacités et source</summary><p class="note" id="fixture-spec"></p><a id="fixture-source" target="_blank" rel="noopener">Documentation ↗</a></details>`;

 // Use the same canvas drawing as the projected cookie, rather than unrelated icons.
 const goboPreview=createGoboPreview();
 goboPreview.ready.then(()=>{for(const button of document.querySelectorAll('[data-gobo]')){
  goboPreview.drawThumbnail(Number(button.dataset.gobo));
  const thumb=button.querySelector('canvas');
  thumb.getContext('2d').drawImage(goboPreview.texture.image,0,0,thumb.width,thumb.height);
 }
 goboPreview.texture.dispose();});
 if(!document.getElementById('fixture-choice-styles')){
  const style=document.createElement('style');style.id='fixture-choice-styles';style.textContent=`
   .spot-save-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.spot-save-actions button{min-width:0;min-height:38px}.spot-save-actions #fixture-save{background:#295847;border-color:#4d987b;color:#effff4;font-weight:650}

  #color-editor .effect-grid-label{margin:14px 0 8px;color:#c8d8dd;font-size:11px}
  .gobo-choices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
  .gobo-choices button{padding:4px 4px 5px;background:#10191e;border:1px solid #46535c;min-width:0;display:flex;flex-direction:column;gap:3px;align-items:center}
  .gobo-choices canvas{display:block;max-width:100%;width:48px;aspect-ratio:1;height:auto;border-radius:50%}
  .gobo-choices span{font-size:10px;line-height:1.2}
  .movement-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
  .movement-choices button{display:flex;align-items:center;justify-content:center;gap:7px;padding:6px;font-size:11px;background:#17242c;border:1px solid #46535c}
  .movement-choices button:first-child{grid-column:1 / -1;padding:4px}
  .movement-choices svg{width:30px;height:30px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
  .movement-choices button:first-child svg{width:22px;height:22px}
  .gobo-choices button[aria-pressed=true],.movement-choices button[aria-pressed=true]{border-color:#9ee9c9;background:#214c40;color:#edfff8;box-shadow:0 0 0 1px #9ee9c9}
  .gobo-choices button:hover,.movement-choices button:hover{border-color:#b5d6ca}
  .gobo-choices button:disabled,.movement-choices button:disabled{opacity:.45;cursor:default}
  `;document.head.appendChild(style);
 }
 for(const [attribute,field] of [['gobo','fixture-gobo'],['movement','fixture-movement']]){
  for(const button of document.querySelectorAll('[data-'+attribute+']'))button.onclick=()=>{
   const input=document.getElementById(field);input.value=button.dataset[attribute];input.dispatchEvent(new Event('input',{bubbles:true}));
  };
 }
 const roomPanel=document.createElement('div');roomPanel.className='section';roomPanel.innerHTML='<p class="eyebrow">Commandes de la salle</p><div class="studio-actions"><button id="room-reset">Réinitialiser la salle</button><button id="room-blackout">Noir spectacle</button></div><p class="note">Départ : blanc à 100 %, poste DJ turquoise pâle à 45 %, S6 et 112 éteints. Noir spectacle : spots et image éteints, bar et poste DJ allumés ; rallumer les spots un par un. Le spot 201 du poste DJ reste réglable. Boîtiers faiblement visibles pour la sélection, sans éclairer la salle. Les appareils rouges restent inutilisés. Réinitialiser conserve vos scènes enregistrées.</p>';$('#color-editor').before(roomPanel);
 function roomAction(dark){activeSavedName=null;timelines={};timelineUI?.resetSelection();playing=false;$('#scene-play').textContent='Lire mes ambiances';prefs=dark?Object.fromEntries(fixtures.map(f=>[f.id,sanitizeFx({dimmer:f.id==='201'?45:0},f.kind)])):{};setColors({'201':'#b8fff2'});roomPreset(dark);resetHistory();const saved=persist();apply();sync();if(saved)status(dark?'Noir spectacle, bar et poste DJ allumés. Le spot 201 reste réglable.':'Salle réinitialisée : blanc à 100 %, poste DJ turquoise pâle à 45 %, S6 et 112 éteints, brouillard OFF. Scènes conservées.');}
 $('#room-reset').onclick=()=>roomAction(false);$('#room-blackout').onclick=()=>roomAction(true);
 const scenePanel=document.createElement('div');scenePanel.className='section';scenePanel.id='scene-editor';scenePanel.innerHTML=`<p class="eyebrow">Mes ambiances</p><label class="note" for="scene-name">Nom du thème</label><input id="scene-name" maxlength="70" required placeholder="Ex. Slam — ambre doux"><button id="scene-save" disabled>Ajouter une ambiance</button><select id="scene-list" aria-label="Ambiances personnelles enregistrées"></select><div class="studio-actions"><button id="scene-load">Afficher</button><button id="scene-update">Remplacer</button><button id="scene-remove">Retirer</button></div><button id="scene-restore" hidden>Rétablir la dernière ambiance retirée</button><div class="row"><label for="scene-hold">Durée par scène</label><input id="scene-hold" type="number" min="2" max="30" value="${savedHoldDuration}"></div><div class="studio-actions"><button id="scene-play">Lire mes ambiances</button><button id="scene-stop">Arrêter</button></div><p id="scene-status" class="note" role="status"></p><div class="studio-actions"><button id="scene-export">Télécharger</button><button id="scene-import-button">Importer</button></div><input id="scene-import" type="file" accept="application/json,.json" hidden><p class="note">Vos ambiances restent dans ce navigateur. Utiliser Exporter pour sauvegarder vos réglages et Importer pour charger un fichier.</p>`;$('#color-editor').after(scenePanel);
 $('#scene-hold').onchange=()=>{savedHoldDuration=sanitizeSceneDuration($('#scene-hold').value);$('#scene-hold').value=savedHoldDuration;persist();};
 for(const f of fixtures){const option=document.createElement('option');option.value=f.id;option.textContent=f.id+' · '+profiles[f.kind].label+(f.notUsed?' · NON UTILISÉ':'');$('#fixture-select').appendChild(option);f.g.userData.details.fixtureId=f.id;}
 function sceneList(){const old=$('#scene-list').value;$('#scene-list').replaceChildren();scenes.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+' · '+s.name+(publishedScenes.some(p=>p.name===s.name)&&!personalScenes.some(p=>p.name===s.name)?' · partagée':'');$('#scene-list').appendChild(o);});if(scenes[Number(old)])$('#scene-list').value=old;for(const id of ['scene-load','scene-update','scene-play','scene-remove'])$('#'+id).disabled=!scenes.length;$('#scene-export').disabled=false;$('#scene-remove').disabled=!scenes.length||!personalScenes.includes(scenes[Number($('#scene-list').value)||0]);$('#scene-restore').hidden=!retiredScenes.length;syncAddButton();onScenesChanged(scenes.map((s,index)=>({index,name:s.name,shared:publishedScenes.some(p=>p.name===s.name)&&!personalScenes.some(p=>p.name===s.name)})));}
 function sync(){const f=selected(),p=profiles[f.kind],s=editorFx(f),base=defaultAngles(f),color=editorColor(f);$('#fixture-type').textContent=f.notUsed?'NON UTILISÉ · boîtier rouge de repérage':p.motorized?'Lyre motorisée · couleurs par roue':f.kind==='sl1'?'Panneau LED fixe · effet stroboscope':p.color==='gel'?'Appareil fixe · blanc ou éteint':'Appareil fixe · couleur LED';$('#free-color').hidden=p.color!=='rgb';$('#white-color').hidden=false;$('#wheel-color').hidden=p.color!=='wheel';$('#moving-controls').hidden=!p.motorized;$('#fixture-color').value=color;$('#fixture-color-value').textContent=color.toUpperCase();document.querySelectorAll('[data-wheel-color]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.wheelColor===color));document.querySelectorAll('[data-swatch]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.swatch===color));for(const [name,value,unit] of [['dimmer',f.notUsed?0:s.dimmer,'%'],['pan',s.pan??base.pan,'°'],['tilt',s.tilt??base.tilt,'°'],['zoom',s.zoom,'°'],['rotation',s.rotation,'°/s'],['amplitude',s.amplitude,'°'],['period',s.period,'s']]){$('#fixture-'+name).value=value;$('#'+name+'-value').textContent=Math.round(value*10)/10+' '+unit;}$('#fixture-gobo').value=s.gobo;$('#fixture-movement').value=s.movement;document.querySelectorAll('[data-gobo]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.gobo)===s.gobo));document.querySelectorAll('[data-movement]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.movement===s.movement));for(const el of $('#color-editor').querySelectorAll('input,button,select'))if(el.id!=='fixture-select')el.disabled=!!f.notUsed;$('#fixture-spec').textContent=(f.notUsed?'Conservé à sa place. Aucune émission pendant cet événement. ':'')+p.note;$('#fixture-source').href=p.url;$('#color-fixture-note').textContent=f.previewBlocked?'Faisceau coupé dans la simulation : réserve de l’écran ou appareil maintenu éteint.':p.color==='gel'?'Blanc ou éteint ; gélatines non confirmées.':'Prévisualisation active · couleur écran approximative.';timelineUI?.sync();$('#lighting-undo').disabled=!history.canUndo;$('#lighting-redo').disabled=!history.canRedo;$('#fixture-save').disabled=!!f.notUsed;$('#fixture-apply-kind').disabled=f.notUsed||!peers(f).length;$('#fixture-copy-direction-label').hidden=!p.motorized;$('#fixture-group-hint').textContent=peers(f).length?'Copie les réglages et la séquence sur '+peers(f).length+' autre(s) lampe(s). Orientations conservées, sauf si cochées.':'Aucune autre lampe utilisable de ce modèle.';}
 function edit(){history.record(editSnapshot(),activeGesture);onEdit();playing=false;$('#scene-play').textContent='Lire mes ambiances';persist();apply();sync();}

 function travelHistory(direction){
  const value=history[direction]();if(!value)return false;
  prefs=cleanPrefs(value.prefs);timelines=cleanTimelines(value.timelines);setColors(cleanColors(value.colors));
  activeGesture=null;onEdit();playing=false;$('#scene-play').textContent='Lire mes ambiances';persist();apply();sync();
  $('#fixture-edit-status').textContent=direction==='undo'?'Réglage annulé.':'Réglage rétabli.';return true;
 }
 $('#lighting-undo').onclick=()=>travelHistory('undo');$('#lighting-redo').onclick=()=>travelHistory('redo');
 document.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey||e.key.toLowerCase()!=='z')return;
  const target=e.target,tag=target?.tagName?.toLowerCase();
  if(target?.isContentEditable||tag==='textarea'||tag==='input'&&!['range','checkbox','button'].includes(target.type))return;
  if(travelHistory(e.shiftKey?'redo':'undo'))e.preventDefault();
 });
 $('#color-editor').addEventListener('pointerdown',e=>{if(e.target?.type==='range'){activeGesture=e.target.id;history.endGesture();}});
 const finishGesture=()=>{activeGesture=null;history.endGesture();};
 document.addEventListener('pointerup',finishGesture);document.addEventListener('pointercancel',finishGesture);
 $('#fixture-apply-kind').onclick=()=>{
  const source=selected();if(source.notUsed)return;const targets=peers(source);if(!targets.length)return;
  const includeDirection=$('#fixture-copy-direction').checked,sourceTrack=timeline(source),sourceFx=fx(source),nextColors={...getColors()};
  const copyFx=(value,targetFx)=>sanitizeFx({...value,pan:includeDirection?(value.pan??defaultAngles(source).pan):targetFx.pan,tilt:includeDirection?(value.tilt??defaultAngles(source).tilt):targetFx.tilt},source.kind);
  for(const target of targets){
   const targetFx=fx(target),targetTrack=timeline(target);
   prefs[target.id]=copyFx(sourceFx,targetFx);nextColors[target.id]=getColors()[source.id]||colors[source.kind]||'#ffffff';
   timelines[target.id]=sanitizeFixtureTimeline({...sourceTrack,steps:sourceTrack.steps.map((step,i)=>({...step,fx:copyFx(step.fx,targetTrack.steps[i]?.fx||targetFx)}))},target.kind);
  }
  setColors(nextColors);finishGesture();edit();$('#fixture-edit-status').textContent='Réglages appliqués à '+targets.length+' autre(s) lampe(s). Annuler ou Ctrl+Z pour revenir en arrière.';
 };
 $('#fixture-select').onchange=()=>{select(selected());sync();};
 for(const name of ['dimmer','pan','tilt','zoom','gobo','rotation','amplitude','period','movement'])$('#fixture-'+name).addEventListener('input',e=>{const f=selected(),raw={...editorFx(f),[name]:name==='movement'?e.target.value:Number(e.target.value)};writeFx(f,raw);edit();});
 function color(value,forceWhite=false){const f=selected(),previous=editorColor(f),settings=editorFx(f);let dimmer=settings.dimmer;if(forceWhite||previous==='#000000'||dimmer===0)dimmer=100;if(value==='#000000')dimmer=0;if(editableStep(f))updateStep(f,{color:value,fx:{...settings,dimmer}});else{prefs[f.id]={...settings,dimmer};setColors({...getColors(),[f.id]:value});}edit();}
 $('#fixture-black').onclick=()=>color('#000000');$('#fixture-white').onclick=()=>color('#ffffff',true);
 $('#fixture-color').oninput=e=>color(e.target.value);document.querySelectorAll('[data-wheel-color]').forEach(b=>b.onclick=()=>color(b.dataset.wheelColor));document.querySelectorAll('[data-swatch]').forEach(b=>b.onclick=()=>color(b.dataset.swatch));
 $('#color-reset').onclick=()=>{const f=selected();if(editableStep(f))updateStep(f,{fx:sanitizeFx({},f.kind),color:'#ffffff',transition:'cut',fadeIn:0,fadeOut:0,flashHz:0,flashPattern:'steady',flashOnly:false});else{delete prefs[f.id];const next={...getColors()};delete next[f.id];setColors(next);}edit();};
 function snapshot(name){const view=capture();return {name:name.slice(0,70),duration:sanitizeSceneDuration($('#scene-hold').value),prefs:cleanPrefs(prefs),colors:cleanColors(getColors()),timelines:cleanTimelines(timelines),view:{...view,artistVisible:view.artistVisible!==false}};}
 function captureCurrentScene(name){
  const view=capture(),id=view.ambience,definition=ambienceDefinitions.find(p=>p.id===id);
  const label=typeof name==='string'&&name.trim()?name.trim():$('#scene-name').value.trim()||presetOverrides[id]?.name||definition?.name||'Ambiance';
  const result=snapshot(label),currentColors=getColors();
  const saved=scenes.find(s=>s.name===activeSavedName);if(saved)result.sceneId=saved.sceneId||'legacy:'+saved.name;
  result.colors=cleanColors(Object.fromEntries(fixtures.map(f=>[f.id,currentColors[f.id]||colors[f.kind]||'#ffffff'])));
  result.timelines=cleanTimelines({...emptyTimelines,...timelines});
  return JSON.parse(JSON.stringify(cleanScene(result)));
 }
 function captureAmbienceSequence(){
  const current=captureCurrentScene(),base=current.view;
  // Read the same preset sources as live playback, without selecting anything,
  // changing the camera, or writing to the user's saved settings.
  const sequence=ambienceDefinitions.map(definition=>{
   if(base.ambience===definition.id)return current;
   const source=presetOverrides[definition.id]||createAmbience(definition.id,fixtures);
   const view={...base,mode:definition.mode,roomDark:true,level:1,motion:true,beams:true,fixtureVisible:true,
    ...source.view,camera:base.camera,target:base.target,view:base.view,ambience:definition.id,
    elapsed:0,ambienceCustomized:false,videoMode:source.videoMode||definition.videoMode||definition.id,
    videoOn:source.videoOn??definition.videoOn,artistVisible:source.artistVisible??definition.artistVisible??true,
    flashes:source.flashes??true,fog:source.fog||definition.fog};
   return cleanScene({...source,name:source.name||definition.name,view});
  });
  return JSON.parse(JSON.stringify({name:'Toutes les ambiances',scenes:sequence}));
 }
 function restoreTemporaryScene(value){
  // Clone before validation so the export can never keep references to its
  // caller's live settings. Validate fully before mutating any working state.
  const next=cleanScene(JSON.parse(JSON.stringify(value)));
  playing=false;held=0;$('#scene-play').textContent='Lire mes ambiances';
  prefs=next.prefs;timelines=next.timelines;timelineUI?.resetSelection();
  setColors(next.colors);$('#scene-name').value=next.name;$('#scene-hold').value=next.duration;
  restore(next.view);resetHistory();apply();sync();status('Aperçu temporaire : '+next.name);
  return JSON.parse(JSON.stringify(next));
 }
 function load(i){const s=scenes[i];if(!s)return;activeSavedName=s.name;timelines=cleanTimelines(s.timelines);timelineUI?.resetSelection();prefs=cleanPrefs(s.prefs);setColors(cleanColors(s.colors));const currentView=capture();restore({...s.view,camera:currentView.camera,target:currentView.target,view:currentView.view,shell:currentView.shell});$('#scene-list').value=i;$('#scene-name').value=s.name;syncAddButton();$('#scene-hold').value=sanitizeSceneDuration(s.duration);onSceneSelected({index:i,name:s.name});resetHistory();apply();sync();status('Scène affichée : '+s.name);}
 function saveAs(rawName){
  const name=uniqueSceneName((typeof rawName==='string'?rawName.trim():'')||'Scène '+(scenes.length+1),[...scenes,...ambienceDefinitions.map(p=>({name:presetOverrides[p.id]?.name||p.name}))]);
  if(scenes.length>=100){status('Maximum 100 scènes : télécharger puis remplacer une scène.');return null;}
  const next={...snapshot(name),sceneId:globalThis.crypto?.randomUUID?.()||'scene-'+Date.now()+'-'+Math.random().toString(36).slice(2)};personalScenes.push(next);rebuildScenes();
  if(!persist()){personalScenes.pop();rebuildScenes();return null;}
  sceneList();const index=scenes.indexOf(next);$('#scene-list').value=index;$('#scene-name').value=name;syncAddButton();
  const item={index,name};activeSavedName=name;onSceneSelected(item);apply();status('Enregistrée localement : '+name);return item;
 }
 function syncAddButton(){$('#scene-save').disabled=!$('#scene-name').value.trim();}
 $('#scene-name').addEventListener('input',syncAddButton);
 $('#scene-save').onclick=()=>{const name=$('#scene-name').value.trim();if(!name){status('Saisir un nom de thème pour ajouter une ambiance.');return;}saveAs(name);syncAddButton();};
 $('#scene-list').addEventListener('change',()=>{$('#scene-remove').disabled=!personalScenes.includes(scenes[Number($('#scene-list').value)]);});
 $('#scene-remove').onclick=()=>{
  const removed=scenes[Number($('#scene-list').value)];if(!removed||!personalScenes.includes(removed))return;
  const before=personalScenes;personalScenes=personalScenes.filter(s=>s!==removed);retiredScenes.push(removed);rebuildScenes();
  if(!persist()){personalScenes=before;retiredScenes.pop();rebuildScenes();return;}
  playing=false;$('#scene-play').textContent='Lire mes ambiances';activeSavedName=null;$('#scene-name').value='';onSceneSelected(null);sceneList();apply();status('Ambiance retirée : '+removed.name+'. Elle peut être rétablie.');
 };
 $('#scene-restore').onclick=()=>{
  if(!retiredScenes.length||scenes.length>=100)return;
  const saved=retiredScenes.pop(),next={...saved,name:uniqueSceneName(saved.name,scenes)};personalScenes.push(next);rebuildScenes();
  if(!persist()){personalScenes.pop();retiredScenes.push(saved);rebuildScenes();return;}
  sceneList();status('Ambiance rétablie : '+next.name);
 };
 $('#scene-load').onclick=()=>{playing=false;$('#scene-play').textContent='Lire mes ambiances';load(Number($('#scene-list').value));persist();};
 function updateSaved(i,name){
  if(!scenes[i])return false;
  const previous=personalScenes;const oldName=scenes[i].name;
  const next={...snapshot(uniqueSceneName(typeof name==='string'&&name.trim()?name.trim():oldName,scenes.filter((s,index)=>index!==i))),sceneId:scenes[i].sceneId||'legacy:'+oldName};
  personalScenes=replaceLocalScene(personalScenes,oldName,next);rebuildScenes();
  if(!persist()){personalScenes=previous;rebuildScenes();return false;}
  sceneList();const index=scenes.indexOf(next);$('#scene-list').value=index;$('#scene-name').value=next.name;syncAddButton();activeSavedName=next.name;onSceneSelected({index,name:next.name});status('Scène personnalisée dans ce navigateur.');return true;
 }
 $('#scene-update').onclick=()=>updateSaved(Number($('#scene-list').value),$('#scene-name').value);
 function savePresetOverride(id,name){const definition=ambienceDefinitions.find(p=>p.id===id);if(!definition)return false;const view=capture();presetOverrides={...presetOverrides,[id]:{name:typeof name==='string'&&name.trim()?name.trim().slice(0,70):definition.name,duration:sanitizeSceneDuration($('#scene-hold').value),prefs:cleanPrefs(prefs),colors:cleanColors(getColors()),timelines:cleanTimelines(timelines),fog:cleanFog(view.fog),artistVisible:view.artistVisible!==false,videoOn:view.videoOn!==false,flashes:view.flashes!==false,videoMode:videoMode(view.videoMode,id),view:{...view,ambience:id,videoMode:videoMode(view.videoMode,id)}}};const oldPersonal=personalOverrides;
  personalOverrides=keepLocalPresetChanges(publishedOverrides,{...personalOverrides,[id]:presetOverrides[id]});
  presetOverrides={...publishedOverrides,...personalOverrides};
  const saved=persist();if(!saved){personalOverrides=oldPersonal;presetOverrides={...publishedOverrides,...personalOverrides};}
  sceneList();if(saved)status('Ambiance personnalisée ici : '+presetOverrides[id].name);return saved;}
 $('#scene-play').onclick=()=>{if(playing){held=performance.now()-started;playing=false;$('#scene-play').textContent='Reprendre';status('Enchaînement en pause ; animations contrôlées par Animation des effets.');}else if(scenes.length){if($('#scene-play').textContent!=='Reprendre'){current=Number($('#scene-list').value)||0;held=0;load(current);}started=performance.now()-held;playing=true;$('#scene-play').textContent='Pause';status('Lecture : '+scenes[current].name);}};
 $('#scene-stop').onclick=()=>{playing=false;held=0;$('#scene-play').textContent='Lire mes ambiances';status('Lecture arrêtée.');};
 function overrideAsScene(id,value){
  const definition=overrideDefinitions.find(p=>p.id===id);
  const view={...capture(),...(publishedOverrides[id]?.view||{}),...(value.view||{}),ambience:id};
  for(const field of ['fog','artistVisible','videoOn','flashes'])if(value[field]!==undefined&&value[field]!==null)view[field]=value[field];
  view.videoMode=videoMode(value.videoMode||view.videoMode,id);
  return cleanScene({...value,name:value.name||definition?.name||'Ambiance',view});
 }
 function exportSettings(){
  // Keep the existing version-1 archive. Include unsaved live edits in this
  // detached download without changing a preset or adding a local scene.
  const currentScene=captureCurrentScene($('#ambience-name')?.value||$('#scene-name').value),id=currentScene.view.ambience;
  const archiveScenes=scenes.map(s=>cleanScene({...s,sceneId:s.sceneId||'legacy:'+s.name}));
  const archiveOverrides=Object.fromEntries(captureAmbienceSequence().scenes.map(s=>[s.view.ambience,{...s,fog:s.view.fog,artistVisible:s.view.artistVisible,videoOn:s.view.videoOn,flashes:s.view.flashes,videoMode:s.view.videoMode}]));
  if(!activeSavedName&&ambienceDefinitions.some(p=>p.id===id)){
   archiveOverrides[id]={...currentScene,fog:currentScene.view.fog,artistVisible:currentScene.view.artistVisible,videoOn:currentScene.view.videoOn,flashes:currentScene.view.flashes,videoMode:currentScene.view.videoMode};
  }else{
   const index=archiveScenes.findIndex(s=>s.name===activeSavedName);
   currentScene.name=uniqueSceneName(currentScene.name,archiveScenes.filter((s,i)=>i!==index));
   if(index<0)archiveScenes.push(currentScene);else archiveScenes[index]=currentScene;
  }
  for(const [key,value] of Object.entries(archiveOverrides))archiveOverrides[key]={...value,view:overrideAsScene(key,value).view};
  return JSON.parse(JSON.stringify({format:'grand-remix-lighting',version:1,catalogueVersion:publishedLighting.catalogueVersion||1,geometryId,holdDuration:sanitizeSceneDuration($('#scene-hold').value),scenes:archiveScenes,presetOverrides:archiveOverrides,promotedSceneBackups}));
 }
 function importSettings(raw){
  // Validate the complete file first; preset IDs and saved-scene IDs update
  // known ambiences. Old files without IDs match their exact existing name.
  if(!raw||raw.format!=='grand-remix-lighting'||raw.version!==1||(raw.geometryId!==geometryId&&!compatibleGeometryIds.includes(raw.geometryId))||!Array.isArray(raw.scenes))throw Error('Format ou géométrie incompatible');
  if(raw.presetOverrides!==undefined&&(!raw.presetOverrides||typeof raw.presetOverrides!=='object'||Array.isArray(raw.presetOverrides)))throw Error('Ambiances invalides');
  if(raw.promotedSceneBackups!==undefined&&!Array.isArray(raw.promotedSceneBackups))throw Error('Archives invalides');
  for(const {id} of overrideDefinitions)if(Object.hasOwn(raw.presetOverrides||{},id)&&(!raw.presetOverrides[id]||typeof raw.presetOverrides[id]!=='object'||Array.isArray(raw.presetOverrides[id])))throw Error('Ambiance invalide : '+id);
  const input=migratePromotedLighting(JSON.parse(JSON.stringify(raw)),publishedLighting);
  const incoming=input.scenes.map(cleanScene),incomingOverrides=cleanOverrides(input.presetOverrides);
  const backups=(input.promotedSceneBackups||[]).map(cleanScene);
  if(!incoming.length&&!Object.keys(incomingOverrides).length){const count=raw.scenes.length+Object.keys(raw.presetOverrides||{}).length;if(count)return {added:0,updated:0,unchanged:count};throw Error('Aucune ambiance à importer');}
  const before={personalScenes,personalOverrides,promotedSceneBackups},activeSceneId=scenes.find(s=>s.name===activeSavedName)?.sceneId;
  const normalized=value=>Array.isArray(value)?value.map(normalized):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).filter(k=>k!=='sceneId').sort().map(k=>[k,normalized(value[k])])):value;
  const equal=(a,b)=>JSON.stringify(normalized(a))===JSON.stringify(normalized(b));
  const result={added:0,updated:0,unchanged:0};
  let nextScenes=[...personalScenes],nextOverrides={...personalOverrides};
  for(const [id,value] of Object.entries(incomingOverrides)){
   if(!ambienceDefinitions.some(p=>p.id===id)){incoming.push({...overrideAsScene(id,value),sceneId:'preset:'+id});continue;}
   if(equal(presetOverrides[id],value))result.unchanged++;else result.updated++;
   nextOverrides[id]=value;
  }
  for(const scene of incoming){
   const catalogue=mergeSceneCatalogue(publishedScenes,nextScenes);
   const existing=catalogue.find(s=>scene.sceneId&&s.sceneId===scene.sceneId)||catalogue.find(s=>s.name===scene.name&&(!scene.sceneId||!s.sceneId||scene.sceneId==='legacy:'+s.name));
   const next={...scene,sceneId:scene.sceneId||existing?.sceneId||'legacy:'+scene.name,
    name:uniqueSceneName(scene.name,catalogue.filter(s=>s!==existing))};
   if(existing){if(equal(existing,next))result.unchanged++;else result.updated++;nextScenes=replaceLocalScene(nextScenes,existing.name,next);}
   else{nextScenes.push(next);result.added++;}
  }
  if(mergeSceneCatalogue(publishedScenes,nextScenes).length>100)throw Error('Maximum 100 ambiances personnelles');
  personalScenes=nextScenes;
  personalOverrides=keepLocalPresetChanges(publishedOverrides,nextOverrides);presetOverrides={...publishedOverrides,...personalOverrides};
  const backupKeys=new Set(promotedSceneBackups.map(s=>JSON.stringify(s)));
  promotedSceneBackups=[...promotedSceneBackups,...backups.filter(s=>{const key=JSON.stringify(s);if(backupKeys.has(key))return false;backupKeys.add(key);return true;})];
  rebuildScenes();
  if(!persist()){({personalScenes,personalOverrides,promotedSceneBackups}=before);presetOverrides={...publishedOverrides,...personalOverrides};rebuildScenes();throw Error('Stockage navigateur indisponible ; aucune modification importée');}
  sceneList();onEdit();
  const currentView=capture(),savedIndex=scenes.findIndex(s=>activeSceneId?s.sceneId===activeSceneId:s.name===activeSavedName);
  if(savedIndex>=0)load(savedIndex);
  else if(incomingOverrides[currentView.ambience]){
   const next=overrideAsScene(currentView.ambience,presetOverrides[currentView.ambience]);
   next.view={...next.view,camera:currentView.camera,target:currentView.target,view:currentView.view};restoreTemporaryScene(next);
  }
  apply();return result;
 }
 const transferStatus=document.createElement('p');transferStatus.id='ambience-transfer-status';transferStatus.className='note';transferStatus.hidden=true;transferStatus.setAttribute('role','status');transferStatus.style.cssText='grid-column:1 / -1;font-size:10px;line-height:1.5;margin:7px 0 0';
 function transferMessage(message,section='export-settings'){status(message);document.querySelector('#'+section+' .sidebar-detail-body')?.appendChild(transferStatus);transferStatus.textContent=message;transferStatus.hidden=false;}
 $('#scene-export').textContent='Télécharger mes réglages';$('#scene-import-button').textContent='Importer des ambiances';
 $('#scene-export').onclick=()=>{try{const data=exportSettings(),a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download='Grand-Remix-Reglages.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);transferMessage('Réglages téléchargés, y compris les changements en cours.');}catch(err){transferMessage('Téléchargement impossible : '+err.message);}};
 $('#scene-import-button').onclick=()=>$('#scene-import').click();
 $('#scene-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>32*1024*1024)throw Error('Fichier trop volumineux (32 Mo maximum)');const result=importSettings(JSON.parse(await file.text()));transferMessage(result.updated+' mise(s) à jour · '+result.added+' nouvelle(s) · '+result.unchanged+' inchangée(s).','import-settings');}catch(err){transferMessage('Import impossible : '+err.message,'import-settings');}finally{e.target.value='';}};
 // simplifySidebar moves the ambience nodes later in this same task. Wait for
 // that arrangement, then move the existing buttons without new listeners.
 queueMicrotask(()=>{const exports=document.querySelector('#export-settings .sidebar-detail-body'),imports=document.querySelector('#import-settings .sidebar-detail-body');if(!exports||!imports)return;const previous=$('#scene-export').parentElement;exports.append($('#scene-export'),transferStatus);imports.append($('#scene-import-button'),$('#scene-import'));const backup=document.createElement('button');backup.id='scene-export-backup';backup.textContent='Télécharger mes réglages';backup.onclick=()=>{$('#scene-export').click();imports.appendChild(transferStatus);};imports.appendChild(backup);if(previous&&!previous.children.length)previous.remove();});
 const timelineHost=document.createElement('div');$('#fixture-type').after(timelineHost);
 timelineUI=createTimelineEditor({host:timelineHost,selectedFixture:selected,getTimeline:timeline,setTimeline:(f,value)=>{timelines={...timelines,[f.id]:sanitizeFixtureTimeline({...value,enabled:!f.notUsed&&value.enabled===true},f.kind)};},getCurrentSettings:f=>({fx:editorFx(f),color:editorColor(f)}),onSelectBlock:sync,onChange:edit,onPlayback:action=>{playing=false;held=0;$('#scene-play').textContent='Lire mes ambiances';onTimelinePlayback(action);},getPlayback:getTimelinePlayback});
 resetHistory();sceneList();sync();status(recoveredGeometry?'Scènes conservées d’une implantation précédente : vérifier les orientations avant lecture.':'Prêt : composer une ambiance, puis enregistrer une scène.');
 return {shiftPlaybackClock:ms=>{if(playing&&Number.isFinite(ms)&&ms>0)started+=ms;},fx,sync,captureCurrentScene,captureAmbienceSequence,restoreTemporaryScene,exportSettings,importSettings,saveAs,savePresetOverride,updateSaved,setSceneName:name=>{$('#scene-name').value=typeof name==='string'?name.slice(0,70):'';syncAddButton();},presetName:(id,fallback)=>presetOverrides[id]?.name||fallback,presetArtist:(id,fallback=true)=>presetOverrides[id]?.artistVisible??fallback,presetFog:(id,fallback)=>presetOverrides[id]?.fog??fallback,presetVideo:(id,fallback)=>presetOverrides[id]?.videoOn??fallback,presetFlashes:(id,fallback)=>presetOverrides[id]?.flashes??fallback,presetVideoMode:(id,fallback)=>presetOverrides[id]?.videoMode??fallback,hasPresetOverride:id=>Object.hasOwn(presetOverrides,id),hasTimeline:f=>!f.notUsed&&timeline(f).enabled,sample:(f,time,flashes=true)=>{const sampled=f.notUsed?null:sampleFixtureTimeline(timeline(f),time,f.kind,{flashes});timelineUI.updatePlayhead(f,sampled);return sampled;},sceneSummaries:()=>scenes.map((s,index)=>({index,name:s.name,shared:publishedScenes.some(p=>p.name===s.name)&&!personalScenes.some(p=>p.name===s.name)})),loadSaved:i=>{playing=false;$('#scene-play').textContent='Lire mes ambiances';load(i);persist();},applyPreset:p=>{activeSavedName=null;const saved=presetOverrides[p.id],source=saved||p;timelines=cleanTimelines(source.timelines);timelineUI?.resetSelection();playing=false;$('#scene-play').textContent='Lire mes ambiances';prefs=cleanPrefs(source.prefs);setColors(cleanColors(source.colors));$('#scene-hold').value=sanitizeSceneDuration(source.duration);if(source.view)restore({...source.view,ambience:p.id,videoMode:source.videoMode||p.videoMode||p.id,ambienceCustomized:false,elapsed:0},{preset:true});resetHistory();const persisted=persist();apply();sync();if(persisted)status('Ambiance : '+source.name+' · ajustable et enregistrable.');},select:f=>{$('#fixture-select').value=f.id;sync();},tick:now=>{if(!playing)return;const hold=sanitizeSceneDuration($('#scene-hold').value)*1000;if(now-started>=hold){current=(current+1)%scenes.length;load(current);started=now;status('Lecture : '+scenes[current].name+' · changements de scène en coupure');}},isPlaying:()=>playing};
}
