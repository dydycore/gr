from pathlib import Path
ROOT = Path(__file__).resolve().parent
# Shared vector drawing helpers; do not regenerate the superseded draft.
exec((ROOT / 'build_plan.py').read_text(encoding='utf-8').split('# SHEET 1:')[0])
OUT = ROOT / 'Grand_Remix_Plan_Technique_V08.pdf'
c = canvas.Canvas(str(OUT), pagesize=(W,H), pageCompression=1)
c.setTitle('Grand Remix - Écran avant droit écarté du mur, DJ gauche, éclairage de piste - V08')
c.setAuthor('Cindy Bélanger - DMTeam')
MAGENTA=colors.HexColor('#F000DE'); GREEN=colors.HexColor('#12CD21')
PINK=colors.HexColor('#E7ACD3'); ORANGE=colors.HexColor('#FF6B18')
CYAN=colors.HexColor('#00CCD9'); BLUE=colors.HexColor('#446BFF')
# User-confirmed position: plane on the stage front; outer screen edge flush
# with the right-hand stage boundary, viewed from the audience.
import json
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
FCLR={'moving':ORANGE,'source':MAGENTA,'colorado':GREEN,'zoom':PINK,'sl1':BLUE,'mini':CYAN,'par':MUTED}

def head(n,title):
    txt(30,H-32,'Le Ministère - Grand Remix',22,True,colors.black)
    txt(31,H-49,title,12,True,colors.black)
    txt(W-30,H-28,'30 OCTOBRE 2026',11,True,colors.black,'right')
    txt(W-30,H-46,'V08 - 07/10/2026 - POUR VALIDATION DT',9,True,ORANGE,'right')
    line(27,H-59,W-27,H-59,colors.black,2)

def foot(n):
    line(28,43,W-28,43,colors.black,1)
    txt(30,29,'Cindy Bélanger - DMTeam | Implantation proposée - non validée DT',8,color=colors.black)
    txt(W/2,29,'Géométrie '+LAYOUT['geometryId'],7,color=MUTED,align='center')
    txt(W-30,29,f'A3 paysage - imprimer à 100 % | {n}/4',8,color=colors.black,align='right')

def pane(x,y,w,h,title):
    box(x,y,w,h,None,colors.black,1.2)
    box(x,y+h-23,w,23,colors.black,None)
    txt(x+9,y+h-16,title,10,True,colors.white)

def fixture(x,y,kind,label='',k=1,labeldy=13):
    cl=FCLR[kind];c.saveState();c.setStrokeColor(cl);c.setFillColor(colors.white);c.setLineWidth(.85)
    if kind=='moving':
        c.roundRect(x-5*k,y-5*k,10*k,13*k,2*k,stroke=1,fill=1)
        c.line(x-8*k,y+4*k,x-8*k,y-8*k);c.line(x+8*k,y+4*k,x+8*k,y-8*k)
        c.line(x-8*k,y-8*k,x+8*k,y-8*k);c.rect(x-9*k,y-11*k,18*k,2*k,stroke=1,fill=0)
    elif kind in ['source','zoom']:
        c.rect(x-4*k,y-8*k,8*k,16*k,stroke=1,fill=1)
        c.rect(x-6*k,y-10*k,12*k,3*k,stroke=1,fill=1)
        c.ellipse(x-3*k,y+8*k,x+3*k,y+12*k,stroke=1,fill=1)
        c.line(x-7*k,y+2*k,x-7*k,y-4*k);c.line(x+7*k,y+2*k,x+7*k,y-4*k)
    elif kind=='colorado':
        c.rect(x-5*k,y-5*k,10*k,10*k,stroke=1,fill=1)
        for xx in [-2,2]:
            for yy in [-2,2]:c.circle(x+xx*k,y+yy*k,.8*k,stroke=1,fill=0)
    elif kind=='par':
        c.circle(x,y,6*k,stroke=1,fill=1);c.line(x-9*k,y+1*k,x-9*k,y-8*k);c.line(x+9*k,y+1*k,x+9*k,y-8*k);c.line(x-9*k,y-8*k,x+9*k,y-8*k)
    elif kind=='sl1':c.rect(x-14*k,y-4*k,28*k,8*k,stroke=1,fill=1)
    else:c.rect(x-4*k,y-11*k,8*k,22*k,stroke=1,fill=1)
    c.restoreState()
    if label:txt(x,y+labeldy*k,label,6.7*k,True,colors.black,'center')

