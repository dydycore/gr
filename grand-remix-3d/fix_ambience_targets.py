from pathlib import Path
p=Path('ambiences.js');s=p.read_text(encoding='utf-8').replace("description:'Visage blanc · gobos et couleurs en mouvement',mode:'slam'","description:'Visage blanc · gobos et couleurs en mouvement',mode:'dance'").replace("amplitude:8,period:7,zoom:20","amplitude:8,period:7,zoom:15");p.write_text(s,encoding='utf-8')
p=Path('scene.js');s=p.read_text(encoding='utf-8').replace("function showDetails(d){if(d.fixtureId){","function showDetails(d){if(d.fixtureId){const panel=$('#spot-settings');if(panel)panel.open=true;").replace("if(d.fog)$('#fog-editor').scrollIntoView", "if(d.fog){const panel=$('#fog-editor').closest('details');if(panel)panel.open=true;}if(d.fog)$('#fog-editor').scrollIntoView")
p.write_text(s,encoding='utf-8')
