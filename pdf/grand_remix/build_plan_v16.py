from pathlib import Path
ROOT = Path(__file__).resolve().parent
# Shared vector drawing helpers; do not regenerate the superseded draft.
exec((ROOT / 'build_plan.py').read_text(encoding='utf-8').split('# SHEET 1:')[0])
OUT = ROOT / 'Grand_Remix_Plan_Technique_V16.pdf'
c = canvas.Canvas(str(OUT), pagesize=(W,H), pageCompression=1)
c.setTitle('Grand Remix - Écran avant droit écarté du mur, DJ gauche, éclairage de piste - V16')
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
    txt(W-30,H-46,'V16 - 07/10/2026 - POUR VALIDATION DT',9,True,ORANGE,'right')
    line(27,H-59,W-27,H-59,colors.black,2)

def foot(n):
    line(28,43,W-28,43,colors.black,1)
    txt(30,29,'Cindy Bélanger - DMTeam | Implantation proposée - non validée DT',8,color=colors.black)
    txt(W/2,29,'Géométrie '+LAYOUT['geometryId'],7,color=MUTED,align='center')
    txt(W-30,29,f'A3 paysage - imprimer à 100 % | {n}/6',8,color=colors.black,align='right')

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
    pts=[project(SCREEN_X+SCREEN_D/2*math.cos(a),SCREEN_Y,SCREEN_Z+SCREEN_D/2*math.sin(a)) for a in [i*2*math.pi/80 for i in range(80)]]
    poly(pts,color,1.4,VIOLET_PALE)
    reserve=[project(SCREEN_X+E['reservationDiameter']/2*math.cos(a),SCREEN_Y,SCREEN_Z+E['reservationDiameter']/2*math.sin(a)) for a in [i*2*math.pi/80 for i in range(80)]]
    poly(reserve,ORANGE,.65,None,(2,3))
    for dx in [-.40,.40]:line(*project(SCREEN_X+dx,SCREEN_Y,SCREEN_Z+math.sqrt((SCREEN_D/2)**2-dx**2)),*project(SCREEN_X+dx,SCREEN_Y,GRID),color,.7,(3,2))

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
for bar in LAYOUT['rigBars']:line(*top(*bar['a']),*top(*bar['b']),TEAL,.9)
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
line(ex-SCREEN_D/2*s,ey,ex+SCREEN_D/2*s,ey,VIOLET,3)
tag(ex-.74*s,ey-18,'E1 Ø 2,00 m estimé',VIOLET,8)
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
    if label=='106':continue
    focus=next(f['focus'] for f in LAYOUT['fixtures'] if f['id']==label)
    if not focus['danceOn']:continue
    target=focus['danceTarget'][:2]
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
notes=[(669,'KIT LX ET AJOUT PROPOSÉ','Kit existant, sauf déposes proposées de 106 pour E1 et Zoom 5 pour P1. Orange : Intimidator vers la piste. Gris : pointage proposé des 6 PAR 56 S1-S6, pris dans l’inventaire de la salle.'),
(585,'DJ À GAUCHE VUE PUBLIC','Table proposée 1,80 x 0,75 m. Centre : x = -3,00 ; y = +1,80. Bord de table à 37 cm du mur gauche. Trajet artiste par le fond puis côté centre.'),
(501,'ÉCRAN ÉCARTÉ DU MUR','Hypothèse Ø 2 m ; place réservée Ø 2,10 m. E1 : centre x = +1,95 ; y = +0,807. Plan sur la première barre derrière le nez de scène ; bord droit x = +2,95, à 1,32 m du mur. Ø environ 2,00 m.'),
(409,'VIDÉOPROJECTEUR À DROITE','Panasonic PT-RZ770. Option B4 : corps x +1,95 ; y -4,25 ; z +2,75 m. Hors comptoir dans la maquette. Repère lentille à 4,78 m d’E1. Couverture et décentrements non validés ; voir calcul page 4. P0 vert : position d’origine.'),
(308,'LUMIÈRES DANS LA SALLE','6 PAR 56 S1-S6 proposés sur la barre salle à y = -4,25 m. S1/S6 vers A ; S3/S4 vers B ; S2/S5 vers C. Implantation et disponibilité à valider.'),
(201,'CADRAGE DU PLAN','Origine au centre du nez de scène. x positif à droite du public ; y positif vers le fond de scène. Dimensions nominales de la fiche.')]
for yy,title,body in notes:
    txt(526,yy,title,8.5,True,colors.black);para(526,yy-11,250,body,8)