def tag(x,y,text_,color=colors.black,size=8):
    width=pdfmetrics.stringWidth(text_,'ArialB',size)+8
    box(x-4,y-3,width,13,colors.white,None)
    txt(x,y,text_,size,True,color)

def poly(points,color=INK,width=.8,fill=None,dash=None):
    c.saveState();c.setLineWidth(width);c.setStrokeColor(color)
    if fill:c.setFillColor(fill)
    if dash:c.setDash(*dash)
    p=c.beginPath();p.moveTo(*points[0])
    for pt in points[1:]:p.lineTo(*pt)
    p.close();c.drawPath(p,stroke=1,fill=int(fill is not None));c.restoreState()

def legend(x,y,w):
    rows=[('source','ETC Source Four 36°','8*','1'),('zoom','ETC Source Four 25/50 Zoom','6','1'),('colorado','Colorado 1 Tour-Tri','12','ARC1 / 3'),('moving','Intimidator Spot 375Z','8','15'),('sl1','DMG SL1 Mix 200 W','1','4**'),('mini','DMG Mini Mix 100 W','2','4**'),('par','PAR 56 WFL 500 W','6*','1')]
    txt(x+6,y,'Symbole',7,True);txt(x+56,y,'Appareil',7,True);txt(x+w-61,y,'Qté',7,True);txt(x+w-36,y,'DMX',7,True)
    for i,(kind,name,count,mode) in enumerate(rows):
        yy=y-27-i*28;fixture(x+22,yy,kind,k=.8)
        txt(x+56,yy+2,name,8);txt(x+w-54,yy+2,count,8,align='center');txt(x+w-23,yy+2,mode,7,align='center')
    return para(x+8,y-220,w-16,'<b>* Source Four 36° : 8 inventoriés, 7 dessinés.</b><br/>PAR 56 : S1-S6 = emplacements proposés, à valider.<br/>** Modes repris du plan LX ; conserver le patch.',8)

def screen_circle(project,color=VIOLET):
    pts=[project(SCREEN_X+.75*math.cos(a),SCREEN_Y,SCREEN_Z+.75*math.sin(a)) for a in [i*2*math.pi/80 for i in range(80)]]
    poly(pts,color,1.4,VIOLET_PALE)
    for dx in [-.40,.40]:line(*project(SCREEN_X+dx,SCREEN_Y,3.19),*project(SCREEN_X+dx,SCREEN_Y,GRID),color,.7,(3,2))

# PAGE 1: top plan, exact fixture identifiers, desired light coverage and new setup.
head(1,'PLAN LX ET SCÉNOGRAPHIE - VUE DE DESSUS / TOP')
pane(28,56,765,688,'VUE PUBLIC : DJ À GAUCHE / ÉCRAN + VIDÉO À DROITE - TOP 1:65')
pane(810,438,352,306,'LÉGENDE - APPAREILS DU MINISTÈRE')
legend(820,704,332)
pane(810,208,352,219,'IMPLANTATION DEMANDÉE - REPÈRES')
pane(810,56,352,141,'CARTOUCHE ET BASE DU PLAN')
s=1000/65*72/25.4;ox,oy=303,535
def top(x,y,z=0):return ox+x*s,oy+y*s
lo=top(-SW/2,-10.668);box(*lo,SW*s,(10.668+SD)*s,None,colors.black,1)
box(*top(-SW/2,0),SW*s,SD*s,PALE,colors.black,1)
txt(ox,oy+SD*s-11,'FOND DE SCÈNE',7,True,colors.black,'center')
dimh(*[top(a,0)[0] for a in [-SW/2,SW/2]],711,'8,53 m / 28 pi',oy+SD*s)
dimv(87,oy,oy+SD*s,'3,66 m / 12 pi',lo[0])
dimv(87,lo[1],oy,'Parterre 10,67 m / 35 pi',lo[0])
line(*top(0,-10.668),*top(0,SD),LINE,.6,(3,4))
# Existing pipes and ventilation ducts, with the curtain tracks distinguished.
for yy in [.807,1.77,2.78,-4.25]:line(*top(-3.95,yy),*top(3.95,yy),colors.black,.65)
for xx in [-3.87,3.87]:
    box(*top(xx-.23,-10.3),.46*s,9.6*s,None,colors.HexColor('#9B9DB8'),.6)
    c.saveState();c.translate(*top(xx,-7.4));c.rotate(90);txt(0,0,'VENTILATION',7,color=MUTED,align='center');c.restoreState()
