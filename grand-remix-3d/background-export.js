// Render a frozen copy of the chosen settings in its own document. The visible
// studio never needs to play, change preset, or write a temporary saved scene.
const CHANNEL='grand-remix-video-export-v1';
import {createExportPlan} from './export-sequence.js';
export const isVideoExportDocument=()=>new URLSearchParams(location.search).has('export-video');

export function installBackgroundExport({capture,isSequence=()=>false,onBusy=()=>{}}){
 const parent=document.querySelector('#export-settings .sidebar-detail-body');if(!parent)return;
 const section=document.createElement('div');section.className='video-export';
 section.innerHTML='<button id="record-ambience" type="button">Créer une vidéo d’ambiance</button><p id="record-status" class="note" role="status"></p><div class="studio-actions"><button id="record-cancel" type="button" hidden>Annuler</button><a id="record-download" hidden>Télécharger la vidéo</a></div>';
 parent.appendChild(section);
 const button=section.querySelector('#record-ambience'),status=section.querySelector('#record-status'),cancel=section.querySelector('#record-cancel'),download=section.querySelector('#record-download');
 const overlay=document.createElement('div');overlay.id='video-export-overlay';overlay.hidden=true;
 overlay.innerHTML='<div class="video-export-card"><h2>Création de la vidéo</h2><p>L’aperçu est en pause pendant la création.</p><progress max="1" aria-label="Progression de la vidéo"></progress><p class="video-export-progress" role="status">Préparation…</p><button type="button">Annuler la création</button></div>';
 (document.querySelector('.view')||document.body).appendChild(overlay);
 const overlayProgress=overlay.querySelector('progress'),overlayStatus=overlay.querySelector('.video-export-progress');
 const style=document.createElement('style');style.textContent='#video-export-overlay{position:absolute;inset:0;z-index:50;display:grid;place-items:center;padding:22px;background:#07151cbd}#video-export-overlay[hidden]{display:none}.video-export-card{max-width:420px;width:100%;padding:30px;border:1px solid #6eaca6;border-radius:14px;background:#13272f;color:#eefafa;text-align:center;box-shadow:0 14px 50px #0005}.video-export-card h2{margin:0 0 14px;font-size:24px;font-weight:600}.video-export-card p{font-size:14px;line-height:1.6;color:#bfd5dc}.video-export-card progress{display:block;width:100%;height:12px;margin:24px 0 12px;accent-color:#aee8d7}.video-export-card button{margin-top:12px}.video-export-progress{font-variant-numeric:tabular-nums;min-height:24px}';document.head.appendChild(style);
 let task=null,resultUrl=null;
 const modeHint=()=>{if(!task)status.textContent=isSequence()?'Les huit ambiances seront enregistrées dans l’ordre, depuis le début, avec leurs fondus. Sans son.':'Ambiance actuelle · 30 s maximum · sans son. Pour tout enregistrer, activer Lire les ambiances.';};
 modeHint();const modeObserver=new MutationObserver(modeHint);const playButton=document.querySelector('#ambience-play');if(playButton)modeObserver.observe(playButton,{childList:true,subtree:true});
 function cleanup(){if(task){clearTimeout(task.timer);task.frame.remove();task=null;}button.disabled=false;cancel.hidden=true;overlay.hidden=true;onBusy(false);}
 function fail(message){cleanup();status.textContent=message;}
 cancel.onclick=()=>fail('Création annulée. Vos réglages sont conservés.');
 overlay.querySelector('button').onclick=()=>cancel.click();
 button.onclick=()=>{
  if(task)return;
  let snapshot,plan;try{snapshot=capture();plan=createExportPlan(snapshot);}catch{fail('Les réglages de cette ambiance sont incomplets. Choisissez une ambiance puis réessayez.');return;}
  overlay.querySelector('h2').textContent=plan.scenes.length>1?'Création de la vidéo des '+plan.scenes.length+' ambiances':'Création de la vidéo';
  overlay.querySelector('p').textContent='L’aperçu est en pause · '+plan.durationSeconds+' secondes · sans son';
  const frame=document.createElement('iframe'),id=crypto.randomUUID();
  frame.title='Création vidéo en arrière-plan';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
  // Keep a real viewport for WebGL and the native decoder; no second window.
  frame.style.cssText='position:fixed;left:0;top:0;width:1280px;height:720px;border:0;opacity:0;pointer-events:none;z-index:-1';
  const url=new URL(location.href);url.searchParams.set('export-video','1');url.hash='';frame.src=url.href;
  task={id,frame,snapshot,timer:setTimeout(()=>fail('La vidéo n’a pas pu être terminée. Réessayez en gardant cet onglet ouvert.'),100000)};
  button.disabled=true;cancel.hidden=false;download.hidden=true;status.textContent='Préparation de la vidéo… L’aperçu reste en pause.';overlayStatus.textContent='Préparation…';overlayProgress.removeAttribute('value');overlay.hidden=false;onBusy(true);document.body.appendChild(frame);
 };
 window.addEventListener('message',event=>{
  if(!task||event.origin!==location.origin||event.source!==task.frame.contentWindow||event.data?.channel!==CHANNEL)return;
  const data=event.data;
  if(data.type==='ready'){task.frame.contentWindow.postMessage({channel:CHANNEL,type:'start',id:task.id,snapshot:task.snapshot},location.origin);return;}
  if(data.id!==task.id)return;
  if(data.type==='progress'){clearTimeout(task.timer);task.timer=setTimeout(()=>fail('La création de la vidéo s’est interrompue. Réessayez.'),60000);status.textContent=data.message;overlayStatus.textContent=data.message;if(Number.isFinite(data.ratio))overlayProgress.value=Math.max(0,Math.min(1,data.ratio));}
  else if(data.type==='error')fail(data.message||'Impossible de créer la vidéo.');
  else if(data.type==='complete'){
   if(!(data.blob instanceof Blob)||!data.blob.size){fail('Le fichier vidéo est vide. Réessayez.');return;}
   if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=URL.createObjectURL(data.blob);
   download.href=resultUrl;download.download=data.filename;download.textContent='Télécharger le '+data.format;download.hidden=false;
   cleanup();status.textContent='Vidéo '+data.format+' prête · '+Math.round(data.durationSeconds)+' s · '+(data.blob.size/1048576).toFixed(1)+' Mo';
   // The explicit link remains available if a browser blocks automatic saving.
   download.click();
  }
 });
 window.addEventListener('pagehide',()=>{modeObserver.disconnect();cleanup();if(resultUrl)URL.revokeObjectURL(resultUrl);});
 return {get active(){return !!task;}};
}

