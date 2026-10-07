from pathlib import Path
p=Path(__file__).with_name('index.template.html');s=p.read_text(encoding='utf-8')
start=s.index('<aside class="side"><div class="section"><p class="eyebrow">Position du projecteur')
end=s.index('<div class="section"><p class="eyebrow">Ambiance',start)
s=s[:start]+'<aside class="side">'+s[end:]
s=s.replace('Maquette spatiale · Plan A / essai B · 30 octobre 2026','Maquette spatiale · Projecteur avant droit · 30 octobre 2026')
s=s.replace('<button data-view="stage" aria-pressed="false">Depuis la scène</button>','<button data-view="stage" aria-pressed="false">Depuis la scène</button><button data-view="projection" aria-pressed="false">Détail projection</button>')
s=s.replace('<a href="PLAN_B.pdf" target="_blank">Plan B + calculs ↗</a>','')
s=s.replace('href="PLAN_A.pdf" target="_blank">Plan A','href="PLAN_AVANT_CORRIGE.pdf" target="_blank">Plan corrigé')
s=s.replace('Projecteur dans son axe.','Projecteur à l’avant, décalé à droite avec 8 cm de marge géométrique au bord.')
s=s.replace('Écran Ø 1,50 m · recul cible 1,85 m','Écran Ø 1,50 m · emplacement avant proposé')
s=s.replace('PLAN V06','AVANT DROIT · CORRIGÉ')
p.write_text(s,encoding='utf-8')