# Furniture is at floor level; LX remains in place above.
box(*top(DJX-J['width']/2,DJY-J['depth']/2),J['width']*s,J['depth']*s,colors.white,colors.black,1)
txt(*top(DJX,DJY+.55),'DJ FRÄNZE',9,True,colors.black,'center')
box(*top(-.75,.35),1.5*s,1.5*s,TEAL_PALE,TEAL,.8)
txt(*top(0,1.48),'SLAM',9,True,TEAL,'center')
for label,kind,xyz in fixtures:fixture(*top(*xyz),kind,label,k=.82)
# Existing projector shown separately from proposed installation.
p0=coord(432,110,3.4);px,py=top(*p0)
box(px-9,py-7,18,16,None,colors.HexColor('#7AA91A'),.7)
txt(px,py+13,'P0',7,True,colors.HexColor('#5E8017'),'center')
# Same bar and columns as 3D, explicitly approximate.
box(*top(BAR['x']-BAR['width']/2,BAR['y']-BAR['depth']/2),BAR['width']*s,BAR['depth']*s,colors.HexColor('#F6E7D4'),MUTED,.7)
for col in LAYOUT['columns']:
    box(*top(col['x']-col['width']/2,col['y']-col['depth']/2),col['width']*s,col['depth']*s,colors.HexColor('#AC8054'),MUTED,.5)
c.saveState();c.translate(*top(BAR['x'],BAR['y']));c.rotate(90);txt(0,0,'BAR INDICATIF',6,True,MUTED,'center');c.restoreState()
# Proposed circular screen edge and short-throw video position.
ex,ey=top(SCREEN_X,SCREEN_Y)
line(ex-.75*s,ey,ex+.75*s,ey,VIOLET,3)
tag(ex-.74*s,ey-18,'E1 Ø 1,50 m',VIOLET,8)
px,py=top(P1X,P1Y)
box(px-.25*s,py-.25*s,.5*s,.5*s,colors.white,VIOLET,1)
box(px-5,py+8,10,4,VIOLET_PALE,VIOLET,.8)

for edge in [-1,1]:line(*top(P1X,P1Y+P['lensForward']),*top(SCREEN_X+edge*E['imageWidth']/2,SCREEN_Y),VIOLET,.7,(3,3))
line(*top(SCREEN_X-E['imageWidth']/2,SCREEN_Y),*top(SCREEN_X+E['imageWidth']/2,SCREEN_Y),VIOLET,.6,(2,2))
tag(px-32,py-3,'P1',VIOLET,9)

# Zones and arrows are aiming intentions, not new physical fixtures.
for za,zb,key in [(-3.30,-1.10,'A - AVANT'),(-6.60,-3.50,'B - MILIEU'),(-9.90,-6.80,'C - FOND')]:
    x,y=top(-3.3,za);c.saveState();c.setDash(4,3);box(x,y,5.85*s,(zb-za)*s,None,ORANGE,.6);c.restoreState()
    tag(*top(.10,(za+zb)/2),key,ORANGE,8)
for label,target in [('101',(2.3,-2.2)),('106',(-2.3,-2.2)),('102',(2.2,-5.0)),('105',(-2.2,-5.0)),('103',(2.0,-8.3)),('104',(-2.0,-8.3))]:
    xyz=next(q for a,k,q in fixtures if a==label)
    arrow(*top(*xyz),*top(*target),ORANGE,.45,(2,4),4)
