from pathlib import Path
p=Path(__file__).with_name('index.template.html');s=p.read_text(encoding='utf-8')
s=s.replace('<aside class="side"><div class="section">','<aside class="side"><div class="section"><p class="eyebrow">Position du projecteur</p><div class="seg"><button data-variant="A" aria-pressed="true">A · Avant</button><button data-variant="B" aria-pressed="false">B · Arrière</button></div><p id="variant-note" class="note">Implantation actuelle · recul cible 1,85 m à valider</p></div><div class="section">',1)
s=s.replace('Maquette spatiale · Plan V06 · 30 octobre 2026','Maquette spatiale · Plan A / essai B · 30 octobre 2026')
s=s.replace('<a href="PLAN_V06.pdf" target="_blank">Plan V06 ↗</a>','<a href="PLAN_A.pdf" target="_blank">Plan A ↗</a><a href="PLAN_B.pdf" target="_blank">Plan B + calculs ↗</a>')
p.write_text(s,encoding='utf-8')
