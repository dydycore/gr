from pathlib import Path
import math
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parents[2] / 'tmp' / 'pdfs' / 'grand-remix' / 'Ministere23_Front.pdf'
ROOT.mkdir(parents=True, exist_ok=True)
FONT = Path('C:/Windows/Fonts')
def font_path(filename, fallbacks):
    for candidate in [FONT / filename, *(Path(p) for p in fallbacks)]:
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError(filename)
pdfmetrics.registerFont(TTFont('Arial', font_path('arial.ttf', ['/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'])))
pdfmetrics.registerFont(TTFont('ArialB', font_path('arialbd.ttf', ['/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'])))
W, H = landscape(A3)
INK = colors.HexColor('#172B3A')
MUTED = colors.HexColor('#596B78')
LINE = colors.HexColor('#BBC7CF')
PALE = colors.HexColor('#F3F6F8')
TEAL = colors.HexColor('#137A79')
TEAL_PALE = colors.HexColor('#EAF5F2')
VIOLET = colors.HexColor('#7042AE')
VIOLET_PALE = colors.HexColor('#F2EDF9')
AMBER = colors.HexColor('#AD6A12')
AMBER_PALE = colors.HexColor('#FFF5DF')
S50 = 1000 / 50 * 72 / 25.4
S75 = 1000 / 75 * 72 / 25.4
SW, SD, RH, STAGE, GRID = 8.5344, 3.6576, 3.81, .6096, 3.6576
SCREEN_X, SCREEN_Y, SCREEN_Z, SCREEN_D = -2.15, -.30, 2.55, 1.50
BODY = ROOT / '_plan_body.pdf'
OUT = ROOT / 'Grand_Remix_Plan_Scene_Lumiere_Projection_V02.pdf'
c = canvas.Canvas(str(BODY), pagesize=(W, H), pageCompression=1)
c.setTitle('Grand Remix - Le Ministère - Implantation, lumière et projection - V02')
c.setAuthor('Cindy Bélanger - DMTeam | Mise en plan préparatoire')

def txt(x, y, s, size=9, bold=False, color=INK, align='left'):
    c.setFillColor(color); c.setFont('ArialB' if bold else 'Arial', size)
    {'left': c.drawString, 'center': c.drawCentredString, 'right': c.drawRightString}[align](x,y,s)

def para(x,y,w,s,size=9,color=INK,leading=None):
    style=ParagraphStyle('body',fontName='Arial',fontSize=size,leading=leading or size*1.38,textColor=color,spaceAfter=0)
    p=Paragraph(s,style); _,h=p.wrap(w,1000); p.drawOn(c,x,y-h); return y-h

def line(x1,y1,x2,y2,color=LINE,width=.7,dash=None):
    c.saveState();c.setStrokeColor(color);c.setLineWidth(width)
    if dash:c.setDash(*dash)
    c.line(x1,y1,x2,y2);c.restoreState()

def box(x,y,w,h,fill=None,stroke=LINE,width=.7,r=0):
    c.saveState();c.setLineWidth(width)
    c.setStrokeColor(stroke or colors.white);c.setFillColor(fill or colors.white)
    if r:c.roundRect(x,y,w,h,r,stroke=int(stroke is not None),fill=int(fill is not None))
    else:c.rect(x,y,w,h,stroke=int(stroke is not None),fill=int(fill is not None))
    c.restoreState()

def arrow(x1,y1,x2,y2,color=INK,width=.9,dash=None,head=5):
    line(x1,y1,x2,y2,color,width,dash)
    a=math.atan2(y2-y1,x2-x1)
    p=c.beginPath();p.moveTo(x2,y2)
    p.lineTo(x2-head*math.cos(a-.48),y2-head*math.sin(a-.48))
    p.lineTo(x2-head*math.cos(a+.48),y2-head*math.sin(a+.48));p.close()
    c.setFillColor(color);c.drawPath(p,stroke=0,fill=1)

def dimh(x1,x2,y,label,ext=None):
    if ext is not None:
        line(x1,ext,x1,y+3);line(x2,ext,x2,y+3)
    line(x1,y,x2,y,MUTED,.6)
    for x in [x1,x2]:line(x-3,y-3,x+3,y+3,MUTED,.7)
    tw=pdfmetrics.stringWidth(label,'Arial',8)
    box((x1+x2-tw)/2-4,y-4,tw+8,12,colors.white,None)
    txt((x1+x2)/2,y-1,label,8,color=MUTED,align='center')