# Six PAR from the venue inventory are proposed on the existing audience pipe.
# Their current positions/availability are undocumented; do not describe as installed.
for label,target in PAR_TARGETS:
    xyz=next(q for a,k,q in PROPOSED_PAR if a==label)
    arrow(*top(*xyz),*top(*target),MUTED,.65,(5,3),4)
for label,kind,xyz in PROPOSED_PAR:fixture(*top(*xyz),kind,label,k=.82,labeldy=-24)
for a,b in zip(LAYOUT['artistRoute'],LAYOUT['artistRoute'][1:]):
    arrow(*top(*a),*top(*b),TEAL,.8,(4,2),4)
# Current régie shown schematically at the back, exact footprint unmeasured.
rx,ry=top(.20,-10.22);box(rx,ry,1.80*s,.72*s,None,colors.black,.7)
txt(rx+.9*s,ry+.3*s,'RÉGIE',7,True,ORANGE,'center')
# Leaders in the open margin.
notes=[(669,'KIT LX ET AJOUT PROPOSÉ','Kit du plan original conservé. Orange : Intimidator vers la piste. Gris : pointage proposé des 6 PAR 56 S1-S6, pris dans l’inventaire de la salle.'),
(585,'DJ À GAUCHE VUE PUBLIC','Table proposée 1,80 x 0,75 m. Centre : x = -3,00 ; y = +1,80. Bord de table à 37 cm du mur gauche. Trajet artiste par le fond puis côté centre.'),
(501,'ÉCRAN ÉCARTÉ DU MUR','E1 : centre x = +2,70 ; y = 0,00. Plan sur le nez de scène ; bord droit x = +3,45, à 0,82 m du mur. Ø environ 1,50 m.'),
(409,'VIDÉOPROJECTEUR À DROITE','Panasonic PT-RZ770. Essai corps x +2,55 ; y -2,55 ; z +3,00 m. Hors comptoir dans la maquette. Repère lentille à 2,27 m d’E1. Couverture et décentrements non validés ; voir calcul page 4. P0 vert : position d’origine.'),
(308,'LUMIÈRES DANS LA SALLE','6 PAR 56 S1-S6 proposés sur la barre salle à y = -4,25 m. S1/S6 vers A ; S3/S4 vers B ; S2/S5 vers C. Implantation et disponibilité à valider.'),
(201,'CADRAGE DU PLAN','Origine au centre du nez de scène. x positif à droite du public ; y positif vers le fond de scène. Dimensions nominales de la fiche.')]
for yy,title,body in notes:
    txt(526,yy,title,8.5,True,colors.black);para(526,yy-11,250,body,8)
scalebar(526,89,s)
para(820,389,332,'<b>E1 :</b> écran suspendu Ø 1,50 m au coin avant droit, sans recul devant le nez de scène. Bord droit à 0,82 m du mur droit. Bas proposé +1,80 m, haut +3,30 m / sol salle.<br/><br/><b>P1 :</b> essai x +2,55 ; y -2,55 ; z +3,00 m. Enveloppe indicative de 0,50 x 0,50 m, à 0,21 m du bord du comptoir modélisé. Lentille indicative à 2,27 m de l’écran. Lentille réelle, décentrements et accroche non validés.<br/><br/><b>Piste :</b> 6 PAR 56 proposés dans la salle pour une base fixe graduable, complétée par les 8 Intimidator existants. Les PAR ne sont pas attestés libres ou déjà installés à ces positions.',8.5)
para(820,162,332,'<b>DT :</b> Rémi LeGresley - Le Ministère<br/><b>Base :</b> dossier Audio-LX fourni + plan LX 2023 envoyé par Rémi.<br/><b>Statut :</b> implantation et pointages proposés. Emplacements LX repris graphiquement ; conserver les points réels. Accroches E1/P1 à valider.',8)
foot(1);c.showPage()

