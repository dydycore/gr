from pathlib import Path
import json,math
from pypdf import PdfReader
root=Path(__file__).resolve().parent
d=json.loads((root/'implantation.json').read_text(encoding='utf-8'))
e,p,b=d['screen'],d['projector'],d['bar']
bar_left=b['x']-b['width']/2
bar_front=-b['y']-b['depth']/2
proj_right=p['x']+p['bodyWidth']/2
l=-p['y']-p['lensForward']+e['y']
beam_right=e['x']+e['imageWidth']/2
edge_at_bar=p['x']+(beam_right-p['x'])*(1-(bar_front+e['y'])/l)
assert proj_right < bar_left
assert edge_at_bar < bar_left
for col in d['columns']:
    assert p['x']+p['bodyWidth']/2 < col['x']-col['width']/2
assert e['x']+e['imageWidth']/2 < d['venue']['width']/2
assert len(d['fixtures'])==41
pdf=PdfReader(root.parent/'pdf/grand_remix/Grand_Remix_Plan_Technique_V13.pdf')
assert len(pdf.pages)==4
for page in pdf.pages: assert d['geometryId'] in page.extract_text()
text='\n'.join(page.extract_text() for page in pdf.pages)
assert '+3,94' not in text and 'cible 1,85' not in text
diag=math.hypot(e['imageWidth'],e['imageHeight'])/.0254
result={'geometryId':d['geometryId'],'pdfPages':4,'fixtures':41,'screenWallGap':d['venue']['width']/2-e['x']-e['diameter']/2,'projectorToCounterHorizontalGap':bar_left-proj_right,'targetEnvelopeToCounterMinPlanGap':bar_left-edge_at_bar,'indicativeLensToScreen':l,'DLE085Range':[diag*.0174-.0471,diag*.0216-.0442],'standardLensRange':[diag*.0379-.0746,diag*.0529-.0725],'boundary':'Only drawn geometry checked; not measured architecture, cooling, lens shifts or real optics.'}
(root/'VERIFICATION_V13.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))



previous=json.loads((root/'versions/V12/implantation.json').read_text(encoding='utf-8'))
assert d['projector']==previous['projector']
assert d['screen']['y']==.807 and abs(d['screen']['z']-previous['screen']['z']+.5)<1e-9
assert not any(f['id']=='106' for f in d['fixtures'])
assert d['removedFixtures'][0]['id']=='106'
print('Recul ecran 0.807 m, abaissement 0.50 m, lyre 106 deposee dans proposition : OK')
