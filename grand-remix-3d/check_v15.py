from pathlib import Path
import json,math,hashlib
from pypdf import PdfReader
root=Path(__file__).resolve().parent
d=json.loads((root/'implantation.json').read_text(encoding='utf-8'))
e,p,b=d['screen'],d['projector'],d['bar']
gid=d['geometryId']; hashed=dict(d);hashed.pop('geometryId')
assert gid==hashlib.sha256(json.dumps(hashed,sort_keys=True).encode()).hexdigest()[:12]
bar_left=b['x']-b['width']/2
bar_front=-b['y']-b['depth']/2
proj_right=p['x']+p['bodyWidth']/2
l=-p['y']-p['lensForward']+e['y']
beam_right=e['x']+e['imageWidth']/2
edge_at_bar=p['x']+(beam_right-p['x'])*(1-(bar_front+e['y'])/l)
assert proj_right < bar_left and edge_at_bar < bar_left
column_gaps=[]
for col in d['columns']:
    assert proj_right < col['x']-col['width']/2
    for yy in [col['y']-col['depth']/2,col['y']+col['depth']/2]:
        t=(yy-(p['y']+p['lensForward']))/l
        if 0<=t<=1:
            gap=col['x']-col['width']/2-(p['x']+(beam_right-p['x'])*t)
            assert gap>0
            column_gaps.append(gap)
assert e['x']+e['imageWidth']/2 < d['venue']['width']/2
assert len(d['fixtures'])==40
assert {f['id'] for f in d['removedFixtures']}=={'106','5'}
assert not {'106','5'} & {f['id'] for f in d['fixtures']}
assert len(d['rigBars'])==7
mount=next(b for b in d['rigBars'] if b['id']==p['mountBar'])
assert mount['a'][1]==p['y']==mount['b'][1]
assert mount['a'][0] < p['x'] < mount['b'][0]
assert mount['a'][2] > p['z']+p['bodyHeight']/2
prior=json.loads((root/'versions/V13/implantation.json').read_text(encoding='utf-8'))
assert d['dj']==prior['dj'] and d['bar']==prior['bar'] and d['columns']==prior['columns']
pdf=PdfReader(root.parent/'pdf/grand_remix/Grand_Remix_Plan_Technique_V15.pdf')
assert len(pdf.pages)==5
for page in pdf.pages: assert gid in page.extract_text()
text='\n'.join(page.extract_text() for page in pdf.pages)
for obsolete in ['3,11 m','1,685 m','x +1,07','41 appareils','y -2,58']:
    assert obsolete not in text,obsolete
diag=math.hypot(e['imageWidth'],e['imageHeight'])/.0254
standard=[diag*.0379-.0746,diag*.0529-.0725]
dle150=[diag*.0286-.054,diag*.0413-.0498]
assert dle150[0]<l<dle150[1]
assert l<standard[0]
assert e['z']+e['reservationDiameter']/2 < d['venue']['grid']
assert e['x']-e['reservationDiameter']/2 > .75
assert e['z']-e['reservationDiameter']/2 > d['venue']['stageHeight']
result={'geometryId':gid,'pdfPages':5,'activeFixtures':40,'barsRepresented':7,'projectorMountOnModeledB4':True,'projectorToCounterHorizontalGap':bar_left-proj_right,'targetEnvelopeToCounterMinPlanGap':bar_left-edge_at_bar,'targetEnvelopeToColumnsMinPlanGap':min(column_gaps),'indicativeLensToScreen':l,'standardLensRange':standard,'DLE150Range':dle150,'screenDiameterEstimated':e['diameter'],'reservationDiameter':e['reservationDiameter'],'installedLens':'UNKNOWN','boundary':'Geometry of drawn volumes only. Neither optical compatibility with installed lens nor real architecture, load, mounting, cooling or availability confirmed.'}
(root/'VERIFICATION_V15.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