# PAGE 2: familiar front and side elevations, all inventory types included.
head(2,'PLAN LX ET SCÉNOGRAPHIE - FRONT / LEFT')
pane(28,414,765,330,'FRONT - VUE DEPUIS LE PUBLIC - 1:50')
pane(28,56,765,347,'LEFT - COUPE SUR E1, À DROITE VUE PUBLIC - 1:65')
pane(810,438,352,306,'LÉGENDE - APPAREILS DU MINISTÈRE')
legend(820,704,332)
pane(810,56,352,371,'NOTES TECHNIQUES DE MONTAGE')
fx,fy,fs=412,461,S50
def front(x,y,z):return fx+x*fs,fy+z*fs
box(fx-SW/2*fs,fy,SW*fs,STAGE*fs,None,colors.black,1)
line(*front(-SW/2,0,GRID),*front(SW/2,0,GRID),colors.black,1.6)
for label,kind,xyz in fixtures:
    fixture(*front(*xyz),kind,'' if kind in ['source','colorado'] else label,k=.75,labeldy=14)
# In elevation, different depths overlap. Group their identifiers so every
# number remains readable; the top view retains each individual position.
for kind,level in [('source',700),('colorado',685)]:
    groups=[]
    for item in sorted((f for f in fixtures if f[1]==kind),key=lambda f:f[2][0]):
        if groups and abs(item[2][0]-groups[-1][-1][2][0])<.23:groups[-1].append(item)
        else:groups.append([item])
    for group in groups:
        gx=sum(f[2][0] for f in group)/len(group)
        fxlabel=front(gx,0,0)[0]
        labellevel=level-9 if kind=='colorado' and int(group[0][0])>=250 else level
        txt(fxlabel,labellevel,' / '.join(sorted((f[0] for f in group),key=int)),6.5,True,colors.black,'center')
for label,kind,xyz in PROPOSED_PAR:fixture(*front(*xyz),kind,label,k=.7,labeldy=-19)
screen_circle(front)
ex,ez=front(SCREEN_X,SCREEN_Y,SCREEN_Z)
txt(ex,ez+4,'E1',12,True,VIOLET,'center');txt(ex,ez-11,'Ø 1,50 m',9,True,VIOLET,'center')
dimv(ex-.75*fs-18,fy+1.8*fs,fy+3.3*fs,'1,50 m',ex-.75*fs)
tag(ex-.70*fs,fy+1.8*fs-14,'bas +1,80 m*',VIOLET,7.5)
box(*front(DJX-J['width']/2,DJY,STAGE),J['width']*fs,J['height']*fs,None,colors.black,1)
txt(*front(DJX,DJY,STAGE+.4),'DJ FRÄNZE',10,True,colors.black,'center')
xx,zz=front(0,1.1,STAGE)
c.setStrokeColor(TEAL);c.circle(xx,zz+1.62*fs,5,stroke=1,fill=0)
line(xx,zz+1.53*fs,xx,zz+.72*fs,TEAL,2)
for dx in [-.2,.2]:line(xx,zz+.73*fs,xx+dx*fs,zz,TEAL,1.5)
line(xx-17,zz,xx-17,zz+1.35*fs,colors.black,.8)
txt(xx,zz-16,'SLAM AU CENTRE',8,True,TEAL,'center')
txt(45,429,'E1 écarté du mur droit. * Hauteur proposée ; à régler avec l’optique, la visibilité et les accroches.',8)
sx,sy,ss=267,99,1000/65*72/25.4
def side(x,y,z):return sx-y*ss,sy+z*ss
box(sx-SD*ss,sy,SD*ss,STAGE*ss,None,colors.black,1)
line(49,sy,776,sy,colors.black,.9)
line(*side(0,SD,GRID),*side(0,0,GRID),colors.black,1.4)
line(*side(0,SD,RH),*side(0,-10.668,RH),LINE,.7)
for label,kind,xyz in fixtures:
    # All are drawn, overlapping pairs share their existing depth in this view.
    if label in ['104','105','106','112','7','9','11','13','6','5','252','M2','SL1']:
        fixture(*side(*xyz),kind,label,k=.68)