def dimv(x,y1,y2,label,ext=None):
    if ext is not None:
        line(ext,y1,x-3,y1);line(ext,y2,x-3,y2)
    line(x,y1,x,y2,MUTED,.6)
    for y in [y1,y2]:line(x-3,y-3,x+3,y+3,MUTED,.7)
    c.saveState();c.translate(x-6,(y1+y2)/2);c.rotate(90)
    tw=pdfmetrics.stringWidth(label,'Arial',8);box(-tw/2-4,-3,tw+8,12,colors.white,None)
    txt(0,0,label,8,color=MUTED,align='center');c.restoreState()

def small_heading(x,y,number,title,w):
    txt(x,y,number,9,True,TEAL);txt(x+25,y,title,11,True)
    line(x,y-10,x+w,y-10)

def header(number,title,subtitle):
    txt(34,H-37,'GRAND REMIX',25,True)
    txt(34,H-58,'LE MINISTÈRE  /  30 OCTOBRE 2026  /  CINDY BÉLANGER - DMTEAM',9,True,MUTED)
    box(W-317,H-61,283,31,AMBER_PALE,None,r=4)
    txt(W-175,H-43,'AVANT-PROJET À VALIDER',10,True,AMBER,'center')
    line(34,H-73,W-34,H-73,INK,1.2)
    txt(34,H-94,f'{number}  {title}',13,True)
    txt(34,H-110,subtitle,8.5,color=MUTED)

def footer(n,title,scale):
    line(34,47,W-34,47,INK,.9)
    txt(34,32,'V02  |  07 OCT. 2026  |  Implantation proposée, sans validation d’accrochage',8,color=MUTED)
    txt(W-34,32,f'{title}  |  {scale}  |  {n}/3',8,color=MUTED,align='right')

def scalebar(x,y,scale):
    for i in range(4):box(x+i*.5*scale,y,.5*scale,4,INK if i%2==0 else colors.white,INK,.5)
    txt(x,y-12,'0',7,color=MUTED);txt(x+scale,y-12,'1',7,color=MUTED,align='center');txt(x+2*scale,y-12,'2 m',7,color=MUTED,align='center')

def table(x,y,width,cols,rows,head=True,rowheights=None,size=8.5):
    for i,row in enumerate(rows):
        h=(rowheights[i] if rowheights else 31)
        box(x,y-h,width,h,INK if head and i==0 else (PALE if i%2 else colors.white),None)
        xx=x
        for j,cell in enumerate(row):
            para(xx+8,y-7,cols[j]-16,cell,size,colors.white if head and i==0 else INK)
            xx+=cols[j]
        line(x,y-h,x+width,y-h,LINE,.5);y-=h
    return y

# SHEET 1: a scaled plan and front elevation, with explicit proposed coordinates.
header('01','IMPLANTATION SCÉNIQUE ET PISTE DE DANSE','Orientation de référence : depuis le public, écran à gauche et DJ à droite. Toutes les cotes sont en mètres.')
small_heading(38,704,'A','VUE DE DESSUS - 1:75',449)
ox,oy,s=252,520,S75
def top(x,y):return ox+x*s,oy+y*s
lx,by=top(-SW/2,-10.668)
box(lx,by,SW*s,10.668*s,colors.white,INK,1)
sx,sy=top(-SW/2,0)
box(sx,sy,SW*s,SD*s,PALE,INK,1.2)
txt(ox,oy+SD*s-17,'FOND DE SCÈNE',8,True,MUTED,'center')
line(ox,oy-10.668*s,ox,oy+SD*s,LINE,.6,(4,4))
dimh(lx,lx+SW*s,676,'8,53 m - mur à mur',oy+SD*s)
dimv(62,oy,oy+SD*s,'3,66 m',lx)
dimv(62,by,oy,'10,67 m - parterre',lx)
txt(ox,oy+9,'NEZ DE SCÈNE  /  +0,61 m',8,True,MUTED,'center')
# Reserved slam footprint and a DJ table at half depth.
x,y=top(-.75,.35);box(x,y,1.5*s,1.5*s,TEAL_PALE,TEAL,1)
txt(ox,y+.88*s,'SLAM',10,True,TEAL,'center');txt(ox,y+.49*s,'1 artiste',8,color=TEAL,align='center')
x,y=top(1.10,1.425);box(x,y,1.8*s,.75*s,colors.white,INK,1)
txt(x+.9*s,y+.4*s,'DJ FRÄNZE',8,True,INK,'center')
px,py=top(2,2.48);c.setStrokeColor(INK);c.setFillColor(colors.white);c.circle(px,py,5,stroke=1,fill=1)
txt(ox+2*s,oy+.82*s,'table proposée 1,80 x 0,75',7,color=MUTED,align='center')
# Round screen seen edge-on, centered left in front of the stage.
x1,y1=top(SCREEN_X-SCREEN_D/2,SCREEN_Y);x2,_=top(SCREEN_X+SCREEN_D/2,SCREEN_Y)
line(x1,y1,x2,y1,VIOLET,4)
txt((x1+x2)/2,y1-17,'E1 - ÉCRAN Ø 1,50',8,True,VIOLET,'center')
txt((x1+x2)/2,y1-30,'suspendu, 0,30 m devant*',7.5,color=VIOLET,align='center')
# Audience dance zones: semantic coverage, not light fixture positions.
zones=[(-3.30,-1.15,'A','AVANT'),(-6.65,-3.55,'B','MILIEU'),(-9.95,-6.90,'C','FOND')]
for ymin,ymax,key,label in zones:
    x,y=top(-3.50,ymin);box(x,y,7*s,(ymax-ymin)*s,AMBER_PALE,None)
    txt(ox,y+(ymax-ymin)*s/2+5,f'{key}  /  PISTE {label}',10,True,AMBER,'center')
    txt(ox,y+(ymax-ymin)*s/2-10,'zone de couverture lumière à régler',7.5,color=AMBER,align='center')
