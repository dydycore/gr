// Rearrange the existing controls after their editors have attached listeners.
// Moving the nodes preserves the editor state, labels and event handlers.
export function simplifySidebar(){
 const side=document.querySelector('.side');
 if(!side||side.dataset.simplified==='true')return;
 const find=id=>document.getElementById(id);
 const ambience=find('ambience-buttons')?.closest('.section');
 const spot=find('color-editor'),fog=find('fog-editor'),saved=find('scene-editor');
 const room=find('room-reset')?.closest('.section');
 const video=find('video-toggle')?.closest('.section');
 if(!ambience||!spot||!room||!video)return;
 side.dataset.simplified='true';
 const original=[...side.children];
 const heading=(parent,text)=>{const el=document.createElement('p');el.className='eyebrow';el.textContent=text;parent.appendChild(el);return el;};
 const section=id=>{const el=document.createElement('section');el.className='section';el.id=id;return el;};
 const disclosure=(id,title,subtitle)=>{
  const el=document.createElement('details');el.id=id;el.className='sidebar-disclosure';
  const summary=document.createElement('summary');const text=document.createElement('span');text.className='disclosure-title';text.textContent=title;summary.appendChild(text);
  if(subtitle){const hint=document.createElement('span');hint.className='disclosure-hint';hint.textContent=subtitle;summary.appendChild(hint);}
  el.appendChild(summary);const body=document.createElement('div');body.className='sidebar-detail-body';el.appendChild(body);return {el,body};
 };
 const top=section('show-ambiences');heading(top,'Ambiances');
 top.appendChild(find('ambience-buttons'));
 // Personal saves are managed in Mes ambiances; keep the main list to eight ambiences.
 const savedCatalogue=document.createElement('div');savedCatalogue.hidden=true;top.appendChild(savedCatalogue);
 const savedHeading=heading(savedCatalogue,'Mes ambiances');savedHeading.id='saved-ambience-heading';savedHeading.hidden=true;
 const savedButtons=document.createElement('div');savedButtons.id='saved-ambience-buttons';savedButtons.className='ambience-buttons';savedCatalogue.appendChild(savedButtons);
 const actions=find('ambience-play').closest('.studio-actions');
 top.appendChild(actions);
 const saveShortcut=document.createElement('button');saveShortcut.id='ambience-save-shortcut';saveShortcut.textContent='Enregistrer mon ambiance';
 top.appendChild(find('ambience-time'));top.appendChild(find('ambience-status'));
 const commands=disclosure('command-settings','Commandes');
 const quick=section('quick-controls');commands.body.appendChild(quick);
 quick.appendChild(find('room-reset').closest('.studio-actions'));
 const videoActions=document.createElement('div');videoActions.className='video-actions';videoActions.appendChild(find('video-toggle'));quick.appendChild(videoActions);
 const spots=disclosure('spot-settings','Régler un spot','Cliquez sur un spot dans la salle');
 const ambienceEdit=section('ambience-edit');ambienceEdit.appendChild(saveShortcut);spots.body.appendChild(ambienceEdit);
 spots.body.appendChild(spot);spot.querySelector('.eyebrow')?.remove();
 const fogSection=disclosure('fog-settings','Brouillard','Arrêté au départ');
 if(fog){fogSection.body.appendChild(fog);fog.querySelector('.eyebrow')?.remove();}
 const scenes=disclosure('saved-scenes','Mes ambiances','Enregistrer et retrouver vos réglages');
 if(saved){scenes.body.appendChild(saved);saved.querySelector('.eyebrow')?.remove();}
 const display=disclosure('view-settings','Vue et repères','Intensité, faisceaux et affichage');
 // The ambience row now contains only the optional display controls and notes.
 ambience.querySelector('.eyebrow')?.remove();
 const ambienceNotes=[...ambience.children].filter(el=>el.matches('p.note'));
 for(const note of ambienceNotes)note.remove();
 display.body.appendChild(ambience);
 const technical=disclosure('technical-settings','Informations techniques','Écran, validation et plans');
 const exports=disclosure('export-settings','Exporter','Vidéo et sauvegarde des réglages');
 const imports=disclosure('import-settings','Importer','Charger des ambiances depuis un fichier');
 const used=new Set([ambience,spot,fog,saved,room,video]);
 for(const node of original)if(!used.has(node))technical.body.appendChild(node);
 // Keep technical nodes available to the scene's selection callbacks, without
 // exposing a second information panel. File exports belong in Exporter.
 const imageExports=technical.body.querySelector('#capture')?.closest('.section');if(imageExports)exports.body.appendChild(imageExports);
 technical.el.hidden=true;
 // Detailed operating help lives under the model on the site. Do not repeat
 // the room/reset paragraphs here; retain the hidden live projection status.
 const videoStatus=find('video-status');if(videoStatus){videoStatus.hidden=true;technical.body.appendChild(videoStatus);}
 side.replaceChildren(top,spots.el,fogSection.el,commands.el,scenes.el,display.el,exports.el,imports.el,technical.el);
 const help=document.createElement('a');help.id='maquette-info-link';help.href='index.html#maquette-info';help.target='_top';help.textContent='Info';help.setAttribute('aria-label','Info : comment utiliser la maquette');side.appendChild(help);
 help.onclick=event=>{if(window.parent!==window){event.preventDefault();window.parent.postMessage({type:'grand-remix-open-help'},location.origin);}};
 saveShortcut.onclick=()=>{scenes.el.open=true;find('scene-name')?.focus();};
 // Keep the location of the selected apparatus obvious when using the list.
 find('fixture-select')?.addEventListener('change',()=>{spots.el.open=true;});
}
