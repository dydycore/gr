from pathlib import Path
import json,re,hashlib,math
root=Path(__file__).resolve().parent
pdf=root.parent/'pdf'/'grand_remix'
# Read the already approved fixture lists without running its PDF drawing section.
ns={'__file__':str(pdf/'build_plan_v07.py')}
prefix=(pdf/'build_plan_v07.py').read_text(encoding='utf-8').split('# PAGE 1:')[0]
exec(prefix,ns)
fixtures=[dict(id=i,kind=k,x=p[0],y=p[1],z=p[2],proposed=i.startswith('S') and i!='SL1') for i,k,p in ns['fixtures']+ns['PROPOSED_PAR']]
data={
 'revision':'V08','status':'ESSAI SPATIAL - OPTIQUE NON VALIDEE',
 'coordinates':'x droite public, y fond de scene, z hauteur depuis sol salle; metres',
 'venue':{'width':8.5344,'stageDepth':3.6576,'stageHeight':.6096,'grid':3.6576,'ceiling':3.81,'roomDepth':10.668},
 'screen':{'x':2.7,'y':0,'z':2.55,'diameter':1.5,'imageWidth':2.4,'imageHeight':1.5},
 'projector':{'x':2.55,'y':-2.55,'z':3,'bodyWidth':.5,'bodyDepth':.5,'bodyHeight':.18,'lensForward':.28,'lensDown':.01,'lensReference':'INCONNUE','bodyDimensionsStatus':'enveloppe indicative'},
 'dj':{'x':-3,'y':1.8,'width':1.8,'depth':.75,'height':.9},
 'slam':{'x':0,'y':1.1,'width':1.5,'depth':1.5},
 'artistRoute':[[-3.36,3.22],[-1.65,3.22],[-1.65,.55],[.23,.55],[.23,1.28]],
 'bar':{'x':3.4,'y':-4.5,'width':.79,'depth':5.8,'top':1.1425,'status':'dimensions et position indicatives'},
 'columns':[{'x':2.99,'y':-z,'width':.22,'depth':.23,'status':'indicatif'} for z in [2.25,5.4]],
 'fixtures':fixtures
}
data['geometryId']=hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8')
s="import layout from './implantation.json';\n"+s
s=s.replace('const W=8.5344,D=3.6576,H=.6096,GRID=3.6576,CEILING=3.81,ROOM=10.668;',"const {width:W,stageDepth:D,stageHeight:H,grid:GRID,ceiling:CEILING,roomDepth:ROOM}=layout.venue;\nconst E=layout.screen,P=layout.projector,J=layout.dj,BAR=layout.bar;")
s=s.replace('const EX=W/2-.75,EZ=0,PZ=1.85,PX=W/2-.25-.08,PY=3.00;', 'const EX=E.x,EZ=-E.y,PZ=-P.y,PX=P.x,PY=P.z;')
s=s.replace('V07','V08')
s=s.replace("dj.position.set(-3,H,-1.8)","dj.position.copy(point(J.x,J.y,H))")
s=s.replace("box(1.8,.06,.75,0,.9,0,black,dj", "box(J.width,.06,J.depth,0,J.height,0,black,dj")
s=s.replace('new THREE.Vector3(-3,1.9,-1.8)','new THREE.Vector3(J.x,1.9,-J.y)')
s=s.replace('person(-3,-2.31,1.72,H,model)', 'person(J.x,-J.y-.51,1.72,H,model)')
s=s.replace('new THREE.Vector3(-3,H+.7,-1.8)','new THREE.Vector3(J.x,H+.7,-J.y)')
s=s.replace('const routePoints=[[-3.36,H+.025,-3.22],[-1.65,H+.025,-3.22],[-1.65,H+.025,-.55],[.23,H+.025,-.55],[.23,H+.025,-1.28]].map(p=>new THREE.Vector3(...p))','const routePoints=layout.artistRoute.map(([x,y])=>point(x,y,H+.025))')
s=s.replace('box(.79,.085,5.8,3.40,1.10,4.50,wood,bar)','box(BAR.width,.085,BAR.depth,BAR.x,BAR.top-.0425,-BAR.y,wood,bar)')
s=s.replace("for(let z of [2.25,5.4]){box(.22,CEILING,.23,2.99,CEILING/2,z,wood,decor,'Colonne_bois_repere_photo');}","for(const col of layout.columns){box(col.width,CEILING,col.depth,col.x,CEILING/2,-col.y,wood,decor,'Colonne_bois_repere_photo');}")
s=s.replace('// Round screen: outer right edge and plane coincide with the stage boundaries.','// Shared screen position: brought inward from the wall; front plane retained.')
s=s.replace("E1_ecran_coin_avant_droit","E1_ecran_avant_droit_ecarte_du_mur").replace('screen.position.set(EX,2.55,EZ)','screen.position.set(EX,E.z,EZ)')
s=s.replace('new THREE.CircleGeometry(.75,96)','new THREE.CircleGeometry(E.diameter/2,96)').replace('new THREE.TorusGeometry(.756,.018,10,96)','new THREE.TorusGeometry(E.diameter/2+.006,.018,10,96)')
s=re.sub(r"clickable\(screen,\{.*?\}\);", "clickable(screen,{title:'E1 · Écran rond',status:'Essai spatial V08',type:'proposed',text:'Écran rentré de 82 cm vers le centre par rapport à V07. Plan sur le nez de scène. Bord droit à 82 cm du mur dans la maquette. Hauteur et accroches à valider.',measure:`Ø ${E.diameter.toFixed(2)} m · x +${EX.toFixed(2)} ; y ${E.y.toFixed(2)}\\nImage native à produire : 2,40 × 1,50 m, masquée au cercle`});",s)
s=s.replace('box(.50,.18,.50,0,0,0', 'box(P.bodyWidth,P.bodyHeight,P.bodyDepth,0,0,0').replace('new THREE.Vector3(0,-.01,-.28)','new THREE.Vector3(0,-P.lensDown,-P.lensForward)')
s=s.replace('new THREE.Vector3(W/2-.02,PY+.12,PZ)','new THREE.Vector3(PX,GRID,PZ)').replace('Support_lateral_propose_non_valide','Suspension_a_creer_point_non_valide')
s=re.sub(r"clickable\(projector,\{.*?\}\);", "clickable(projector,{title:'P1 · ESSAI HORS BAR',status:'Optique inconnue · montage non validé',type:'proposed',text:'Boîtier dans la salle, côté piste du comptoir. Gabarit 16:10 montré en pointillés : volume à produire, pas une simulation de la lentille installée. Distance calculée depuis le repère de lentille indicatif. Optique, décentrement, support et refroidissement restent à confirmer.',measure:`Corps x +${PX.toFixed(2)} ; y ${P.y.toFixed(2)} ; z +${PY.toFixed(2)} m\\nLentille indicative → écran : ${(PZ-P.lensForward-EZ).toFixed(2)} m\\nOptique courte compatible en distance : ET-DLE085 (non confirmée sur place)`});",s)
s=s.replace("label('P1 · AVANT DROIT'","label('P1 · ESSAI HORS BAR'")
a=s.index("const projectionGuide=group(");b=s.index('// Room reference humans',a)
s=s[:a]+'''const projectionGuide=group('Gabarit_16x10_a_produire_NON_simulation_optique',extras);
const imageCorners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>new THREE.Vector3(EX+x*E.imageWidth/2,E.z+z*E.imageHeight/2,EZ));
function guideLine(pts){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineDashedMaterial({color:'#efc579',dashSize:.065,gapSize:.065,transparent:true,opacity:.65}));l.computeLineDistances();projectionGuide.add(l);}
for(const corner of imageCorners)guideLine([new THREE.Vector3(PX,PY-P.lensDown,PZ-P.lensForward),corner]);
guideLine([...imageCorners,imageCorners[0]]);
''' + s[b:]
a=s.index('const coord=(px,py,z)=>');b=s.index('const names=',a)
s=s[:a]+'const inventory=layout.fixtures;\n'+s[b:]
s=s.replace('projection:{p:[0,3.15,1.5],t:[3.55,2.7,.75]}','projection:{p:[-.6,3.2,4.4],t:[2.65,2.5,1.25]}')
s=s.replace("'La salle et son implantation';", "'Gabarit vidéo à produire · optique non validée';")
s=s.replace("projector:{x:PX,y:-PZ,z:PY,depthReference:PZ,rightClearance:.08}","projector:P,layout")
s=s.replace("applyMode();drawVJ(0);", "$('#geometry-id').textContent=layout.revision+' · Géométrie '+layout.geometryId;applyMode();drawVJ(0);")
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8').replace('Plan V07','Essai V08').replace('Le setup décidé','Implantation à valider')
h=h.replace('Écran rond au coin avant droit, aligné sur les deux bords de scène. Projecteur à l’avant, décalé à droite avec 8 cm de marge géométrique au bord.','Écran à droite, rentré de 82 cm vers le centre. Projecteur dans la salle, côté piste du bar. L’emplacement et le cadre lumineux sont un essai spatial : la lentille installée reste inconnue.')
h=h.replace('Écran Ø 1,50 m · emplacement avant proposé','Écran Ø 1,50 m · image native 2,40 × 1,50 m<br>Lentille indicative → écran : 2,27 m')
h=h.replace('<p>Cliquer sur l’écran', '<p id="geometry-id"></p><p>Cliquer sur l’écran')
h=h.replace('<div class="section"><p class="eyebrow">Dimensions du dossier</p>', '''<div class="section"><p class="eyebrow">Calcul de couverture</p><p class="note">Image 16:10 : 1,50 × 1,60 = <b>2,40 m</b> de large. Diagonale : <b>111,425 pouces</b>. Masque circulaire de 1,50 m.</p><p class="note"><b>ET-DLE085 :</b> recul calculé 1,89–2,36 m. L’essai à 2,27 m entre dans cette plage, sous réserve du repère de mesure et des décentrements.<br><b>ET-DLE170 standard :</b> 4,15–5,82 m. Elle ne convient pas à cette position.<br><b>Lentille de la salle :</b> référence absente du dossier. Aucune de ces deux lentilles n’est confirmée installée.</p><p class="note">Les pointillés indiquent le volume cible avant masque, pas le trajet réel d’une optique ultra-courte. Bar et poteaux : cotes indicatives, à relever sur place.</p></div><div class="section"><p class="eyebrow">Dimensions du dossier</p>''')
(root/'index.template.html').write_text(h,encoding='utf-8')
print('Shared geometry',data['geometryId'],len(fixtures),'fixtures')
