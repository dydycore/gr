from pathlib import Path
import json,hashlib,re,shutil
root=Path(__file__).resolve().parent;pdf=root.parent/'pdf/grand_remix'
base=root/'versions/V10'
d=json.loads((base/'implantation.json').read_text(encoding='utf-8'))
d['revision']='V12';d['projector']['x']=round(d['projector']['x']-1,2)
d['status']='ESSAI PROJECTEUR A GAUCHE - DECENTREMENT OPTIQUE NON VALIDE'
d.pop('geometryId');d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(base/'scene.js').read_text(encoding='utf-8').replace('V10','V12')
s=s.replace('Écran déplacé de 50 cm vers le DJ depuis V09.','Écran conservé à la position V10 ; seul le projecteur est déplacé dans cet essai.')
s=s.replace('Boîtier déplacé de 50 cm vers le DJ depuis V09, avec le même recul et le même décentrement par rapport à l’écran. Dégagements géométriques : 68,5 cm du comptoir, 56 cm du poteau.','Boîtier déplacé de 1 m vers la gauche depuis V10 ; déplacement de 65 cm à droite annulé. Décalage latéral par rapport au centre écran : 1,18 m. Ce décentrement important reste à valider avec la lentille. Dégagements géométriques : 1,685 m du comptoir, 1,56 m du poteau.')
s=s.replace('Optique courte compatible en distance : ET-DLE085 (non confirmée sur place)','Recul seul dans la plage ET-DLE085 ; décentrement latéral 1,18 m NON validé')
(root/'scene.js').write_text(s,encoding='utf-8')
h=(base/'index.template.html').read_text(encoding='utf-8').replace('Essai V10','Essai V12')
h=h.replace('Depuis V09 : écran et projecteur déplacés ensemble de 50 cm vers le DJ, à gauche vue public. Écran à 1,27 m du mur droit.','Déplacement de 65 cm à droite annulé. Depuis V10 : projecteur seul déplacé de 1 m vers la gauche vue public. Écran conservé, à 1,27 m du mur droit. Décalage latéral projecteur/écran : 1,18 m, à valider optiquement.')
h=h.replace('Le gabarit complet garde environ 51 cm de marge en plan près du bar modélisé.','Le gabarit complet garde environ 1,21 m de marge en plan près du bar modélisé. Le fort décentrement latéral de 1,18 m ne constitue pas une projection optiquement validée.')
(root/'index.template.html').write_text(h,encoding='utf-8')
s=(pdf/'build_plan_v10.py').read_text(encoding='utf-8').replace('V10','V12')
s=s.replace('x +2,07','x +1,07').replace('0,685 m','1,685 m')
s=s.replace('Décentrement latéral 0,18 m','Décentrement latéral 1,18 m')
s=s.replace('Depuis V09 : E1 et P1 déplacés ensemble de 50 cm vers le DJ, à gauche vue public.','Essai de 65 cm à droite annulé. Depuis V10 : P1 seul déplacé de 1 m à gauche ; E1 conservé. Le fort décentrement latéral n’est pas validé.')
s=s.replace('Gabarit complet à environ 51 cm du bar en plan ; boîtier à 68,5 cm du comptoir et 56 cm du poteau.','Gabarit complet à environ 1,21 m du bar en plan ; boîtier à 1,685 m du comptoir et 1,56 m du poteau.')
s=s.replace('compatible en distance avec ET-DLE085 seulement parmi les deux exemples calculés page 4.','recul seul dans la plage ET-DLE085 ; décentrement latéral 1,18 m non validé.')
(pdf/'build_plan_v12.py').write_text(s,encoding='utf-8')
check=(root/'check_geometry.py').read_text(encoding='utf-8').split('previous=json.loads')[0].replace('V10','V12')
check+="\nprevious=json.loads((root/'versions/V10/implantation.json').read_text(encoding='utf-8'))\nassert d['screen']==previous['screen']\nassert abs(d['projector']['x']-previous['projector']['x']+1)<1e-9\nassert d['projector']['y']==previous['projector']['y']\nassert d['projector']['z']==previous['projector']['z']\nprint('Projecteur -1 m depuis V10, ecran conserve, essai droite annule : OK')\n"
(root/'check_geometry.py').write_text(check,encoding='utf-8')
print(d['geometryId'])
