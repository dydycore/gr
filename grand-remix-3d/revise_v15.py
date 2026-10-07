from pathlib import Path
import json,hashlib,shutil,re
root=Path(__file__).resolve().parent;pdf=root.parent/'pdf/grand_remix'
d=json.loads((root/'implantation.json').read_text(encoding='utf-8'));assert d['revision']=='V14'
a=root/'versions/V14';a.mkdir(exist_ok=True)
for f in ['implantation.json','scene.js','index.template.html','Grand_Remix_3D.html','PLAN_AVANT_CORRIGE.pdf']:shutil.copy2(root/f,a/f)
d['revision']='V15';d['status']='ECRAN 2 M ESTIME - RESERVE 2.10 M - OPTION B4 AVEC OPTIQUE A CONFIRMER'
d['screen'].update(x=1.95,diameter=2.0,reservationDiameter=2.10,diameterStatus='Estime depuis photo ; non mesure',imageWidth=3.392,imageHeight=2.12,contentDiameter=1.98,coverageMarginEachSide=.06)
d['projector']['x']=1.95
d.pop('geometryId');d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8').replace('V14','V15')
s=s.replace('Bas à 1,30 m','Bas à 1,05 m').replace('bas 1,30 m, haut 2,80 m','bas 1,05 m, haut 3,05 m')
s=s.replace('Écran reculé sur la première barre :','Écran estimé à 2 m, réserve de place Ø 2,10 m. Ensemble E1/P1 rapproché de 30 cm vers le centre pour dégager le bar et le poteau. Écran sur la première barre :')
s=s.replace('Image visible Ø 1,48 m','Image visible Ø 1,98 m').replace('écran Ø 1,50 m','écran Ø 2,00 m estimé')
s=s.replace("label('E1 · Ø 1,50 m'","label('E1 · Ø 2 m ESTIMÉ'")
s=s.replace('zoom standard ET-DLE170','zoom ET-DLE150').replace('0,505 m','0,805 m')
s=s.replace('Cliquer','Cliquer')
s=s.replace("const projector=group('P1_",'''const reservePts=Array.from({length:97},(_,i)=>new THREE.Vector3(EX+E.reservationDiameter/2*Math.cos(i*Math.PI/48),E.z+E.reservationDiameter/2*Math.sin(i*Math.PI/48),EZ+.008));
const reserveRing=new THREE.Line(new THREE.BufferGeometry().setFromPoints(reservePts),new THREE.LineDashedMaterial({color:'#f3c575',dashSize:.055,gapSize:.055,transparent:true,opacity:.65}));reserveRing.computeLineDistances();reserveRing.name='Reserve_ecran_2.10m_non_mesuree';model.add(reserveRing);
const projector=group('P1_''')
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8').replace('V14','V15')
for old,new in [('Écran Ø 1,50 m · image visible Ø 1,48 m','Écran Ø 2 m estimé · image visible Ø 1,98 m'),('bas à 1,30 m','bas à 1,05 m'),('x +2,25','x +1,95'),('2,432 × 1,52','3,392 × 2,12'),('112,911','157,481'),('4,20–5,90','5,893–8,258'),('1,92–2,39','2,693–3,357'),('0,505','0,805'),('<strong>1,50 m</strong>','<strong>2 m estimés</strong>')]:h=h.replace(old,new)
h=h.replace('Écran conservé sur B1,','Écran porté à 2 m estimés, avec une réserve Ø 2,10 m en pointillés. E1 et P1 déplacés de 30 cm vers le centre pour dégager le bar et le poteau. Écran sur B1,')
h=h.replace('<b>ET-DLE170 standard :</b> 5,893–8,258 m. Recul de l’option : <b>4,777 m</b>, dans cette plage.','<b>ET-DLE150 :</b> 4,450–6,454 m : le recul de <b>4,777 m</b> entre dans cette plage pour le gabarit avec réserve.<br><b>ET-DLE170 standard :</b> 5,893–8,258 m : recul insuffisant sur B4.')
h=h.replace('Gabarit 16:10 :','Réserve optique : hauteur 2,12 m, permettant de couvrir jusqu’à Ø 2,10 m après ajustement du masque. Gabarit 16:10 :')
h=h.replace('Comptoir à 0,805 m du boîtier indicatif','Gabarit cible à environ 21 cm du comptoir et 29 cm du poteau en plan. Comptoir à 0,805 m du boîtier indicatif')
h=h.replace('Diamètre de l’écran prévu','Diamètre estimé · réserve 2,10 m')
(root/'index.template.html').write_text(h,encoding='utf-8')
s=(pdf/'build_plan_v14.py').read_text(encoding='utf-8').replace('V14','V15')
# Parameterize the actual screen geometry and all dimensional drawing bounds.
s=s.replace('SCREEN_X+.75*math.cos(a)','SCREEN_X+SCREEN_D/2*math.cos(a)').replace('SCREEN_Z+.75*math.sin(a)','SCREEN_Z+SCREEN_D/2*math.sin(a)')
s=s.replace('math.sqrt(.75**2-dx**2)','math.sqrt((SCREEN_D/2)**2-dx**2)')
s=s.replace('SCREEN_X-.75','SCREEN_X-SCREEN_D/2').replace('SCREEN_X+.75','SCREEN_X+SCREEN_D/2')
s=s.replace('SCREEN_Z-.75','SCREEN_Z-SCREEN_D/2').replace('SCREEN_Z+.75','SCREEN_Z+SCREEN_D/2')
s=s.replace('ex-.75*s','ex-SCREEN_D/2*s').replace('ex+.75*s','ex+SCREEN_D/2*s').replace('ex-.75*fs','ex-SCREEN_D/2*fs')
for old,new in [('x +2,25','x +1,95'),('x = +2,25','x = +1,95'),('1,685 m','0,805 m'),('0,505 m','0,805 m'),('1,30 m','1,05 m'),('2,80 m','3,05 m'),('1,27 m','1,32 m'),('+3,00','+2,95'),('2,02 m du mur','2,32 m du mur'),('Ø 1,50 m','Ø 2,00 m estimé'),('diamètre 1.50','diamètre 2.00'),('diamètre 1,50','diamètre 2,00'),('1,48 m','1,98 m'),('2,432','3,392'),('1,52 m avant masque','2,12 m avant masque'),('2,432 x 1,52','3,392 x 2,12'),('3,392 x 1,52','3,392 x 2,12'),('image visible Ø 1,48','image visible Ø 1,98'),("'1,50 m'","'2,00 m*'")]:s=s.replace(old,new)
# Correct only the project native image height, preserving the venue's documented 5 ft = 1.52 m.
s=s.replace('Gabarit natif 16:10 = 3,392 x 1,52','Gabarit natif 16:10 = 3,392 x 2,12')
s=s.replace('option sur B4 compatible en recul avec ET-DLE170','option sur B4 compatible en recul avec ET-DLE150')
s=s.replace('low=diag*.0174-.0471; high=diag*.0216-.0442','low=diag*.0174-.0471; high=diag*.0216-.0442\ndle150low=diag*.0286-.054; dle150high=diag*.0413-.0498')
s=s.replace('4,777 m est dans la plage. Décentrement vertical et référence réelle de mesure à contrôler.','Recul insuffisant à B4 pour ce gabarit avec réserve.<br/><b>ET-DLE150 :</b> plage {dle150low:.3f} à {dle150high:.3f} m : 4,777 m est dans la plage. Décentrement vertical et repère réel à contrôler.')
s=s.replace('<b>Image demandée :</b>','<b>Dimension estimée :</b> Ø 2,00 m non mesuré ; réserve d’encombrement Ø 2,10 m. E1 et P1 rapprochés de 0,30 m vers le centre pour dégager le bar et le poteau.<br/><b>Image demandée :</b>')
s=s.replace('Le gabarit doit être masqué hors du cercle.','Réserve optique de 2,12 m en hauteur ; masque à ajuster au diamètre réel, jusque 2,10 m. Le gabarit doit être noir hors du cercle.')
s=s.replace('La position B4','La position B4')
s=s.replace('Corps à 0,805 m du comptoir indicatif ;','Corps à 0,805 m du comptoir indicatif ; gabarit à environ 0,21 m du comptoir et 0,29 m du poteau en plan ;')
s=s.replace('rayons sont un gabarit cible','rayons sont un gabarit cible')
s=s.replace('E1 : centre x = +1,95','Hypothèse Ø 2 m ; place réservée Ø 2,10 m. E1 : centre x = +1,95')
# Give the larger optical paragraph slightly more room without shrinking below 10 pt.
s=s.replace('réelle.\",10.5)','réelle.\",10)')
(pdf/'build_plan_v15.py').write_text(s,encoding='utf-8')
print(d['geometryId'])
