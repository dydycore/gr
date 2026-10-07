from pathlib import Path
import json,re,math,shutil
root=Path(__file__).resolve().parent
shared=root.parents[1]/'grand-remix-3d'/'implantation.json'
s=(root/'build_plan_v07.py').read_text(encoding='utf-8').replace('V07','V08').replace('{n}/3','{n}/4')
a=s.index('SCREEN_Y=');b=s.index('FCLR=',a)
s=s[:a]+'''import json
LAYOUT=json.loads((ROOT.parents[1]/'grand-remix-3d'/'implantation.json').read_text(encoding='utf-8'))
E=LAYOUT['screen']; P=LAYOUT['projector']; J=LAYOUT['dj']; BAR=LAYOUT['bar']
SCREEN_X,SCREEN_Y,SCREEN_Z,SCREEN_D=E['x'],E['y'],E['z'],E['diameter']
P1X,P1Y,P1Z=P['x'],P['y'],P['z']
DJX,DJY=J['x'],J['y']
SW,SD,STAGE,GRID,RH=[LAYOUT['venue'][k] for k in ['width','stageDepth','stageHeight','grid','ceiling']]
def coord(px,py,z):return ((px-432)/70.55,(275-py)/70.55,z)
fixtures=[(f['id'],f['kind'],(f['x'],f['y'],f['z'])) for f in LAYOUT['fixtures'] if not f['proposed']]
PROPOSED_PAR=[(f['id'],f['kind'],(f['x'],f['y'],f['z'])) for f in LAYOUT['fixtures'] if f['proposed']]
PAR_TARGETS=[('S1',(-1.8,-2.2)),('S6',(1.8,-2.2)),('S3',(-1.8,-5.0)),('S4',(1.8,-5.0)),('S2',(-1.8,-8.3)),('S5',(1.8,-8.3))]
''' +s[b:]
s=s.replace('Écran au coin avant droit','Écran avant droit écarté du mur').replace('ÉCRAN AU COIN AVANT DROIT','ÉCRAN ÉCARTÉ DU MUR')
s=s.replace('E1 au coin avant droit.','E1 écarté du mur droit.').replace('suspendu au coin avant droit','suspendu à l’avant droit, écarté du mur')
s=s.replace('Plan de l’écran aligné sur le nez de scène ; bord droit aligné sur le bord de scène, x = +4,27.','Plan sur le nez de scène ; bord droit x = +3,45, à 0,82 m du mur.')
s=s.replace('Bord droit à l’aplomb du bord de scène.','Bord droit à 0,82 m du mur droit.')
s=s.replace('bord droit sur le bord de scène.','bord droit à 0,82 m du mur.')
s=s.replace('x = +3,52','x = +2,70').replace('x +3,52','x +2,70')
s=s.replace('Coin avant droit : bord droit x +4,27.','Bord droit x +3,45 ; mur à 0,82 m.')
s=s.replace('Corps proposé x = +3,94 ; y = -1,85 ; z = +3,00 m. Décalage latéral +0,42 m du centre E1. Marge géométrique mur 8 cm ; refroidissement, optique et support non validés.', 'Essai corps x +2,55 ; y -2,55 ; z +3,00 m. Hors comptoir dans la maquette. Repère lentille à 2,27 m d’E1. Couverture et décentrements non validés ; voir calcul page 4.')
s=s.replace('<b>P1 :</b> corps à x +3,94 ; y -1,85 ; z +3,00 m. Boîtier indicatif 0,50 m de large : bord droit à +4,19 m. Marge mur 8 cm, géométrique seulement. Refroidissement, décentrement et support à valider.', '<b>P1 :</b> essai x +2,55 ; y -2,55 ; z +3,00 m. Enveloppe indicative de 0,50 x 0,50 m, à 0,21 m du bord du comptoir modélisé. Lentille indicative à 2,27 m de l’écran. Lentille réelle, décentrements et accroche non validés.')
s=s.replace('P1 : boîtier sous la ventilation, 8 cm de marge au mur dans la maquette. Refroidissement, décentrement et support à valider.', 'P1 hors du bar modélisé. Repère lentille à 2,27 m de l’écran, compatible en distance avec ET-DLE085 seulement parmi les deux exemples calculés page 4. Lentille de la salle inconnue.')
s=s.replace('x +3,94 ; y -1,85 ; z +3,00 m','x +2,55 ; y -2,55 ; z +3,00 m')
s=s.replace('Marge mur 8 cm dans la maquette ; optique, refroidissement et support à valider.', 'Hors comptoir modélisé. Repère lentille à 2,27 m. Optique, décentrements et support non validés.')
s=s.replace("'cible 1,85 m*'","'corps 2,55 m*'")
s=s.replace('Le recul cible de 1,85 m représente environ 33 cm de plus ; ce n’est pas une distance optique validée pour E1.', 'Dans V08 : corps à 2,55 m, repère de lentille indicatif à 2,27 m. La lentille de la salle est inconnue : essai spatial, non validé optiquement.')
s=s.replace("top(-3.90,1.425)","top(DJX-J['width']/2,DJY-J['depth']/2)").replace('1.8*s,.75*s',"J['width']*s,J['depth']*s").replace('top(-3,2.35)','top(DJX,DJY+.55)')
s=s.replace('front(-3.90,1.8,STAGE)',"front(DJX-J['width']/2,DJY,STAGE)").replace('1.8*fs,.9*fs',"J['width']*fs,J['height']*fs").replace('front(-3,1.8,STAGE+.4)','front(DJX,DJY,STAGE+.4)')
for old,new in [('iso(-3.9,1.425,z)',"iso(DJX-J['width']/2,DJY-J['depth']/2,z)"),('iso(-2.1,1.425,z)',"iso(DJX+J['width']/2,DJY-J['depth']/2,z)"),('iso(-2.1,2.175,z)',"iso(DJX+J['width']/2,DJY+J['depth']/2,z)"),('iso(-3.9,2.175,z)',"iso(DJX-J['width']/2,DJY+J['depth']/2,z)")]:s=s.replace(old,new)
s=s.replace('[(-3.9,1.425),(-2.1,1.425),(-2.1,2.175),(-3.9,2.175)]',"[(DJX+dx*J['width']/2,DJY+dy*J['depth']/2) for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]]")
s=s.replace('iso(-3.4,1.7,STAGE+.5)','iso(DJX-.4,DJY-.1,STAGE+.5)')
s=s.replace("for a,b in zip([(-3.36,3.22),(-1.65,3.22),(-1.65,.55)],[(-1.65,3.22),(-1.65,.55),(.23,.55)]):","for a,b in zip(LAYOUT['artistRoute'],LAYOUT['artistRoute'][1:]):")
s=s.replace('# Proposed circular screen edge', '''# Same bar and columns as 3D, explicitly approximate.
box(*top(BAR['x']-BAR['width']/2,BAR['y']-BAR['depth']/2),BAR['width']*s,BAR['depth']*s,colors.HexColor('#F6E7D4'),MUTED,.7)
for col in LAYOUT['columns']:
    box(*top(col['x']-col['width']/2,col['y']-col['depth']/2),col['width']*s,col['depth']*s,colors.HexColor('#AC8054'),MUTED,.5)
c.saveState();c.translate(*top(BAR['x'],BAR['y']));c.rotate(90);txt(0,0,'BAR INDICATIF',6,True,MUTED,'center');c.restoreState()
# Proposed circular screen edge''')
s=s.replace("arrow(px,py+12,ex,ey-4,VIOLET,.9,(3,2),5)","\nfor edge in [-1,1]:line(*top(P1X,P1Y+P['lensForward']),*top(SCREEN_X+edge*E['imageWidth']/2,SCREEN_Y),VIOLET,.7,(3,3))\nline(*top(SCREEN_X-E['imageWidth']/2,SCREEN_Y),*top(SCREEN_X+E['imageWidth']/2,SCREEN_Y),VIOLET,.6,(2,2))")
s=s.replace("line(*top(SCREEN_X-.45,SCREEN_Y-1.82),*top(SCREEN_X-.45,SCREEN_Y-2.02),VIOLET,.7,(2,2))",'')
s=s.replace("tag(px+19,py-2,'P1 - PT-RZ770'","tag(px+19,py-2,'P1 - ESSAI'" )
s=s.replace("'30 OCTOBRE 2026'","'30 OCTOBRE 2026'")
s=s.replace("txt(W-30,29,f'A3 paysage", "txt(W/2,29,'Géométrie '+LAYOUT['geometryId'],7,color=MUTED,align='center')\n    txt(W-30,29,f'A3 paysage")
s=s.replace('Conception : Cindy Bélanger - DMTeam | Implantation proposée sur base du dossier technique du Ministère','Cindy Bélanger - DMTeam | Implantation proposée - non validée DT')
s=s.replace("foot(3);c.showPage();c.save()",'''foot(3);c.showPage()
head(4,'CONCORDANCE PLAN / 3D ET CALCUL DU GABARIT VIDÉO')
pane(28,395,1134,349,'DONNÉES COMMUNES - V08 - ESSAI SPATIAL, PAS UN PLAN DE MONTAGE VALIDÉ')
para(45,700,1090,'Le PDF et la maquette lisent le même fichier implantation.json : positions E1/P1/DJ, dimensions principales, trajet artiste, bar, poteaux et 42 appareils repérés. Le repère de géométrie est identique dans les deux livrables. Cette concordance ne remplace pas un relevé architectural.',12)
rows=[['Élément','Repères communs en mètres','Niveau de validation'],['Scène / parterre','8,5344 x 3,6576 ; parterre 8,5344 x 10,668','Dimensions nominales du dossier de salle'],['Écran E1',f"x {SCREEN_X:.2f} ; y {SCREEN_Y:.2f} ; z {SCREEN_Z:.2f} ; diamètre {SCREEN_D:.2f}",'Proposé : suspension et visibilité à valider'],['Projecteur P1',f"x {P1X:.2f} ; y {P1Y:.2f} ; z {P1Z:.2f}",'Enveloppe indicative ; lentille et support inconnus'],['DJ',f"x {DJX:.2f} ; y {DJY:.2f} ; table 1,80 x 0,75",'Proposé ; dégagement mur 0,367 m'],['Bar / poteaux','Mêmes volumes indicatifs dans les deux vues','Aucun relevé coté disponible ; collisions réelles non garanties'],['Lumières','36 repérées existantes + 6 PAR proposés = 42','Positions reprises graphiquement ; accroches réelles à conserver']]
table(45,627,1097,[165,445,487],rows,rowheights=[25]+[27]*6,size=9)
pane(28,56,1134,326,'CALCUL DE COUVERTURE - IDENTIFIER LA LENTILLE AVANT DE FIXER LE RECUL')
diag=math.hypot(E['imageWidth'],E['imageHeight'])/.0254
low=diag*.0174-.0471; high=diag*.0216-.0442
stdlow=diag*.0379-.0746; stdhigh=diag*.0529-.0725
para(45,345,1089,f"<b>Cercle de 1,50 m :</b> image native 16:10 de 2,40 x 1,50 m, puis masque circulaire. Diagonale = sqrt(2,40² + 1,50²) / 0,0254 = {diag:.3f} pouces. Le cercle n’est pas la diagonale du rectangle.<br/><br/><b>ET-DLE085 :</b> Lmin = D x 0,0174 - 0,0471 = {low:.3f} m ; Lmax = D x 0,0216 - 0,0442 = {high:.3f} m.<br/><b>ET-DLE170 standard :</b> Lmin = D x 0,0379 - 0,0746 = {stdlow:.3f} m ; Lmax = D x 0,0529 - 0,0725 = {stdhigh:.3f} m.<br/><br/><b>Essai V08 :</b> distance perpendiculaire du repère lentille indicatif à E1 = 2,55 - 0,28 = <b>2,27 m</b>. Dans la plage ET-DLE085, hors plage standard. Décentrement latéral 0,15 m et vertical 0,44 m à contrôler avec la lentille et son repère réel.<br/><br/><b>La salle ne nomme pas sa lentille.</b> Elle décrit une installation ultra-courte à 5 pieds d’un écran 150 pouces. Cela ne confirme ni ET-DLE085 ni ET-DLE170. Les rayons V08 montrent le gabarit à obtenir, pas le trajet optique réel. Bar et poteaux sont approximatifs. Ne pas monter à partir de ces seuls tracés.<br/><br/><b>Source de calcul :</b> Panasonic PT-RZ770 Spec File, page 15, tableau 16:10 (mars 2020). Contrôle sur place requis : lentille, recul et décentrements, refroidissement, structure porteuse, cotes du bar et visibilité de l’écran.",10.5)
foot(4);c.showPage();c.save()''')
(root/'build_plan_v08.py').write_text(s,encoding='utf-8')
exec(compile(s,str(root/'build_plan_v08.py'),'exec'))
shutil.copy2(root/'Grand_Remix_Plan_Technique_V08.pdf',root.parents[1]/'grand-remix-3d'/'PLAN_AVANT_CORRIGE.pdf')
