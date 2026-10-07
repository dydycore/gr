from pathlib import Path
import json,math,hashlib
from pypdf import PdfReader
r=Path(__file__).resolve().parent
d=json.loads((r/'implantation.json').read_text(encoding='utf-8'))
old=json.loads((r/'versions/V16/implantation.json').read_text(encoding='utf-8'))
assert abs(d['screen']['x']-old['screen']['x']-.4)<1e-9
assert d['projector']==old['projector']
assert all(d['screen'][k]==old['screen'][k] for k in ['y','z','diameter'])
check=dict(d);check.pop('geometryId')
assert hashlib.sha256(json.dumps(check,sort_keys=True).encode()).hexdigest()[:12]==d['geometryId']
assert d['lightingProtection']['enabled']
center=[d['screen'][k] for k in ['x','y','z']]
R=d['lightingProtection']['screenSphereRadius']
checked=0; minimum=100;off={}
for mode in ['slam','dance']:
    off[mode]=[]
    for f in d['fixtures']:
        focus=f['focus']
        if not focus[mode+'On']:
            off[mode].append(f['id']);continue
        start=[f[k] for k in ['x','y','z']];end=focus[mode+'Target']
        for i in range(2001):
            t=i/2000
            point=[a+(b-a)*t for a,b in zip(start,end)]
            clearance=math.dist(point,center)-R-(.035+(focus['radius']-.035)*t)
            assert clearance>0,(mode,f['id'],clearance)
            minimum=min(minimum,clearance)
        checked+=1
pdf=PdfReader(r.parent/'pdf/grand_remix/Grand_Remix_Plan_Technique_V17.pdf')
assert len(pdf.pages)==6
assert all(d['geometryId'] in p.extract_text() for p in pdf.pages)
source=(r/'scene.js').read_text(encoding='utf-8')
assert "state.mode==='dance'&&!state.projectionProtection" in source
assert 'projectionProtection:true' in source
result={'revision':d['revision'],'geometryId':d['geometryId'],'screenMovedRightMetres':.4,'projectorUnchanged':True,'pdfPages':6,'illuminatedCuePathsChecked':checked,'minimumIllustrativeSphereClearanceMetres':minimum,'blackoutFixtures':off,'boundary':'Illustrative cones only, not measured photometry. PDF visually reviewed; final browser render not verified. Projector mount, lens, beam and actual obstructions unresolved.'}
(r/'VERIFICATION_V17.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