# Projector alignment corridor, deliberately without invented installation point.
ax,ay=top(SCREEN_X,-6.6);_,ay2=top(SCREEN_X,-1.8)
box(ax-7,ay,14,ay2-ay,VIOLET_PALE,None)
arrow(ax,ay,ax,y1-5,VIOLET,1,(5,3),6)
c.saveState();c.translate(ax-12,(ay+ay2)/2);c.rotate(90)
txt(0,0,'P1 : axe vidéo en hauteur - distance à déterminer',7.5,True,VIOLET,'center');c.restoreState()
txt(ox,by+10,'PUBLIC / DANSE - implantation finale et régie à confirmer',7.2,color=MUTED,align='center')
arrow(438,136,438,176,TEAL,1.2,head=7)
txt(438,121,'REGARD',7.5,True,TEAL,'center');txt(438,111,'DU PUBLIC',7.5,True,TEAL,'center')
scalebar(91,83,s)
txt(195,87,'* Recul proposé, à ajuster avec la salle.',7.5,color=MUTED)
txt(195,74,'Zones A/B/C = fonctions lumière, sans ajout d’appareils.',7.5,color=MUTED)

small_heading(518,704,'B','VUE DE FACE DEPUIS LE PUBLIC - 1:50',635)
fx,fy,fs=829,452,S50
def front(x,z):return fx+x*fs,fy+z*fs
x,y=front(-SW/2,0);box(x,y,SW*fs,STAGE*fs,PALE,INK,1)
line(*front(-SW/2,GRID),*front(SW/2,GRID),INK,2)
line(*front(-SW/2,RH),*front(SW/2,RH),LINE,.7)
txt(fx,fy+GRID*fs+7,'GRIL EXISTANT : +3,66 m / sol salle',7.5,color=MUTED,align='center')
# Fixed LX plotted from original elevation. Graphical coordinates are not survey data.
for i,xx in enumerate([-2.62,-1.85,-1.24,1.20,1.85,2.62],101):
    px,py=front(xx,3.35);box(px-6,py-6,12,15,AMBER_PALE,AMBER,.9,r=2)
    line(px-8,py+12,px+8,py+12,AMBER,1)
    txt(px,py+18,str(i),6.5,True,AMBER,'center')
for i,xx in [(111,-3.79),(112,3.79)]:
    px,py=front(xx,1.45);box(px-6,py-5,12,13,AMBER_PALE,AMBER,.9,r=2)
    box(px-15,fy+STAGE*fs,30,.60*fs,None,LINE,.8)
    txt(px,py-17,str(i),6.5,True,AMBER,'center')
