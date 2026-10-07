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
pdfmetrics.registerFont(TTFont('AR', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('AB', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('AR', normal='AR', bold='AB', italic='AR', boldItalic='AB')
W, H = landscape(A3)
buf = io.BytesIO()
c = canvas.Canvas(buf, pagesize=(W, H))
ink, green, muted = map(HexColor, ['#20332e', '#215d4d', '#61736b'])
light, border = map(HexColor, ['#f0f5f2', '#cbd8d0'])
style = ParagraphStyle('body', fontName='AR', fontSize=11, leading=15.5, textColor=ink)


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


def section(x, y, width, title, body, size=11):
    text(x, y, title, 13, True, green)
    return para(x, y - 19, width, body, size) - 24


def head(number, title):
    text(32, H - 36, 'Le Ministère - Grand Remix', 22, True)
    text(32, H - 59, title, 13, True)
    text(W - 270, H - 35, 'V18 - 07/10/2026 - VALIDATION DT', 10, True)
    c.setStrokeColor(green)
    c.line(32, H - 77, W - 32, H - 77)
    text(32, 28, 'Cindy Bélanger - DMTeam | Implantation et prévisualisation proposées', 9)
    text(W - 355, 28, 'Géométrie ' + d['geometryId'] + f' | {number}/10', 9)


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
    ['Appareil / inventaire', 'Commandes disponibles dans l’aperçu', 'Réalité du matériel / points à confirmer'],
    ['<b>Intimidator Spot 375Z IRC</b><br/>8 inventoriés',
     'Pan 540° ; tilt 270° ; zoom 10-23°. Roue : blanc, orange, lime, cyan, rouge, vert, magenta, jaune. Sept gobos rotatifs ; quatre mouvements et position fixe.',
     'Sept lyres utilisables ; 106 en dépose proposée. 112 sous E1 : OFF au départ/reset, Accueil et Ouverture ; actif dans les cinq autres ambiances. Zéros et focus à valider. Motifs issus du manuel ; jeu installé à vérifier. Prismes non simulés. Flashs limités à 2 Hz dans l’aperçu, distincts des capacités du matériel.'],
    ['<b>ETC Source Four 36°</b><br/>8 inventoriés, 7 dessinés',
     'Intensité ; blanc ou noir (éteint).',
     '575 W selon la salle. Appareil fixe : orientation et couteaux manuels, aucun moteur. Gélatines non confirmées : aucune couleur ajoutée. Le huitième appareil reste non localisé.'],
    ['<b>ETC Source Four Zoom 25-50°</b><br/>6 inventoriés',
     'Intensité ; blanc ou noir (éteint).',
     '750 W. Zoom et focus manuels. Aperçu ouvert à 25°, bord net, couteaux non réglés. Zoom 5 en dépose proposée pour P1 ; Zoom 6 éteint pour la projection.'],
    ['<b>COLORado 1-Tri Tour</b><br/>12 inventoriés',
     'Mélange RGB, intensité visuelle ; noir.',
     'Fixe, orientation manuelle. 210 réactivé vers le haut du corps de l’artiste. Manuel v2 rev.4 : cœur 15°, champ doux 28° ; version/diffuseur à vérifier. ARC.1 : trois canaux RGB, sans dimmer séparé.'],
    ['<b>DMG SL1 MIX / MINI MIX</b><br/>1 SL1 / 2 MINI',
     'Couleur LED, intensité ; noir. SL1 : strobe blanc à 8 Hz, crête 80 % dans Rouge intense ; aperçu réglable 4/8 Hz.',
     '200 / 100 W ; six couleurs, blanc 1 700-10 000 K. SL1 : strobe natif 0,1-25 Hz dans les profils compatibles. Le patch salle à quatre canaux ne donne pas accès au canal strobe dédié : reconfiguration à valider (p. 9). RGB, diffusion et accessoires approximatifs.'],
    ['<b>PAR 56 WFL</b><br/>6 proposés',
     'Intensité ; blanc ou noir (éteint).',
     '500 W, fixes. S6 OFF au départ/reset ; disponible manuellement et dans les ambiances prévues. Ampoule et photométrie non documentées. Disponibilité, gradateurs et accroche à confirmer.'],
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

# 8: One readable row per cue. Exact timing and patch instructions move to p9.
head(8, 'LES SEPT AMBIANCES - LUMIÈRE, PROJECTION ET BROUILLARD')
para(32, H - 99, W - 64, 'Chaque boucle dure <b>30 secondes maximum</b>. '
     'Intentions à déclencher avec la musique : neuf artistes, deux slams chacun, puis finale hip-hop. '
     'Aucune synchronisation audio automatique.', 11)
rows = [
    ['Ambiance', 'Éclairage et mouvement', 'Visuel projeté / boucle de 30 s', 'Brouillard F1'],
    ['<b>01<br/>Entrée du public</b>',
     'Salle blanche à 100 %, faisceaux fixes répartis gauche/centre/droite et à plusieurs profondeurs. Scène éteinte, sauf platines DJ. Aucun flash ; artiste absent.',
     'Accueil animé :<br/><b>BIENVENUE / ENTREZ / DANSONS</b>', '<b>OFF</b>'],
    ['<b>02<br/>Ouverture</b>',
     'DJ magenta, face artiste blanche ; salle éteinte. 201 reste à 45 % sur les platines.',
     'Logo animé avec révélation cinématographique turquoise.', '<b>OFF</b>'],
    ['<b>03<br/>Bleu océan</b>',
     'RGB bleu électrique à 100 %. Lyres cyan, <b>gobo 6 - Ondes</b>, très lentes. DJ bleu : 101 ouvert à 60 %, 202/207 à 65 %, 201 à 45 %. Aucun spot blanc, rouge ou rose.',
     'Mer photographique animée, trois cadrages en fondu.<br/><b>MER / MARÉE / ÉCUME</b><br/>Émersion, glissement, masque de vague.', '<b>ON - 95 %</b>'],
    ['<b>04<br/>Rouge intense</b>',
     'Fond rouge, <b>gobo 7 - Anneaux</b> rapide. SL1 blanc à 8 Hz, crête 80 %, quatre accents de 2 s. Pendant les accents : lyres salle à 60 % de leur niveau de base, RGB scène à 25 %, 101 coupé ; 201 reste à 45 %.',
     'Ville abîmée rouge, typo brute.<br/><b>GUERRE / VIOLENCE / RÉSISTER</b><br/>Impact, découpes et masque angulaire.', '<b>ON - 55 %</b>'],
    ['<b>05<br/>Jaune et rouge</b>',
     '<b>Gobo 2</b> unique ; jaune/rouge, sans blanc. Mouvements souples de vitesse moyenne, changements de couleur doux.',
     'Côte dorée, trois cadrages en fondu.<br/><b>VACANCES / JOIE / SOLEIL</b><br/>Montée, élan et diagonale.', '<b>ON - 25 %</b>'],
    ['<b>06<br/>Transition DJ</b>',
     'Artiste absent, DJ très éclairé en couleur. 101 à 100 %, 202/207 à 85 %, 201 à 45 %. Séquence : plein fixe, gobo mobile, plein fixe (détail p. 9). Salle en mouvement.',
     'Logo animé sans disque blanc ; vagues et égaliseur sur fond sombre.', '<b>ON - 40 %</b>'],
    ['<b>07<br/>Finale hip-hop</b>',
     'Duos de couleurs évolutifs, parcours rapides scène/public et accents. Face blanche 3 modérée à 18 % ; PAR en accents. 201 reste à 45 %.',
     '<b>PAROLES BRUTES</b> (titre inventé).<br/>LA VOIX / LE RYTHME / ENSEMBLE.<br/>Typo forte, impact, glissement et décalage des lignes.', '<b>ON - 85 %</b>'],
]
y = table(32, H - 145, [150, 475, 345, W - 64 - 970], rows, size=11, padding=11,
          first_colors=['#eaf1ed', '#f2e8ee', '#e6f1f8', '#f9e8e5', '#fbf1d9', '#e9e8f5', '#e9f1df'])
para(32, y - 20, W - 64,
     '<b>Repères communs :</b> bar toujours allumé. 112 éteint dans Accueil et Ouverture, actif dans les cinq autres ambiances. '
     'Les pourcentages F1 sont des commandes de l’aperçu, pas des mesures de densité en salle. '
     'Flashs désactivables ; aucune commande DMX n’est transmise.', 11)
c.showPage()

# 9: Operating the preview, with concise technical cue references beside it.
head(9, 'UTILISATION ET RÉGLAGES - REPÈRES POUR LE DT')
left, right, cw = 32, W / 2 + 18, W / 2 - 66
y = H - 108
y = section(left, y, cw, '1. Démarrer ou réinitialiser',
            'Vue de face ; appareils utilisables blancs à 100 %, sauf <b>S6 et 112 éteints</b> et '
            '<b>201 turquoise pâle à 45 %</b>. Brouillard OFF. Les six appareils rouges et Zoom 6 restent éteints. '
            '<b>Réinitialiser la salle</b> restaure cet état et conserve les scènes enregistrées.')
y = section(left, y, cw, '2. Faire un noir spectacle',
            '<b>Noir spectacle</b> coupe les spots et l’image vidéo. Le bar et le poste DJ 201 restent allumés ; '
            '201 reste réglable manuellement. Les boîtiers demeurent faiblement visibles pour pouvoir les sélectionner.')
y = section(left, y, cw, '3. Choisir et rejouer une ambiance',
            'Les sept ambiances sont accessibles en haut du panneau. <b>Rejouer</b> relance la boucle ; '
            '<b>Lire les ambiances</b> les enchaîne. Chaque état dure au maximum 30 s. '
            'Présence de l’artiste, vidéo, flashs et brouillard peuvent être enregistrés avec les réglages.')
y = section(left, y, cw, '4. Régler une lumière',
            'Cliquer le spot ouvre ses paramètres : <b>mauve = allumé, vert = sélectionné</b>. '
            'Couleurs visibles, noir pour éteindre ; sept gobos sur les lyres. Quatre mouvements et position fixe, '
            'rotation indépendante. Les appareils fixes ne possèdent aucun moteur.')
y = section(left, y, cw, '5. Construire et sauvegarder une séquence',
            'Chaque spot possède jusqu’à <b>10 carrés / 30 s</b> : durée, couleur, intensité, mouvement, flashs, '
            'fondus d’entrée et de sortie. Dupliquer, retirer ou déplacer les blocs. '
            '<b>Enregistrer</b> modifie l’ambiance et son nom ; <b>Enregistrer sous...</b> crée une copie. '
            'Sauvegarde locale au navigateur : exporter le JSON pour transmettre les réglages.')
section(left, y, cw, '6. Se déplacer dans la maquette',
        'Souris : glisser pour tourner, molette pour avancer/reculer, clic droit pour déplacer. '
        'W/A/S/D ou flèches disponibles. Les repères du faisceau vidéo se trouvent dans <b>Vue et repères</b>.')

y = H - 108
y = section(right, y, cw, 'SL1 - Mode DMX et accents blancs',
            '<b>Patch salle : quatre canaux, sans canal strobe dédié.</b> Pour le strobe, le DT doit confirmer un profil '
            'compatible, par exemple <b>Full 8 bits / 12 canaux, canal 11</b>. Capacité native documentée : 0,1-25 Hz. '
            'L’aperçu propose 4/8 Hz ; les autres appareils restent limités à 2 Hz.')
y = table(right, y + 4, [145, cw - 145], [
    ['Rouge intense', 'Séquence SL1 sur 30 s'],
    ['<b>Blanc 8 Hz / 80 %</b>', '4-6 s ; 10-12 s ; 18-20 s ; 28-30 s.'],
    ['<b>Hors de ces fenêtres</b>', 'SL1 éteint. Flashs OFF désactive toujours le SL1.'],
], size=11, padding=9) - 25
y = section(right, y, cw, 'Fond rouge conservé pendant les accents',
            'Les lyres 102/103/104/105/111/112 restent rouges à <b>60 % de leur niveau de base</b>. '
            'Les RGB de scène restent rouges à <b>25 % de leur niveau de base</b>. '
            '101 s’éteint pendant ces fenêtres ; 201 reste stable à 45 %. Les PAR blancs sont éteints dans Rouge intense.')
y = table(right, y + 4, [145, cw - 145], [
    ['Transition DJ - 101', 'À 100 %, en couleur'],
    ['<b>0-10 s</b>', 'Plein feu fixe sur le DJ.'],
    ['<b>10-20 s</b>', 'Gobo 6 ; cercle amplitude 6°, période 6 s.'],
    ['<b>20-30 s</b>', 'Retour au plein feu fixe.'],
], size=11, padding=8) - 25
y = section(right, y, cw, 'Bleu océan - repères RGB',
            'Artiste et RGB principaux : <b>#005eff à 100 %</b>. DJ 202/207 : <b>#0078ff à 65 %</b> ; '
            '201 : <b>#adcaff à 45 %</b>. Roue des lyres sans bleu profond : <b>cyan #35dcff</b>. '
            '101 ouvert à 60 % ; gobos 6 sur les lyres de salle, respiration de 85 à 100 % du niveau de base, période lente de 30 s.')
section(right, y, cw, 'Couleur et matériel',
        'Bleu / Rouge / Jaune gardent chacun leur motif unique <b>6 / 7 / 2</b>. '
        'Aucun projecteur UV inventorié. PAR et découpes blancs sans gélatines confirmées. '
        '201 suit la couleur de l’ambiance, à 45 %, sans flash.')
c.showPage()

# 10: Physical placement and validation, separated from app instructions.
head(10, 'BROUILLARD ET VALIDATION EN SALLE')
y = H - 108
y = section(left, y, cw, 'F1 - Antari F-1W de la salle',
            'Machine inventoriée, proposée <b>entre le support/enceinte gauche et le booth DJ</b>, '
            'dans l’espace libéré par le recul de 30 cm de la table. '
            'Centre : <b>x -3,62 ; y +1,43 m</b> ; posée à <b>z +0,6096 m</b> (plateau de scène). '
            'Gabarit dessiné : 60,8 x 27,5 x 28,6 cm, <b>non certifié constructeur</b>. '
            'Version installée et encombrement réels à relever.')
diagram_top, diagram_height = y + 3, 284
diagram_bottom = diagram_top - diagram_height
c.setStrokeColor(border)
c.setFillColor(light)
c.roundRect(left, diagram_bottom, cw, diagram_height, 8, fill=1, stroke=1)
text(left + 16, diagram_top - 24, 'VUE DE DESSUS - COTES INDICATIVES', 10.5, True)


def pt(x, yy):
    return left + 65 + (x + 4.2) * 100, diagram_bottom + 24 + (yy - .3) * 100


J = d['dj']
c.setFillColor(HexColor('#d4e2da'))
c.setStrokeColor(green)
c.rect(*pt(J['x'] - J['width'] / 2, J['y'] - J['depth'] / 2), J['width'] * 100, J['depth'] * 100, fill=1)
text(*pt(-3.27, 2.04), 'BOOTH DJ', 12, True)
c.setFillColor(HexColor('#3a4348'))
c.rect(*pt(-3.9704, .7497), .4 * 100, .4 * 100, fill=1)
text(*pt(-3.95, .88), 'S-G', 10, True, HexColor('#ffffff'))
F = d['atmosphere']
c.setFillColor(green)
c.rect(*pt(F['x'] - F['width'] / 2, F['y'] - F['depth'] / 2), F['width'] * 100, F['depth'] * 100, fill=1)
text(*pt(F['x'] - .08, F['y'] - .04), 'F1', 10, True, HexColor('#ffffff'))
text(left + 367, diagram_top - 82, 'FOND DE SCÈNE', 9.5, True, muted)
text(left + 367, diagram_bottom + 35, 'VERS LE PUBLIC', 9.5, True, muted)
c.setStrokeColor(muted)
c.line(left + 421, diagram_bottom + 79, left + 421, diagram_bottom + 52)
c.line(left + 421, diagram_bottom + 52, left + 416, diagram_bottom + 60)
c.line(left + 421, diagram_bottom + 52, left + 426, diagram_bottom + 60)
text(left + 16, diagram_bottom + 10, 'S-G : support / enceinte. F1 : dégagement et ventilation à confirmer.', 9.5, color=muted)
y = diagram_bottom - 24
y = section(left, y, cw, 'Commande et comportement',
            '<b>OFF au départ et après réinitialisation.</b> Débit réglable de 5 à 100 % ; valeurs par ambiance en page 8. '
            'La commande et le débit se sauvegardent. Poussée douce depuis la machine, répartition progressive au sol '
            'et en hauteur, nappe diffuse et volutes montantes. Le débit règle la quantité ; résidu et dissipation '
            'après l’arrêt. L’effet n’émet pas de lumière.')
section(left, y, cw, 'Installation réelle',
        '<b>Implantation entre DJ et support non validée.</b> Le manuel F-1 prescrit au moins 50 cm libres autour ; '
        'identifier la version F-1W installée et confirmer ses consignes. Ne pas enfermer la machine : '
        'sortie, ventilation et accès dégagés. '
        'Chauffe, ventilation réelle, diffusion, reflets et voile sur l’image ne sont pas calculés. '
        'Le rendu est illustratif, sans densité physique garantie. '
        '<link href="https://www.antari.com/usermanual/F/F-1/F-1.pdf" color="#215d4d">Manuel Antari F-1</link> '
        '(dégagement p. 3 / 6).')

y = H - 108
y = section(right, y, cw, '1. Vidéoprojecteur P1 - décision à confirmer',
            '<b>B4 reste une hypothèse non validée ; lentille installée inconnue.</b> Identifier l’optique et reprendre '
            'le point vidéo avec le DT. Le PT-RZ770 et le Chief VCMU sont documentés ; '
            'couverture, décentrements, support et obstacles réels restent à valider (calculs p. 4).')
y = section(right, y, cw, '2. Écran et accroches',
            'E1 : diamètre <b>2,00 m estimé, non mesuré</b> ; réserve d’encombrement 2,10 m. '
            'Positions et barres partagées par le PDF et le 3D, sans relevé architectural complet. '
            'Le DT vérifie points approuvés, charge, fixation et sécurité secondaire. Aucun appareil sur les rails à rideaux.')
y = section(right, y, cw, '3. Protéger les deux faces de la toile',
            '<b>9, 11, 13, 205, 206 et M2 : non utilisés, conservés sur place.</b> '
            '112 vise le public ; 210 et SL1 visent le haut du corps de l’artiste : '
            '<b>x -0,375 ; y +1,10 ; z +2,00 m</b>. Réserve de contrôle E1 de rayon 1,20 m : '
            'les faisceaux qui la croisent sont coupés dans l’aperçu, timelines comprises. '
            'Focus, couteaux, zoom et parcours à vérifier physiquement.')
y = section(right, y, cw, '4. Essai avant l’arrivée du public',
            'Projeter une mire blanche puis noire et tester chaque appareil séparément, de face et derrière la toile. '
            'Corriger tout débordement et laisser éteint tout appareil qui lave l’image. '
            'Vérifier ensuite brouillard, reflets, lisibilité des visages, couverture de la piste et éblouissement.')
y = section(right, y, cw, '5. Ce que montre la maquette',
            'Gobos issus du manuel, mais intensités non calibrées en lux ; matériaux, spectre, diffusion et brouillard approximatifs. '
            'L’image vidéo est indépendante des ombres et de l’éclairage de salle dans l’aperçu ; '
            'P1 éteint, la toile blanche diffuse reçoit cet éclairage. Ce choix ne valide pas la photométrie réelle.')
section(right, y, cw, '6. Ce que le DT réalise en salle',
        'Confirmer le patch SL1, calibrer les angles et les zéros, régler les focus et programmer les états sur la GrandMA3. '
        '<b>Aucun contrôle DMX, déplacement réel ou réglage de console n’a été exécuté par cette maquette.</b>')
c.showPage()
c.save()
buf.seek(0)

dest = r.parent / 'pdf/grand_remix/Grand_Remix_Plan_Technique_V18.pdf'
base = PdfReader(dest)
assert len(base.pages) == 6, 'Rebuild the six-page base before appending the studio guide.'
w = PdfWriter()
w.append(base)
w.append(PdfReader(buf))
w.add_metadata({'/Title': 'Grand Remix - Plan technique et guide DT V18',
                '/Author': 'Cindy Bélanger - DMTeam',
                '/Subject': 'Implantation, appareils, sept ambiances, réglages et validation en salle',
                '/Keywords': 'Grand Remix, Le Ministère, V18, 30 octobre 2026, ' + d['geometryId']})
with open(dest, 'wb') as out:
    w.write(out)
assert len(PdfReader(dest).pages) == 10
print(dest)
