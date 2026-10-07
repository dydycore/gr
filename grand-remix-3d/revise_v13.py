from pathlib import Path
import json,hashlib,shutil,re
root=Path(__file__).resolve().parent;pdf=root.parent/'pdf/grand_remix'
d=json.loads((root/'implantation.json').read_text(encoding='utf-8'));assert d['revision']=='V12'
a=root/'versions/V12';a.mkdir(parents=True,exist_ok=True)
for f in ['implantation.json','Grand_Remix_3D.html','scene.js','index.template.html','PLAN_AVANT_CORRIGE.pdf']:shutil.copy2(root/f,a/f)
d['revision']='V13';d['screen']['y']=.807;d['screen']['z']=2.05
d['screen']['mounting']='Premiere barre a y +0.807 m ; accroche proposee a valider par DT'
removed=next(f for f in d['fixtures'] if f['id']=='106')
d['removedFixtures']=[dict(removed,reason='Depose proposee pour liberer accroche ecran ; reste dans inventaire salle')]
d['fixtures']=[f for f in d['fixtures'] if f['id']!='106']
d['status']='ECRAN SUR PREMIERE BARRE - DEPOSE 106 PROPOSEE - OPTIQUE A REVALIDER'
d.pop('geometryId');d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8').replace('V12','V13')
s=s.replace('new THREE.Vector3(EX+dx,3.185,EZ)','new THREE.Vector3(EX+dx,E.z+Math.sqrt((E.diameter/2)**2-dx**2),EZ)')
s=s.replace('new THREE.Vector3(EX,3.57,.02)','new THREE.Vector3(EX,E.z+E.diameter/2+.27,EZ)')
s=s.replace('Écran conservé à la position V10 ; seul le projecteur est déplacé dans cet essai. Plan sur le nez de scène, bord droit à 1,27 m du mur droit.','Écran reculé sur la première barre : 80,7 cm derrière le nez de scène. Abaissé de 50 cm : bas 1,30 m, haut 2,80 m au-dessus du sol salle. Lyre 106 retirée de la maquette pour libérer le point d’accroche proposé. Suspension à faire valider par le DT.')
s=s.replace('Recul seul dans la plage ET-DLE085 ; décentrement latéral 1,18 m NON validé','Recul 3,11 m : hors plage ET-DLE085 pour ce gabarit ; optique à revalider')
s=s.replace('LX_42_appareils_reperes','LX_41_appareils_106_depose_proposee')
s=s.replace('screen:{x:EX,y:0,z:2.55,diameter:1.5}','screen:E')
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8').replace('Essai V12','Essai V13')
old='Déplacement de 65 cm à droite annulé. Depuis V10 : projecteur seul déplacé de 1 m vers la gauche vue public. Écran conservé, à 1,27 m du mur droit. Décalage latéral projecteur/écran : 1,18 m, à valider optiquement. Recul et marge noire autour de l’image conservés.'
new='Écran reculé sur la première barre, à 81 cm derrière le nez de scène, et abaissé de 50 cm. Bas à 1,30 m du sol salle ; haut à 2,80 m. Lyre 106 retirée de cette implantation pour libérer l’accroche proposée. Projecteur conservé à gauche ; marge noire de 1 cm conservée.'
assert old in h;h=h.replace(old,new).replace('2,30 m','3,11 m')
h=h.replace('L’essai à 3,11 m entre dans cette plage, sous réserve du repère de mesure et des décentrements.','Le nouveau recul de 3,11 m est hors de cette plage pour ce gabarit. Il faut revalider l’optique.')
h=h.replace('environ 1,21 m de marge en plan','environ 1,13 m de marge en plan').replace('6 PAR + 8 lyres','6 PAR + 7 lyres')
h=h.replace('Le 8e Source Four 36° est inventorié mais non localisé sur le plan.','Lyre 106 : dépose proposée, appareil conservé dans l’inventaire. Le 8e Source Four 36° est inventorié mais non localisé sur le plan.')
(root/'index.template.html').write_text(h,encoding='utf-8')
s=(pdf/'build_plan_v12.py').read_text(encoding='utf-8').replace('V12','V13')
# Skip the aiming arrows of the fixture removed from the active shared setup.
s=s.replace("xyz=next(q for a,k,q in fixtures if a==label)","if label=='106':continue\n    xyz=next(q for a,k,q in fixtures if a==label)")
s=s.replace('SCREEN_Y,3.19','SCREEN_Y,SCREEN_Z+math.sqrt(.75**2-dx**2)')
s=s.replace('fy+1.8*fs','fy+(SCREEN_Z-.75)*fs').replace('fy+3.3*fs','fy+(SCREEN_Z+.75)*fs')
s=s.replace('sy+1.8*ss','sy+(SCREEN_Z-.75)*ss').replace('sy+3.3*ss','sy+(SCREEN_Z+.75)*ss')
s=s.replace("'bas +1,80 m*'","'bas +1,30 m*'").replace('Bas proposé +1,80 m','Bas proposé +1,30 m').replace('haut +3,30 m / sol salle','haut +2,80 m / sol salle')
s=s.replace("'corps 2,58 m*'","'corps / E1 : 3,39 m*'")
s=s.replace('y = 0,00. Plan sur le nez de scène','y = +0,807. Plan sur la première barre derrière le nez de scène')
s=s.replace('sans recul devant le nez de scène','sur la première barre, à 0,807 m derrière le nez de scène')
s=s.replace('Plan de l’écran sur le nez de scène (y = 0)','Plan de l’écran sur la première barre (y = +0,807)')
s=s.replace('x +2,25 ; y 0,00 ; Ø 1,50 m','x +2,25 ; y +0,807 ; Ø 1,50 m')
s=s.replace('2,30 m','3,11 m').replace('2,58 - 0,28','2,58 - 0,28 + 0,807')
s=s.replace('Dans la plage ET-DLE085, hors plage standard.','Hors plage ET-DLE085 et hors plage standard pour ce gabarit. Optique à revalider.')
s=s.replace('recul seul dans la plage ET-DLE085 ; décentrement latéral 1,18 m non validé.','hors plage ET-DLE085 pour ce gabarit ; optique et décentrements à revalider.')
s=s.replace('et vertical 0,44 m','et vertical 0,94 m')
s=s.replace('Essai de 65 cm à droite annulé. Depuis V10 : P1 seul déplacé de 1 m à gauche ; E1 conservé. Le fort décentrement latéral n’est pas validé. Recul, hauteurs et bordure noire conservés.','Depuis V12 : E1 reculé de 0,807 m sur la première barre et abaissé de 0,50 m. P1 conservé. Lyre 106 déposée dans cette proposition pour dégager l’accroche. Bordure noire de 1 cm conservée.')
s=s.replace('environ 1,21 m du bar','environ 1,13 m du bar')
s=s.replace('Kit du plan original conservé.','Kit existant, sauf dépose proposée de la lyre 106 pour E1.')
s=s.replace('Conserver les positions et le patch du plan LX original.','Conserver les positions et le patch, sauf dépose proposée de la lyre 106 pour l’accroche E1.')
s=s.replace('les 8 Intimidator existants','les 7 Intimidator actifs (106 déposé proposé)')
s=s.replace('42 appareils repérés','41 appareils actifs, 106 déposé proposé')
s=s.replace('36 repérées existantes + 6 PAR proposés = 42','35 existants actifs + 6 PAR proposés = 41')
s=s.replace('6 suspendus + 2 bas','5 suspendus + 2 bas ; 106 déposé')
s=s.replace('Les autres appareils conservent les positions du plan LX existant.','106 : dépose proposée pour E1 ; autres points conservés.')
s=s.replace('conserver les points réels. Accroches E1/P1 à valider.','106 déposé proposé. Accroches E1/P1 à valider.')
(pdf/'build_plan_v13.py').write_text(s,encoding='utf-8')
check=(root/'check_geometry.py').read_text(encoding='utf-8').split('previous=json.loads')[0].replace('V12','V13').replace("len(d['fixtures'])==42","len(d['fixtures'])==41").replace("'fixtures':42","'fixtures':41")
# Interpolate to the plane y=+0.807, not the old front plane.
check=check.replace('(1-bar_front/l)','(1-(bar_front+e[\'y\'])/l)')
check+="\nprevious=json.loads((root/'versions/V12/implantation.json').read_text(encoding='utf-8'))\nassert d['projector']==previous['projector']\nassert d['screen']['y']==.807 and abs(d['screen']['z']-previous['screen']['z']+.5)<1e-9\nassert not any(f['id']=='106' for f in d['fixtures'])\nassert d['removedFixtures'][0]['id']=='106'\nprint('Recul ecran 0.807 m, abaissement 0.50 m, lyre 106 deposee dans proposition : OK')\n"
(root/'check_geometry.py').write_text(check,encoding='utf-8')
print(d['geometryId'])