# Screen dimensions and unvalidated hanging points.
ex,ez=front(SCREEN_X,SCREEN_Z)
c.setStrokeColor(VIOLET);c.setFillColor(VIOLET_PALE);c.setLineWidth(1.5);c.circle(ex,ez,.75*fs,fill=1,stroke=1)
for dx in [-.40,.40]:line(*front(SCREEN_X+dx,3.19),*front(SCREEN_X+dx,GRID),VIOLET,.8,(3,2))
txt(ex,ez+5,'E1',14,True,VIOLET,'center');txt(ex,ez-11,'Ø 1,50 m',10,True,VIOLET,'center')
txt(ex,fy+1.61*fs,'BAS ÉCRAN : +1,80 m*',7.2,color=VIOLET,align='center')
dimv(560,fy+1.8*fs,fy+3.3*fs,'1,50 m',ex-.75*fs)
# Performer and microphone icon.
px,pz=front(0,STAGE)
c.setStrokeColor(TEAL);c.setFillColor(TEAL_PALE);c.circle(px,pz+1.62*fs,.095*fs,fill=1,stroke=1)
line(px,pz+1.5*fs,px,pz+.72*fs,TEAL,3)
for dx in [-.2,.2]:
    line(px,pz+.73*fs,px+dx*fs,pz,TEAL,2)
    line(px,pz+1.36*fs,px+dx*fs,pz+.95*fs,TEAL,2)
line(px-18,pz,px-18,pz+1.32*fs,INK,.9);line(px-24,pz,px-12,pz,INK,.9)
txt(px,pz-17,'SLAM AU CENTRE',8.5,True,TEAL,'center')
x,y=front(1.10,STAGE);box(x,y,1.80*fs,.90*fs,colors.white,INK,1)
txt(x+.9*fs,y+.42*fs,'DJ FRÄNZE',9,True,INK,'center')
txt(x+.9*fs,y-17,'À DROITE, MI-PROFONDEUR',7.8,True,INK,'center')
txt(520,416,'* Hauteur d’écran proposée. Accroches et visibilité à valider.',8,color=MUTED)
txt(520,402,'Symboles orange : Intimidator existants. Implantation complète : annexe, feuille 3.',8,color=MUTED)
scalebar(1010,410,fs)

small_heading(518,365,'C','COTES D’IMPLANTATION PROPOSÉES',635)
rows=[['Élément','Position / dimensions','Statut'],
['Écran E1','Centre x = -2,15 ; y = -0,30.<br/>Ø 1,50 ; bas z = 1,80 ; haut z = 3,30.','Côté et suspension demandés.<br/>Cotes exactes à valider.'],
['Table DJ','Centre x = +2,00 ; y = +1,80.<br/>Emprise proposée : 1,80 x 0,75.','À droite, à mi-profondeur.<br/>Mesurer la table réelle.'],
['Zone slam','Centre x = 0 ; y = +1,10.<br/>Zone proposée : 1,50 x 1,50.','Centre dégagé pour 1 artiste.'],
['Vidéoprojecteur P1','Axe gauche aligné avec E1.<br/>Prévoir 0,30 à 0,50 m de réserve de recul.','Distance de base et support à confirmer.<br/>Réserve soumise à la plage optique.']]
table(518,343,635,[107,304,224],rows,rowheights=[27,45,45,43,45],size=8.5)
para(518,119,635,'<b>Repère :</b> origine x = 0 au centre du nez de scène ; x positif vers la droite du public ; y positif vers le fond de scène ; z depuis le sol de la salle. Les côtés gauche/droite de ce document sont toujours ceux du public.',8.5)
para(518,78,635,'<b>Lecture :</b> traits noirs = salle existante ; violet = projection proposée ; vert = slam ; ambre = éclairage de la piste. Imprimer à 100 % sur A3 pour conserver les échelles.',8.2)
footer(1,'IMPLANTATION','A3 / échelles indiquées')
c.showPage()