scalebar(526,89,s)
para(820,389,332,'<b>E1 :</b> écran suspendu Ø 2,00 m estimé à l’avant droit, sur la première barre, à 0,807 m derrière le nez de scène. Bord droit à 1,32 m du mur droit. Bas proposé +1,05 m, haut +3,05 m / sol salle.<br/><br/><b>P1 :</b> option B4 x +1,95 ; y -4,25 ; z +2,75 m. Enveloppe indicative de 0,50 x 0,50 m, à 0,805 m du bord du comptoir modélisé. Lentille indicative à 4,78 m de l’écran. Lentille réelle, décentrements et accroche non validés.<br/><br/><b>Piste :</b> 6 PAR 56 proposés dans la salle pour une base fixe graduable, complétée par les 7 Intimidator actifs (106 déposé proposé). Les PAR ne sont pas attestés libres ou déjà installés à ces positions.',8.5)
para(820,162,332,'<b>DT :</b> Rémi LeGresley - Le Ministère<br/><b>Base :</b> dossier Audio-LX fourni + plan LX 2023 envoyé par Rémi.<br/><b>Statut :</b> implantation et pointages proposés. Emplacements LX repris graphiquement ; 106 et Zoom 5 déposés proposés. Accroches E1/P1 à valider.',8)
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
txt(ex,ez+4,'E1',12,True,VIOLET,'center');txt(ex,ez-11,'Ø 2,00 m estimé',9,True,VIOLET,'center'); txt(ex,ez-24,'image Ø 1,98 m',6.5,False,VIOLET,'center')
dimv(ex-SCREEN_D/2*fs-18,fy+(SCREEN_Z-SCREEN_D/2)*fs,fy+(SCREEN_Z+SCREEN_D/2)*fs,'2,00 m*',ex-SCREEN_D/2*fs)
tag(ex-.70*fs,fy+(SCREEN_Z-SCREEN_D/2)*fs-14,'bas +1,05 m*',VIOLET,7.5)
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
line(xx,sy+(SCREEN_Z-SCREEN_D/2)*ss,xx,sy+(SCREEN_Z+SCREEN_D/2)*ss,VIOLET,2.7)
line(xx,sy+(SCREEN_Z+SCREEN_D/2)*ss,xx,sy+GRID*ss,VIOLET,.7,(3,2))
px,py=side(P1X,P1Y,P1Z)
box(px-12,py-6,24,12,None,VIOLET,1)
# Candidate support is connected to B4; hardware/load still unverified.
line(*side(P1X,P1Y,P1Z+.12),*side(P1X,P1Y,GRID),VIOLET,1)
line(*side(0,0,GRID),*side(0,-4.25,GRID),TEAL,.9)
poly([side(P1X,P1Y+P['lensForward'],P1Z-P['lensDown']),(xx,sy+(SCREEN_Z+E['imageHeight']/2)*ss),(xx,sy+(SCREEN_Z-E['imageHeight']/2)*ss)],VIOLET,.6,None,(3,3))
tag(px+19,py-2,'P1 / B4 - NON VALIDÉ',VIOLET,8)
dimh(xx,px,sy+1.28*ss,'corps / E1 : 5,06 m*')
tag(xx-30,sy+(SCREEN_Z+SCREEN_D/2)*ss+12,'E1',VIOLET,8)
dimv(77,sy,sy+STAGE*ss,'0,61 m',105)
for d in [3.1,6.1,8.9]:
    xx,zz=side(0,-d,0);c.setStrokeColor(LINE);c.circle(xx,zz+1.62*ss,3.5,stroke=1,fill=0)
    line(xx,zz+1.52*ss,xx,zz+.75*ss,LINE,1)
    line(xx,zz+.75*ss,xx-5,zz,LINE,1);line(xx,zz+.75*ss,xx+5,zz,LINE,1)
