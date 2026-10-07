from pathlib import Path
import json,math,hashlib,shutil
root=Path(__file__).resolve().parent; pdf=root.parent/'pdf/grand_remix'
d=json.loads((root/'implantation.json').read_text(encoding='utf-8')); assert d['revision']=='V15'
a=root/'versions/V15';a.mkdir(exist_ok=True)
for f in ['implantation.json','scene.js','index.template.html','Grand_Remix_3D.html','PLAN_AVANT_CORRIGE.pdf']:shutil.copy2(root/f,a/f)
d['revision']='V16';e=d['screen'];H=d['venue']['stageHeight']
# Conservative sphere encloses both screen faces and a 15 cm reserve beyond the 2.10 m envelope.
center=[e[k] for k in ['x','y','z']]; protection=e['reservationDiameter']/2+.15
def clearance(origin,target,radius):
    length=math.dist(origin,target)
    # Distance-minus-radius is 1-Lipschitz along the center line; subtract half a sampling step.
    conservative_step=(length+abs(radius-.035))/1000/2
    return min(math.dist([origin[j]+(target[j]-origin[j])*i/1000 for j in range(3)],center)-(.035+(radius-.035)*i/1000)-protection for i in range(1001))-conservative_step
djids={'8','10','12','201','202','207','1','M1'}
dt={'101':[-1.8,-2.2,0],'102':[-1.8,-5,0],'103':[-1.8,-8.3,0],'104':[-2.7,-2.5,0],'105':[-2.7,-2.2,0],'111':[-1.5,-3.3,0],'112':[-.8,-3.3,0], 'S1':[-1.8,-2.2,0],'S6':[1.8,-2.2,0],'S3':[-1.8,-5,0],'S4':[1.8,-5,0],'S2':[-1.8,-8.3,0],'S5':[1.8,-8.3,0]}
for f in d['fixtures']:
    isdj=f['id'] in djids
    target=[-3,1.8,H] if isdj else [0,1.1,H]
    radius={'moving':.45,'source':.40,'zoom':.50,'colorado':.55,'sl1':.85,'mini':.9,'par':1.4}[f['kind']]
    if f['kind']=='par':target=dt[f['id']]
    dance=dt.get(f['id'],target)
    origin=[f[k] for k in ['x','y','z']]
    sc=clearance(origin,target,radius);dc=clearance(origin,dance,radius)
    f['focus']={'slamTarget':target,'danceTarget':dance,'radius':radius,'slamOn':sc>0,'danceOn':dc>0,'slamClearance':round(sc,4),'danceClearance':round(dc,4),'role':'DJ' if isdj else 'PISTE' if f['kind']=='par' else 'ARTISTE','status':'Intentions de focus ; rayons illustratifs et decoupes a regler sur place'}
