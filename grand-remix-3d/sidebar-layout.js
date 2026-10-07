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
 const savedHeading=heading(top,'Mes ambiances');savedHeading.id='saved-ambience-heading';savedHeading.hidden=true;
 const savedButtons=document.createElement('div');savedButtons.id='saved-ambience-buttons';savedButtons.className='ambience-buttons';savedButtons.setAttribute('role','group');savedButtons.setAttribute('aria-label','Mes ambiances enregistrées');top.appendChild(savedButtons);
 const actions=find('ambience-play').closest('.studio-actions');
 top.appendChild(actions);
 const saveShortcut=document.createElement('button');saveShortcut.id='ambience-save-shortcut';saveShortcut.textContent='Enregistrer mon ambiance';top.appendChild(saveShortcut);
 top.appendChild(find('ambience-time'));top.appendChild(find('ambience-status'));
 const quick=section('quick-controls');heading(quick,'Commandes');
 quick.appendChild(find('room-reset').closest('.studio-actions'));
 const videoActions=document.createElement('div');videoActions.className='video-actions';videoActions.appendChild(find('video-toggle'));quick.appendChild(videoActions);
 const spots=disclosure('spot-settings','Régler un spot','Cliquez sur un spot dans la salle');
 spots.body.appendChild(spot);spot.querySelector('.eyebrow')?.remove();
 const fogSection=disclosure('fog-settings','Brouillard','Arrêté au départ');
 if(fog){fogSection.body.appendChild(fog);fog.querySelector('.eyebrow')?.remove();}
 const scenes=disclosure('saved-scenes','Mes scènes','Enregistrer et retrouver vos réglages');
 if(saved){scenes.body.appendChild(saved);saved.querySelector('.eyebrow')?.remove();}
 const display=disclosure('view-settings','Vue et repères','Intensité, faisceaux et affichage');
 // The ambience row now contains only the optional display controls and notes.
 ambience.querySelector('.eyebrow')?.remove();
 const ambienceNotes=[...ambience.children].filter(el=>el.matches('p.note'));
 for(const note of ambienceNotes)note.remove();
 display.body.appendChild(ambience);
 const technical=disclosure('technical-settings','Informations techniques','Équipements, implantation et documents');
 const used=new Set([ambience,spot,fog,saved,room,video]);
 for(const node of original)if(!used.has(node))technical.body.appendChild(node);
 const operationDetails=document.createElement('div');operationDetails.className='section';heading(operationDetails,'Repères de prévisualisation');
 for(const note of ambienceNotes)operationDetails.appendChild(note);
 const videoStatus=find('video-status');if(videoStatus){videoStatus.hidden=true;operationDetails.appendChild(videoStatus);}
 for(const note of room.querySelectorAll('p.note'))operationDetails.appendChild(note);
 technical.body.appendChild(operationDetails);
 side.replaceChildren(top,quick,spots.el,fogSection.el,scenes.el,display.el,technical.el);
 saveShortcut.onclick=()=>{scenes.el.open=true;find('scene-name')?.focus();};
 // Keep the location of the selected apparatus obvious when using the list.
 find('fixture-select')?.addEventListener('change',()=>{spots.el.open=true;});
}
