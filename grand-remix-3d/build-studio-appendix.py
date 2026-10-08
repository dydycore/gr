from pathlib import Path
import json, io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader, PdfWriter

r = Path(__file__).resolve().parent
d = json.loads((r / 'implantation.json').read_text(encoding='utf-8'))
published = json.loads((r / 'published-lighting.json').read_text(encoding='utf-8'))
assert published['geometryId'] == d['geometryId']
presets = published['presetOverrides']
def fog_label(key):
    f = presets[key]['fog']
    assert 0 <= f['rate'] <= .07, f'Brouillard hors limite : {key} = {f["rate"]}'
    return '<b>ON - ' + str(round(f['rate'] * 100)) + ' %</b>' if f['on'] else '<b>OFF</b>'
def font_path(filename, fallbacks):
    choices = [Path('C:/Windows/Fonts') / filename, *(Path(p) for p in fallbacks)]
    return str(next(p for p in choices if p.exists()))
pdfmetrics.registerFont(TTFont('AR', font_path('arial.ttf', ['/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'])))
pdfmetrics.registerFont(TTFont('AB', font_path('arialbd.ttf', ['/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'])))
pdfmetrics.registerFontFamily('AR', normal='AR', bold='AB', italic='AR', boldItalic='AB')
W, H = landscape(A3)
buf = io.BytesIO()
c = canvas.Canvas(buf, pagesize=(W, H))
ink, green, muted = map(HexColor, ['#20332e', '#215d4d', '#61736b'])
light, border = map(HexColor, ['#f0f5f2', '#cbd8d0'])
style = ParagraphStyle('body', fontName='AR', fontSize=11, leading=15.5, textColor=ink)
PAGE_BODY_SIZE = 11


def text(x, y, value, size=11, bold=False, color=ink):
    c.setFillColor(color)
    c.setFont('AB' if bold else 'AR', size)
    c.drawString(x, y, value)


def para(x, y, width, value, size=11, leading=None):
    st = ParagraphStyle('p', parent=style, fontSize=size, leading=leading or size * 1.4)
    p = Paragraph(value, st)
    _, height = p.wrap(width, 1400)
    p.drawOn(c, x, y - height)
    assert y - height >= 48, f'Text below footer: {value[:75]} -> {y-height:.1f}'
    return y - height


def section(x, y, width, title, body, size=None):
    size = PAGE_BODY_SIZE if size is None else size
    text(x, y, title, 14 if PAGE_BODY_SIZE > 11 else 13, True, green)
    return para(x, y - 20, width, body, size, leading=size * 1.3 if size > 11 else None) - 23


def head(number, title):
    global PAGE_BODY_SIZE
    PAGE_BODY_SIZE = 13 if number == 9 else 11
    text(32, H - 36, 'Le Ministère - Grand Remix', 22, True)
    text(32, H - 59, title, 13, True)
    text(W - 270, H - 35, 'POUR VALIDATION DT', 10, True)
    c.setStrokeColor(green)
    c.line(32, H - 77, W - 32, H - 77)
    text(32, 28, 'DMTeam | Implantation et prévisualisation proposées', 9)
    text(W - 110, 28, f'Planche {number}/9', 9)


