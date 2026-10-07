from pathlib import Path
import json,hashlib,math,shutil
root=Path(__file__).resolve().parent
pdf=root.parent/'pdf/grand_remix'
old=json.loads((root/'implantation.json').read_text(encoding='utf-8'))
assert old['revision']=='V08'
archive=root/'versions/V08';archive.mkdir(parents=True,exist_ok=True)
for name in ['implantation.json','Grand_Remix_3D.html','scene.js','index.template.html','PLAN_AVANT_CORRIGE.pdf']:
    shutil.copy2(root/name,archive/name)
d=json.loads(json.dumps(old));d['revision']='V09';d['screen']['x']=2.75
d['screen']['imageHeight']=1.52;d['screen']['imageWidth']=2.432
d['screen']['coverageMarginEachSide']=.01
d['projector']['x']=2.57;d['projector']['y']=-2.58
d.pop('geometryId');d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8').replace('V08','V09')
s=s.replace('Écran rentré de 82 cm vers le centre par rapport à V07. Plan sur le nez de scène. Bord droit à 82 cm du mur dans la maquette. Hauteur et accroches à valider.','Essai : écran déplacé de 5 cm à droite par rapport à V08. Plan sur le nez de scène, bord droit à 77 cm du mur. Gabarit agrandi de 1 cm autour du cercle pour le réglage du masque. Hauteur et accroches à valider.')
s=s.replace('Image native à produire : 2,40 × 1,50 m, masquée au cercle','Image native à produire : ${E.imageWidth.toFixed(3)} × ${E.imageHeight.toFixed(2)} m, masquée au cercle')
s=s.replace('Boîtier dans la salle, côté piste du comptoir.','Essai : boîtier déplacé de 2 cm à droite et 3 cm vers le fond depuis V08. Dégagements géométriques : 18,5 cm du comptoir, 6 cm du poteau. Ce ne sont pas des dégagements de refroidissement validés.')
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8').replace('Essai V08','Essai V09')
h=h.replace('Écran à droite, rentré de 82 cm vers le centre. Projecteur dans la salle, côté piste du bar.','Depuis V08 : écran +5 cm à droite ; projecteur +2 cm à droite et +3 cm vers le fond. Écran à 77 cm du mur, boîtier hors du comptoir modélisé.')
h=h.replace('2,40 × 1,50 m','2,432 × 1,52 m').replace('2,27 m','2,30 m')
h=h.replace('Image 16:10 : 1,50 × 1,60 = <b>2,40 m</b> de large. Diagonale : <b>111,425 pouces</b>. Masque circulaire de 1,50 m.','Essai : 1,52 × 1,60 = <b>2,432 m</b> de large. Diagonale : <b>112,911 pouces</b>. Marge de couverture de 1 cm en haut et en bas autour du cercle Ø 1,50 m, puis masque circulaire. Cette marge ne doit pas devenir un halo projeté hors écran.')
h=h.replace('1,89–2,36 m','1,92–2,39 m').replace('4,15–5,82 m','4,20–5,90 m')
h=h.replace('Bar et poteaux : cotes indicatives, à relever sur place.','Le gabarit complet ne garde qu’environ 1 cm de marge en plan près du bar : insuffisant pour garantir le montage avec des cotes approximatives. Bar et poteaux à relever sur place.')
(root/'index.template.html').write_text(h,encoding='utf-8')
s=(pdf/'build_plan_v08.py').read_text(encoding='utf-8').replace('V08','V09')
for a,b in [('x = +2,70','x = +2,75'),('x +2,70','x +2,75'),('x = +3,45','x = +3,50'),('x +3,45','x +3,50'),('0,82 m','0,77 m'),('x +2,55 ; y -2,55','x +2,57 ; y -2,58'),('0,21 m du bord','0,185 m du bord'),('2,27 m','2,30 m'),('corps 2,55 m','corps 2,58 m'),('corps à 2,55 m','corps à 2,58 m'),('2,55 - 0,28','2,58 - 0,28'),('Décentrement latéral 0,15 m','Décentrement latéral 0,18 m')]:s=s.replace(a,b)
s=s.replace('Une image 16:10 de 1,50 m de haut mesure 2,40 m de large avant masque.','Gabarit V09 : 2,432 x 1,52 m avant masque, soit 1 cm de marge verticale de chaque côté du cercle pour le réglage.')
s=s.replace('image native 16:10 de 2,40 x 1,50 m, puis masque circulaire. Diagonale = sqrt(2,40² + 1,50²)','gabarit 16:10 de 2,432 x 1,52 m : 1 cm en haut et en bas pour régler le masque circulaire, sans halo final. Diagonale = sqrt(2,432² + 1,52²)')
s=s.replace('Décentrement latéral 0,18 m et vertical 0,44 m à contrôler avec la lentille et son repère réel.','Décentrement latéral 0,18 m et vertical 0,44 m à contrôler avec la lentille et son repère réel. Depuis V08 : E1 +5 cm à droite ; P1 +2 cm à droite et +3 cm vers le fond.')
s=s.replace('Bar et poteaux sont approximatifs. Ne pas monter à partir de ces seuls tracés.','Bar et poteaux approximatifs. Gabarit complet à seulement 1 cm du bar en plan ; boîtier à 18,5 cm du comptoir et 6 cm du poteau. Marges trop faibles pour valider sur des cotes estimées. Ne pas monter à partir de ces seuls tracés.')
s=s.replace("poly([side(P1X,P1Y+P['lensForward'],P1Z-P['lensDown']),(xx,sy+3.3*ss),(xx,sy+1.8*ss)]", "poly([side(P1X,P1Y+P['lensForward'],P1Z-P['lensDown']),(xx,sy+(SCREEN_Z+E['imageHeight']/2)*ss),(xx,sy+(SCREEN_Z-E['imageHeight']/2)*ss)]")
s=s.replace('optique, refroidissement','optique, refroidissement')
(pdf/'build_plan_v09.py').write_text(s,encoding='utf-8')
check=(root/'check_geometry.py').read_text(encoding='utf-8').replace('V08','V09')
(root/'check_geometry.py').write_text(check,encoding='utf-8')
print('V09',d['geometryId'])