txt(160,82,'SCÈNE',8,True,colors.black,'center');txt(560,82,'PUBLIC / DANSE',8,True,ORANGE,'center')
para(44,371,733,'<b>P1 est une proposition de repositionnement.</b> La fiche décrit l’installation existante à 5 pi (1,52 m) de son écran 150 pouces. Dans V16 : corps à 4,25 m devant le nez de scène, repère de lentille indicatif à 4,78 m. La lentille de la salle est inconnue : essai spatial, non validé optiquement.',8.5)
para(44,319,733,'Trajet vidéo schématique : la lentille ultra-courte peut imposer un décalage et un trajet différents. B4 est repérée sur le plan source. Adaptation du Chief VCMU au tube carré, hauteur, charge et lentille à confirmer.',8,color=MUTED)
para(820,389,332,'<b>1. Kit existant.</b> Conserver les positions et le patch, sauf déposes proposées de 106 pour E1 et du Zoom 5 pour P1. Les PAR S1-S6 sont une proposition complémentaire avec du matériel inventorié, non une implantation existante confirmée.<br/><br/><b>2. Écran E1.</b> Ø environ 2,00 m, suspendu à l’avant droit, écarté du mur vue public. Plan de l’écran sur la première barre (y = +0,807) ; bord droit à 1,32 m du mur. Suspension et sécurité secondaire à définir par le DT.<br/><br/><b>3. Lumières dans la salle.</b> Proposer S1-S6 sur la barre transversale existante, à 4,25 m du nez de scène. Vérifier place disponible, charge, accroches, gradateurs et disponibilité des PAR. Puissance totale : 6 x 500 W = 3 kW.<br/><br/><b>4. Projection.</b> PT-RZ770 et Chief VCMU documentés. Lentille installée non nommée : ne pas appliquer le ratio du zoom standard à l’installation ultra-courte. P1 hors du bar modélisé. Repère lentille à 4,78 m de l’écran, option sur B4 compatible en recul avec ET-DLE150 ; disponibilité et décentrement à vérifier. Lentille de la salle inconnue.<br/><br/><b>5. Public dansant.</b> PAR : base fixe graduable. Intimidator : effets complémentaires, lyres fixes pendant la vidéo ; transit avec dimmer fermé. Régler l’éblouissement et la couverture au fond.<br/><br/><b>6. Accroches.</b> Aucun appareil sur les rails à rideaux. Points approuvés par la salle uniquement. Le 8e Source Four 36° reste non localisé.',8.4)
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
for bar in LAYOUT['rigBars']:line(*iso(*bar['a']),*iso(*bar['b']),TEAL,.9)
for xx in [-3.87,3.87]:
    for dz in [0,.16]:line(*iso(xx,-.7,3.25+dz),*iso(xx,-10.2,3.25+dz),colors.HexColor('#9B9DB8'),.8)
    line(*iso(xx-.18,-.7,3.25),*iso(xx-.18,-10.2,3.25),colors.HexColor('#9B9DB8'),.5)
