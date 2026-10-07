from pathlib import Path
import json, hashlib, shutil, re
root=Path(__file__).resolve().parent
pdf=root.parent/'pdf/grand_remix'
d=json.loads((root/'implantation.json').read_text(encoding='utf-8'))
assert d['revision']=='V13'
archive=root/'versions/V13'; archive.mkdir(exist_ok=True)
for name in ['implantation.json','Grand_Remix_3D.html','scene.js','index.template.html','PLAN_AVANT_CORRIGE.pdf']:
    shutil.copy2(root/name,archive/name)
d['revision']='V14'
d['status']='OPTION SUR BARRE SALLE - LENTILLE INSTALLEE INCONNUE - VALIDATION DT REQUISE'
d['projector'].update(x=2.25,y=-4.25,z=2.75,mountBar='B4',mounting='Option sur barre salle reperee graphiquement ; adaptateur, charge et lentille a confirmer')
f=next(f for f in d['fixtures'] if f['id']=='5')
d['removedFixtures'].append(dict(f,reason='Depose proposee pour reserver P1 sur B4 ; aucune nouvelle accroche LX attribuee'))
d['fixtures']=[f for f in d['fixtures'] if f['id']!='5']
z=d['venue']['grid']
d['rigBars']=[dict(id=f'B{i}',a=[-3.95,y,z],b=[3.95,y,z],source='Plan LX source, vue Top et isometrie',status='Trace existant repere ; cotes estimees, charge et accessibilite non confirmees') for i,y in enumerate([.807,1.77,2.78,-4.25],1)]
for name,x in [('L-G',-3.36),('L-C',-.20),('L-D',3.02)]:
    d['rigBars'].append(dict(id=name,a=[x,0,z],b=[x,-4.25,z],source='Traces longitudinaux de la vue Top du dossier LX',status='Reperage graphique approximatif ; nature continue et limites a confirmer sur place'))