d['lightingProtection']={'enabled':True,'screenSphereRadius':protection,'extraMargin':.15,'movingEffects':'FIXES PENDANT VIDEO ; transit avec dimmer ferme','scope':'Avant et arriere ecran ; orientation et blackout des faisceaux a risque, sans validation photometrique','projectorBoundary':'B4 reste une hypothese non retenue pour la lentille actuelle ; verifier les obstacles quand le point video reel sera fixe'}
d['status']='FOCUS LX PROTEGE AUTOUR ECRAN - POSITION VIDEO A REDEFINIR AVEC LENTILLE SALLE'
d.pop('geometryId');d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8').replace('V15','V16')
s=s.replace("route:true,variant:'A'","route:true,variant:'A',projectionProtection:true")
start=s.index('const initialTarget=new THREE.Vector3'); end=s.index('head.quaternion.',start)
s=s[:start]+"const initialTarget=point(...f.focus.slamTarget);\n"+s[end:]
s=s.replace("let b=null;if(f.kind==='moving'||f.kind==='par'||f.kind==='source'||f.kind==='zoom')b=beam(g.position,initialTarget,colors[f.kind],f.kind==='par'?1.7:(f.kind==='moving'?.68:.85));","let b=beam(g.position,initialTarget,colors[f.kind],f.focus.radius);")
s=s.replace('measure:`Repère ${f.id}',"measure:`Focus : ${f.focus.role}. Vidéo + slam : ${f.focus.slamOn?'ALLUMÉ':'ÉTEINT'} ; vidéo + danse : ${f.focus.danceOn?'ALLUMÉ':'ÉTEINT'}.\\nLyres fixes pendant la vidéo ; déplacements avec dimmer fermé.\\nRepère ${f.id}")
s=s.replace("new THREE.Vector3(...danceTargets[f.id])","point(...f.focus.danceTarget)")
s=s.replace("if(state.mode==='dance')fixtures.forEach", "if(state.mode==='dance'&&!state.projectionProtection)fixtures.forEach")
start=s.index('for(const f of fixtures){if(!f.beam)continue;let active=');end=s.index('projectionGuide.visible=',start)
s=s[:start]+'''for(const f of fixtures){
 const cue=state.mode==='dance'?'dance':'slam';const allowed=f.focus[cue+'On'];
 const target=point(...f.focus[cue+'Target']);aim(f.beam,target);f.head.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),target.clone().sub(f.g.position).normalize());
 const active=$('#fixtures-visible').checked&&allowed;
 f.beam.g.visible=state.beams&&active;f.beam.patch.visible=active&&state.mode!=='setup';
 f.beam.cone.material.opacity=(state.mode==='setup'?.035:.055)*state.level;
 f.lensmat.color.set(allowed?colors[f.kind]:'#252a30');f.beam.cone.material.color.copy(f.lensmat.color);f.beam.patch.material.color.copy(f.lensmat.color);
 f.beam.patch.material.opacity=(state.mode==='dance'?.35:.20)*state.level;
}
''' +s[end:]
s=s.replace("danceLights.forEach(s=>s.intensity=(mode==='dance'?48:mode==='slam'?2.5:5)*state.level);","danceLights.forEach((s,i)=>{const f=fixtures.find(f=>f.id===`S${i+1}`);s.intensity=f.focus[mode==='dance'?'danceOn':'slamOn']?(mode==='dance'?48:mode==='slam'?2.5:5)*state.level:0;});")
s=s.replace("status:'Lentille actuelle inconnue · DT requis'","status:'B4 non retenu avec la lentille actuelle'")
s=s.replace("P1 · B4 · OPTIQUE À CONFIRMER","P1 · HYPOTHÈSE NON VALIDÉE")
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8').replace('V15','V16')
h=h.replace('<p>Écran porté à 2 m estimés,','<p><b>Protection projection active :</b> lumières orientées vers l’artiste, le DJ ou la piste ; appareils à risque éteints dans les états vidéo. Lyres fixes pendant la vidéo, transitions à programmer dans le noir. Vérification des deux faces de l’écran, avec une réserve supplémentaire de 15 cm. Les faisceaux dessinés restent illustratifs.</p><p><b>Position vidéo à reprendre :</b> B4 reste un ancien essai conditionnel ; le point réel doit être choisi avec la lentille ultra-courte de la salle.</p><p>Écran porté à 2 m estimés,')
(root/'index.template.html').write_text(h,encoding='utf-8')
s=(pdf/'build_plan_v15.py').read_text(encoding='utf-8').replace('V15','V16').replace('{n}/5','{n}/6')
# Main top and iso dance arrows now use the shared focus table and omit blacked-out cues.
old="xyz=next(q for a,k,q in fixtures if a==label)"
s=s.replace(old,"focus=next(f['focus'] for f in LAYOUT['fixtures'] if f['id']==label)\n    if not focus['danceOn']:continue\n    target=focus['danceTarget'][:2]\n    "+old)
s=s.replace('pan/tilt limités autour d’E1','lyres fixes pendant la vidéo ; transit avec dimmer fermé')
s=s.replace('P1 / B4 - OPTION','P1 / B4 - NON VALIDÉ')
s=s.replace('Le PDF et la maquette lisent','B4 reste un essai non retenu avec la lentille actuelle ; reprendre le point vidéo avec le DT. Le PDF et la maquette lisent')
s=s.replace('foot(5);c.showPage();c.save()', '''foot(5);c.showPage()
head(6,'FOCUS LX - PROTECTION DES DEUX FACES DE L’ÉCRAN')
pane(28,56,680,688,'ORIENTATIONS PARTAGÉES AVEC LE 3D - VIDÉO ACTIVE')
pane(724,56,438,688,'CONSIGNES POUR LE FOCUS ET LA PROGRAMMATION')
groups={}
for f in LAYOUT['fixtures']:
    focus=f['focus']; key=(focus['role'],focus['slamOn'],focus['danceOn'])
    groups.setdefault(key,[]).append(f['id'])
rows=[['Appareils','Destination','Slam + vidéo','Danse + vidéo']]
for (role,slam,dance),ids in groups.items():rows.append([', '.join(ids),role,'ALLUMÉ' if slam else 'ÉTEINT','ALLUMÉ' if dance else 'ÉTEINT'])
table(42,700,652,[310,108,117,117],rows,rowheights=[27]+[37]*(len(rows)-1),size=9)
para(43,175,644,'Allumé = état proposé après réglage du focus. Éteint = faisceau non retenu pendant la vidéo, sans dépose physique. Source Four : utiliser les couteaux pour couper les débordements ; Zoom : resserrer si nécessaire. Ne pas confondre ces coupures avec les déposes proposées de 106 et 5. Les niveaux précis restent à programmer en salle.',10)
para(741,700,399,'<b>1. Lumières derrière E1.</b> Orienter vers le centre artiste ou le DJ, en évitant aussi le dos de la toile. Aucun éclairage direct sur l’une ou l’autre face du cercle.<br/><br/><b>2. Appareils à risque.</b> Les états ci-contre coupent les faisceaux dont le volume illustratif s’approche trop de l’écran. Une rotation ne garantit pas l’absence de débordement : contrôler les contours et la diffusion réelle.<br/><br/><b>3. Lyres.</b> Positions de focus fixes tant que la projection est active. Retirer les mouvements automatiques dans cet état. Transitions avec dimmer fermé ; réouverture au point vérifié. Aucune valeur pan/tilt DMX inventée.<br/><br/><b>4. Zone protégée.</b> Contrôle conservateur autour d’une sphère de rayon 1,20 m centrée sur E1 : réserve écran Ø 2,10 m plus 15 cm. Les rayons de faisceau sont des gabarits de conception, pas des mesures photométriques.<br/><br/><b>5. Trajet vidéo.</b> Garder appareils, câbles et accessoires hors du faisceau vidéo réel. Les appareils derrière la toile ne bloquent pas une projection frontale si aucun élément ne dépasse devant elle ; ils peuvent néanmoins éclairer son dos. Recontrôler après identification de la lentille et du nouveau point P1.<br/><br/><b>6. Validation réelle.</b> Tester une mire blanche puis noire avec chaque appareil séparément, de face et derrière la toile. Corriger couteaux, zoom et orientation ; laisser éteint tout appareil qui lave l’image. Vérifier aussi les reflets et le brouillard.<br/><br/><b>Portée :</b> consignes et maquette mises à jour ; aucun réglage de la GrandMA3 ni déplacement réel exécuté.',10)
foot(6);c.showPage();c.save()''')
(pdf/'build_plan_v16.py').write_text(s,encoding='utf-8')
print('Blackouts slam:',[f['id'] for f in d['fixtures'] if not f['focus']['slamOn']])
print('Blackouts dance:',[f['id'] for f in d['fixtures'] if not f['focus']['danceOn']])
print('Groups:',len({(f['focus']['role'],f['focus']['slamOn'],f['focus']['danceOn']) for f in d['fixtures']}))