pxpar,pypar=side(0,-4.25,3.30)
fixture(pxpar,pypar,'par',k=.8)
tag(pxpar+13,pypar-16,'S1-S6 : PAR salle proposés',MUTED,7)
xx,_=side(SCREEN_X,SCREEN_Y,0)
line(xx,sy+1.8*ss,xx,sy+3.3*ss,VIOLET,2.7)
line(xx,sy+3.3*ss,xx,sy+GRID*ss,VIOLET,.7,(3,2))
px,py=side(P1X,P1Y,P1Z)
box(px-12,py-6,24,12,None,VIOLET,1)
# Support deliberately unspecified pending DT validation.
poly([side(P1X,P1Y+P['lensForward'],P1Z-P['lensDown']),(xx,sy+3.3*ss),(xx,sy+1.8*ss)],VIOLET,.6,None,(3,3))
tag(px+19,py-2,'P1 - ESSAI',VIOLET,8)
dimh(xx,px,sy+1.28*ss,'corps 2,55 m*')
tag(xx-30,sy+3.3*ss+12,'E1',VIOLET,8)
dimv(77,sy,sy+STAGE*ss,'0,61 m',105)
for d in [3.1,6.1,8.9]:
    xx,zz=side(0,-d,0);c.setStrokeColor(LINE);c.circle(xx,zz+1.62*ss,3.5,stroke=1,fill=0)
    line(xx,zz+1.52*ss,xx,zz+.75*ss,LINE,1)
    line(xx,zz+.75*ss,xx-5,zz,LINE,1);line(xx,zz+.75*ss,xx+5,zz,LINE,1)
txt(160,82,'SCÈNE',8,True,colors.black,'center');txt(560,82,'PUBLIC / DANSE',8,True,ORANGE,'center')
para(44,371,733,'<b>P1 est une proposition de repositionnement.</b> La fiche décrit l’installation existante à 5 pi (1,52 m) de son écran 150 pouces. Dans V08 : corps à 2,55 m, repère de lentille indicatif à 2,27 m. La lentille de la salle est inconnue : essai spatial, non validé optiquement.',8.5)
para(44,319,733,'Trajet vidéo schématique : la lentille ultra-courte peut imposer un décalage et un trajet différents. Le repère de mesure du recul, la hauteur du corps et l’accroche finale restent à fixer après identification de la lentille.',8,color=MUTED)
para(820,389,332,'<b>1. Kit existant.</b> Conserver les positions et le patch du plan LX original. Les PAR S1-S6 sont une proposition complémentaire avec du matériel inventorié, non une implantation existante confirmée.<br/><br/><b>2. Écran E1.</b> Ø environ 1,50 m, suspendu à l’avant droit, écarté du mur vue public. Plan de l’écran sur le nez de scène (y = 0) ; bord droit à 0,82 m du mur. Suspension et sécurité secondaire à définir par le DT.<br/><br/><b>3. Lumières dans la salle.</b> Proposer S1-S6 sur la barre transversale existante, à 4,25 m du nez de scène. Vérifier place disponible, charge, accroches, gradateurs et disponibilité des PAR. Puissance totale : 6 x 500 W = 3 kW.<br/><br/><b>4. Projection.</b> PT-RZ770 et Chief VCMU documentés. Lentille installée non nommée : ne pas appliquer le ratio du zoom standard à l’installation ultra-courte. P1 hors du bar modélisé. Repère lentille à 2,27 m de l’écran, compatible en distance avec ET-DLE085 seulement parmi les deux exemples calculés page 4. Lentille de la salle inconnue.<br/><br/><b>5. Public dansant.</b> PAR : base fixe graduable. Intimidator : effets complémentaires, pan/tilt limités autour d’E1. Régler l’éblouissement et la couverture au fond.<br/><br/><b>6. Accroches.</b> Aucun appareil sur les rails à rideaux. Points approuvés par la salle uniquement. Le 8e Source Four 36° reste non localisé.',8.4)
foot(2);c.showPage()

