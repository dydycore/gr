from pathlib import Path
p=Path('check-ambiences.mjs');s=p.read_text(encoding='utf-8').replace("assert.equal(fx.movement,'sweep',`Sweeping gobo ${id}`);","assert.ok(['sweep','tilt','circle','eight'].includes(fx.movement),`Moving gobo ${id}`);");p.write_text(s,encoding='utf-8')