# SHEET 2: projection feasibility and show-light allocation.
header('02','PROJECTION ET ÉCLAIRAGE DU PUBLIC','Conception avec le kit fixe du Ministère. Aucun appareil supplémentaire ni déplacement du kit n’est présumé.')
small_heading(38,704,'D','COUPE SUR L’AXE DE L’ÉCRAN GAUCHE - 1:50',709)
cx,cy,ss=284,453,S50
def section(distance,z):return cx+distance*ss,cy+z*ss
# Positive distance points into auditorium. Stage behind zero.
box(cx-SD*ss,cy,SD*ss,STAGE*ss,PALE,INK,1)
line(55,cy,745,cy,INK,1)
line(*section(-SD,RH),*section(7.8,RH),LINE,.7)
line(*section(-SD,GRID),*section(0,GRID),INK,2)
txt(cx-SD*ss/2,cy+18,'SCÈNE EXISTANTE',8,True,MUTED,'center')
txt(620,cy-18,'SALLE / PISTE DE DANSE',8,True,AMBER,'center')
screen_dist=-SCREEN_Y
ex,_=section(screen_dist,0)
line(ex,cy+1.8*ss,ex,cy+3.3*ss,VIOLET,3)
line(ex,cy+3.3*ss,ex,cy+GRID*ss,VIOLET,.9,(3,3))
txt(ex-10,cy+3.38*ss,'E1',10,True,VIOLET,'right')
dimv(66,cy,cy+STAGE*ss,'0,61 m',80)
dimv(321,cy+1.8*ss,cy+3.3*ss,'Ø 1,50 m',ex)
dimv(349,cy,cy+1.8*ss,'bas : +1,80 m*',ex)
# An illustrative projector with no coordinate approval.
pdist,pheight=5.9,3.35
px,py=section(pdist,pheight)
c.saveState();c.setFillColor(VIOLET_PALE)
path=c.beginPath();path.moveTo(px-12,py);path.lineTo(ex,cy+1.8*ss);path.lineTo(ex,cy+3.3*ss);path.close();c.drawPath(path,fill=1,stroke=0);c.restoreState()
line(px-12,py,ex,cy+1.8*ss,VIOLET,.7,(4,3));line(px-12,py,ex,cy+3.3*ss,VIOLET,.7,(4,3))
box(px-12,py-8,27,16,colors.white,VIOLET,1,r=2)
box(px-17,py-5,5,10,VIOLET_PALE,VIOLET,.8)
line(px+3,py+8,px+3,cy+GRID*ss,VIOLET,.8,(3,2))
txt(px+23,py+2,'P1',10,True,VIOLET)
txt(470,cy+3.95*ss,'POSITION GRAPHIQUE INDICATIVE',8,True,VIOLET)
para(463,py-30,265,'Projecteur en hauteur, côté public gauche.<br/>Prévoir 0,30 à 0,50 m de réserve de recul*.<br/>Distance de base et support à déterminer.',8.5,VIOLET)
arrow(px+17,py+23,px+17+.5*ss,py+23,VIOLET,.9,(2,2),4)
txt(px+17+.25*ss,py+35,'réserve*',7,color=VIOLET,align='center')
dimh(ex,px-12,cy+1.38*ss,'D optique : à déterminer')
# Generic standing audience silhouettes: do not imply validated sightlines.
for d in [1.55,3.4,7.1]:
    xx,zz=section(d,0)
    c.setStrokeColor(LINE);c.circle(xx,zz+1.60*ss,4,fill=0,stroke=1)
    line(xx,zz+1.52*ss,xx,zz+.8*ss,LINE,1.4)
    line(xx,zz+.8*ss,xx-6,zz,LINE,1.2);line(xx,zz+.8*ss,xx+6,zz,LINE,1.2)
txt(39,415,'* Hauteur proposée : vérifier visibilité du public, obstacles et absence d’ombres dans le faisceau.',8,color=MUTED)
scalebar(624,420,ss)

small_heading(780,704,'E','VALIDATION DE LA PROJECTION',372)
yy=677
for num,title,body in [
('1','Identifier le matériel réellement utilisé','Le courriel de Rémi confirme une solution de projection et un câble HDMI. Il ne précise ni lentille ni position exploitable pour ce cercle.'),
('2','Distance et petite réserve de recul','Calculer la distance selon la lentille ; prévoir 0,30 à 0,50 m d’ajustement vers l’arrière, si l’optique et l’accroche le permettent. Cette réserve ne valide pas un déplacement du support existant.'),
('3','Préparer le masque circulaire','Un cercle de 1,50 m exige une image dont la hauteur utile couvre 1,50 m. À titre de calcul : largeur 2,67 m en 16:9 ou 2,40 m en 16:10 ; format réel à confirmer.'),
('4','Tester avec l’éclairage de la piste','Régler focus, géométrie et masque. Vérifier la lumière résiduelle autour du cercle, les ombres du public et les positions des Intimidator qui touchent l’écran.')]:
    txt(780,yy,f'{num}. {title}',9.5,True,VIOLET)
    yy=para(780,yy-10,372,body,8.5)-16