# PAGE 3: wireframe isometric layout like the venue's overview, plus equipment.
head(3,'VUE D’ENSEMBLE LX / SETUP ET SPÉCIFICATIONS')
pane(28,276,765,468,'ISOMÉTRIE DE REPÉRAGE - SANS ÉCHELLE - IMPLANTATION PROPOSÉE')
pane(810,370,352,374,'ÉQUIPEMENTS TECHNIQUES LX - FICHE SALLE')
pane(810,56,352,303,'VIDÉOPROJECTION - DONNÉES DOCUMENTÉES')
pane(28,56,765,209,'COTES À REPORTER ET RÉGLAGES POUR LE DT')
def iso(x,y,z):return 466+39*x+18*y,463-10*x+11*y+46*z
poly([iso(-SW/2,SD,0),iso(SW/2,SD,0),iso(SW/2,-10.668,0),iso(-SW/2,-10.668,0)],colors.black,.65)
poly([iso(-SW/2,SD,STAGE),iso(SW/2,SD,STAGE),iso(SW/2,0,STAGE),iso(-SW/2,0,STAGE)],colors.black,.9)
for x,y in [(-SW/2,SD),(SW/2,SD),(SW/2,0),(-SW/2,0)]:line(*iso(x,y,0),*iso(x,y,STAGE),colors.black,.7)
for yy in [.807,1.77,2.78,-4.25]:line(*iso(-3.95,yy,GRID),*iso(3.95,yy,GRID),colors.black,.7)
for xx in [-3.87,3.87]:
    for dz in [0,.16]:line(*iso(xx,-.7,3.25+dz),*iso(xx,-10.2,3.25+dz),colors.HexColor('#9B9DB8'),.8)
    line(*iso(xx-.18,-.7,3.25),*iso(xx-.18,-10.2,3.25),colors.HexColor('#9B9DB8'),.5)
for label,target in [('101',(2.3,-2.2)),('106',(-2.3,-2.2)),('102',(2.2,-5)),('105',(-2.2,-5)),('103',(2,-8.3)),('104',(-2,-8.3))]:
    xyz=next(q for a,k,q in fixtures if a==label)
    arrow(*iso(*xyz),*iso(*target,0),ORANGE,.5,(2,3),4)
for label,kind,xyz in fixtures:fixture(*iso(*xyz),kind,label,k=.65)
for label,target in PAR_TARGETS:
    xyz=next(q for a,k,q in PROPOSED_PAR if a==label)
    arrow(*iso(*xyz),*iso(*target,0),MUTED,.6,(4,3),4)
