from pathlib import Path
root=Path(__file__).resolve().parent
p=root.parent/'pdf/grand_remix/build_plan_v15.py'
s=p.read_text(encoding='utf-8').replace('Ø environ 1,50 m','Ø environ 2,00 m')
s=s.replace('poly(pts,color,1.4,VIOLET_PALE)', '''poly(pts,color,1.4,VIOLET_PALE)
    reserve=[project(SCREEN_X+E['reservationDiameter']/2*math.cos(a),SCREEN_Y,SCREEN_Z+E['reservationDiameter']/2*math.sin(a)) for a in [i*2*math.pi/80 for i in range(80)]]
    poly(reserve,ORANGE,.65,None,(2,3))''')
p.write_text(s,encoding='utf-8')
p=root/'index.template.html';p.write_text(p.read_text(encoding='utf-8').replace('5,893','5,894'),encoding='utf-8')
s=(root/'check_v14.py').read_text(encoding='utf-8').replace('V14','V15')
s=s.replace("assert e==prior['screen'] and d['dj']==prior['dj'] and d['bar']==prior['bar'] and d['columns']==prior['columns']","assert d['dj']==prior['dj'] and d['bar']==prior['bar'] and d['columns']==prior['columns']")
s=s.replace('assert standard[0]<l<standard[1]', '''dle150=[diag*.0286-.054,diag*.0413-.0498]
assert dle150[0]<l<dle150[1]
assert l<standard[0]
assert e['z']+e['reservationDiameter']/2 < d['venue']['grid']
assert e['x']-e['reservationDiameter']/2 > .75
assert e['z']-e['reservationDiameter']/2 > d['venue']['stageHeight']''')
s=s.replace("'standardLensRange':standard,","'standardLensRange':standard,'DLE150Range':dle150,'screenDiameterEstimated':e['diameter'],'reservationDiameter':e['reservationDiameter'],")
(root/'check_v15.py').write_text(s,encoding='utf-8')