small_heading(38,373,'F','PLAN DE FONCTIONS LUMIÈRE - SCÈNE ET PISTE',709)
rows=[['Groupe / matériel existant','Fonction proposée','Réglage / limite'],
['Source Four / Colorado / DMG','Visage de l’artiste au centre ; table DJ à droite ; ambiance scénique.','Choisir les circuits au focus avec Rémi. Éviter tout débordement sur E1.'],
['Intimidator 101 à 106<br/>6 appareils suspendus','Éclairage dynamique de la piste.<br/>Répartir entre A avant, B milieu et C fond.','Affectation appareil-zone après essais. Faisceaux ouverts / zoom adapté ; amplitude limitée autour d’E1.'],
['Intimidator 111 et 112<br/>2 appareils bas existants','Complément d’effets pour la piste si les angles sont exploitables.','Vérifier l’éblouissement aux premiers rangs. Les exclure des effets public si les angles ne conviennent pas.'],
['Éclairage général de salle','Accueil, entracte, sortie et circulation.','Circuits existants à identifier avec la salle. Ne pas les confondre avec les effets de spectacle.']]
table(38,352,709,[181,264,264],rows,rowheights=[26,43,52,52,43],size=8.2)
para(38,126,709,'<b>Les huit Intimidator restent à leurs emplacements existants.</b> Les zones A/B/C indiquent la couverture recherchée, pas de nouvelles accroches. La portée au fond du parterre reste à tester. Les effets mobiles ne garantissent pas un éclairage uniforme de toute la piste.',8.6)
para(38,81,709,'<b>États proposés :</b> slam = visage stable + piste discrète ; slam dansant = visage stable + mouvements doux dans la salle ; interlude/DJ = piste plus présente. Niveaux et vitesse à régler avec l’éclairagiste.',8.4)

small_heading(780,373,'G','BASE DOCUMENTAIRE ET INVENTAIRE',372)
yy=350
yy=para(780,yy,372,'<b>Plan joint par Rémi, Ministere23_Front.pdf :</b><br/>8 Intimidator Spot 375Z ; 7 Source Four 36° ; 6 Source Four 25/50 Zoom ; 12 Colorado 1 Tour-Tri ; 1 DMG SL1 ; 2 DMG Mini Mix. Plan original reproduit en feuille 3.',8.4)-11
yy=para(780,yy,372,'<b>Rémi, message daté du 6 mars, transféré par Ivy le 12 août 2026 :</b> kit fixe ; Intimidator utilisables vers la salle. Tout ajout demande location, personnel d’installation et vérification de compatibilité GrandMA3.',8.4)-11
yy=para(780,yy,372,'<b>Ivy, 31 août :</b> scénographie comprenant les lumières sur scène et dans le public. <b>3 septembre :</b> ébauche souhaitée début octobre, délai possible jusqu’au 10 octobre.',8.4)-11
yy=para(780,yy,372,'<b>Fiche publique du Ministère :</b> scène 28 x 12 pi ; hauteur 2 pi ; gril 10 pi au-dessus de la scène ; parterre 28 x 35 pi. Cotes nominales à contrôler sur place.',8.4)-11
yy=para(780,yy,372,'<b>Décisions Cindy, 7 octobre :</b> cercle env. 1,50 m suspendu devant à gauche ; DJ à droite à mi-profondeur ; slam central ; public dansant éclairé ; petite marge de recul du vidéoprojecteur.',8.4)
c.linkURL('https://leministere.ca/assets/documents/Le-Minist%C3%A8re_Fiche-technique_Audio-LX.pdf',(780,yy,1152,yy+55),relative=0,thickness=0)
footer(2,'PROJECTION / LUMIÈRE','A3 / coupe 1:50')
c.showPage();c.save()

# Original technical drawing is appended without redrawing or changing its content.
w=PdfWriter()
for p in PdfReader(str(BODY)).pages:w.add_page(p)
for p in PdfReader(str(SOURCE)).pages:w.add_page(p)
w.add_metadata({'/Title':'Grand Remix - Le Ministère - Plan scène, lumière et projection - V02','/Author':'Cindy Bélanger - DMTeam','/Subject':'Avant-projet coté : écran à gauche, DJ à droite, public dansant éclairé. Annexe LX originale.'})
w.add_outline_item('01 - Implantation scène et piste',0)
w.add_outline_item('02 - Projection et lumière',1)
w.add_outline_item('03 - Annexe : plan LX original communiqué par Rémi',2)
with OUT.open('wb') as f:w.write(f)
print(str(OUT))
print('Pages:',len(PdfReader(str(OUT)).pages))