def table(x, top, widths, rows, size=10.7, padding=10, first_colors=None):
    data = []
    for index, row in enumerate(rows):
        st = ParagraphStyle('cell', parent=style, fontName='AB' if index == 0 else 'AR',
                            fontSize=size, leading=size * 1.36)
        data.append([Paragraph(value, st) for value in row])
    commands = [('BACKGROUND', (0, 0), (-1, 0), HexColor('#e2eee7')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ffffff'), HexColor('#f7f9f7')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LINEBELOW', (0, 0), (-1, 0), 1, green),
                ('INNERGRID', (0, 1), (-1, -1), .35, border),
                ('BOX', (0, 0), (-1, -1), .5, border),
                ('LEFTPADDING', (0, 0), (-1, -1), padding),
                ('RIGHTPADDING', (0, 0), (-1, -1), padding),
                ('TOPPADDING', (0, 0), (-1, -1), padding),
                ('BOTTOMPADDING', (0, 0), (-1, -1), padding)]
    for index, color in enumerate(first_colors or [], 1):
        commands.append(('BACKGROUND', (0, index), (0, index), HexColor(color)))
    t = Table(data, colWidths=widths)
    t.setStyle(TableStyle(commands))
    _, height = t.wrap(sum(widths), H)
    assert top - height >= 48, f'Table below footer: {top-height:.1f}'
    t.drawOn(c, x, top - height)
    return top - height


# 7: Hardware facts, separated from operating instructions and show cues.
head(7, 'APPAREILS - CAPACITÉS ET LIMITES')
rows = [
    ['Appareil / inventaire', 'Fonctions envisagées pour le spectacle', 'Réalité du matériel / points à confirmer'],
    ['<b>Intimidator Spot 375Z IRC</b><br/>8 inventoriés',
     'Pan 540° ; tilt 270° ; zoom 10-23°. Roue : blanc, orange, lime, cyan, rouge, vert, magenta, jaune. Sept gobos rotatifs plus ouverture. Parcours de pan/tilt à programmer sur la console.',
     'Sept lyres utilisables ; 106 en dépose proposée. Zéros, parcours et focus à valider. Motifs issus du manuel ; jeu installé à vérifier. Prismes non retenus dans cette étude. Accents proposés jusqu’à 2 Hz, distincts des capacités maximales du matériel.'],
    ['<b>ETC Source Four 36°</b><br/>8 inventoriés, 7 dessinés',
     'Intensité ; blanc ou noir (éteint).',
     '575 W selon la salle. Appareil fixe : orientation et couteaux manuels, aucun moteur. Gélatines non confirmées : aucune couleur ajoutée. Le huitième appareil reste non localisé.'],
    ['<b>ETC Source Four Zoom 25-50°</b><br/>6 inventoriés',
     'Intensité ; blanc ou noir (éteint).',
     '750 W. Zoom, focus et couteaux manuels. Ouverture de référence : 25°, à adapter sur place. Zoom 5 en dépose proposée pour P1 ; Zoom 6 éteint pour la projection.'],
    ['<b>COLORado 1-Tri Tour</b><br/>12 inventoriés',
     'Mélange RGB, intensité visuelle ; noir.',
     'Fixe, orientation manuelle. 210 orienté vers le haut du corps de l’artiste. Manuel v2 rev.4 : cœur 15°, champ doux 28° ; version/diffuseur à vérifier. ARC.1 : trois canaux RGB, sans dimmer séparé.'],
    ['<b>DMG SL1 MIX / MINI MIX</b><br/>1 SL1 / 2 MINI',
     'Couleur LED et intensité. SL1 : accents blancs à 8 Hz, crête 80 % dans Rouge intense.',
     '200 / 100 W ; six couleurs, blanc 1 700-10 000 K. SL1 : strobe natif 0,1-25 Hz dans les profils compatibles. Le patch source à quatre canaux ne donne pas accès au canal strobe dédié : reconfiguration à valider avec le DT. Diffusion et accessoires réels à relever.'],
    ['<b>PAR 56 WFL</b><br/>6 proposés',
     'Intensité ; blanc ou noir (éteint).',
     '500 W, fixes. Base blanche de la piste, graduable ; implantation S1-S6 proposée. Ampoule et photométrie non documentées. Disponibilité, gradateurs et accroche à confirmer.'],
]
y = table(32, H - 100, [220, 365, W - 64 - 585], rows)
y = para(32, y - 20, W - 64,
         '<b><font color="#c54747">ROUGE CLAIR = APPAREIL NON UTILISÉ.</font></b> '
         '9, 11, 13, 205, 206 et M2 restent en place, sans faisceau dans toutes les scènes. '
         'Le boîtier rouge est un repère graphique : il ne produit pas de lumière rouge. '
         'Seules déposes proposées : 106 pour E1 et Zoom 5 pour P1.', 11) - 22
sources = [
    ('Chauvet - Intimidator Spot 375Z IRC, manuel rev.6 (gobos p.7)', 'https://fr.chauvetdj.com/wp-content/uploads/2017/07/Intimidator_Spot_375Z_IRC_UM_Rev6.pdf'),
    ('Chauvet - COLORado 1-Tri Tour, manuel v2 rev.4', 'https://storage.googleapis.com/web-congoblue/2016/01/COLORado-Tri-Tour-Manual-1.pdf'),
    ('ETC - Source Four et documentation Zoom', 'https://www.etcconnect.com/Products/Entertainment-Fixtures/Source-Four/'),
    ('Rosco - DMG MINI / SL1 MIX, guide utilisateur', 'https://ca.rosco.com/sites/default/files/content/resource/2019-06/DMG%20MINI%20and%20SL1%20MIX%20User%20Guide.pdf'),
    ('Rosco - DMX Profiles nov.2022 (quatre canaux p.3 ; strobe Full 8b p.10)', 'https://la.rosco.com/sites/default/files/content/resource/2022-12/DMG_DMX_Profiles_PDF_nov22.pdf'),
]
text(32, y, 'SOURCES FABRICANT - CONSULTÉES LE 7 OCTOBRE 2026', 10.5, True)
for name, url in sources:
    y -= 20
    text(32, y, name, 10, color=green)
    c.linkURL(url, (32, y - 2, W - 32, y + 12))
assert y >= 48, f'Page7 source links below footer: {y}'
c.showPage()

# 8: Concise event lighting intentions, without application instructions.
head(8, 'HUIT AMBIANCES SUGGÉRÉES')
para(32, H - 99, W - 64,
     'Pistes artistiques à faire évoluer selon les morceaux et les besoins du spectacle. Elles illustrent la direction souhaitée ; '
     '<b>conduite et patch à finaliser avec la direction technique.</b> '
     '<b>Maquette 3D : débit visuel de 0 à 7 % maximum ; Bleu océan : 6 %.</b> '
     'Les pourcentages décrivent la simulation, et non une consigne physique ou DMX. À valider avec le DT.', 12)
rows = [
    ['Ambiance', 'Intention lumière', 'Brouillard F1<br/>Pourcentage indicatif'],
    ['<b>01<br/>Entrée du public</b>',
     'Salle blanche à pleine intensité ; mouvements très discrets. DJ en couleur. Face artiste éteinte ; 112 OFF.',
     '<b>OFF</b>'],
    ['<b>02<br/>Ouverture</b>',
     'DJ magenta/violet. Artiste éclairé de face en blanc. Salle éteinte ; bar maintenu.',
     '<b>OFF</b>'],
    ['<b>03<br/>Bleu océan</b>',
     'Bleu/cyan avec passages blancs et violets. Gobo 6 - Ondes, mouvements lents. Sur les lyres : cyan de la roue, pas de bleu profond.',
     fog_label('dream')],
    ['<b>04<br/>Rouge intense</b>',
     'Fond rouge, gobo 7 - Anneaux, mouvements rapides. Accents blancs SL1 à 8 Hz ; réduction partielle des autres sources durant les accents.',
     fog_label('red_alert')],
    ['<b>05<br/>Jaune et rouge</b>',
     'Jaune, rouge et orange, sans blanc. Gobo 2, mouvements souples et fondus.',
     fog_label('warm')],
    ['<b>06<br/>Pinky love</b>',
     'Rose, magenta et violet ; gobos variés. Accents blancs des PAR et magenta de 111 jusqu’à 2 Hz. Artiste présent ; 112 OFF.',
     fog_label('pinky')],
    ['<b>07<br/>Transition DJ</b>',
     'Artiste absent. DJ orange/magenta/rouge. Faisceaux mobiles dans la salle, gobos variés et accents jusqu’à 2 Hz.',
     fog_label('dj')],
    ['<b>08<br/>Finale hip-hop</b>',
     'Couleurs et gobos variés, mouvements rapides entre scène et public. Blanc réduit sur l’artiste ; accents de salle jusqu’à 2 Hz.',
     fog_label('hiphop')],
]
y = table(32, H - 158, [200, 775, W - 64 - 975], rows, size=13.5, padding=14,
          first_colors=['#eaf1ed', '#f2e8ee', '#e6f1f8', '#f9e8e5', '#fbf1d9', '#fbe8f3', '#e9e8f5', '#e9f1df'])
para(32, y - 16, W - 64,
     '<b>Commandes maquette :</b> Enregistrer à côté de Rétablir ce spot ; scènes dans Mes ambiances. '
     'Flash uniquement dans les séquences ; Importer avant Exporter dans le panneau de droite.', 10.5)
c.showPage()

# 9: Physical placement and validation, separated from app instructions.
head(9, 'BROUILLARD ET VALIDATION EN SALLE')
left, right, cw = 32, W / 2 + 18, W / 2 - 66
y = H - 108
y = section(left, y, cw, 'F1 - Antari F-1W de la salle',
            'Position proposée <b>entre l’enceinte gauche et le poste DJ</b>, table reculée de 30 cm. '
            'Centre : <b>x -3,62 ; y +1,43 ; z +0,6096 m</b>.<br/>'
            'Gabarit 60,8 x 27,5 x 28,6 cm indicatif ; encombrement réel à relever.')

diagram_top, diagram_height = y + 3, 252
diagram_bottom = diagram_top - diagram_height
c.setStrokeColor(border)
c.setFillColor(light)
c.roundRect(left, diagram_bottom, cw, diagram_height, 8, fill=1, stroke=1)
text(left + 16, diagram_top - 24, 'VUE DE DESSUS - COTES INDICATIVES', 12, True)


def pt(x, yy):
    return left + 65 + (x + 4.2) * 85, diagram_bottom + 24 + (yy - .3) * 85


J = d['dj']
c.setFillColor(HexColor('#d4e2da'))
c.setStrokeColor(green)
c.rect(*pt(J['x'] - J['width'] / 2, J['y'] - J['depth'] / 2), J['width'] * 85, J['depth'] * 85, fill=1)
text(*pt(-3.27, 2.04), 'POSTE DJ', 12, True)
c.setFillColor(HexColor('#3a4348'))
c.rect(*pt(-3.9704, .7497), .4 * 85, .4 * 85, fill=1)
text(*pt(-3.95, .88), 'S-G', 10, True, HexColor('#ffffff'))
F = d['atmosphere']
c.setFillColor(green)
c.rect(*pt(F['x'] - F['width'] / 2, F['y'] - F['depth'] / 2), F['width'] * 85, F['depth'] * 85, fill=1)
text(*pt(F['x'] - .08, F['y'] - .04), 'F1', 10, True, HexColor('#ffffff'))
text(left + 367, diagram_top - 82, 'FOND DE SCÈNE', 11, True, muted)
text(left + 367, diagram_bottom + 35, 'VERS LE PUBLIC', 11, True, muted)
c.setStrokeColor(muted)
c.line(left + 421, diagram_bottom + 79, left + 421, diagram_bottom + 52)
c.line(left + 421, diagram_bottom + 52, left + 416, diagram_bottom + 60)
c.line(left + 421, diagram_bottom + 52, left + 426, diagram_bottom + 60)
text(left + 16, diagram_bottom + 10, 'S-G : enceinte. F1 : dégagement / ventilation à confirmer.', 11, color=muted)
y = diagram_bottom - 24
y = section(left, y, cw, 'Diffusion',
            '<b>Proposition : OFF à l’accueil et à l’ouverture.</b> Débits suggérés p. 8. '
            '<b>Pour toutes les ambiances : 7 % maximum, Bleu océan 6 %.</b> '
             'La valeur visuelle de la maquette n’est pas une consigne DMX ; réduire si la brume diminue le contraste.')
section(left, y, cw, 'Dégagements',
        '<b>Emplacement à valider.</b> Le manuel F-1 prescrit au moins <b>50 cm libres autour</b> ; '
        'identifier le F-1W installé et confirmer ses consignes. Sortie, ventilation et accès dégagés. '
        '<link href="https://www.antari.com/usermanual/F/F-1/F-1.pdf" color="#215d4d">Manuel Antari F-1, p. 3 / 6</link>.')

y = H - 108
y = section(right, y, cw, 'À confirmer avant montage',
            '<b>P1 :</b> lentille installée, décentrements, support et obstacles réels. '
            'B4 reste une option non validée ; calcul p. 4.')
y = section(right, y, cw, 'Écran E1 - construction proposée',
            '<b>Tissu blanc léger traité ignifuge</b>, tendu sur un cerceau en PVC de <b>¾ po</b>. '
            '<br/><br/>'
            '<b>12 pi de tube annoncés (3,66 m)</b> : diamètre théorique du cerceau <b>environ 1,16 m</b>, hors raccord et épaisseur. '
            'Mesurer l’écran monté avant de réviser le <b>gabarit de 2 m dessiné p. 1-6</b> et le calcul optique.<br/><br/>'
            '<b>Poids indicatif : 1,4 à 1,8 kg.</b> Hypothèses : PVC ¾ po Schedule 40, tissu 100-180 g/m², assemblage inclus. '
            'À confirmer par pesée. <link href="https://www.charlottepipe.com/uploads/documents/technical/BR-PK.pdf#page=28" color="#215d4d">Masse du tube : Charlotte Pipe, p. 28</link>.<br/><br/>'
            '<b>Principe d’attache confirmé par l’organisation :</b> monofilament transparent (fil de pêche) vers le plafond. '
            'Points d’ancrage, caractéristiques du fil et sécurité secondaire à documenter avec le DT (p. 5).', size=12)
y = section(right, y, cw, 'Essai avant l’arrivée du public',
            '1. Mire blanche puis noire : vérifier couverture et masque.<br/>'
            '2. Allumer chaque appareil séparément : contrôler les deux faces de E1.<br/>'
            '3. Tester les parcours complets, puis le brouillard et les reflets.<br/>'
            '4. Vérifier visage de l’artiste, poste DJ, piste et éblouissement.')
section(right, y, cw, 'Validation finale du DT',
        'Confirmer patch SL1, zéros et focus ; programmer la GrandMA3. '
        'Les images illustrent les intentions, sans certification photométrique. '
        '<b>Montage et essais physiques restent à valider en salle.</b>')
c.showPage()
c.save()
buf.seek(0)

dest = r.parent / 'pdf/grand_remix/Grand_Remix_Plan_Technique_V18.pdf'
base = PdfReader(dest)
assert len(base.pages) == 6, 'Rebuild the six-page base before appending the technical appendix.'
w = PdfWriter()
w.append(base)
w.append(PdfReader(buf))
w.add_metadata({'/Title': 'Grand Remix - Plan technique',
                '/Author': 'DMTeam',
                '/Subject': 'Implantation, appareils, huit ambiances, brouillard et validation en salle',
                '/Keywords': 'Grand Remix, Le Ministère, 30 octobre 2026, ' + d['geometryId']})
with open(dest, 'wb') as out:
    w.write(out)
assert len(PdfReader(dest).pages) == 9
print(dest)
