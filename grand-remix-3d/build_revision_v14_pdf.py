from pathlib import Path
root=Path(__file__).resolve().parent;pdf=root.parent/'pdf/grand_remix'
s=(pdf/'build_plan_v13.py').read_text(encoding='utf-8').replace('V13','V14').replace('{n}/4','{n}/5')
subs={
'x +1,07 ; y -2,58 ; z +3,00':'x +2,25 ; y -4,25 ; z +2,75',
'3,11 m':'4,78 m','1,685 m':'0,505 m',
'corps / E1 : 3,39 m*':'corps / E1 : 5,06 m*',
'corps à 2,58 m':'corps à 4,25 m devant le nez de scène',
'Hors plage ET-DLE085 et hors plage standard pour ce gabarit. Optique à revalider.':'Recul dans la plage standard ; lentille installée inconnue.',
'hors plage ET-DLE085 pour ce gabarit ; optique et décentrements à revalider.':'option sur B4 compatible en recul avec ET-DLE170 ; disponibilité et décentrement à vérifier.',
'41 appareils actifs, 106 déposé proposé':'40 appareils actifs ; 106 et Zoom 5 déposés proposés',
'35 existants actifs + 6 PAR proposés = 41':'34 existants actifs + 6 PAR proposés = 40',
'sauf dépose proposée de la lyre 106 pour E1':'sauf déposes proposées de 106 pour E1 et Zoom 5 pour P1',
'sauf dépose proposée de la lyre 106 pour l’accroche E1':'sauf déposes proposées de 106 pour E1 et du Zoom 5 pour P1',
'106 déposé proposé. Accroches E1/P1 à valider.':'106 et Zoom 5 déposés proposés. Accroches E1/P1 à valider.',
'106 : dépose proposée pour E1 ; autres points conservés.':'106 et Zoom 5 : déposes proposées pour E1/P1 ; autres points conservés.',
'Enveloppe indicative ; lentille et support inconnus':'Option B4 ; lentille installée et adaptation support non validées',
'P1 - ESSAI':'P1 / B4 - OPTION',
'Panasonic PT-RZ770. Essai corps':'Panasonic PT-RZ770. Option B4 : corps',
'Essai corps':'Option B4 : corps',
'<b>P1 :</b> essai':'<b>P1 :</b> option B4',
'Le repère de mesure du recul, la hauteur du corps et l’accroche finale restent à fixer après identification de la lentille.':'B4 est repérée sur le plan source. Adaptation du Chief VCMU au tube carré, hauteur, charge et lentille à confirmer.',
}
for a,b in subs.items():s=s.replace(a,b)
s=s.replace("for yy in [.807,1.77,2.78,-4.25]:line(*top(-3.95,yy),*top(3.95,yy),colors.black,.65)","for bar in LAYOUT['rigBars']:line(*top(*bar['a']),*top(*bar['b']),TEAL,.9)")
s=s.replace("for yy in [.807,1.77,2.78,-4.25]:line(*iso(-3.95,yy,GRID),*iso(3.95,yy,GRID),colors.black,.7)","for bar in LAYOUT['rigBars']:line(*iso(*bar['a']),*iso(*bar['b']),TEAL,.9)")
s=s.replace('# Support deliberately unspecified pending DT validation.',"# Candidate support is connected to B4; hardware/load still unverified.\nline(*side(P1X,P1Y,P1Z+.12),*side(P1X,P1Y,GRID),VIOLET,1)\nline(*side(0,0,GRID),*side(0,-4.25,GRID),TEAL,.9)")
s=s.replace("px,py=iso(P1X,P1Y,P1Z);box(px-10,py-6,20,12,None,VIOLET,1)","px,py=iso(P1X,P1Y,P1Z);box(px-10,py-6,20,12,None,VIOLET,1)\nline(*iso(P1X,P1Y,P1Z+.12),*iso(P1X,P1Y,GRID),VIOLET,1)")
s=s.replace("['Source Four 25-50°','6','750 W / TL3']","['Source Four 25-50°','6','5 actifs ; Zoom 5 déposé proposé']")
# Replace the optical paragraph rather than retaining obsolete trial arithmetic.
start=s.index('para(45,345,1089,')
s=s[:start]+'''para(45,345,1089,f"<b>Image demandée :</b> cercle Ø 1,50 m ; image visible Ø 1,48 m, bord noir de 1 cm. Gabarit natif 16:10 = 2,432 x 1,52 m, diagonale {diag:.3f} pouces. Le gabarit doit être masqué hors du cercle.<br/><br/><b>Option B4 :</b> corps P1 x +2,25 ; y -4,25 ; z +2,75 m. Écran x +2,25 ; y +0,807 ; z +2,05 m. Lentille indicative avancée de 0,28 m : L = 4,25 - 0,28 + 0,807 = <b>4,777 m</b>. Alignement horizontal : 0,00 m ; écart vertical : 2,75 - 0,01 - 2,05 = 0,69 m.<br/><br/><b>Zoom standard / ET-DLE170 :</b> plage de recul {stdlow:.3f} à {stdhigh:.3f} m, d’après les formules constructeur. 4,777 m est dans la plage. Décentrement vertical et référence réelle de mesure à contrôler.<br/><b>ET-DLE085 :</b> plage {low:.3f} à {high:.3f} m ; ne convient pas à ce recul et à ce gabarit.<br/><br/><b>Conclusion conditionnelle :</b> la position B4 est une option avec une optique appropriée, pas une installation confirmée avec la lentille actuelle. La salle décrit un montage ultra-court sans identifier sa lentille. Référence et disponibilité de l’optique indispensables avant de retenir B4.<br/><br/><b>Accroche :</b> barre transversale reprise graphiquement ; cotes non relevées. Chief VCMU inventorié, mais adaptation, charge et longueur de suspension non documentées. Zoom 5 réservé à la dépose pour P1 ; 106 pour E1. Le dessin ne certifie ni leur déplacement ni la capacité de la structure. Corps à 0,505 m du comptoir indicatif ; visibilité, ventilation et obstacles réels à vérifier.<br/><br/><b>Source :</b> Panasonic PT-RZ770 Spec File, pages 15–16 ; plan LX et fiche Audio-LX du Ministère. Les rayons sont un gabarit cible, pas une simulation de la lentille installée.",10.5)
foot(4);c.showPage()
head(5,'BARRES ET PRIORITÉS D’ACCROCHE - REPÉRAGE DEPUIS LE PLAN SOURCE')
pane(28,56,690,688,'GRILLE SEULE - SECTIONS VIDES VISIBLES - COTES GRAPHIQUES APPROXIMATIVES')
pane(734,56,428,688,'POINTS PROPOSÉS ET LIMITES DU REPÉRAGE')
rs=58;rx=361;ry=454
def rigp(x,y,z=0):return rx+x*rs,ry+y*rs
box(*rigp(-SW/2,0),SW*rs,SD*rs,PALE,colors.black,.8)
line(*rigp(-SW/2,0),*rigp(SW/2,0),colors.black,2)
txt(*rigp(0,3.3),'FOND DE SCÈNE',8,True,colors.black,'center')
txt(*rigp(0,-.4),'NEZ DE SCÈNE / ORIGINE y = 0',8,True,colors.black,'center')
for bar in LAYOUT['rigBars']:
    line(*rigp(*bar['a']),*rigp(*bar['b']),TEAL,2.5)
    a,b=bar['a'],bar['b']
    mx,my=(a[0]+b[0])/2,(a[1]+b[1])/2
    if bar['id'].startswith('B'):tag(*rigp(-3.8,my+.10),bar['id'],TEAL,9)
    else:tag(*rigp(mx+.08,my),bar['id'],TEAL,9)
for a,b in [((-SW/2+.06,SD-.06),(SW/2-.06,SD-.06)),((-SW/2+.06,0),(-SW/2+.06,SD-.06)),((SW/2-.06,0),(SW/2-.06,SD-.06))]:line(*rigp(*a),*rigp(*b),colors.HexColor('#B4A126'),1,(4,3))
line(*rigp(SCREEN_X-.75,SCREEN_Y),*rigp(SCREEN_X+.75,SCREEN_Y),VIOLET,4)
tag(*rigp(SCREEN_X-.45,SCREEN_Y+.22),'E1 / B1',VIOLET,9)
pp=rigp(P1X,P1Y);box(pp[0]-.25*rs,pp[1]-.25*rs,.5*rs,.5*rs,VIOLET_PALE,VIOLET,1.2)
tag(pp[0]-20,pp[1]-31,'P1 / B4',VIOLET,9)
line(*rigp(P1X,P1Y+.28),*rigp(SCREEN_X,SCREEN_Y),VIOLET,1,(4,3))
dimv(656,rigp(0,-4.25)[1],rigp(0,0)[1],'env. 4,25 m',rigp(3.95,0)[0])
txt(50,110,'Vert : tubes repérés. Jaune : rails à rideaux, accroche interdite.',9)
txt(50,91,'Une section sans appareil n’est pas un point de charge validé.',9,True,ORANGE)
para(751,702,392,'<b>B1–B3 : traverses de scène.</b><br/>y ≈ +0,807 / +1,77 / +2,78 m depuis le bord avant.<br/><br/><b>B4 : traverse salle.</b><br/>y ≈ -4,25 m. P1 proposé à x +2,25 m, dans l’axe d’E1. Environ 2,02 m du mur droit à l’axe, selon la largeur nominale.<br/><br/><b>L-G / L-C / L-D : tracés longitudinaux.</b><br/>x ≈ -3,36 / -0,20 / +3,02 m ; de la scène vers B4. Repérage graphique : continuité, extrémités et nature de chaque tronçon à confirmer.<br/><br/><b>Section documentée :</b> tubes carrés 2 x 2 pouces (50,8 mm). Aucun rail à rideaux, conduit de ventilation ou élément décoratif n’est retenu comme point d’accroche.<br/><br/><b>Priorités projection :</b><br/>106 : dépose proposée pour la suspension E1 sur B1.<br/>Zoom 5 : dépose proposée pour le support P1 sur B4.<br/>Les deux restent à l’inventaire, sans nouvel emplacement attribué.<br/><br/><b>Avant montage :</b> DT à consulter pour identification de la lentille, contrôle du support Chief VCMU, fixation adaptée au tube carré, capacité de charge, suspension secondaire, refroidissement et trajet optique réel.<br/><br/><b>Fidélité du modèle :</b> mêmes segments et coordonnées dans le PDF et le 3D. Le dossier ne donne ni un relevé complet de tous les points cachés ni leurs charges admissibles. Ce repérage ne remplace pas la visite technique.',10)
foot(5);c.showPage();c.save()
print(OUT)
'''
(pdf/'build_plan_v14.py').write_text(s,encoding='utf-8')
