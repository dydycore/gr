import {profiles,wheel,sanitizeFx} from './fixture-profiles.js';
import {createGoboPreview} from './gobo-preview.js';
import {sanitizeFixtureTimeline,sampleFixtureTimeline} from './fixture-timeline.js';
import {createTimelineEditor} from './timeline-editor.js';
import {ambienceDefinitions} from './ambiences.js';
import publishedLighting from './published-lighting.json';
import {mergeSceneCatalogue,keepLocalSceneChanges,keepLocalPresetChanges,replaceLocalScene} from './published-lighting-state.mjs';
const $=s=>document.querySelector(s),key='grand-remix-lighting-studio-v1';
const hex=v=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v);
export const sanitizeSceneDuration=value=>value!==null&&value!==''&&Number.isFinite(Number(value))?Math.max(2,Math.min(30,Number(value))):25;
const goboNames=['Ouvert','Couronne de points','Spirale à 5 branches','Spirale à 3 branches','Rayons pointillés','Quatre disques','Ondes','Anneaux entrelacés'];
const movementChoices=[['static','Fixe','M32 12v40M12 32h40'],['sweep','Balayage','M10 32h44m-8-8 8 8-8 8M18 24l-8 8 8 8'],['tilt','Vertical','M32 10v44m-8-8 8 8 8-8M24 18l8-8 8 8'],['circle','Ellipse','M52 32a20 12 0 1 1-6-8m0-8v8h8'],['eight','Huit','M32 32C7 4 0 54 21 43L43 21C64 10 57 60 32 32']];
export function createLightingEditor({fixtures,colors,getColors,setColors,apply,capture,restore,select,defaultAngles,geometryId,compatibleGeometryIds=[],roomPreset,onEdit=()=>{},onScenesChanged=()=>{},onSceneSelected=()=>{},onTimelinePlayback=()=>{},getTimelinePlayback=()=>true}){
 let timelineUI=null,timelines={},presetOverrides={},personalOverrides={},publishedOverrides={};
 let recoveredGeometry=false;let prefs={},scenes=[],personalScenes=[],publishedScenes=[],playing=false,started=0,current=0,held=0,savedHoldDuration=25;
 const defaultFx=f=>sanitizeFx({dimmer:['S6','112'].includes(f.id)?0:f.id==='201'?45:100,...(f.id==='112'?{zoom:12}: {})},f.kind);
 const cleanPrefs=raw=>Object.fromEntries(fixtures.map(f=>[f.id,raw?.[f.id]?sanitizeFx(raw[f.id],f.kind):defaultFx(f)]));
 const cleanColors=raw=>Object.fromEntries(fixtures.filter(f=>hex(raw?.[f.id])).map(f=>[f.id,profiles[f.kind].color==='gel'?(raw[f.id]==='#000000'?'#000000':'#ffffff'):f.kind==='moving'&&!wheel.some(w=>w[1]===raw[f.id])&&raw[f.id]!=='#000000'?'#ffffff':raw[f.id].toLowerCase()]));
 const emptyTimelines=Object.fromEntries(fixtures.map(f=>[f.id,sanitizeFixtureTimeline(null,f.kind)]));
 const cleanTimelines=raw=>Object.fromEntries(fixtures.filter(f=>raw?.[f.id]).map(f=>[f.id,sanitizeFixtureTimeline({...raw[f.id],enabled:!f.notUsed&&raw[f.id].enabled===true},f.kind)]));
 const cleanFog=raw=>raw&&typeof raw==='object'?{on:raw.on===true,rate:Number.isFinite(raw.rate)?Math.max(.05,Math.min(1,raw.rate)):.35}:null;
 // Preserve retired overrides in exports without bringing retired buttons back.
 const overrideDefinitions=[...ambienceDefinitions,{id:'slam_blue',name:'Slam · nuit bleue'},{id:'slam_amber',name:'Slam · ambre et rythme'},{id:'artist',name:'Premier artiste'},{id:'slam_white',name:'Slam · pulsation blanche'},{id:'dance',name:'Danse · duo contrasté'}];
 const cleanOverrides=raw=>Object.fromEntries(overrideDefinitions.filter(p=>raw?.[p.id]&&typeof raw[p.id]==='object').map(p=>{const saved=raw[p.id];return [p.id,{name:typeof saved.name==='string'?saved.name.slice(0,70):p.name,duration:sanitizeSceneDuration(saved.duration),prefs:cleanPrefs(saved.prefs),colors:cleanColors(saved.colors),timelines:cleanTimelines(saved.timelines),fog:cleanFog(saved.fog),artistVisible:typeof saved.artistVisible==='boolean'?saved.artistVisible:undefined,videoOn:typeof saved.videoOn==='boolean'?saved.videoOn:undefined,flashes:typeof saved.flashes==='boolean'?saved.flashes:undefined}];}));
 const timeline=f=>timelines[f.id]||emptyTimelines[f.id];
 const cleanScene=s=>{if(!s||typeof s.name!=='string'||!s.view||!['setup','slam','dance'].includes(s.view.mode)||!Array.isArray(s.view.camera)||s.view.camera.length!==3||!s.view.camera.every(Number.isFinite)||!Array.isArray(s.view.target)||s.view.target.length!==3||!s.view.target.every(Number.isFinite))throw Error('Scène invalide');return {name:s.name.slice(0,70),duration:sanitizeSceneDuration(s.duration),prefs:cleanPrefs(s.prefs),colors:cleanColors(s.colors),timelines:cleanTimelines(s.timelines),view:{...s.view,artistVisible:s.view.artistVisible!==false,level:Math.max(.1,Math.min(1,Number(s.view.level)||.75))}};};
 // Load published presets first. Older local saves become personal overrides,
 // so an update to the public version won't be masked by identical cached copies.
 if(publishedLighting.geometryId===geometryId){
  publishedOverrides=cleanOverrides(publishedLighting.presetOverrides);
  publishedScenes=(publishedLighting.scenes||[]).map(cleanScene);
  savedHoldDuration=sanitizeSceneDuration(publishedLighting.holdDuration);
 }else console.warn('Les ambiances publiques ne correspondent pas à cette géométrie.',publishedLighting.geometryId,geometryId);
 const rebuildScenes=()=>{scenes=mergeSceneCatalogue(publishedScenes,personalScenes);};
 try{
  const data=JSON.parse(localStorage.getItem(key)||'null');
  if(data?.version===1){
   recoveredGeometry=data.geometryId!==geometryId;
   savedHoldDuration=sanitizeSceneDuration(data.holdDuration);
   personalOverrides=keepLocalPresetChanges(publishedOverrides,cleanOverrides(data.presetOverrides));
   personalScenes=keepLocalSceneChanges(publishedScenes,Array.isArray(data.scenes)?data.scenes.slice(0,100).map(cleanScene):[]);
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
 function persist(){try{localStorage.setItem(key,JSON.stringify({version:1,geometryId,holdDuration:sanitizeSceneDuration($('#scene-hold')?.value??savedHoldDuration),prefs,timelines,presetOverrides:personalOverrides,scenes:personalScenes}));status('Modifications personnelles conservées dans ce navigateur.');return true;}catch{status('Sauvegarde navigateur indisponible. Télécharger le fichier de scènes.');return false;}}
 $('#color-editor').innerHTML=`<p class="eyebrow">Créer une ambiance</p><label class="note" for="fixture-select">Cliquer sur un spot en 3D ou choisir son numéro</label><select id="fixture-select" aria-label="Spot à régler"></select><p class="note" id="fixture-outline-legend"><span style="color:#b99adb">Mauve : allumé</span> · <span style="color:#62ef9b">vert : sélectionné</span></p><p class="note" id="fixture-type"></p><div class="row"><label for="fixture-dimmer">Intensité du spot</label><output id="dimmer-value"></output></div><input class="slider" id="fixture-dimmer" type="range" min="0" max="100" value="100"><div id="free-color"><div class="row"><label for="fixture-color">Couleur / gélatine</label><input id="fixture-color" type="color" value="#ffffff"></div><div class="color-palette">${[['Blanc','#ffffff'],['Ambre','#ffcc88'],['Rouge','#ff3030'],['Rose','#ff4dbe'],['Violet','#a066ff'],['Bleu','#3478ff'],['Turquoise','#32e0d0'],['Vert','#50e580']].map(([name,c])=>`<button data-swatch="${c}" style="--swatch:${c}" aria-label="${name}" title="${name}"></button>`).join('')}</div></div><div id="white-color"><button id="fixture-white">Blanc — allumer</button></div><div id="wheel-color"><p class="note">Couleur</p><div id="fixture-wheel-swatches" class="color-palette" role="group" aria-label="Couleurs de la lyre">${wheel.map(([n,c])=>`<button data-wheel-color="${c}" style="--swatch:${c}" aria-label="${n} · lyre" title="${n}" aria-pressed="false"></button>`).join('')}</div></div><button id="fixture-black" aria-label="Noir — éteindre ce spot">● Noir — éteindre</button><p class="note" id="fixture-color-value"></p><details id="moving-controls" open><summary>Mouvement et gobos</summary><p class="note effect-grid-label">Mouvement de la lyre</p><input id="fixture-movement" type="hidden" value="static"><div id="movement-choices" class="movement-choices" role="group" aria-label="Mouvement de la lyre">${movementChoices.map(([value,name,path])=>`<button type="button" data-movement="${value}" aria-label="Mouvement : ${name}" aria-pressed="false"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="${path}"/></svg><span>${name}</span></button>`).join('')}</div><p class="note effect-grid-label">Motif du gobo</p><input id="fixture-gobo" type="hidden" value="0"><div id="gobo-choices" class="gobo-choices" role="group" aria-label="Motif du gobo">${goboNames.map((name,i)=>`<button type="button" data-gobo="${i}" aria-label="${i?i+' · ':''}${name}" aria-pressed="false" title="${name}"><canvas width="128" height="128" aria-hidden="true"></canvas><span>${i?i:'Ouvert'}</span></button>`).join('')}</div><div class="row"><label for="fixture-pan">Pan · orientation</label><output id="pan-value"></output></div><input class="slider" id="fixture-pan" type="range" min="-270" max="270" step="1"><div class="row"><label for="fixture-tilt">Tilt · inclinaison</label><output id="tilt-value"></output></div><input class="slider" id="fixture-tilt" type="range" min="-135" max="135" step="1"><p class="note">Angles de la maquette, zéro vers le bas. Réglages DMX à calibrer au montage.</p><div class="row"><label for="fixture-zoom">Zoom</label><output id="zoom-value"></output></div><input class="slider" id="fixture-zoom" type="range" min="10" max="23" step=".5"><div class="row"><label for="fixture-rotation">Rotation gobo</label><output id="rotation-value"></output></div><input class="slider" id="fixture-rotation" type="range" min="-30" max="30" value="0"><div class="row"><label for="fixture-amplitude">Amplitude</label><output id="amplitude-value"></output></div><input class="slider" id="fixture-amplitude" type="range" min="0" max="45" value="15"><div class="row"><label for="fixture-period">Durée d’un cycle</label><output id="period-value"></output></div><input class="slider" id="fixture-period" type="range" min="3" max="30" value="8"></details><p class="note" id="color-fixture-note" role="status"></p><button id="color-reset">Rétablir ce spot</button><details><summary>Capacités et source</summary><p class="note" id="fixture-spec"></p><a id="fixture-source" target="_blank" rel="noopener">Documentation ↗</a></details>`;

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
 function roomAction(dark){timelines={};timelineUI?.resetSelection();playing=false;$('#scene-play').textContent='Lire mes scènes';prefs=dark?Object.fromEntries(fixtures.map(f=>[f.id,sanitizeFx({dimmer:f.id==='201'?45:0},f.kind)])):{};setColors({'201':'#b8fff2'});roomPreset(dark);const saved=persist();apply();if(saved)status(dark?'Noir spectacle, bar et poste DJ allumés. Le spot 201 reste réglable.':'Salle réinitialisée : blanc à 100 %, poste DJ turquoise pâle à 45 %, S6 et 112 éteints, brouillard OFF. Scènes conservées.');}
 $('#room-reset').onclick=()=>roomAction(false);$('#room-blackout').onclick=()=>roomAction(true);
 const scenePanel=document.createElement('div');scenePanel.className='section';scenePanel.id='scene-editor';scenePanel.innerHTML=`<p class="eyebrow">Mes ambiances</p><label class="note" for="scene-name">Nom de l’ambiance</label><input id="scene-name" maxlength="70" placeholder="Ex. Slam — ambre doux"><button id="scene-save">Enregistrer cette ambiance</button><select id="scene-list" aria-label="Scènes enregistrées"></select><div class="studio-actions"><button id="scene-load">Afficher</button><button id="scene-update">Remplacer</button></div><div class="row"><label for="scene-hold">Durée par scène</label><input id="scene-hold" type="number" min="2" max="30" value="${savedHoldDuration}"></div><div class="studio-actions"><button id="scene-play">Lire mes scènes</button><button id="scene-stop">Arrêter</button></div><p id="scene-status" class="note" role="status"></p><div class="studio-actions"><button id="scene-export">Télécharger</button><button id="scene-import-button">Importer</button></div><input id="scene-import" type="file" accept="application/json,.json" hidden><p class="note">Les ambiances officielles sont publiées pour tous. Vos changements restent personnels tant qu'ils ne sont pas réintégrés à GitHub. Export JSON disponible ; aucun pilotage de console. PDF V18 inchangé. Les spots traditionnels sont limités au blanc : gélatines non confirmées.</p>`;$('#color-editor').after(scenePanel);
 $('#scene-hold').onchange=()=>{savedHoldDuration=sanitizeSceneDuration($('#scene-hold').value);$('#scene-hold').value=savedHoldDuration;persist();};
 for(const f of fixtures){const option=document.createElement('option');option.value=f.id;option.textContent=f.id+' · '+profiles[f.kind].label+(f.notUsed?' · NON UTILISÉ':'');$('#fixture-select').appendChild(option);f.g.userData.details.fixtureId=f.id;}
 function sceneList(){const old=$('#scene-list').value;$('#scene-list').replaceChildren();scenes.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+' · '+s.name+(publishedScenes.some(p=>p.name===s.name)&&!personalScenes.some(p=>p.name===s.name)?' · partagée':'');$('#scene-list').appendChild(o);});if(scenes[Number(old)])$('#scene-list').value=old;for(const id of ['scene-load','scene-update','scene-play'])$('#'+id).disabled=!scenes.length;$('#scene-export').disabled=!scenes.length&&!Object.keys(presetOverrides).length;onScenesChanged(scenes.map((s,index)=>({index,name:s.name,shared:publishedScenes.some(p=>p.name===s.name)&&!personalScenes.some(p=>p.name===s.name)})));}
 function sync(){const f=selected(),p=profiles[f.kind],s=editorFx(f),base=defaultAngles(f),color=editorColor(f);$('#fixture-type').textContent=f.notUsed?'NON UTILISÉ · boîtier rouge de repérage':p.motorized?'Lyre motorisée · couleurs par roue':f.kind==='sl1'?'Panneau LED fixe · effet stroboscope':p.color==='gel'?'Appareil fixe · blanc ou éteint':'Appareil fixe · couleur LED';$('#free-color').hidden=p.color!=='rgb';$('#white-color').hidden=false;$('#wheel-color').hidden=p.color!=='wheel';$('#moving-controls').hidden=!p.motorized;$('#fixture-color').value=color;$('#fixture-color-value').textContent=color.toUpperCase();document.querySelectorAll('[data-wheel-color]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.wheelColor===color));document.querySelectorAll('[data-swatch]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.swatch===color));for(const [name,value,unit] of [['dimmer',f.notUsed?0:s.dimmer,'%'],['pan',s.pan??base.pan,'°'],['tilt',s.tilt??base.tilt,'°'],['zoom',s.zoom,'°'],['rotation',s.rotation,'°/s'],['amplitude',s.amplitude,'°'],['period',s.period,'s']]){$('#fixture-'+name).value=value;$('#'+name+'-value').textContent=Math.round(value*10)/10+' '+unit;}$('#fixture-gobo').value=s.gobo;$('#fixture-movement').value=s.movement;document.querySelectorAll('[data-gobo]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.gobo)===s.gobo));document.querySelectorAll('[data-movement]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.movement===s.movement));for(const el of $('#color-editor').querySelectorAll('input,button,select'))if(el.id!=='fixture-select')el.disabled=!!f.notUsed;$('#fixture-spec').textContent=(f.notUsed?'Conservé à sa place. Aucune émission pendant cet événement. ':'')+p.note;$('#fixture-source').href=p.url;$('#color-fixture-note').textContent=f.previewBlocked?'Faisceau coupé dans la simulation : réserve de l’écran ou extinction V18.':p.color==='gel'?'Blanc ou éteint ; gélatines non confirmées.':'Prévisualisation active · couleur écran approximative.';timelineUI?.sync();}
 function edit(){onEdit();playing=false;$('#scene-play').textContent='Lire mes scènes';persist();apply();sync();}
 $('#fixture-select').onchange=()=>{select(selected());sync();};
 for(const name of ['dimmer','pan','tilt','zoom','gobo','rotation','amplitude','period','movement'])$('#fixture-'+name).addEventListener('input',e=>{const f=selected(),raw={...editorFx(f),[name]:name==='movement'?e.target.value:Number(e.target.value)};writeFx(f,raw);edit();});
 function color(value,forceWhite=false){const f=selected(),previous=editorColor(f),settings=editorFx(f);let dimmer=settings.dimmer;if(forceWhite||previous==='#000000'||dimmer===0)dimmer=100;if(value==='#000000')dimmer=0;if(editableStep(f))updateStep(f,{color:value,fx:{...settings,dimmer}});else{prefs[f.id]={...settings,dimmer};setColors({...getColors(),[f.id]:value});}edit();}
 $('#fixture-black').onclick=()=>color('#000000');$('#fixture-white').onclick=()=>color('#ffffff',true);
 $('#fixture-color').oninput=e=>color(e.target.value);document.querySelectorAll('[data-wheel-color]').forEach(b=>b.onclick=()=>color(b.dataset.wheelColor));document.querySelectorAll('[data-swatch]').forEach(b=>b.onclick=()=>color(b.dataset.swatch));
 $('#color-reset').onclick=()=>{const f=selected();if(editableStep(f))updateStep(f,{fx:sanitizeFx({},f.kind),color:'#ffffff',transition:'cut',fadeIn:0,fadeOut:0,flashHz:0,flashPattern:'steady',flashOnly:false});else{delete prefs[f.id];const next={...getColors()};delete next[f.id];setColors(next);}edit();};
 function snapshot(name){const view=capture();return {name:name.slice(0,70),duration:sanitizeSceneDuration($('#scene-hold').value),prefs:cleanPrefs(prefs),colors:cleanColors(getColors()),timelines:cleanTimelines(timelines),view:{...view,artistVisible:view.artistVisible!==false}};}
 function load(i){const s=scenes[i];if(!s)return;timelines=cleanTimelines(s.timelines);timelineUI?.resetSelection();prefs=cleanPrefs(s.prefs);setColors(cleanColors(s.colors));restore(s.view);$('#scene-list').value=i;$('#scene-name').value=s.name;$('#scene-hold').value=sanitizeSceneDuration(s.duration);onSceneSelected({index:i,name:s.name});apply();status('Scène affichée : '+s.name);}
 function saveAs(rawName){
  const name=(typeof rawName==='string'?rawName.trim():'').slice(0,70)||'Scène '+(scenes.length+1);
  if(scenes.length>=100){status('Maximum 100 scènes : télécharger puis remplacer une scène.');return null;}
  const next=snapshot(name);personalScenes.push(next);rebuildScenes();
  if(!persist()){personalScenes.pop();rebuildScenes();return null;}
  sceneList();const index=scenes.indexOf(next);$('#scene-list').value=index;$('#scene-name').value=name;
  const item={index,name};onSceneSelected(item);apply();status('Enregistrée localement : '+name);return item;
 }
 $('#scene-save').onclick=()=>saveAs($('#scene-name').value);
 $('#scene-load').onclick=()=>{playing=false;$('#scene-play').textContent='Lire mes scènes';load(Number($('#scene-list').value));persist();};
 function updateSaved(i,name){
  if(!scenes[i])return false;
  const previous=personalScenes;const oldName=scenes[i].name;
  const next=snapshot(typeof name==='string'&&name.trim()?name.trim():oldName);
  personalScenes=replaceLocalScene(personalScenes,oldName,next);rebuildScenes();
  if(!persist()){personalScenes=previous;rebuildScenes();return false;}
  sceneList();$('#scene-list').value=scenes.indexOf(next);status('Scène personnalisée dans ce navigateur.');return true;
 }
 $('#scene-update').onclick=()=>updateSaved(Number($('#scene-list').value),$('#scene-name').value);
 function savePresetOverride(id,name){const definition=ambienceDefinitions.find(p=>p.id===id);if(!definition)return false;const view=capture();presetOverrides={...presetOverrides,[id]:{name:typeof name==='string'&&name.trim()?name.trim().slice(0,70):definition.name,duration:sanitizeSceneDuration($('#scene-hold').value),prefs:cleanPrefs(prefs),colors:cleanColors(getColors()),timelines:cleanTimelines(timelines),fog:cleanFog(view.fog),artistVisible:view.artistVisible!==false,videoOn:view.videoOn!==false,flashes:view.flashes!==false}};const oldPersonal=personalOverrides;
  personalOverrides=keepLocalPresetChanges(publishedOverrides,{...personalOverrides,[id]:presetOverrides[id]});
  presetOverrides={...publishedOverrides,...personalOverrides};
  const saved=persist();if(!saved){personalOverrides=oldPersonal;presetOverrides={...publishedOverrides,...personalOverrides};}
  sceneList();if(saved)status('Ambiance personnalisée ici : '+presetOverrides[id].name);return saved;}
 $('#scene-play').onclick=()=>{if(playing){held=performance.now()-started;playing=false;$('#scene-play').textContent='Reprendre';status('Enchaînement en pause ; animations contrôlées par Animation des effets.');}else if(scenes.length){if($('#scene-play').textContent!=='Reprendre'){current=Number($('#scene-list').value)||0;held=0;load(current);}started=performance.now()-held;playing=true;$('#scene-play').textContent='Pause';status('Lecture : '+scenes[current].name);}};
 $('#scene-stop').onclick=()=>{playing=false;held=0;$('#scene-play').textContent='Lire mes scènes';status('Lecture arrêtée.');};
 $('#scene-export').onclick=()=>{const data={format:'grand-remix-lighting',version:1,geometryId,scenes,presetOverrides};const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download='Grand-Remix-Scenes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};
 $('#scene-import-button').onclick=()=>$('#scene-import').click();
 $('#scene-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2e6)throw Error('Fichier trop volumineux');const data=JSON.parse(await file.text());if(data.format!=='grand-remix-lighting'||data.version!==1||(data.geometryId!==geometryId&&!compatibleGeometryIds.includes(data.geometryId))||!Array.isArray(data.scenes))throw Error('Format ou géométrie incompatible');
   const incoming=data.scenes.map(cleanScene),incomingOverrides=cleanOverrides(data.presetOverrides);
   const updatedLocal=keepLocalSceneChanges(publishedScenes,[...incoming,...personalScenes]);
   const updatedScenes=mergeSceneCatalogue(publishedScenes,updatedLocal);
   if(updatedScenes.length>100)throw Error('Maximum 100 scènes');
   personalScenes=updatedLocal;rebuildScenes();
   personalOverrides=keepLocalPresetChanges(publishedOverrides,{...incomingOverrides,...personalOverrides});
   presetOverrides={...publishedOverrides,...personalOverrides};
   sceneList();if(persist())status(incoming.length+' scène(s) importée(s). Les réglages publics restent inchangés.');}catch(err){status('Import impossible : '+err.message);}e.target.value='';};
 const timelineHost=document.createElement('div');$('#fixture-type').after(timelineHost);
 timelineUI=createTimelineEditor({host:timelineHost,selectedFixture:selected,getTimeline:timeline,setTimeline:(f,value)=>{timelines={...timelines,[f.id]:sanitizeFixtureTimeline({...value,enabled:!f.notUsed&&value.enabled===true},f.kind)};},getCurrentSettings:f=>({fx:editorFx(f),color:editorColor(f)}),onSelectBlock:sync,onChange:edit,onPlayback:action=>{playing=false;held=0;$('#scene-play').textContent='Lire mes scènes';onTimelinePlayback(action);},getPlayback:getTimelinePlayback});
 sceneList();sync();status(recoveredGeometry?'Scènes conservées d’une implantation précédente : vérifier les orientations avant lecture.':'Prêt : composer une ambiance, puis enregistrer une scène.');
 return {fx,sync,saveAs,savePresetOverride,updateSaved,setSceneName:name=>{$('#scene-name').value=typeof name==='string'?name.slice(0,70):'';},presetName:(id,fallback)=>presetOverrides[id]?.name||fallback,presetArtist:(id,fallback=true)=>presetOverrides[id]?.artistVisible??fallback,presetFog:(id,fallback)=>presetOverrides[id]?.fog??fallback,presetVideo:(id,fallback)=>presetOverrides[id]?.videoOn??fallback,presetFlashes:(id,fallback)=>presetOverrides[id]?.flashes??fallback,hasPresetOverride:id=>Object.hasOwn(presetOverrides,id),hasTimeline:f=>!f.notUsed&&timeline(f).enabled,sample:(f,time,flashes=true)=>{const sampled=f.notUsed?null:sampleFixtureTimeline(timeline(f),time,f.kind,{flashes});timelineUI.updatePlayhead(f,sampled);return sampled;},sceneSummaries:()=>scenes.map((s,index)=>({index,name:s.name,shared:publishedScenes.some(p=>p.name===s.name)&&!personalScenes.some(p=>p.name===s.name)})),loadSaved:i=>{playing=false;$('#scene-play').textContent='Lire mes scènes';load(i);persist();},applyPreset:p=>{const saved=presetOverrides[p.id],source=saved||p;timelines=cleanTimelines(source.timelines);timelineUI?.resetSelection();playing=false;$('#scene-play').textContent='Lire mes scènes';prefs=cleanPrefs(source.prefs);setColors(cleanColors(source.colors));$('#scene-hold').value=sanitizeSceneDuration(source.duration);const persisted=persist();apply();sync();if(persisted)status('Ambiance : '+source.name+' · ajustable et enregistrable.');},select:f=>{$('#fixture-select').value=f.id;sync();},tick:now=>{if(!playing)return;const hold=sanitizeSceneDuration($('#scene-hold').value)*1000;if(now-started>=hold){current=(current+1)%scenes.length;load(current);started=now;status('Lecture : '+scenes[current].name+' · changements de scène en coupure');}},isPlaying:()=>playing};
}