for label,target in [('101',(2.3,-2.2)),('106',(-2.3,-2.2)),('102',(2.2,-5)),('105',(-2.2,-5)),('103',(2,-8.3)),('104',(-2,-8.3))]:
    if label=='106':continue
    focus=next(f['focus'] for f in LAYOUT['fixtures'] if f['id']==label)
    if not focus['danceOn']:continue
    target=focus['danceTarget'][:2]
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
line(*iso(P1X,P1Y,P1Z+.12),*iso(P1X,P1Y,GRID),VIOLET,1)
arrow(px+9,py,*iso(SCREEN_X,SCREEN_Y,SCREEN_Z),VIOLET,.7,(3,2),4)
tag(px-40,py+9,'P1',VIOLET,8)
for d,key in [(2.2,'A'),(5,'B'),(8.3,'C')]:tag(*iso(0,-d,.03),f'PISTE {key}',ORANGE,8)
txt(51,292,'S1-S6 : 6 PAR proposés au-dessus de la piste. 106 et Zoom 5 : déposes proposées pour E1/P1 ; autres points conservés.',8)
# Full inventory from the source, including reserve items absent from the plot.
rows=[['Appareil','Qté','Donnée principale'],['Colorado 1 Tri Tour','12','LED RGB / ARC1'],['Intimidator Spot 375Z','8','5 suspendus + 2 bas ; 106 déposé'],['Source Four 25-50°','6','5 actifs ; Zoom 5 déposé proposé'],['Source Four 36°','8','575 W / 7 dessinés'],['DMG SL1 Mix','1','200 W'],['DMG Mini Mix','2','100 W'],['PAR 56 WFL','6','500 W / S1-S6 proposés']]
table(819,701,334,[159,34,141],rows,rowheights=[24]+[25]*7,size=8)
para(822,484,330,'<b>Commande :</b> GrandMA3 Command Wing Compact sur PC.<br/><b>Gradateurs :</b> 4 Lite-Putter DX-1210.<br/><b>Distribution DMX :</b> 1 Chauvet Data Stream 4.<br/><b>Brouillard :</b> Antari F-1W, usage à convenir.<br/><b>Complément :</b> conserver l’éclairage général de salle pour accueil et circulation.',8.2)
para(822,326,330,'<b>Panasonic PT-RZ770</b><br/>Laser DLP ; <b>7 000 lumens</b> nominaux.<br/>Résolution native : <b>1920 x 1200, 16:10</b>.<br/>HDMI disponible ; câble annoncé par Rémi.<br/><br/><b>Installation décrite par la salle :</b><br/>Support Chief VCMU ; ultra short throw ; à 5 pi (1,52 m) de l’écran existant 16:9 de 150 pouces.<br/><br/><b>Écran de ce projet :</b> cercle Ø 2,00 m estimé. Prévoir un masque circulaire. Gabarit V16 : 3,392 x 2,12 m avant masque, image visible Ø 1,98 m, bord noir intérieur de 1 cm. Réserve native pour réglage du masque.<br/><br/><b>À relever :</b> référence de lentille et repère exact des 5 pi. Le modèle est connu ; le ratio de l’optique installée n’est pas fourni.',8.5)
rows=[['Élément','Cote / destination','Application'],['E1 - écran','x +1,95 ; y +0,807 ; Ø 2,00 m estimé','Bord droit x +2,95 ; mur à 1,32 m. Bas proposé +1,05 m / sol salle.'],['P1 - vidéo','x +1,95 ; y -4,25 ; z +2,75 m','Hors comptoir modélisé. Repère lentille à 4,78 m. Optique, décentrements et support non validés.'],['DJ / slam','DJ : x -3,00 ; y +1,80. Slam : x 0 ; y +1,10.','Table 1,80 x 0,75 m ; mur gauche à 37 cm. Passage artiste derrière puis côté centre.'],['PAR S1-S6','y -4,25 ; x -3,10 / -1,55 / -0,16 / +0,16 / +1,55 / +3,10.','Hauteur de corps proposée +3,30 m. S1/S6 : A ; S3/S4 : B ; S2/S5 : C.']]
table(37,229,747,[105,257,385],rows,rowheights=[24,29,29,29,29],size=8)
para(38,80,743,'<b>Sources :</b> dossier Audio-LX du Ministère (dimensions, inventaire, support et installation vidéo) ; plan LX communiqué par Rémi ; spécifications Panasonic PT-RZ770. Les cotes du nouveau setup sont des propositions de conception, pas un relevé de l’existant.',7.6)
c.linkURL('https://leministere.ca/assets/documents/Le-Minist%C3%A8re_Fiche-technique_Audio-LX.pdf',(38,57,420,85),relative=0,thickness=0)
c.linkURL('https://eu.connect.panasonic.com/sites/default/files/media/document/2024-04/PT-RZ770G_STE_04%28sec%29.pdf',(430,57,783,85),relative=0,thickness=0)
foot(3);c.showPage()
head(4,'CONCORDANCE PLAN / 3D ET CALCUL DU GABARIT VIDÉO')
pane(28,395,1134,349,'DONNÉES COMMUNES - V16 - ESSAI SPATIAL, PAS UN PLAN DE MONTAGE VALIDÉ')
para(45,700,1090,'B4 reste un essai non retenu avec la lentille actuelle ; reprendre le point vidéo avec le DT. Le PDF et la maquette lisent le même fichier implantation.json : positions E1/P1/DJ, dimensions principales, trajet artiste, bar, poteaux et 40 appareils actifs ; 106 et Zoom 5 déposés proposés. Le repère de géométrie est identique dans les deux livrables. Cette concordance ne remplace pas un relevé architectural.',12)
rows=[['Élément','Repères communs en mètres','Niveau de validation'],['Scène / parterre','8,5344 x 3,6576 ; parterre 8,5344 x 10,668','Dimensions nominales du dossier de salle'],['Écran E1',f"x {SCREEN_X:.2f} ; y {SCREEN_Y:.2f} ; z {SCREEN_Z:.2f} ; diamètre {SCREEN_D:.2f}",'Proposé : suspension et visibilité à valider'],['Projecteur P1',f"x {P1X:.2f} ; y {P1Y:.2f} ; z {P1Z:.2f}",'Option B4 ; lentille installée et adaptation support non validées'],['DJ',f"x {DJX:.2f} ; y {DJY:.2f} ; table 1,80 x 0,75",'Proposé ; dégagement mur 0,367 m'],['Bar / poteaux','Mêmes volumes indicatifs dans les deux vues','Aucun relevé coté disponible ; collisions réelles non garanties'],['Lumières','34 existants actifs + 6 PAR proposés = 40','Positions reprises graphiquement ; accroches réelles à conserver']]
table(45,627,1097,[165,445,487],rows,rowheights=[25]+[27]*6,size=9)
pane(28,56,1134,326,'CALCUL DE COUVERTURE - IDENTIFIER LA LENTILLE AVANT DE FIXER LE RECUL')
diag=math.hypot(E['imageWidth'],E['imageHeight'])/.0254
low=diag*.0174-.0471; high=diag*.0216-.0442
dle150low=diag*.0286-.054; dle150high=diag*.0413-.0498
stdlow=diag*.0379-.0746; stdhigh=diag*.0529-.0725
para(45,345,1089,f"<b>Dimension estimée :</b> Ø 2,00 m non mesuré ; réserve d’encombrement Ø 2,10 m. E1 et P1 rapprochés de 0,30 m vers le centre pour dégager le bar et le poteau.<br/><b>Image demandée :</b> cercle Ø 2,00 m estimé ; image visible Ø 1,98 m, bord noir de 1 cm. Gabarit natif 16:10 = 3,392 x 2,12 m, diagonale {diag:.3f} pouces. Réserve optique de 2,12 m en hauteur ; masque à ajuster au diamètre réel, jusque 2,10 m. Le gabarit doit être noir hors du cercle.<br/><br/><b>Option B4 :</b> corps P1 x +1,95 ; y -4,25 ; z +2,75 m. Écran x +1,95 ; y +0,807 ; z +2,05 m. Lentille indicative avancée de 0,28 m : L = 4,25 - 0,28 + 0,807 = <b>4,777 m</b>. Alignement horizontal : 0,00 m ; écart vertical : 2,75 - 0,01 - 2,05 = 0,69 m.<br/><br/><b>Zoom standard / ET-DLE170 :</b> plage de recul {stdlow:.3f} à {stdhigh:.3f} m, d’après les formules constructeur. Recul insuffisant à B4 pour ce gabarit avec réserve.<br/><b>ET-DLE150 :</b> plage {dle150low:.3f} à {dle150high:.3f} m : 4,777 m est dans la plage. Décentrement vertical et repère réel à contrôler.<br/><b>ET-DLE085 :</b> plage {low:.3f} à {high:.3f} m ; ne convient pas à ce recul et à ce gabarit.<br/><br/><b>Conclusion conditionnelle :</b> la position B4 est une option avec une optique appropriée, pas une installation confirmée avec la lentille actuelle. La salle décrit un montage ultra-court sans identifier sa lentille. Référence et disponibilité de l’optique indispensables avant de retenir B4.<br/><br/><b>Accroche :</b> barre transversale reprise graphiquement ; cotes non relevées. Chief VCMU inventorié, mais adaptation, charge et longueur de suspension non documentées. Zoom 5 réservé à la dépose pour P1 ; 106 pour E1. Le dessin ne certifie ni leur déplacement ni la capacité de la structure. Corps à 0,805 m du comptoir indicatif ; gabarit à environ 0,21 m du comptoir et 0,28 m du poteau en plan ; visibilité, ventilation et obstacles réels à vérifier.<br/><br/><b>Source :</b> Panasonic PT-RZ770 Spec File, pages 15–16 ; plan LX et fiche Audio-LX du Ministère. Les rayons sont un gabarit cible, pas une simulation de la lentille installée.",10.5)
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
line(*rigp(SCREEN_X-SCREEN_D/2,SCREEN_Y),*rigp(SCREEN_X+SCREEN_D/2,SCREEN_Y),VIOLET,4)
tag(*rigp(SCREEN_X-.45,SCREEN_Y+.22),'E1 / B1',VIOLET,9)
pp=rigp(P1X,P1Y);box(pp[0]-.25*rs,pp[1]-.25*rs,.5*rs,.5*rs,VIOLET_PALE,VIOLET,1.2)
tag(pp[0]-20,pp[1]-31,'P1 / B4',VIOLET,9)
line(*rigp(P1X,P1Y+.28),*rigp(SCREEN_X,SCREEN_Y),VIOLET,1,(4,3))
dimv(656,rigp(0,-4.25)[1],rigp(0,0)[1],'env. 4,25 m',rigp(3.95,0)[0])
txt(50,110,'Vert : tubes repérés. Jaune : rails à rideaux, accroche interdite.',9)
txt(50,91,'Une section sans appareil n’est pas un point de charge validé.',9,True,ORANGE)
para(751,702,392,'<b>B1–B3 : traverses de scène.</b><br/>y ≈ +0,807 / +1,77 / +2,78 m depuis le bord avant.<br/><br/><b>B4 : traverse salle.</b><br/>y ≈ -4,25 m. P1 proposé à x +1,95 m, dans l’axe d’E1. Environ 2,32 m du mur droit à l’axe, selon la largeur nominale.<br/><br/><b>L-G / L-C / L-D : tracés longitudinaux.</b><br/>x ≈ -3,36 / -0,20 / +3,02 m ; de la scène vers B4. Repérage graphique : continuité, extrémités et nature de chaque tronçon à confirmer.<br/><br/><b>Section documentée :</b> tubes carrés 2 x 2 pouces (50,8 mm). Aucun rail à rideaux, conduit de ventilation ou élément décoratif n’est retenu comme point d’accroche.<br/><br/><b>Priorités projection :</b><br/>106 : dépose proposée pour la suspension E1 sur B1.<br/>Zoom 5 : dépose proposée pour le support P1 sur B4.<br/>Les deux restent à l’inventaire, sans nouvel emplacement attribué.<br/><br/><b>Avant montage :</b> DT à consulter pour identification de la lentille, contrôle du support Chief VCMU, fixation adaptée au tube carré, capacité de charge, suspension secondaire, refroidissement et trajet optique réel.<br/><br/><b>Fidélité du modèle :</b> mêmes segments et coordonnées dans le PDF et le 3D. Le dossier ne donne ni un relevé complet de tous les points cachés ni leurs charges admissibles. Ce repérage ne remplace pas la visite technique.',10)
foot(5);c.showPage()
head(6,'FOCUS LX - PROTECTION DES DEUX FACES DE L’ÉCRAN')
pane(28,56,680,688,'ORIENTATIONS PARTAGÉES AVEC LE 3D - VIDÉO ACTIVE')
pane(724,56,438,688,'CONSIGNES POUR LE FOCUS ET LA PROGRAMMATION')
groups={}
for f in LAYOUT['fixtures']:
    focus=f['focus']; key=(focus['role'],focus['slamOn'],focus['danceOn'])
    groups.setdefault(key,[]).append(f['id'])
