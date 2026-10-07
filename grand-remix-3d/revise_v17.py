from pathlib import Path
import json,math,hashlib,shutil
root=Path(__file__).resolve().parent;pdf=root.parent/'pdf/grand_remix'
d=json.loads((root/'implantation.json').read_text(encoding='utf-8'));assert d['revision']=='V16'
a=root/'versions/V16';a.mkdir(exist_ok=True)
for f in ['implantation.json','scene.js','index.template.html','Grand_Remix_3D.html']:shutil.copy2(root/f,a/f)
shutil.copy2(pdf/'Grand_Remix_Plan_Technique_V16.pdf',a/'PLAN_AVANT_CORRIGE.pdf')
d['revision']='V17';d['screen']['x']=round(d['screen']['x']+.40,2)
source=(root/'revise_v16.py').read_text(encoding='utf-8')
exec(source[source.index("e=d['screen'];H="):source.index("d['lightingProtection']=")])
for f in d['fixtures']:
    if f['kind']=='moving':f['focus']['role']='ARTISTE / PISTE'
d['status']='ECRAN +40 CM DROITE - FOCUS LX RECALCULE - POINT VIDEO NON VALIDE'
d.pop('geometryId');d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8').replace('V16','V17')
s=s.replace('Ensemble E1/P1 rapproché de 30 cm vers le centre pour dégager le bar et le poteau.','Depuis V16 : écran seul décalé de 40 cm vers la droite vue public. Hauteur et recul conservés. Projecteur au repère provisoire précédent, décalage horizontal de 40 cm non validé avec la lentille de la salle.')
s=s.replace('Axe aligné sur E1','Axe décalé de 40 cm par rapport à E1')
s=s.replace('Alignement horizontal : 0,00 m','Décalage horizontal : 0,40 m non validé')
s=s.replace('Lyres fixes pendant la vidéo ; déplacements avec dimmer fermé.\\nRepère','Cible slam (x,y,z) : ${f.focus.slamTarget.join(" ; ")} m ; cible danse : ${f.focus.danceTarget.join(" ; ")} m.\\nLyres fixes pendant la vidéo ; déplacements avec dimmer fermé.\\nRepère')
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8').replace('V16','V17')
h=h.replace('E1 et P1 déplacés de 30 cm vers le centre pour dégager le bar et le poteau.','Écran seul décalé de 40 cm vers la droite depuis V16 : centre x +2,35 m, bord à 0,92 m du mur droit (0,87 m avec réserve). Projecteur conservé au repère provisoire, décentrement 0,40 m à revalider.')
h=h.replace('projecteur aligné sur E1','projecteur décalé de 40 cm par rapport à E1')
h=h.replace('Axe horizontal aligné','Décentrement horizontal 0,40 m non validé')
h=h.replace('Gabarit cible à environ 21 cm du comptoir et 28 cm du poteau en plan.','L’ancien gabarit B4 arrive à environ 1,5 cm du comptoir en plan : marge insuffisante pour figer ce point approximatif. Position vidéo à reprendre avec la lentille réelle.')
(root/'index.template.html').write_text(h,encoding='utf-8')
s=(pdf/'build_plan_v16.py').read_text(encoding='utf-8').replace('V16','V17')
for old,new in [('E1 : centre x = +1,95','E1 : centre x = +2,35'),('Écran x +1,95','Écran x +2,35'),('x +1,95 ; y +0,807','x +2,35 ; y +0,807'),('Bord droit x +2,95','Bord droit x +3,35'),('bord droit x = +2,95','bord droit x = +3,35'),('1,32 m du mur','0,92 m du mur'),('mur à 1,32 m','mur à 0,92 m'),('Alignement horizontal : 0,00 m','Décentrement horizontal : 0,40 m non validé'),('E1 et P1 rapprochés de 0,30 m vers le centre pour dégager le bar et le poteau.','Depuis V16 : E1 seul décalé de 0,40 m vers la droite ; recul et hauteur conservés. P1 reste provisoire.'),('P1 proposé à x +1,95 m, dans l’axe d’E1.','P1 provisoire à x +1,95 m, décalé de 0,40 m par rapport à E1.'),('gabarit à environ 0,21 m du comptoir et 0,28 m du poteau en plan','ancien gabarit à environ 0,015 m du comptoir en plan : marge insuffisante, point vidéo à reprendre')]:s=s.replace(old,new)
s=s.replace("['Appareils','Destination','Slam + vidéo','Danse + vidéo']","['Appareils','Destination','Slam + vidéo','Danse + vidéo']")
s=s.replace('Allumé = état proposé après réglage du focus.','Cibles au sol : artiste x 0 / y +1,10 ; DJ x -3,00 / y +1,80. Piste : voir flèches du plan. Allumé = état proposé après réglage du focus.')
s=s.replace('faire bouger','orienter')
(pdf/'build_plan_v17.py').write_text(s,encoding='utf-8')
print(d['geometryId'])
print('Slam OFF:',[f['id'] for f in d['fixtures'] if not f['focus']['slamOn']])
print('Danse OFF:',[f['id'] for f in d['fixtures'] if not f['focus']['danceOn']])
