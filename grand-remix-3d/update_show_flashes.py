from pathlib import Path
p=Path('ambiences.js');s=p.read_text(encoding='utf-8').replace("on('103',power,color('Cyan'),{gobo:4,rotation:-10,movement:'sweep'","on('103',power,color('Cyan'),{gobo:4,rotation:-10,movement:'eight'").replace("on('104',power*.7,color('Magenta'),{gobo:6,rotation:6,movement:'sweep'","on('104',power*.7,color('Magenta'),{gobo:6,rotation:6,movement:'circle'")
s=s.replace('export function ambienceEnvelope(id,fixture,time){','export function ambienceEnvelope(id,fixture,time,flashes=true){')
s=s.replace('return Math.max(windowPulse(local,0,15,1.2),windowPulse(t,16,23,1.1)*.9);', '''const holdAndChase=Math.max(windowPulse(local,0,15,1.2),windowPulse(t,16,23,1.1)*.9);
 if(flashes&&['102','103','105'].includes(fixture)&&['artist','dance','hiphop'].includes(id)){
  const start=id==='artist'?18:17,end=id==='hiphop'?21:20;
  if(t>=start&&t<end){const phase=(t-start)*2;return phase%1<.45?1:0;}
 }
 return holdAndChase;''')
p.write_text(s,encoding='utf-8')
p=Path('scene.js');s=p.read_text(encoding='utf-8').replace('savedAmbience:null,view:','savedAmbience:null,flashes:true,view:').replace('ambienceEnvelope(state.ambience,f.id,time)','ambienceEnvelope(state.ambience,f.id,time,state.flashes)')
s=s.replace("simplifySidebar();renderSavedAmbiences(lightingEditor.sceneSummaries());",'''simplifySidebar();renderSavedAmbiences(lightingEditor.sceneSummaries());
const flashRow=document.createElement('label');flashRow.className='row';flashRow.innerHTML='<span>Flashs</span><input id="show-flashes" type="checkbox" checked>';$('#ambience-time').before(flashRow);$('#show-flashes').onchange=e=>{state.flashes=e.target.checked;};''')
s=s.replace('capture:()=>({ambience:state.ambience,','capture:()=>({flashes:state.flashes,ambience:state.ambience,').replace('restore:v=>{transition=null;state.savedAmbience=null;',"restore:v=>{transition=null;state.flashes=v.flashes??true;if($('#show-flashes'))$('#show-flashes').checked=state.flashes;state.savedAmbience=null;")
p.write_text(s,encoding='utf-8')
p=Path('fixture-profiles.js');s=p.read_text(encoding='utf-8').replace('Prismes et strobe non simulés.','Prismes non simulés ; accents de flash approximatifs dans les ambiances.');p.write_text(s,encoding='utf-8')
p=Path('build-studio-appendix.py');s=p.read_text(encoding='utf-8').replace('avec une face stable. « Rejouer »','avec une face stable. Accents de flash courts (2 Hz) sur les lyres de salle ; case « Flashs » pour les couper. « Rejouer »');p.write_text(s,encoding='utf-8')
