from pathlib import Path
p=Path(__file__).with_name('index.template.html')
s=p.read_text(encoding='utf-8')
s=s.replace('<input id="public" type="checkbox" checked>','<input id="public" type="checkbox">')
s=s.replace('<div class="row"><label for="motion">','<div class="row"><label for="route">Trajet depuis la coulisse</label><input id="route" type="checkbox" checked></div><button id="entrance" style="width:100%;font-size:12px">Voir l’entrée de l’artiste</button><div class="row"><label for="motion">')
s=s.replace('Reconstitution métrique de la scène et du parterre. Volumes techniques simplifiés, escaliers et régie indicatifs.','Reconstitution métrique de la scène et du parterre, avec le bar, le parquet et les éléments visibles sur les photos. Détails architecturaux, escaliers et régie indicatifs.')
s=s.replace('Les loges et le lobby ne sont pas modélisés.','Les loges au sous-sol et le lobby ne sont pas modélisés. L’entrée en coulisse et le trajet de l’artiste sont proposés, à confirmer.')
p.write_text(s,encoding='utf-8')