export function installExportRenderer({prepare,createRecorder,exportOffline,startLive=()=>{}}){
 let started=false,id=null;
 const post=data=>window.parent.postMessage({channel:CHANNEL,id,...data},location.origin);
 window.addEventListener('message',async event=>{
  if(started||event.source!==window.parent||event.origin!==location.origin||event.data?.channel!==CHANNEL||event.data.type!=='start')return;
  started=true;id=event.data.id;
  try{
   const options=await prepare(event.data.snapshot);
   if(exportOffline){
    const result=await exportOffline(options,progress=>post({type:'progress',ratio:progress.ratio,message:Math.round(progress.ratio*100)+' % · '+Math.min(options.durationSeconds,progress.timeSeconds).toFixed(0)+' / '+options.durationSeconds+' s'}));
    if(result){post({type:'complete',...result});return;}
   }
   const stopLive=startLive(error=>post({type:'error',message:error?.message||String(error)}));
   const recorder=createRecorder({
    onState:s=>{if(s.status==='recording')post({type:'progress',ratio:s.elapsedSeconds/options.durationSeconds,message:Math.floor(s.elapsedSeconds)+' / '+options.durationSeconds+' s'});},
    onError:error=>{stopLive?.();post({type:'error',message:error?.message||String(error)});},
    onComplete:result=>{stopLive?.();post({type:'complete',blob:result.blob,filename:result.filename,format:result.format,durationSeconds:result.durationSeconds});}
   });
   window.addEventListener('pagehide',()=>recorder.dispose(),{once:true});
   const support=recorder.getSupport();
   if(!support.supported)throw new Error(support.message||'L’enregistrement vidéo n’est pas disponible dans ce navigateur.');
   recorder.start({...options,autoDownload:false});
  }catch(error){post({type:'error',message:error?.message||'Impossible de créer la vidéo.'});}
 });
 post({type:'ready'});
}
