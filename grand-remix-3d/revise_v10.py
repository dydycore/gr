from pathlib import Path
import json,hashlib,shutil
root=Path(__file__).resolve().parent
pdf=root.parent/'pdf/grand_remix'
d=json.loads((root/'implantation.json').read_text(encoding='utf-8'))
assert d['revision']=='V09'
archive=root/'versions/V09';archive.mkdir(parents=True,exist_ok=True)
for name in ['implantation.json','Grand_Remix_3D.html','scene.js','index.template.html','PLAN_AVANT_CORRIGE.pdf']:
    shutil.copy2(root/name,archive/name)
d['revision']='V10';d['screen']['x']=2.25;d['projector']['x']=2.07
d.pop('geometryId');d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8').replace('V09','V10')
s=s.replace('Essai : écran déplacé de 5 cm à droite par rapport à V08. Plan sur le nez de scène, bord droit à 77 cm du mur.','Écran déplacé de 50 cm vers le DJ depuis V09. Plan sur le nez de scène, bord droit à 1,27 m du mur droit.')
s=s.replace('Essai : boîtier déplacé de 2 cm à droite et 3 cm vers le fond depuis V08. Dégagements géométriques : 18,5 cm du comptoir, 6 cm du poteau.','Boîtier déplacé de 50 cm vers le DJ depuis V09, avec le même recul et le même décentrement par rapport à l’écran. Dégagements géométriques : 68,5 cm du comptoir, 56 cm du poteau.')
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8').replace('Essai V09','Essai V10')
h=h.replace('Depuis V08 : écran +5 cm à droite ; projecteur +2 cm à droite et +3 cm vers le fond. Écran à 77 cm du mur, boîtier hors du comptoir modélisé.','Depuis V09 : écran et projecteur déplacés ensemble de 50 cm vers le DJ, à gauche vue public. Écran à 1,27 m du mur droit. Recul et marge noire autour de l’image conservés.')
h=h.replace('Le gabarit complet ne garde qu’environ 1 cm de marge en plan près du bar : insuffisant pour garantir le montage avec des cotes approximatives.','Le gabarit complet garde environ 51 cm de marge en plan près du bar modélisé. Cela reste un contrôle de maquette avec des cotes indicatives.')
(root/'index.template.html').write_text(h,encoding='utf-8')
s=(pdf/'build_plan_v09.py').read_text(encoding='utf-8').replace('V09','V10')
for a,b in [('x = +2,75','x = +2,25'),('x +2,75','x +2,25'),('x = +3,50','x = +3,00'),('x +3,50','x +3,00'),('0,77 m','1,27 m'),('x +2,57','x +2,07'),('0,185 m','0,685 m')]:s=s.replace(a,b)
s=s.replace('au coin avant droit','à l’avant droit')
s=s.replace('Depuis V08 : E1 +5 cm à droite ; P1 +2 cm à droite et +3 cm vers le fond.','Depuis V09 : E1 et P1 déplacés ensemble de 50 cm vers le DJ, à gauche vue public. Recul, hauteurs et bordure noire conservés.')
s=s.replace('Gabarit complet à seulement 1 cm du bar en plan ; boîtier à 18,5 cm du comptoir et 6 cm du poteau. Marges trop faibles pour valider sur des cotes estimées.','Gabarit complet à environ 51 cm du bar en plan ; boîtier à 68,5 cm du comptoir et 56 cm du poteau. Contrôle géométrique de maquette, sans validation des cotes réelles.')
(pdf/'build_plan_v10.py').write_text(s,encoding='utf-8')
s=(root/'check_geometry.py').read_text(encoding='utf-8').replace('V09','V10')
s += "\nprevious=json.loads((root/'versions/V09/implantation.json').read_text(encoding='utf-8'))\nfor name in ['screen','projector']:\n    assert abs(d[name]['x']-previous[name]['x']+.5)<1e-9\n    assert d[name]['y']==previous[name]['y'] and d[name]['z']==previous[name]['z']\nassert d['screen']['visibleBorder']==previous['screen']['visibleBorder']\nprint('Translation commune -0.50 m et recul/hauteurs/bordure conserves : OK')\n"
(root/'check_geometry.py').write_text(s,encoding='utf-8')
print(d['geometryId'])
