from pathlib import Path
p=Path('ambiences.js');s=p.read_text(encoding='utf-8').replace("?.65+.35*smooth(0,3,t)","?.65+.35*smooth(0,3,t)*(1-smooth(23,25,t))").replace('windowPulse(local,0,10,1.2)','windowPulse(local,0,15,1.2)');p.write_text(s,encoding='utf-8')
p=Path('lighting-editor.js');s=p.read_text(encoding='utf-8').replace('onEdit=()=>{}})','onEdit=()=>{},onScenesChanged=()=>{}})')
old='<select id="fixture-wheel">${wheel.map(([n,c])=>`<option value="${c}">${n}</option>`).join(\'\')}</select>'
new='<div id="fixture-wheel-swatches" class="color-palette" role="group" aria-label="Couleurs de la lyre">${wheel.map(([n,c])=>`<button data-wheel-color="${c}" style="--swatch:${c}" aria-label="${n} · lyre" title="${n}" aria-pressed="false"></button>`).join(\'\')}</div>'
assert old in s;s=s.replace(old,new).replace('<label for="fixture-wheel" class="note">Roue de couleurs réelle · teintes approximatives</label>','<p class="note">Couleur</p>')
s=s.replace("$('#fixture-wheel').value=wheel.some(w=>w[1]===color)?color:wheel[0][1];","document.querySelectorAll('[data-wheel-color]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.wheelColor===color));document.querySelectorAll('[data-swatch]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.swatch===color));")
s=s.replace("$('#fixture-wheel').onchange=e=>color(e.target.value);","document.querySelectorAll('[data-wheel-color]').forEach(b=>b.onclick=()=>color(b.dataset.wheelColor));")
s=s.replace("$('#'+id).disabled=!scenes.length;}","$('#'+id).disabled=!scenes.length;onScenesChanged(scenes.map((s,index)=>({index,name:s.name})));}")
s=s.replace('return {fx,sync,applyPreset:',"return {fx,sync,sceneSummaries:()=>scenes.map((s,index)=>({index,name:s.name})),loadSaved:i=>{playing=false;$('#scene-play').textContent='Lire mes scènes';load(i);persist();},applyPreset:")
s=s.replace('Enregistrer une nouvelle scène','Enregistrer cette ambiance').replace('Nom de la nouvelle scène','Nom de l’ambiance').replace('<p class="eyebrow">Mes scènes</p>','<p class="eyebrow">Mes ambiances</p>').replace('value="6"></div><div class="studio-actions"><button id="scene-play"','value="25"></div><div class="studio-actions"><button id="scene-play"')
p.write_text(s,encoding='utf-8')
p=Path('scene.js');s=p.read_text(encoding='utf-8');s="import {simplifySidebar} from './sidebar-layout.js';\n"+s
s=s.replace("ambienceCustomized:false,ambiencePlaying:false,view:","ambienceCustomized:false,ambiencePlaying:false,savedAmbience:null,view:")
s=s.replace("$('#caption').textContent=ambienceDefinitions.find", "$('#caption').textContent=state.savedAmbience?.name||ambienceDefinitions.find")
s=s.replace("b.dataset.ambience===state.ambience","!state.savedAmbience&&b.dataset.ambience===state.ambience")
s=s.replace('state.ambience=p.id;state.ambienceCustomized=false;','state.ambience=p.id;state.savedAmbience=null;state.ambienceCustomized=false;')
s=s.replace('onEdit:()=>{state.ambienceCustomized=!!state.ambience;},','onScenesChanged:renderSavedAmbiences,onEdit:()=>{state.ambienceCustomized=!!state.ambience;state.savedAmbience=null;},')
s=s.replace('roomPreset:dark=>{state.ambience=null;', 'roomPreset:dark=>{state.savedAmbience=null;state.ambience=null;')
s=s.replace('restore:v=>{transition=null;elapsed=0;', 'restore:v=>{transition=null;state.savedAmbience=null;elapsed=0;')
s=s.replace('let dt=Math.min((now-last)/1000,.05);last=now;if(state.motion)elapsed+=dt;', 'const realDelta=last?Math.max(0,(now-last)/1000):0;let dt=Math.min(realDelta,.05);last=now;if(state.motion)elapsed+=realDelta;')
needle="applyRigView();\n$('#geometry-id')"
replacement='''function renderSavedAmbiences(items){const list=$('#saved-ambience-buttons');if(!list)return;list.replaceChildren();$('#saved-ambience-heading').hidden=!items.length;for(const item of items){const b=document.createElement('button');b.textContent=item.name;b.setAttribute('aria-pressed',String(state.savedAmbience?.index===item.index));b.onclick=()=>{lightingEditor.loadSaved(item.index);state.savedAmbience=item;renderSavedAmbiences(lightingEditor.sceneSummaries());applyMode();};list.appendChild(b);}}
simplifySidebar();renderSavedAmbiences(lightingEditor.sceneSummaries());
applyRigView();
$('#geometry-id')'''
assert needle in s;s=s.replace(needle,replacement)
p.write_text(s,encoding='utf-8')