for label,kind,xyz in PROPOSED_PAR:fixture(*iso(*xyz),kind,label,k=.68,labeldy=-22)
# Bar and columns use the shared indicative volumes.
for item,height in [(BAR,BAR['top'])]+[(col,LAYOUT['venue']['ceiling']) for col in LAYOUT['columns']]:
    corners=[(item['x']+dx*item['width']/2,item['y']+dy*item['depth']/2) for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    for zz in [0,height]:poly([iso(x,y,zz) for x,y in corners],MUTED,.5)
    for x,y in corners:line(*iso(x,y,0),*iso(x,y,height),MUTED,.5)
# DJ table as a wireframe solid.
for z in [STAGE,STAGE+.9]:poly([iso(DJX-J['width']/2,DJY-J['depth']/2,z),iso(DJX+J['width']/2,DJY-J['depth']/2,z),iso(DJX+J['width']/2,DJY+J['depth']/2,z),iso(DJX-J['width']/2,DJY+J['depth']/2,z)],colors.black,.8)
for x,y in [(DJX+dx*J['width']/2,DJY+dy*J['depth']/2) for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]]:line(*iso(x,y,STAGE),*iso(x,y,STAGE+.9),colors.black,.8)
tag(*iso(DJX-.4,DJY-.1,STAGE+.5),'DJ',colors.black,8)
poly([iso(-.75,.35,STAGE+.01),iso(.75,.35,STAGE+.01),iso(.75,1.85,STAGE+.01),iso(-.75,1.85,STAGE+.01)],TEAL,.8)
tag(*iso(-.35,.6,STAGE+.05),'SLAM',TEAL,7.5)
screen_circle(iso)
txt(*iso(SCREEN_X,SCREEN_Y,SCREEN_Z),'E1',10,True,VIOLET,'center')
px,py=iso(P1X,P1Y,P1Z);box(px-10,py-6,20,12,None,VIOLET,1)
arrow(px+9,py,*iso(SCREEN_X,SCREEN_Y,SCREEN_Z),VIOLET,.7,(3,2),4)
tag(px-40,py+9,'P1',VIOLET,8)
for d,key in [(2.2,'A'),(5,'B'),(8.3,'C')]:tag(*iso(0,-d,.03),f'PISTE {key}',ORANGE,8)
txt(51,292,'S1-S6 : 6 PAR proposés au-dessus de la piste. Les autres appareils conservent les positions du plan LX existant.',8)
# Full inventory from the source, including reserve items absent from the plot.
rows=[['Appareil','Qté','Donnée principale'],['Colorado 1 Tri Tour','12','LED RGB / ARC1'],['Intimidator Spot 375Z','8','6 suspendus + 2 bas'],['Source Four 25-50°','6','750 W / TL3'],['Source Four 36°','8','575 W / 7 dessinés'],['DMG SL1 Mix','1','200 W'],['DMG Mini Mix','2','100 W'],['PAR 56 WFL','6','500 W / S1-S6 proposés']]
table(819,701,334,[159,34,141],rows,rowheights=[24]+[25]*7,size=8)
para(822,484,330,'<b>Commande :</b> GrandMA3 Command Wing Compact sur PC.<br/><b>Gradateurs :</b> 4 Lite-Putter DX-1210.<br/><b>Distribution DMX :</b> 1 Chauvet Data Stream 4.<br/><b>Brouillard :</b> Antari F-1W, usage à convenir.<br/><b>Complément :</b> conserver l’éclairage général de salle pour accueil et circulation.',8.2)
para(822,326,330,'<b>Panasonic PT-RZ770</b><br/>Laser DLP ; <b>7 000 lumens</b> nominaux.<br/>Résolution native : <b>1920 x 1200, 16:10</b>.<br/>HDMI disponible ; câble annoncé par Rémi.<br/><br/><b>Installation décrite par la salle :</b><br/>Support Chief VCMU ; ultra short throw ; à 5 pi (1,52 m) de l’écran existant 16:9 de 150 pouces.<br/><br/><b>Écran de ce projet :</b> cercle Ø 1,50 m. Prévoir un masque circulaire. Une image 16:10 de 1,50 m de haut mesure 2,40 m de large avant masque.<br/><br/><b>À relever :</b> référence de lentille et repère exact des 5 pi. Le modèle est connu ; le ratio de l’optique installée n’est pas fourni.',8.5)
rows=[['Élément','Cote / destination','Application'],['E1 - écran','x +2,70 ; y 0,00 ; Ø 1,50 m','Bord droit x +3,45 ; mur à 0,82 m. Bas proposé +1,80 m / sol salle.'],['P1 - vidéo','x +2,55 ; y -2,55 ; z +3,00 m','Hors comptoir modélisé. Repère lentille à 2,27 m. Optique, décentrements et support non validés.'],['DJ / slam','DJ : x -3,00 ; y +1,80. Slam : x 0 ; y +1,10.','Table 1,80 x 0,75 m ; mur gauche à 37 cm. Passage artiste derrière puis côté centre.'],['PAR S1-S6','y -4,25 ; x -3,10 / -1,55 / -0,16 / +0,16 / +1,55 / +3,10.','Hauteur de corps proposée +3,30 m. S1/S6 : A ; S3/S4 : B ; S2/S5 : C.']]
table(37,229,747,[105,257,385],rows,rowheights=[24,29,29,29,29],size=8)
para(38,80,743,'<b>Sources :</b> dossier Audio-LX du Ministère (dimensions, inventaire, support et installation vidéo) ; plan LX communiqué par Rémi ; spécifications Panasonic PT-RZ770. Les cotes du nouveau setup sont des propositions de conception, pas un relevé de l’existant.',7.6)
c.linkURL('https://leministere.ca/assets/documents/Le-Minist%C3%A8re_Fiche-technique_Audio-LX.pdf',(38,57,420,85),relative=0,thickness=0)
c.linkURL('https://eu.connect.panasonic.com/sites/default/files/media/document/2024-04/PT-RZ770G_STE_04%28sec%29.pdf',(430,57,783,85),relative=0,thickness=0)
foot(3);c.showPage()
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
foot(4);c.showPage();c.save()
print(OUT)
