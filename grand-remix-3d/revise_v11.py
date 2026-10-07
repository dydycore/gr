from pathlib import Path
import json,hashlib,shutil
root=Path(__file__).resolve().parent;pdf=root.parent/'pdf/grand_remix'
d=json.loads((root/'implantation.json').read_text(encoding='utf-8'));assert d['revision']=='V10'
a=root/'versions/V10';a.mkdir(parents=True,exist_ok=True)
for f in ['implantation.json','Grand_Remix_3D.html','scene.js','index.template.html','PLAN_AVANT_CORRIGE.pdf']:shutil.copy2(root/f,a/f)
d['revision']='V11';d['screen']['x']=2.90;d['projector']['x']=2.72
d['status']='ESSAI DEMANDE - CONFLIT AVEC POTEAU MODELISE';d['projector']['spatialConflict']='Chevauchement poteau indicatif : 9 cm lateralement et 3,5 cm en profondeur'
d.pop('geometryId');d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8').replace('V10','V11')
s=s.replace('Écran déplacé de 50 cm vers le DJ depuis V09. Plan sur le nez de scène, bord droit à 1,27 m du mur droit.','Écran déplacé de 65 cm à droite depuis V10, vue public. Plan sur le nez de scène, bord droit à 62 cm du mur droit.')
s=s.replace('Boîtier déplacé de 50 cm vers le DJ depuis V09, avec le même recul et le même décentrement par rapport à l’écran. Dégagements géométriques : 68,5 cm du comptoir, 56 cm du poteau.','Boîtier déplacé de 65 cm à droite depuis V10. CONFLIT dans la maquette : chevauchement du poteau de 9 cm latéralement et 3,5 cm en profondeur. Seulement 3,5 cm entre boîtier et comptoir. Position de test demandée, pas un montage validé.')
s=s.replace('P1 · ESSAI HORS BAR','P1 · CONFLIT POTEAU').replace('Optique inconnue · montage non validé','CONFLIT GÉOMÉTRIQUE · essai uniquement')
s=s.replace("mat('#bec7c9',.45),projector,'Corps_indicatif'","mat('#d46f68',.45),projector,'Corps_indicatif_conflit_poteau'")
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8').replace('Essai V10','Essai V11 · conflit poteau')
h=h.replace('Depuis V09 : écran et projecteur déplacés ensemble de 50 cm vers le DJ, à gauche vue public. Écran à 1,27 m du mur droit.','Depuis V10 : écran et projecteur déplacés ensemble de 65 cm à droite vue public. Écran à 62 cm du mur droit. Le projecteur rouge chevauche le poteau indicatif : essai demandé, montage non validé.')
h=h.replace('Le gabarit complet garde environ 51 cm de marge en plan près du bar modélisé. Cela reste un contrôle de maquette avec des cotes indicatives.','Le gabarit complet empiète d’environ 14 cm sur l’emprise du bar en vue de dessus. Le boîtier chevauche le poteau modélisé de 9 cm latéralement et 3,5 cm en profondeur. Ces conflits doivent être résolus avant montage.')
(root/'index.template.html').write_text(h,encoding='utf-8')
s=(pdf/'build_plan_v10.py').read_text(encoding='utf-8').replace('V10','V11')
for old,new in [('x = +2,25','x = +2,90'),('x +2,25','x +2,90'),('x = +3,00','x = +3,65'),('Bord droit x +3,00','Bord droit x +3,65'),('1,27 m','0,62 m'),('x +2,07','x +2,72'),('0,685 m','0,035 m')]:s=s.replace(old,new)
s=s.replace('POUR VALIDATION DT','ESSAI - CONFLIT POTEAU')
s=s.replace('Hors comptoir dans la maquette.','Conflit avec poteau modélisé.').replace('P1 hors du bar modélisé.','P1 chevauche le poteau modélisé.').replace('Hors comptoir modélisé.','Conflit poteau modélisé.')
s=s.replace('Depuis V09 : E1 et P1 déplacés ensemble de 50 cm vers le DJ, à gauche vue public.','Depuis V10 : E1 et P1 déplacés ensemble de 65 cm à droite vue public.')
s=s.replace('Gabarit complet à environ 51 cm du bar en plan ; boîtier à 68,5 cm du comptoir et 56 cm du poteau. Contrôle géométrique de maquette, sans validation des cotes réelles.','CONFLIT : boîtier chevauchant le poteau de 9 cm latéralement et 3,5 cm en profondeur. Gabarit complet empiétant sur 14 cm de l’emprise du bar en plan ; boîtier à seulement 3,5 cm du comptoir. Essai demandé, non validé pour montage. Cotes architecturales indicatives.')
(pdf/'build_plan_v11.py').write_text(s,encoding='utf-8')
print(d['geometryId'])
