import {TIMELINE_LIMITS,timelineDuration,previewFlashLimit} from './fixture-timeline.js';

const fmt=value=>Number(value.toFixed(2)).toLocaleString('fr-CA');
let nextBlockId=0;
const blockId=()=>`bloc-${Date.now().toString(36)}-${(++nextBlockId).toString(36)}`;

// This component edits sequence data. The scene clock drives playback elsewhere.
export function createTimelineEditor({host,selectedFixture,getTimeline,setTimeline,getCurrentSettings,onSelectBlock,onChange,onPlayback,getPlayback}){
 const selectedBlocks=new Map();
 const section=document.createElement('section');section.id='fixture-timeline-editor';
 section.innerHTML=`<div class="row timeline-heading"><span>Séquence du spot</span><label class="timeline-enable"><input type="checkbox" id="timeline-enabled">Activer la séquence</label></div>
 <div id="timeline-content" hidden>
 <div id="timeline-blocks" role="group" aria-label="Blocs de la séquence"></div>
 <p id="timeline-editing" class="note"></p><p id="timeline-playhead" class="note" aria-live="off"></p>
 <div class="timeline-actions"><button type="button" id="timeline-restart">Rejouer</button><button type="button" id="timeline-pause">Pause</button></div>
 <div class="timeline-actions"><button type="button" id="timeline-add">Ajouter</button><button type="button" id="timeline-duplicate">Dupliquer</button><button type="button" id="timeline-remove">Retirer</button></div>
 <div class="timeline-order"><button type="button" id="timeline-left" aria-label="Déplacer le bloc vers la gauche">←</button><button type="button" id="timeline-right" aria-label="Déplacer le bloc vers la droite">→</button><span id="timeline-total" class="note"></span></div>
 <div class="row"><label for="timeline-duration">Durée du bloc</label><div class="timeline-duration-field"><input id="timeline-duration" type="number" min="${TIMELINE_LIMITS.minDuration}" max="${TIMELINE_LIMITS.maxDuration}" step=".25" value="2" aria-label="Durée du bloc en secondes"><span>s</span></div></div>
 <div class="timeline-choice-row" role="group" aria-label="Durées rapides">${[.5,1,2,4,8].map(s=>`<button type="button" data-block-duration="${s}" aria-label="Durée : ${fmt(s)} secondes">${fmt(s)} s</button>`).join('')}</div>
 <div class="timeline-choice-line"><span>Transition</span><div class="timeline-choice-row" role="group" aria-label="Transition du bloc"><button type="button" data-block-transition="cut">Coupe</button><button type="button" data-block-transition="fade">Fondu</button></div></div>
 <div class="row" id="timeline-fade-in-row"><label for="timeline-fade-in">Fade-in (s)</label><input class="timeline-fade-input" id="timeline-fade-in" type="number" min="0" max="30" step=".25" value=".5"></div>
 <div class="row"><label for="timeline-fade-out">Fade-out (s)</label><input class="timeline-fade-input" id="timeline-fade-out" type="number" min="0" max="30" step=".25" value="0"></div>
 <div class="timeline-choice-line"><span>Flash</span><div class="timeline-choice-row" role="group" aria-label="Flash du bloc"><button type="button" data-block-flash="0">Sans flash</button><button type="button" data-block-flash="1">1 Hz</button><button type="button" data-block-flash="2">2 Hz</button><button type="button" data-block-flash="4" hidden>4 Hz</button><button type="button" data-block-flash="8" hidden>8 Hz</button></div></div>
 <div class="timeline-choice-line"><div class="timeline-choice-row" role="group" aria-label="Rythme des flashs"><button type="button" data-block-flash-pattern="steady">Régulier</button><button type="button" data-block-flash-pattern="random">Variable ~5 s</button></div></div>
 <div class="row" id="timeline-flash-only-row" hidden><label for="timeline-flash-only">Allumer seulement les accents</label><input id="timeline-flash-only" type="checkbox"></div>
 <p id="timeline-message" class="note" role="status"></p></div>`;
 host.appendChild(section);
 const $=id=>section.querySelector('#'+id);
 if(!document.getElementById('timeline-editor-styles')){
  const style=document.createElement('style');style.id='timeline-editor-styles';style.textContent=`
  #fixture-timeline-editor{padding:12px 0 16px;margin:14px 0 18px;border-top:1px solid #43515a;border-bottom:1px solid #43515a}
  #fixture-timeline-editor .timeline-heading{display:block;margin:0;font-size:12px;font-weight:500}
  .timeline-enable{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:11px;font-weight:400}
  #timeline-content{padding-top:12px}#timeline-blocks{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:3px 2px 9px}
  #timeline-blocks button{min-width:0;aspect-ratio:1;padding:4px;text-align:center;position:relative;background:var(--block-color);border:1px solid #7d8c93;border-radius:6px;line-height:1.3;color:var(--block-ink,#f3f8fa)}
  #timeline-blocks button>strong{display:block;font-size:10px}#timeline-blocks button>span{display:block;font-size:10px;color:inherit}
  #timeline-blocks button[aria-pressed=true]{outline:2px solid #73e8ae;outline-offset:2px;background:var(--block-color);color:var(--block-ink,#f3f8fa)}
  #timeline-blocks button[data-playing=true]::after{content:'';position:absolute;bottom:2px;left:5px;right:5px;height:3px;border-radius:2px;background:#cbabf6;transform:scaleX(var(--block-progress,1));transform-origin:left}
  #timeline-editing,#timeline-playhead{margin:5px 0;font-size:10px;line-height:1.45}#timeline-playhead{color:#c9b3e7;font-variant-numeric:tabular-nums;min-height:14px}
  .timeline-actions,.timeline-order,.timeline-choice-row{display:flex;gap:5px}.timeline-actions{margin:10px 0 7px}.timeline-actions button{flex:1;padding:7px 5px;font-size:10px}.timeline-order{align-items:center}.timeline-order button{padding:4px 10px;font-size:14px}.timeline-order .note{margin:0 0 0 auto;font-size:10px}
  .timeline-duration-field{display:flex;align-items:center;gap:5px}#timeline-duration,.timeline-fade-input{max-width:76px;padding:6px;border:1px solid #62737d;border-radius:5px;background:#111c24;color:#edf5f5;font-size:12px}
  .timeline-choice-row button{flex:1;padding:6px 4px;font-size:10px;white-space:nowrap}.timeline-choice-row button[aria-pressed=true]{background:#33634e;color:#ecfff3;border-color:#8ddebb}
  .timeline-choice-line{margin-top:12px}.timeline-choice-line>span{display:block;margin-bottom:7px;font-size:11px;color:#c6d3d9}#timeline-message{font-size:10px;margin:8px 0 0}#timeline-message:empty{display:none}
  #fixture-timeline-editor button:disabled{opacity:.4;cursor:default}
  `;document.head.appendChild(style);
 }
 const current=()=>{const f=selectedFixture();return {f,t:getTimeline(f)};};
 $('timeline-restart').onclick=()=>{onPlayback('restart');sync();};
 $('timeline-pause').onclick=()=>{onPlayback(getPlayback()?'pause':'resume');sync();};
 function index(f,t){return Math.min(Math.max(0,selectedBlocks.get(f.id)||0),Math.max(0,t.steps.length-1));}
 function step(){const {f,t}=current();return t.enabled?t.steps[index(f,t)]||null:null;}
 function remember(f,i){selectedBlocks.set(f.id,Math.max(0,i));}
 function commit(raw,i,notice=''){const f=selectedFixture();setTimeline(f,raw);if(i!==undefined)remember(f,i);onChange();sync();if(notice)$('timeline-message').textContent=notice;}
 function patch(values){const {f,t}=current(),i=index(f,t);if(!t.steps[i])return;if(values.duration!==undefined)values={...values,duration:Math.max(TIMELINE_LIMITS.minDuration,Math.min(TIMELINE_LIMITS.maxDuration,values.duration,TIMELINE_LIMITS.maxTotalDuration-timelineDuration(t)+t.steps[i].duration))};commit({...t,steps:t.steps.map((s,n)=>n===i?{...s,...values}:s)},i);}
 function makeStep(settings){return {id:blockId(),duration:2,transition:'cut',flashHz:0,flashPattern:'steady',flashOnly:false,color:settings.color,fx:{...settings.fx}};}
 $('timeline-enabled').onchange=()=>{const {f,t}=current();commit({...t,enabled:$('timeline-enabled').checked,steps:t.steps.length?t.steps:[makeStep(getCurrentSettings(f))]},0);};
 $('timeline-add').onclick=()=>{const {f,t}=current(),remaining=TIMELINE_LIMITS.maxTotalDuration-timelineDuration(t);if(t.steps.length>=TIMELINE_LIMITS.maxSteps||remaining<TIMELINE_LIMITS.minDuration)return;const i=index(f,t),steps=[...t.steps],added=makeStep(getCurrentSettings(f));added.duration=Math.min(added.duration,remaining);steps.splice(i+1,0,added);commit({...t,enabled:true,steps},i+1);};
 $('timeline-duplicate').onclick=()=>{const {f,t}=current(),i=index(f,t),remaining=TIMELINE_LIMITS.maxTotalDuration-timelineDuration(t);if(!t.steps[i]||t.steps.length>=TIMELINE_LIMITS.maxSteps||remaining<TIMELINE_LIMITS.minDuration)return;const steps=[...t.steps];steps.splice(i+1,0,{...steps[i],id:blockId(),duration:Math.min(steps[i].duration,remaining),fx:{...steps[i].fx}});commit({...t,steps},i+1);};
 $('timeline-remove').onclick=()=>{const {f,t}=current(),i=index(f,t),steps=t.steps.filter((s,n)=>n!==i);commit({...t,enabled:!!steps.length,steps},Math.max(0,i-1));};
 for(const [id,offset] of [['timeline-left',-1],['timeline-right',1]])$(id).onclick=()=>{const {f,t}=current(),i=index(f,t),other=i+offset;if(other<0||other>=t.steps.length)return;const steps=[...t.steps];[steps[i],steps[other]]=[steps[other],steps[i]];commit({...t,steps},other);};
 $('timeline-duration').onchange=()=>{const value=Number($('timeline-duration').value);if(Number.isFinite(value)&&value>0)patch({duration:value});else sync();};
 for(const [id,key] of [['timeline-fade-in','fadeIn'],['timeline-fade-out','fadeOut']])$(id).onchange=()=>{const value=Number($(id).value);if(Number.isFinite(value)&&value>=0)patch({[key]:value,...(key==='fadeIn'?{transition:'fade'}:{})});else sync();};
 $('timeline-flash-only').onchange=()=>patch({flashOnly:$('timeline-flash-only').checked});
 for(const [attribute,key] of [['block-duration','duration'],['block-transition','transition'],['block-flash','flashHz'],['block-flash-pattern','flashPattern']]){
  section.querySelectorAll('[data-'+attribute+']').forEach(button=>button.onclick=()=>{const raw=button.getAttribute('data-'+attribute),value=key==='transition'||key==='flashPattern'?raw:Number(raw);patch({[key]:value,...(key==='transition'&&value==='fade'&&!step()?.fadeIn?{fadeIn:Math.min(.5,(step()?.duration||2)/2)}:{}),...(key==='flashPattern'&&value==='random'&&!step()?.flashHz?{flashHz:2}:{})});});
 }
 let lastRender='',lastPlayhead='';
 function sync(){
  const {f,t}=current(),i=index(f,t),s=t.steps[i];remember(f,i);$('timeline-enabled').checked=t.enabled;$('timeline-enabled').disabled=!!f.notUsed;$('timeline-content').hidden=!t.enabled;
  $('timeline-pause').textContent=getPlayback()?'Pause':'Reprendre';$('timeline-pause').disabled=!!f.notUsed;$('timeline-restart').disabled=!!f.notUsed;
  section.querySelectorAll('[data-block-flash]').forEach(b=>b.hidden=Number(b.dataset.blockFlash)>previewFlashLimit(f.kind));
  const signature=JSON.stringify([f.id,t,i]);
  if(signature!==lastRender){lastRender=signature;lastPlayhead='';$('timeline-playhead').textContent='';$('timeline-blocks').replaceChildren();
   t.steps.forEach((block,n)=>{const b=document.createElement('button');b.type='button';b.dataset.blockIndex=n;b.setAttribute('aria-pressed',String(n===i));b.setAttribute('aria-label',`Bloc ${n+1}, ${fmt(block.duration)} secondes`);b.title=`Bloc ${n+1} · ${fmt(block.duration)} s`;const fill=block.fx.dimmer===0?'#27333c':block.color;b.style.setProperty('--block-color',fill);const brightness=[1,3,5].map((p,i)=>parseInt(fill.slice(p,p+2),16)*[.2126,.7152,.0722][i]).reduce((a,b)=>a+b,0);b.style.setProperty('--block-ink',brightness>145?'#102018':'#f3f8fa');
    const label=document.createElement('strong');label.textContent=n+1;const duration=document.createElement('span');duration.textContent=fmt(block.duration)+' s';b.append(label,duration);b.onclick=()=>{remember(f,n);onSelectBlock();sync();};$('timeline-blocks').appendChild(b);
   });
  }
  $('timeline-total').textContent=t.steps.length+'/'+TIMELINE_LIMITS.maxSteps+' blocs · '+fmt(timelineDuration(t))+'/'+TIMELINE_LIMITS.maxTotalDuration+' s';$('timeline-editing').textContent=s?`Bloc ${i+1} : modifiez les réglages ci-dessous.`:'';
  $('timeline-message').textContent=t.steps.length>=TIMELINE_LIMITS.maxSteps?TIMELINE_LIMITS.maxSteps+' blocs maximum.':timelineDuration(t)>=TIMELINE_LIMITS.maxTotalDuration?TIMELINE_LIMITS.maxTotalDuration+' secondes maximum.':'';
  $('timeline-add').disabled=!!f.notUsed||t.steps.length>=TIMELINE_LIMITS.maxSteps||TIMELINE_LIMITS.maxTotalDuration-timelineDuration(t)<TIMELINE_LIMITS.minDuration;
  $('timeline-duplicate').disabled=$('timeline-add').disabled||!s;$('timeline-remove').disabled=!!f.notUsed||!s;$('timeline-left').disabled=!!f.notUsed||i===0;$('timeline-right').disabled=!!f.notUsed||i>=t.steps.length-1;
  $('timeline-duration').value=s?.duration??2;$('timeline-duration').disabled=!!f.notUsed||!s;
  $('timeline-fade-in-row').hidden=s?.transition!=='fade';$('timeline-fade-in').value=s?.fadeIn??0;$('timeline-fade-out').value=s?.fadeOut??0;
  for(const id of ['timeline-fade-in','timeline-fade-out']){$(id).max=s?.duration??TIMELINE_LIMITS.maxDuration;$(id).disabled=!!f.notUsed||!s;}
  $('timeline-flash-only-row').hidden=s?.flashPattern!=='random';$('timeline-flash-only').checked=s?.flashOnly===true;$('timeline-flash-only').disabled=!!f.notUsed||!s;
  for(const [attribute,key] of [['block-duration','duration'],['block-transition','transition'],['block-flash','flashHz'],['block-flash-pattern','flashPattern']])section.querySelectorAll('[data-'+attribute+']').forEach(b=>{b.disabled=!!f.notUsed||!s;b.setAttribute('aria-pressed',String(String(s?.[key])===b.getAttribute('data-'+attribute)));});
 }
 function updatePlayhead(f,sample){
  if(f.id!==selectedFixture().id)return;
  if(!sample){if(lastPlayhead!=='off'){$('timeline-playhead').textContent='';section.querySelectorAll('[data-playing]').forEach(b=>b.removeAttribute('data-playing'));lastPlayhead='off';}return;}
  const stamp=`${f.id}:${sample.stepIndex}:${Math.floor(sample.localTime*10)}`;if(stamp===lastPlayhead)return;lastPlayhead=stamp;
  const t=getTimeline(f),s=t.steps[sample.stepIndex];$('timeline-playhead').textContent=`Lecture : bloc ${sample.stepIndex+1} · ${fmt(sample.localTime)} / ${fmt(s?.duration||0)} s`;
  section.querySelectorAll('[data-block-index]').forEach(b=>{const playing=Number(b.dataset.blockIndex)===sample.stepIndex;b.dataset.playing=String(playing);if(playing)b.style.setProperty('--block-progress',Math.min(1,sample.localTime/Math.max(.25,s?.duration||1)));});
 }
 return {sync,step,index:()=>{const {f,t}=current();return index(f,t);},updatePlayhead,resetSelection:()=>{selectedBlocks.clear();lastRender='';}};
}