d['rigNotes']='Barres carrees 2 pouces selon source. Aucun rail a rideaux, conduit, poutre decorative ou surface vide ne vaut point approuve. Pas de charge admissible fournie.'
d.pop('geometryId',None);d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8').replace('V13','V14')
start=s.index('for(let y of [.807,1.77,2.78,-4.25])')
end=s.index('for(let x of [-2.7,-.9,.9,2.7])',start)
s=s[:start]+'''const rigMeshes=[],rigLabels=[];
const rigHighlight=new THREE.MeshStandardMaterial({color:'#75ddcd',emissive:'#306b62',emissiveIntensity:.4,metalness:.5,roughness:.4});
for(const b of layout.rigBars){
 const a=point(...b.a),end=point(...b.b),delta=end.clone().sub(a),middle=a.clone().add(end).multiplyScalar(.5);
 const mesh=box(.0508,delta.length(),.0508,0,0,0,metal,rig,b.id+'_barre_reperage_graphique');
 mesh.position.copy(middle);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());rigMeshes.push(mesh);
 clickable(mesh,{title:b.id+' · Barre repérée',status:'Cotes graphiques · charge non confirmée',type:'proposed',text:b.status+'. Sections sans appareil représentées aussi. Une place vide ne confirme pas une disponibilité. Priorité P1 sur B4 : dépose proposée du Zoom 5 ; priorité E1 sur B1 : dépose proposée de la lyre 106.',measure:'Tube carré 2 pouces selon dossier.\u005cn'+b.a.map(v=>v.toFixed(2)).join(' ; ')+' → '+b.b.map(v=>v.toFixed(2)).join(' ; ')+' m'});
 const item=label(b.id+(b.id==='B4'?' · OPTION P1':''),middle.clone().add(new THREE.Vector3(0,.16,0)),true,true);item.rigOnly=true;rigLabels.push(item);
}
// Yellow curtain tracks are explicitly excluded from attachment options.
const curtainTracks=group('Rails_rideaux_INTERDIT_ACCROCHE',rig);
const trackMat=mat('#a79448');
box(W,.022,.022,0,GRID+.08,-D+.06,trackMat,curtainTracks);
for(const x of [-W/2+.06,W/2-.06])box(.022,.022,D,x,GRID+.08,-D/2,trackMat,curtainTracks);
clickable(curtainTracks,{title:'Rails à rideaux',status:'Aucune accroche appareil',type:'proposed',text:'Les notes du plan source interdisent l’accroche des appareils sur les rails à rideaux, dessinés en jaune.',measure:'Ne pas confondre avec les tubes carrés de la grille.'});
''' + s[end:]
s=s.replace("mountA.name='Suspension_a_creer_point_non_valide'","mountA.name='Option_support_B4_adaptation_Chief_non_validee'")
start=s.index("clickable(projector,{title:")
end=s.index("const projectionGuide=",start)
s=s[:start]+'''clickable(projector,{title:'P1 · OPTION SUR B4',status:'Lentille actuelle inconnue · DT requis',type:'proposed',text:'Option sur la barre transversale salle, repérée à environ 4,25 m du nez de scène. Axe aligné sur E1 ; Zoom 5 retiré de cette proposition pour réserver le montage. Support Chief VCMU documenté, adaptation au tube carré et capacité non confirmées. Recul compatible avec la plage du zoom standard ET-DLE170 pour ce gabarit, mais sa présence dans la salle n’est pas confirmée. La fiche décrit une optique ultra-courte non identifiée. Boîtier à 0,505 m du comptoir indicatif. Hauteur, enveloppe réelle, ventilation et décentrement restent à valider.',measure:`x +${PX.toFixed(2)} ; y ${P.y.toFixed(2)} ; z +${PY.toFixed(2)} m
Repère lentille → écran : ${(PZ-P.lensForward-EZ).toFixed(3)} m
Alignement horizontal : 0,00 m ; écart vertical : 0,69 m`});
const labelProjector=label('P1 · B4 · OPTIQUE À CONFIRMER',new THREE.Vector3(PX,PY+.32,PZ+.40),true);
''' + s[end:]
s=s.replace('LX_41_appareils_106_depose_proposee','LX_40_actifs_106_et_5_depose_proposee')
s=s.replace("projection:{p:[-.75,2.1,3.5],t:[2.65,2.4,1.2]}","projection:{p:[-1.8,2.3,6.8],t:[2.25,2.35,1.7]},rig:{p:[7.8,9.8,10.5],t:[0,2.5,.7]}")
s=s.replace("let r=host.getBoundingClientRect();for(const l of labelItems)","let r=host.getBoundingClientRect();for(const l of labelItems)")
s=s.replace('visible=state.labels&&p.z<1','visible=state.labels&&(!l.rigOnly||state.rigFocus)&&p.z<1')
s=s.replace("$('#geometry-id').textContent=", """function applyRigView(){state.rigFocus=$('#rig-focus').checked;for(const m of rigMeshes)m.material=state.rigFocus?rigHighlight:metal;fixtureLayer.visible=$('#fixtures-visible').checked;for(const b of beamItems)b.g.visible=fixtureLayer.visible&&state.beams;}
$('#rig-focus').addEventListener('change',applyRigView);$('#fixtures-visible').addEventListener('change',applyRigView);
applyRigView();
$('#geometry-id').textContent=""")
# beam visibility is controlled by existing mode handler; do not access a guessed beam field.
s=s.replace('for(const b of beamItems)b.g.visible=fixtureLayer.visible&&state.beams;','')
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8').replace('Essai V13','Option V14')
h=h.replace('</nav><div class="scene-caption">','<button data-view="rig" aria-pressed="false">Barres d’accroche</button></nav><div class="scene-caption">')
h=h.replace('<div class="row"><label for="shell">','<div class="row"><label for="rig-focus">Souligner toutes les barres</label><input id="rig-focus" type="checkbox" checked></div><div class="row"><label for="fixtures-visible">Afficher les appareils LX</label><input id="fixtures-visible" type="checkbox" checked></div><div class="row"><label for="shell">')
start=h.index('<p>DJ rapproché');end=h.index('<div class="section"><p class="eyebrow">Dimensions du dossier',start)
h=h[:start]+'''<p>Écran conservé sur B1, 81 cm derrière le bord de scène, bas à 1,30 m. Option P1 sur B4, barre transversale à environ 4,25 m devant la scène : projecteur aligné sur E1, hors comptoir dans la maquette. Priorité projection : dépose proposée de 106 pour E1 et du Zoom 5 pour P1. Leurs remplacements restent à définir avec le DT.</p><div class="measure">Écran Ø 1,50 m · image visible Ø 1,48 m<br>Bord noir intérieur : 1 cm<br>P1 : x +2,25 ; y −4,25 ; z +2,75 m<br>Repère lentille → écran : 4,777 m</div><p id="geometry-id"></p><p>Cliquer sur une barre pour ses repères. Les sections sans appareil sont visibles ; leur disponibilité et leur charge ne sont pas attestées.</p></div>
<div class="section"><p class="eyebrow">Accroches et optique</p><p class="note">B1–B3 : traverses de scène. B4 : traverse salle. L-G, L-C, L-D : tracés longitudinaux repris graphiquement. Tubes carrés 2 pouces. Implantation estimée depuis le plan LX : limites, hauteurs exactes et continuité à relever. Jaune : rails à rideaux, aucune accroche appareil. Ventilation et poutres décoratives exclues.</p><p class="note"><b>Option uniquement :</b> le Chief VCMU est inventorié ; son adaptation sur B4 et la capacité de la barre ne sont pas documentées. L’ancien point P1 entre les barres n’était pas confirmé.</p><p class="note">Gabarit 16:10 : 2,432 × 1,52 m ; diagonale 112,911 pouces.<br><b>ET-DLE170 standard :</b> 4,20–5,90 m. Recul de l’option : <b>4,777 m</b>, dans cette plage.<br><b>ET-DLE085 :</b> 1,92–2,39 m, incompatible avec ce recul et ce gabarit.<br><b>Lentille installée inconnue :</b> la fiche indique « ultra short throw ». Il faut sa référence avant de retenir B4. Aucune substitution de lentille n’est confirmée disponible.</p><p class="note">Axe horizontal aligné ; décalage vertical indicatif 0,69 m. Le réglage de lens shift reste à vérifier avec la lentille et la hauteur réelle de son axe. Les pointillés montrent le gabarit cible ; ils ne simulent pas l’optique installée. Comptoir à 0,505 m du boîtier indicatif ; architecture et dégagement de refroidissement non validés.</p></div>''' + h[end:]
h=h.replace('Lyre 106 : dépose proposée, appareil conservé dans l’inventaire.','Lyre 106 et Zoom 5 : déposes proposées, appareils conservés dans l’inventaire.')
(root/'index.template.html').write_text(h,encoding='utf-8')
print(d['geometryId'])