rows=[['Appareils','Destination','Slam + vidéo','Danse + vidéo']]
for (role,slam,dance),ids in groups.items():rows.append([', '.join(ids),role,'ALLUMÉ' if slam else 'ÉTEINT','ALLUMÉ' if dance else 'ÉTEINT'])
table(42,700,652,[310,108,117,117],rows,rowheights=[27]+[37]*(len(rows)-1),size=9)
para(43,175,644,'Allumé = état proposé après réglage du focus. Éteint = faisceau non retenu pendant la vidéo, sans dépose physique. Source Four : utiliser les couteaux pour couper les débordements ; Zoom : resserrer si nécessaire. Ne pas confondre ces coupures avec les déposes proposées de 106 et 5. Les niveaux précis restent à programmer en salle.',10)
para(741,700,399,'<b>1. Lumières derrière E1.</b> Orienter vers le centre artiste ou le DJ, en évitant aussi le dos de la toile. Aucun éclairage direct sur l’une ou l’autre face du cercle.<br/><br/><b>2. Appareils à risque.</b> Les états ci-contre coupent les faisceaux dont le volume illustratif s’approche trop de l’écran. Une rotation ne garantit pas l’absence de débordement : contrôler les contours et la diffusion réelle.<br/><br/><b>3. Lyres.</b> Positions de focus fixes tant que la projection est active. Retirer les mouvements automatiques dans cet état. Transitions avec dimmer fermé ; réouverture au point vérifié. Aucune valeur pan/tilt DMX inventée.<br/><br/><b>4. Zone protégée.</b> Contrôle conservateur autour d’une sphère de rayon 1,20 m centrée sur E1 : réserve écran Ø 2,10 m plus 15 cm. Les rayons de faisceau sont des gabarits de conception, pas des mesures photométriques.<br/><br/><b>5. Trajet vidéo.</b> Garder appareils, câbles et accessoires hors du faisceau vidéo réel. Les appareils derrière la toile ne bloquent pas une projection frontale si aucun élément ne dépasse devant elle ; ils peuvent néanmoins éclairer son dos. Recontrôler après identification de la lentille et du nouveau point P1.<br/><br/><b>6. Validation réelle.</b> Tester une mire blanche puis noire avec chaque appareil séparément, de face et derrière la toile. Corriger couteaux, zoom et orientation ; laisser éteint tout appareil qui lave l’image. Vérifier aussi les reflets et le brouillard.<br/><br/><b>Portée :</b> consignes et maquette mises à jour ; aucun réglage de la GrandMA3 ni déplacement réel exécuté.',10)
foot(6);c.showPage();c.save()
print(OUT)
