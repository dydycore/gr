import layout from './implantation.json';
import {createLightingEditor} from './lighting-editor.js';
import {profiles,wheel,sanitizeFx,motionAngles,coneHitsSphere} from './fixture-profiles.js';
import {createGoboPreview} from './gobo-preview.js';
import atmosphere from './atmosphere.json';
import {createFogPreview} from './fog-preview.js';
let lightingEditor=null;
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

const $=s=>document.querySelector(s),host=$('#viewport');
const {width:W,stageDepth:D,stageHeight:H,grid:GRID,ceiling:CEILING,roomDepth:ROOM}=layout.venue;
const E=layout.screen,P=layout.projector,J=layout.dj,BAR=layout.bar;
const EX=E.x,EZ=-E.y,PZ=-P.y,PX=P.x,PY=P.z;
const scene=new THREE.Scene();scene.background=new THREE.Color('#151c24');
const model=new THREE.Group();model.name='Grand_Remix_V18_Metres';scene.add(model);
model.userData={units:'metres',revision:'V18',date:'2026-10-07',coordinates:'X droite public ; Y hauteur ; Z vers public. Pour le plan : x=X, y=-Z, z=Y.',status:'Implantation proposee ; pas un releve ni une validation technique'};
const camera=new THREE.PerspectiveCamera(46,1,.05,150);camera.position.set(11.5,10.5,16);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.target.set(0,1.1,2.6);controls.maxDistance=32;controls.minDistance=1.2;controls.maxPolarAngle=Math.PI*.497;
const state={mode:'setup',view:'overview',level:1,roomDark:false,beams:true,people:false,labels:true,shell:false,motion:true,route:true,variant:'A',projectionProtection:true};
const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const black=mat('#191e25'),metal=mat('#535f6c',.35,.65),wallmat=mat('#3b424a'),floor=mat('#ad8a65'),stageMat=mat('#171b20'),warmMetal=mat('#746958',.4,.35);
let seed=41;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function woodTexture(){const cv=document.createElement('canvas');cv.width=512;cv.height=1024;const t=cv.getContext('2d');t.fillStyle='#705238';t.fillRect(0,0,512,1024);for(let col=0;col<8;col++){for(let row=-1;row<5;row++){let x=col*64,y=row*256+(col%2)*128;let v=rand()*25;t.fillStyle=`rgb(${117+v},${84+v*.8},${56+v*.5})`;t.fillRect(x+1,y+1,62,254);for(let j=0;j<90;j++){let gx=x+2+rand()*60;t.strokeStyle=rand()>.5?'#d6b58b17':'#22130724';t.lineWidth=.5+rand();t.beginPath();t.moveTo(gx,y);t.bezierCurveTo(gx+5,y+70,gx-4,y+180,gx+rand()*3,y+255);t.stroke();}}}const tx=new THREE.CanvasTexture(cv);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(2.2,2.7);tx.colorSpace=THREE.SRGBColorSpace;return tx;}
floor.map=woodTexture();floor.roughness=.7;
function brickTexture(){const cv=document.createElement('canvas');cv.width=1024;cv.height=512;const b=cv.getContext('2d');b.fillStyle='#827a70';b.fillRect(0,0,1024,512);for(let r=0;r<16;r++)for(let col=-1;col<13;col++){let v=rand()*25;b.fillStyle=`rgb(${89+v},${61+v*.7},${48+v*.65})`;b.fillRect(col*86+(r%2)*43+2,r*32+2,82,28);}b.fillStyle='#d9d4c7c4';b.fillRect(0,136,1024,190);b.fillRect(100,0,64,512);b.fillRect(820,0,74,512);const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;return tx;}
const bricks=mat('#b9afa3');bricks.map=brickTexture();
const pickables=[],labelItems=[],fixtures=[],beamItems=[],spots=[];const extras=new THREE.Group();scene.add(extras);extras.name='Reperes_hors_export';
function group(name,parent=model){let g=new THREE.Group();g.name=name;parent.add(g);return g;}
function box(w,h,d,x,y,z,material=black,parent=model,name=''){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.name=name;parent.add(m);return m;}
function cylinder(radius,length,pos,material=metal,parent=model){let m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,16),material);m.position.copy(pos);m.castShadow=true;parent.add(m);return m;}
function rod(a,b,r=.016,material=metal,parent=model){let delta=b.clone().sub(a),m=cylinder(r,delta.length(),a.clone().add(b).multiplyScalar(.5),material,parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
function point(x,y,z){return new THREE.Vector3(x,z,-y);}
function clickable(obj,data){obj.userData.details=data;pickables.push(obj);return obj;}
function label(text,pos,proposed=false,small=false){let e=document.createElement('div');e.textContent=text;e.className='overlay-label'+(proposed?' proposed':'')+(small?' small':'');$('#labels').appendChild(e);let item={e,pos};labelItems.push(item);return item;}
const hemi=new THREE.HemisphereLight('#dcecf5','#605e62',2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight('#ffecd2',2.2);sun.position.set(-5,13,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:35});sun.shadow.bias=-.0008;scene.add(sun);
const room=group('Salle_dimensions_documentees');
box(W,.16,ROOM+D,0,-.08,(ROOM-D)/2,floor,room,'Sol_salle');
const stage=box(W,H,D,0,H/2,-D/2,stageMat,room,'Scene_8.5344x3.6576_h0.6096');
clickable(stage,{title:'Scène',status:'Dimensions documentées',type:'confirmed',text:'Plancher en bois peint noir mat. Dimensions mur à mur du dossier technique.',measure:'Largeur 8,5344 m · profondeur 3,6576 m\nHauteur 0,6096 m · grille 3,6576 m / salle'});
// Subtle floor seams and the stage front edge provide a metric depth cue.
box(W,.018,.018,0,H+.002,0,mat('#a4c8bc'),room,'Nez_de_scene');
// Two stair volumes are indicative, following the supplied wireframe.
for(let sign of [-1,1])for(let i=0;i<3;i++)box(.65,H*(i+1)/3,.24,sign*(W/2-.325),H*(i+1)/6,.60-i*.24,stageMat,room,'Marche_indicative');
// Back wall, curtain folds, side walls and ceiling.
box(W,CEILING,.12,0,CEILING/2,-D-.06,wallmat,room,'Mur_arriere');
const curtainMat=mat('#20212a',.96);for(let i=0;i<75;i++){let x=-3.95+i*(7.9/74);if(x< -3.05&&x> -3.65)continue;cylinder(.072,2.93,new THREE.Vector3(x,H+1.465,-D+.18+.055*Math.sin(i)),curtainMat,room).name='Rideau_fond';}
const shell=group('Murs_et_plafond');
for(let x of [-W/2-.06,W/2+.06])box(.12,CEILING,ROOM+D,x,CEILING/2,(ROOM-D)/2,wallmat,shell,'Mur_lateral');
box(W,CEILING,.12,0,CEILING/2,ROOM+.06,bricks,shell,'Mur_brique_fond_salle');
box(W,.12,ROOM+D,0,CEILING+.06,(ROOM-D)/2,mat('#242932'),shell,'Plafond');shell.visible=false;
// Low perimeter retained in cutaway mode.
const cutaway=group('Contour_salle');for(let x of [-W/2,W/2])box(.05,.08,ROOM+D,x,.04,(ROOM-D)/2,metal,cutaway);
// Appearance reconstructed from the venue PDF photographs, not surveyed dimensions.
const decor=group('Habillage_d_apres_photos_cotes_indicatives');const wood=mat('#65462f',.75),bronze=mat('#9b8058',.35,.6);
const bar=group('Bar_cote_droit_public_indicatif',decor);box(.64,1.06,5.6,3.46,.53,4.50,mat('#493b31'),bar);box(BAR.width,.085,BAR.depth,BAR.x,BAR.top-.0425,-BAR.y,wood,bar);
box(.012,.022,5.65,3.062,1.052,4.50,new THREE.MeshBasicMaterial({color:'#ffc27d'}),bar,'Bande_lumineuse_bar');
box(.06,2.55,2.25,4.20,1.30,4.65,black,bar,'Arriere_bar');
for(let y of [1.38,1.80,2.22]){box(.26,.035,2.2,4.00,y,4.65,wood,bar);box(.018,.022,2.1,3.87,y+.02,4.65,new THREE.MeshBasicMaterial({color:'#ffc78b'}),bar);for(let n=0;n<11;n++){let m=mat(n%3?'#84632d':'#50735c',.27,.1);cylinder(.027,.20,new THREE.Vector3(3.98,y+.12,3.67+n*.19),m,bar);cylinder(.012,.07,new THREE.Vector3(3.98,y+.24,3.67+n*.19),m,bar);}}
for(let z of [2.0,2.85,3.70,4.55,5.4,6.25]){cylinder(.17,.05,new THREE.Vector3(2.84,.73,z),wood,bar);for(let dz of [-.11,.11])for(let x of [2.74,2.94])rod(new THREE.Vector3(x,.70,z+dz),new THREE.Vector3(x,.02,z+dz*1.35),.014,metal,bar);}
for(const col of layout.columns){box(col.width,CEILING,col.depth,col.x,CEILING/2,-col.y,wood,decor,'Colonne_bois_repere_photo');}
for(let z of [2.4,3.55,4.7,5.85]){rod(new THREE.Vector3(3.45,CEILING,z),new THREE.Vector3(3.45,2.45,z),.006,black,bar);let shade=new THREE.Mesh(new THREE.ConeGeometry(.17,.14,24,1,true),bronze);shade.position.set(3.45,2.43,z);bar.add(shade);let bulb=new THREE.Mesh(new THREE.SphereGeometry(.032,10,8),new THREE.MeshBasicMaterial({color:'#ffe5b2'}));bulb.position.set(3.45,2.39,z);bar.add(bulb);}
const barGlow=new THREE.PointLight('#ffc078',4.5,7,1.2);barGlow.position.set(3.05,1.65,4.4);scene.add(barGlow);
// Painted brick rear, black acoustic absorbers and the left-side door seen from stage.
for(let x of [-2.9,-.8,1.4])box(1.45,1.05,.12,x,2.75,ROOM-.03,black,shell,'Absorbeur_mur_fond');
for(let z of [1.5,4.3,7.1,9.1])box(.08,1.1,1.55,-W/2+.06,2.75,z,black,shell,'Absorbeur_mur_lateral');
box(.08,2.18,1.02,-W/2+.04,1.09,8.2,mat('#252b31'),shell,'Porte_salle_repere_photo');
box(.035,.055,.18,-W/2+.10,1.05,7.9,metal,shell);box(.03,.17,.35,-W/2+.10,2.36,8.2,new THREE.MeshBasicMaterial({color:'#77cc99'}),shell,'Repere_sortie_photo_position_indicative');
for(let z=-2.7;z<ROOM;z+=2.3)box(W,.09,.11,0,CEILING-.12,z,wood,shell,'Poutre_plafond');
// Compact main PA silhouettes follow the pair of hanging stacks in the source drawings.
for(let sign of [-1,1])for(let i=0;i<2;i++){const cabinet=box(.37,.35,.30,sign*3.82,3.38-i*.35,-.55,black,decor,'QSC_KLA12_volume_indicatif');cabinet.rotation.x=.12;}
clickable(bar,{title:'Bar de la salle',status:'Reconstitué depuis les photos',type:'proposed',text:'Bar lumineux, tabourets, étagères et suspensions repris visuellement du dossier. Cotes et implantation détaillées indicatives ; elles ne constituent pas un relevé architectural.',measure:'Côté droit depuis le public'});
// Acoustic panels and hanging pipes. Existing rig points are graphic estimates.
const rig=group('Grille_et_ventilation_reperage_graphique');
const rigMeshes=[],rigLabels=[];
const rigHighlight=new THREE.MeshStandardMaterial({color:'#75ddcd',emissive:'#306b62',emissiveIntensity:.4,metalness:.5,roughness:.4});
for(const b of layout.rigBars){
 const a=point(...b.a),end=point(...b.b),delta=end.clone().sub(a),middle=a.clone().add(end).multiplyScalar(.5);
 const mesh=box(.0508,delta.length(),.0508,0,0,0,metal,rig,b.id+'_barre_reperage_graphique');
 mesh.position.copy(middle);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());rigMeshes.push(mesh);
 clickable(mesh,{title:b.id+' · Barre repérée',status:'Cotes graphiques · charge non confirmée',type:'proposed',text:b.status+'. Sections sans appareil représentées aussi. Une place vide ne confirme pas une disponibilité. Priorité P1 sur B4 : dépose proposée du Zoom 5 ; priorité E1 sur B1 : dépose proposée de la lyre 106.',measure:'Tube carré 2 pouces selon dossier.\n'+b.a.map(v=>v.toFixed(2)).join(' ; ')+' → '+b.b.map(v=>v.toFixed(2)).join(' ; ')+' m'});
 const item=label(b.id+(b.id==='B4'?' · OPTION P1':''),middle.clone().add(new THREE.Vector3(0,.16,0)),true,true);item.rigOnly=true;rigLabels.push(item);
}
// Yellow curtain tracks are explicitly excluded from attachment options.
const curtainTracks=group('Rails_rideaux_INTERDIT_ACCROCHE',rig);
const trackMat=mat('#a79448');
box(W,.022,.022,0,GRID+.08,-D+.06,trackMat,curtainTracks);
for(const x of [-W/2+.06,W/2-.06])box(.022,.022,D,x,GRID+.08,-D/2,trackMat,curtainTracks);
clickable(curtainTracks,{title:'Rails à rideaux',status:'Aucune accroche appareil',type:'proposed',text:'Les notes du plan source interdisent l’accroche des appareils sur les rails à rideaux, dessinés en jaune.',measure:'Ne pas confondre avec les tubes carrés de la grille.'});
for(let x of [-2.7,-.9,.9,2.7])box(1.2,.045,2.7,x,CEILING-.04,-D/2,black,shell,'Panneau_acoustique');
for(let x of [-3.87,3.87]){const duct=cylinder(.23,9.60,new THREE.Vector3(x,3.40,5.5),mat('#727d8a',.55,.65),rig);duct.rotation.x=Math.PI/2;duct.name='Ventilation_volume_indicatif';
for(let z=.8;z<10.3;z+=.8){let band=new THREE.Mesh(new THREE.TorusGeometry(.235,.012,5,32),metal);band.position.set(x,3.40,z);rig.add(band);}}
// DJ table and simplified performance hardware.
const dj=group('DJ_Franze_gauche_public');dj.position.copy(point(J.x,J.y,H));
box(J.width,.06,J.depth,0,J.height,0,black,dj,'Table_1.80x0.75');box(1.8,.80,.025,0,.45,.36,mat('#242c34'),dj,'Facade_DJ');
for(let x of [-.78,.78])for(let z of [-.28,.28])box(.045,.88,.045,x,.44,z,metal,dj,'Pied_table');
for(let x of [-.50,.25]){box(.48,.07,.38,x,.97,0,mat('#3d454a'),dj,'Platine');let disk=cylinder(.13,.018,new THREE.Vector3(x,1.012,0),black,dj);}
box(.22,.06,.30,-.12,.96,.02,metal,dj,'Mixeur');
let laptop=box(.33,.22,.014,.57,1.12,-.15,mat('#8fc0ba',.3),dj,'Ecran_ordinateur');laptop.rotation.x=-.16;
box(.34,.014,.23,.57,1.00,-.03,metal,dj);
clickable(dj,{title:'DJ Fränze',status:'Implantation décidée',type:'proposed',text:'Proche du mur gauche vu du public, reculé de 30 cm pour placer F1 entre le booth et l’enceinte. Environ 37 cm entre la table et le mur dans la maquette. L’arrivée de l’artiste contourne le mobilier par le fond puis côté centre.',measure:'Centre x −3,00 ; y +2,10 m\nTable proposée 1,80 × 0,75 m\nBord gauche x −3,90 m ; mur x −4,2672 m'});
label('DJ · GAUCHE',new THREE.Vector3(J.x,1.9,-J.y),true);
const fogMachine=group('F1_Antari_position_proposee');fogMachine.position.copy(point(atmosphere.x,atmosphere.y,atmosphere.z));
box(atmosphere.width,atmosphere.height,atmosphere.depth,0,atmosphere.height/2,0,black,fogMachine,'Boitier_F1');
box(.42,.035,.20,0,atmosphere.height+.018,0,metal,fogMachine,'Poignee_F1');
box(.17,.075,.008,.16,.17,atmosphere.depth/2+.005,mat('#11151b'),fogMachine,'Sortie_brouillard');
const fogLed=box(.023,.012,.01,-.20,.23,atmosphere.depth/2+.009,new THREE.MeshBasicMaterial({color:'#75282b'}),fogMachine);
clickable(fogMachine,{title:'F1 · Machine à brouillard',status:'Au sol entre enceinte gauche et booth DJ reculé de 30 cm',type:'proposed',fog:true,text:atmosphere.status,measure:'Antari F-1W inventoriée. Centre x −3,62 ; y +1,43 m. Posée sur scène. Encombrement indicatif 60,8 × 27,5 × 28,6 cm.'});
const fogPreview=createFogPreview({scene,origin:fogMachine.position.clone().add(new THREE.Vector3(.16,.17,atmosphere.depth/2+.04))});
function syncFog(){const s=fogPreview.state;$('#fog-toggle').textContent=s.on?'Arrêter la machine':'Démarrer la machine';$('#fog-toggle').setAttribute('aria-pressed',s.on);$('#fog-rate').value=Math.round(s.rate*100);$('#fog-value').textContent=Math.round(s.rate*100)+' %';$('#fog-status').textContent=s.on?'Émission en cours · diffusion illustrative':'Émission arrêtée · dissipation progressive';fogLed.material.color.set(s.on?'#7beec4':'#75282b');}
const slam=group('Zone_slam');const slamLine=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-.75,H+.005,-.35],[.75,H+.005,-.35],[.75,H+.005,-1.85],[-.75,H+.005,-1.85]].map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:'#62bda8'}));slam.add(slamLine);
rod(new THREE.Vector3(0,H,-1.1),new THREE.Vector3(0,H+1.46,-1.1),.012,metal,slam);cylinder(.14,.025,new THREE.Vector3(0,H+.012,-1.1),black,slam);
rod(new THREE.Vector3(0,H+1.44,-1.1),new THREE.Vector3(0,H+1.50,-.92),.021,black,slam);
label('SLAM · CENTRE',new THREE.Vector3(0,H+.20,-.6));
// Shared screen position: brought inward from the wall; front plane retained.
const screen=group('E1_ecran_avant_droit_ecarte_du_mur');screen.position.set(EX,E.z,EZ);
const vjCanvas=document.createElement('canvas');vjCanvas.width=512;vjCanvas.height=512;const ctx=vjCanvas.getContext('2d');const vjTexture=new THREE.CanvasTexture(vjCanvas);vjTexture.colorSpace=THREE.SRGBColorSpace;
const circle=new THREE.Mesh(new THREE.CircleGeometry(E.diameter/2,96),new THREE.MeshBasicMaterial({color:'#000000',side:THREE.DoubleSide}));screen.add(circle);
const visibleImage=new THREE.Mesh(new THREE.CircleGeometry(E.contentDiameter/2,96),new THREE.MeshBasicMaterial({map:vjTexture,side:THREE.DoubleSide}));visibleImage.position.z=.002;screen.add(visibleImage);
const rim=new THREE.Mesh(new THREE.TorusGeometry(E.diameter/2+.006,.018,10,96),metal);screen.add(rim);
for(let dx of [-.40,.40])rod(new THREE.Vector3(EX+dx,E.z+Math.sqrt((E.diameter/2)**2-dx**2),EZ),new THREE.Vector3(EX+dx,GRID,EZ),.006,metal,model).name='Suspension_E1_proposee';
clickable(screen,{title:'E1 · Écran rond',status:'Essai spatial V18',type:'proposed',text:'Écran estimé à 2 m, réserve de place Ø 2,10 m. Depuis V16 : écran seul décalé de 40 cm vers la droite vue public. Hauteur et recul conservés. Projecteur au repère provisoire précédent, décalage horizontal de 40 cm non validé avec la lentille de la salle. Écran sur la première barre : 80,7 cm derrière le nez de scène. Abaissé de 50 cm : bas 1,05 m, haut 3,05 m au-dessus du sol salle. Lyre 106 retirée de la maquette pour libérer le point d’accroche proposé. Suspension à faire valider par le DT. Image visible Ø 1,98 m : bord noir intérieur de 1 cm sur l’écran Ø 2,00 m estimé. Le gabarit natif dépasse légèrement pour permettre le réglage du masque. Hauteur et accroches à valider.',measure:`Ø ${E.diameter.toFixed(2)} m · x +${EX.toFixed(2)} ; y ${E.y.toFixed(2)}
Image native à produire : ${E.imageWidth.toFixed(3)} × ${E.imageHeight.toFixed(2)} m, masquée au cercle`});
label('E1 · Ø 2 m ESTIMÉ',new THREE.Vector3(EX,E.z+E.diameter/2+.27,EZ),true);
const reservePts=Array.from({length:97},(_,i)=>new THREE.Vector3(EX+E.reservationDiameter/2*Math.cos(i*Math.PI/48),E.z+E.reservationDiameter/2*Math.sin(i*Math.PI/48),EZ+.008));
const reserveRing=new THREE.Line(new THREE.BufferGeometry().setFromPoints(reservePts),new THREE.LineDashedMaterial({color:'#f3c575',dashSize:.055,gapSize:.055,transparent:true,opacity:.65}));reserveRing.computeLineDistances();reserveRing.name='Reserve_ecran_2.10m_non_mesuree';model.add(reserveRing);
const projector=group('P1_Panasonic_PT_RZ770_position_proposee');projector.position.set(PX,PY,PZ);
box(P.bodyWidth,P.bodyHeight,P.bodyDepth,0,0,0,mat('#bec7c9',.45),projector,'Corps_indicatif');
let lens=cylinder(.057,.10,new THREE.Vector3(0,-P.lensDown,-P.lensForward),black,projector);lens.rotation.x=Math.PI/2;
box(.12,.012,.12,0,.13,0,metal,projector);
const mountA=rod(new THREE.Vector3(PX,PY+.12,PZ),new THREE.Vector3(PX,GRID,PZ),.013,warmMetal,model);mountA.name='Option_support_B4_adaptation_Chief_non_validee';
clickable(projector,{title:'P1 · OPTION SUR B4',status:'B4 non retenu avec la lentille actuelle',type:'proposed',text:'Option sur la barre transversale salle, repérée à environ 4,25 m du nez de scène. Axe décalé de 40 cm par rapport à E1 ; Zoom 5 retiré de cette proposition pour réserver le montage. Support Chief VCMU documenté, adaptation au tube carré et capacité non confirmées. Recul compatible avec la plage du zoom ET-DLE150 pour ce gabarit, mais sa présence dans la salle n’est pas confirmée. La fiche décrit une optique ultra-courte non identifiée. Boîtier à 0,805 m du comptoir indicatif. Hauteur, enveloppe réelle, ventilation et décentrement restent à valider.',measure:`x +${PX.toFixed(2)} ; y ${P.y.toFixed(2)} ; z +${PY.toFixed(2)} m
Repère lentille → écran : ${(PZ-P.lensForward-EZ).toFixed(3)} m
Décalage horizontal : 0,40 m non validé ; écart vertical : 0,69 m`});
const labelProjector=label('P1 · HYPOTHÈSE NON VALIDÉE',new THREE.Vector3(PX,PY+.32,PZ+.40),true);
const projectionGuide=group('Gabarit_16x10_a_produire_NON_simulation_optique',extras);
const imageCorners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>new THREE.Vector3(EX+x*E.imageWidth/2,E.z+z*E.imageHeight/2,EZ));
function guideLine(pts){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineDashedMaterial({color:'#efc579',dashSize:.065,gapSize:.065,transparent:true,opacity:.65}));l.computeLineDistances();projectionGuide.add(l);}
for(const corner of imageCorners)guideLine([new THREE.Vector3(PX,PY-P.lensDown,PZ-P.lensForward),corner]);
guideLine([...imageCorners,imageCorners[0]]);
// Room reference humans, not a capacity model.
function person(x,z,height=1.7,base=0,parent=model){const g=group('Repere_humain',parent);g.position.set(x,base,z);const bodymat=mat('#86969e',.8);let torso=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.39,3,7),bodymat);torso.position.y=height*.66;g.add(torso);let head=new THREE.Mesh(new THREE.SphereGeometry(.115,10,8),bodymat);head.position.y=height-.13;g.add(head);for(let s of [-1,1]){rod(new THREE.Vector3(s*.09,.88,0),new THREE.Vector3(s*.14,.08,.045),.058,bodymat,g);rod(new THREE.Vector3(s*.17,1.32,0),new THREE.Vector3(s*.25,.88,.025),.04,bodymat,g);}return g;}
const performer=person(.23,-1.28,1.70,H,model);performer.name='Artiste_slam_repere';
// Only the on-stage route is proposed: the basement-to-stage connection is unknown.
const route=group('Parcours_artiste_propose',extras);const routePoints=layout.artistRoute.map(([x,y])=>point(x,y,H+.025));
for(let i=1;i<routePoints.length;i++){let a=routePoints[i-1],b=routePoints[i],direction=b.clone().sub(a);let arrow=new THREE.ArrowHelper(direction.clone().normalize(),a,direction.length(),0xecc577,.18,.09);route.add(arrow);}
const waiting=box(.74,.018,.62,-3.36,H+.008,-3.15,new THREE.MeshBasicMaterial({color:'#a88847',transparent:true,opacity:.28}),route,'Attente_coulisse_proposee');
label('COULISSE · ACCÈS PROPOSÉ',new THREE.Vector3(-3.36,1.4,-3.10),true);
let entrance=null;
clickable(waiting,{title:'Arrivée de l’artiste',status:'Parcours proposé · à confirmer',type:'proposed',text:'Départ dans une coulisse côté DJ, passage derrière le DJ puis côté centre du mobilier, puis arrivée au micro. Les loges sont documentées au sous-sol ; le dossier ne localise pas leur connexion à la scène. L’ouverture et le trajet dessinés ne sont donc pas des accès existants confirmés.',measure:'Parcours sur scène uniquement\nZone d’attente et passage à valider avec le DT'});
person(J.x,-J.y-.51,1.72,H,model).name='DJ_repere';
const audience=group('Public_reperes_indicatifs');
for(let row=0;row<4;row++)for(let col=0;col<5;col++){let x=-2.5+col*1.03+.13*Math.sin(row*3+col);if(Math.abs(x)<.5)x+=.65;let z=2.35+row*1.65+.20*Math.cos(col*5+row);let g=person(x,z,1.62+((col*7+row)%4)*.05,0,audience);g.rotation.y=(col-2.5)*.09;}
const regie=group('Regie_indicative');box(1.8,.9,.72,.9,.45,9.85,black,regie,'Regie');box(.75,.045,.42,.65,.94,9.8,metal,regie,'Console_LX');box(.45,.27,.025,1.42,1.08,9.8,mat('#78a293'),regie,'Moniteur');label('RÉGIE',new THREE.Vector3(.9,1.5,9.85),false);
// Fixture positions from V06, with the original identifiers preserved.
const inventory=layout.fixtures;
const names={moving:'Intimidator Spot 375Z',source:'Source Four 36°',zoom:'Source Four 25/50 Zoom',colorado:'Colorado 1 Tri Tour',sl1:'DMG SL1 Mix',mini:'DMG Mini Mix',par:'PAR 56 WFL · 500 W'};
const colors={moving:'#ffffff',source:'#ffffff',zoom:'#ffffff',colorado:'#ffffff',sl1:'#ffffff',mini:'#ffffff',par:'#ffffff'};
const colorStorageKey='grand-remix-fixture-colors-v1';
const validColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
let fixtureColors={};
try{const saved=JSON.parse(localStorage.getItem(colorStorageKey)||'{}');for(const f of inventory)if(validColor(saved?.[f.id]))fixtureColors[f.id]=saved[f.id];}catch{}
for(const f of inventory)if(['source','zoom','par'].includes(f.kind)&&fixtureColors[f.id]!=='#000000')delete fixtureColors[f.id];
const fixtureColor=f=>fixtureColors[f.id]||colors[f.kind];
for(const f of inventory)if(f.kind==='moving'&&fixtureColors[f.id]&&fixtureColors[f.id]!=='#000000'&&!wheel.some(w=>w[1]===fixtureColors[f.id]))delete fixtureColors[f.id];
const danceTargets={'101':[2.3,0,2.2],'106':[-2.3,0,2.2],'102':[2.2,0,5],'105':[-2.2,0,5],'103':[2,0,8.3],'104':[-2,0,8.3],'111':[.8,.05,3.3],'112':[-.8,.05,3.3],S1:[-1.8,0,2.2],S6:[1.8,0,2.2],S3:[-1.8,0,5],S4:[1.8,0,5],S2:[-1.8,0,8.3],S5:[1.8,0,8.3]};
const fixtureLayer=group('LX_40_dont_9_NON_UTILISES_ROUGES');
function beam(origin,target,color,radius=.75){const len=origin.distanceTo(target),g=group('Faisceau_illustratif',extras),geo=new THREE.CylinderGeometry(.035,radius,1,24,1,true);geo.translate(0,-.5,0);
let material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});const cone=new THREE.Mesh(geo,material);g.add(cone);g.position.copy(origin);let patch=new THREE.Mesh(new THREE.PlaneGeometry(radius*2.7,radius*2.7),new THREE.MeshBasicMaterial({map:glowTexture,color,transparent:true,opacity:.23,depthWrite:false,blending:THREE.AdditiveBlending}));patch.rotation.x=-Math.PI/2;extras.add(patch);
let item={g,cone,patch,origin:origin.clone(),target:target.clone(),radius};beamItems.push(item);aim(item,target);return item;}
const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;const gc=glowCanvas.getContext('2d'),grad=gc.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'rgba(255,255,255,.8)');grad.addColorStop(.5,'rgba(255,255,255,.4)');grad.addColorStop(1,'rgba(255,255,255,0)');gc.fillStyle=grad;gc.fillRect(0,0,64,64);const glowTexture=new THREE.CanvasTexture(glowCanvas);
function aim(item,t){let direction=t.clone().sub(item.origin),length=direction.length();item.g.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),direction.normalize());item.cone.scale.y=length;item.patch.position.set(t.x,t.y+.015,t.z);}
for(const f of inventory){let g=group(`${f.id}_${names[f.kind]}`,fixtureLayer);g.position.copy(point(f.x,f.y,f.z));g.userData.plan={...f};const lensmat=new THREE.MeshBasicMaterial({color:colors[f.kind]});let head=group('Tete',g);
if(f.kind==='moving'){box(.24,.055,.19,0,.18,0,black,g);for(let x of [-.115,.115])box(.027,.24,.045,x,.05,0,metal,g);let b=cylinder(.085,.21,new THREE.Vector3(0,0,0),black,head);let l=cylinder(.066,.012,new THREE.Vector3(0,-.112,0),lensmat,head);head.position.y=-.025;}
else if(['source','zoom','par'].includes(f.kind)){let r=f.kind==='par'?.105:.065,len=f.kind==='source'?.38:.25;cylinder(r,len,new THREE.Vector3(0,0,0),black,head);cylinder(r*.85,.012,new THREE.Vector3(0,-len/2-.009,0),lensmat,head);box(r*2.5,.035,r*2.5,0,-len/2,0,black,head);for(let x of [-r*1.3,r*1.3])box(.016,.19,.035,x,.08,0,metal,g);}
else if(f.kind==='colorado'){box(.16,.07,.16,0,0,0,black,head);for(let x of [-.045,.045])for(let z of [-.045,.045])cylinder(.024,.008,new THREE.Vector3(x,-.04,z),lensmat,head);}
else{let w=f.kind==='sl1'?.6:.23;box(w,.07,.22,0,0,0,black,head);box(w*.9,.006,.19,0,-.04,0,lensmat,head);}
if(f.kind==='moving'&&Number(f.id)>110)box(.40,.66,.40,0,-.46,0,black,g,'Base_indicative');else if(f.kind!=='mini')rod(g.position.clone().add(new THREE.Vector3(0,.17,0)),new THREE.Vector3(g.position.x,GRID,g.position.z),.006,metal,fixtureLayer);
const initialTarget=point(...f.focus.slamTarget);
head.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),initialTarget.clone().sub(g.position).normalize());
let b=beam(g.position,initialTarget,colors[f.kind],f.focus.radius);
let item={...f,g,head,lensmat,beam:b,baseTarget:initialTarget};fixtures.push(item);
if(f.notUsed){const redBody=mat('#ed7777',.7);g.traverse(o=>{if(o.isMesh&&o.material!==lensmat&&o.name!=='Base_indicative')o.material=redBody;});g.name+='__NON_UTILISE';}
clickable(g,{title:`${f.id} · ${names[f.kind]}`,status:f.proposed?'Position proposée · DT':'Position reprise du plan LX',type:f.proposed?'proposed':'confirmed',text:f.kind==='par'?'Un des six PAR inventoriés, proposé sur la barre de salle pour la piste. Disponibilité, charge, accroche, alimentation et orientation à confirmer.':f.kind==='moving'?'Lyre du kit existant. Les orientations vers la piste sont des intentions d’éclairage. Limiter les mouvements pour protéger l’écran et éviter l’éblouissement.':'Appareil de l’inventaire du Ministère. Son emplacement est repris graphiquement du plan LX ; conserver le point réel et le patch de la salle.',measure:`Focus : ${f.focus.role}. Vidéo + slam : ${f.focus.slamOn?'ALLUMÉ':'ÉTEINT'} ; vidéo + danse : ${f.focus.danceOn?'ALLUMÉ':'ÉTEINT'}.\nCible slam (x,y,z) : ${f.focus.slamTarget.join(" ; ")} m ; cible danse : ${f.focus.danceTarget.join(" ; ")} m.\nLyres fixes pendant la vidéo ; déplacements avec dimmer fermé.\nRepère ${f.id} · x ${f.x.toFixed(2)} ; y ${f.y.toFixed(2)} m\nHauteur représentée ${f.z.toFixed(2)} m / sol salle`});
}
label('S1–S6 · PAR PROPOSÉS',new THREE.Vector3(0,3.94,4.25),true);
// Small set of true lights; additional cones are illustrative to keep the viewer responsive.
function spotlight(pos,target,color,power,angle){const s=new THREE.SpotLight(color,power,18,angle,.7,1.2);s.position.copy(pos);s.target.position.copy(target);scene.add(s,s.target);spots.push(s);return s;}
const keyFixture=fixtures.find(f=>f.id==='3'),djFixture=fixtures.find(f=>f.id==='1');
function focusSpot(f,target,color,power){const aimPoint=point(...target);const light=spotlight(f.g.position,aimPoint,color,power,Math.atan(f.focus.radius/f.g.position.distanceTo(aimPoint)));f.actualLight=light;f.defaultLightColor=color;return light;}
const keyLight=focusSpot(keyFixture,keyFixture.focus.slamTarget,'#ffe7c5',42);
const djLight=focusSpot(djFixture,djFixture.focus.slamTarget,'#c5dfff',24);
const danceLights=[];for(let i=1;i<=6;i++){let f=fixtures.find(f=>f.id===`S${i}`);danceLights.push(focusSpot(f,f.focus.danceTarget,i%2?'#ffcca1':'#a6b5ff',22));}
// Every selected source illuminates actual surfaces; no lux prediction is implied.
for(const f of fixtures){
 if(!f.actualLight)focusSpot(f,f.focus.slamTarget,fixtureColor(f),f.kind==='moving'?110:22);
 f.previewPower=f.kind==='moving'?110:f.id==='3'?42:f.id==='1'?24:f.kind==='par'?48:22;
 f.actualLight.decay=2;f.actualLight.distance=20;
 if(f.kind==='moving'){f.goboPreview=createGoboPreview();f.actualLight.map=f.goboPreview.texture;f.actualLight.castShadow=true;f.actualLight.shadow.mapSize.set(256,256);f.actualLight.shadow.bias=-.0005;f.actualLight.penumbra=.08;}
 f.beam.patch.visible=false;
}
const lightRay=new THREE.Raycaster();const screenCenter=new THREE.Vector3(EX,E.z,EZ);
function baseAngles(f){const cue=state.mode==='dance'?'dance':'slam',d=point(...f.focus[cue+'Target']).sub(f.g.position).normalize();return {pan:THREE.MathUtils.radToDeg(Math.atan2(d.x,d.z)),tilt:THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(-d.y,-1,1)))};}
function renderFixtures(time){
 model.updateMatrixWorld(true);let anyLight=false;
 for(const f of fixtures){const fx=lightingEditor?.fx(f)||sanitizeFx({},f.kind),cue=state.mode==='dance'?'dance':'slam';
  let target=point(...f.focus[cue+'Target']),direction=target.clone().sub(f.g.position).normalize(),length=f.g.position.distanceTo(target);
  if(f.kind==='moving'){
   const base=baseAngles(f),a=motionAngles(fx.pan??base.pan,fx.tilt??base.tilt,fx,time),p=THREE.MathUtils.degToRad(a.pan),t=THREE.MathUtils.degToRad(a.tilt);
   direction.set(Math.sin(p)*Math.sin(t),-Math.cos(t),Math.cos(p)*Math.sin(t));
   lightRay.set(f.g.position.clone().addScaledVector(direction,.24),direction);const hit=lightRay.intersectObjects([room,shell,bar,dj],true)[0];length=hit?hit.distance+.24:15;target=f.g.position.clone().addScaledVector(direction,length);
  }
  const radius=f.kind==='moving'?Math.tan(THREE.MathUtils.degToRad(fx.zoom/2))*length:f.focus.radius;
  const intersects=coneHitsSphere(f.g.position.toArray(),direction.toArray(),length,radius/length,screenCenter.toArray(),E.reservationDiameter/2+.15);
  f.previewBlocked=f.notUsed||!f.focus[cue+'On']||intersects;
  const active=$('#fixtures-visible').checked&&!f.previewBlocked&&fx.dimmer>0;anyLight ||= active;
  aim(f.beam,target);f.beam.cone.scale.x=f.beam.cone.scale.z=radius/f.focus.radius;f.head.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),direction);
  f.beam.g.visible=state.beams&&active;f.beam.patch.visible=false;
  f.beam.cone.material.opacity=(state.mode==='setup'?.022:.045)*state.level*fx.dimmer/100*(.2+fogPreview.density*.8);
  f.lensmat.color.set(active?fixtureColor(f):'#252a30');f.beam.cone.material.color.copy(f.lensmat.color);
  f.actualLight.position.copy(f.g.position).addScaledVector(direction,.24);f.actualLight.target.position.copy(target);f.actualLight.color.set(fixtureColor(f));f.actualLight.angle=Math.atan(radius/length);
  f.actualLight.intensity=active?f.previewPower*fx.dimmer/100*state.level:0;
  if(f.goboPreview){const gtime=fx.rotation?time:0;if(f.lastGobo!==fx.gobo||f.lastGoboTime!==gtime){f.goboPreview.draw(fx.gobo,THREE.MathUtils.degToRad(fx.rotation*gtime));f.lastGobo=fx.gobo;f.lastGoboTime=gtime;}}
 }
 fogPreview.setVisible(!state.roomDark||anyLight);
 if(lightingEditor){const f=fixtures.find(f=>f.id===$('#fixture-select').value);$('#color-fixture-note').textContent=f?.notUsed?'NON UTILISÉ durant l’événement · rouge de repérage uniquement.':f&&lightingEditor.fx(f).dimmer===0?'Spot éteint (intensité 0 %).':f?.previewBlocked?'Faisceau coupé : réserve de l’écran ou extinction V18.':profiles[f?.kind]?.color==='gel'?'Blanc uniquement · gélatines non confirmées.':'Prévisualisation active · couleur écran approximative.';}
}
// Screen material excluded from this light simulation deliberately uses a visible VJ preview.
function drawVJ(t){if(state.roomDark){ctx.fillStyle='#000000';ctx.fillRect(0,0,512,512);vjTexture.needsUpdate=true;return;}const k=t*.2;ctx.fillStyle=state.mode==='setup'?'#17322f':'#111125';ctx.fillRect(0,0,512,512);ctx.save();ctx.translate(256,256);ctx.rotate(k*.2);for(let i=0;i<13;i++){ctx.beginPath();let r=24+i*17+7*Math.sin(k*2+i);ctx.ellipse(0,0,r,r*(.5+.25*Math.sin(k+i*.13)),i*.17+k,0,Math.PI*2);ctx.lineWidth=4;ctx.strokeStyle=i%2?'#a2e6ca':'#ae92ee';ctx.stroke();}ctx.restore();ctx.fillStyle='#e6f3e5';ctx.font='500 30px Arial';ctx.textAlign='center';ctx.fillText('GRAND REMIX',256,262);vjTexture.needsUpdate=true;}
const decorative=[];model.traverse(o=>{let f=o;while(f&&f!==fixtureLayer)f=f.parent;if(!f&&o.isMesh&&o.material?.isMeshBasicMaterial)decorative.push({material:o.material,color:o.material.color.clone()});});
function applyMode(){const mode=state.mode;hemi.intensity=mode==='setup'?2.1:.24;sun.intensity=mode==='setup'?2.2:.20;renderer.toneMappingExposure=mode==='setup'?1.15:1.2;scene.background.set(mode==='setup'?'#151c24':'#070b13');keyLight.intensity=mode==='dance'?12:42;djLight.intensity=mode==='dance'?25:18;
danceLights.forEach((s,i)=>{const f=fixtures.find(f=>f.id===`S${i+1}`);s.intensity=f.focus[mode==='dance'?'danceOn':'slamOn']?(mode==='dance'?48:mode==='slam'?2.5:5)*state.level:0;});
barGlow.intensity=state.roomDark?0:4.5;if(state.roomDark){hemi.intensity=0;sun.intensity=0;scene.background.set('#000000');}for(const d of decorative)d.material.color.copy(state.roomDark?new THREE.Color('#000000'):d.color);rigHighlight.emissiveIntensity=state.roomDark?0:.4;reserveRing.visible=!state.roomDark;
renderFixtures(elapsed);
projectionGuide.visible=state.beams&&mode==='setup'&&!state.roomDark;audience.visible=state.people;shell.visible=state.shell;cutaway.visible=!state.shell;route.visible=state.route&&!state.roomDark;
$('#caption').textContent=mode==='dance'?'La salle devient une piste de danse':mode==='slam'?'La parole au centre, l’image à droite':'Gabarit vidéo à produire · optique non validée';
document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
lightingEditor?.sync();
}
const presets={overview:{p:[11.5,10.5,16],t:[0,1.1,2.6]},public:{p:[-.65,1.75,7.8],t:[0,1.7,-1.1]},top:{p:[0,21,3.3],t:[0,0,3.3]},stage:{p:[0,2.26,-2.8],t:[0,1.4,7.0]},projection:{p:[-1.8,2.3,6.8],t:[2.25,2.35,1.7]},rig:{p:[7.8,9.8,10.5],t:[0,2.5,.7]}};
let transition=null;
function view(name){state.view=name;state.shell=name==='public'||name==='stage';$('#shell').checked=state.shell;if(name==='rig'){$('#rig-focus').checked=true;applyRigView();}applyMode();transition={start:performance.now(),a:camera.position.clone(),b:new THREE.Vector3(...presets[name].p),ta:controls.target.clone(),tb:new THREE.Vector3(...presets[name].t)};document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===name));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;applyMode();});
$('#light-level').oninput=e=>{state.level=Number(e.target.value)/100;$('#level-value').textContent=e.target.value+' %';applyMode();};
for(const [id,key] of [['beams','beams'],['public','people'],['labels-check','labels'],['shell','shell'],['motion','motion'],['route','route']])$('#'+id).onchange=e=>{state[key]=e.target.checked;applyMode();};
$('#entrance').onclick=()=>{entrance={start:performance.now()};state.route=true;$('#route').checked=true;applyMode();showDetails(waiting.userData.details);};
// Picking resolves a clicked component to its equipment parent.
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;let r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);let hit=ray.intersectObjects(pickables,true).find(h=>{let p=h.object;while(p){if(!p.visible)return false;p=p.parent;}return true;});if(hit){let o=hit.object;while(o&&!o.userData.details)o=o.parent;if(o)showDetails(o.userData.details);}});
function showDetails(d){if(d.fixtureId){lightingEditor?.select(fixtures.find(f=>f.id===d.fixtureId));$('#color-editor').scrollIntoView({block:'nearest'});}if(d.fog)$('#fog-editor').scrollIntoView({block:'nearest'});$('#detail').replaceChildren();let add=(tag,text,cls)=>{let el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;$('#detail').appendChild(el);return el;};add('p','ÉQUIPEMENT SÉLECTIONNÉ','eyebrow');add('h2',d.title);add('span',d.status,'badge '+(d.type==='proposed'?'proposed':''));add('p',d.text);add('div',d.measure,'measure');}
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',2800);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
$('#capture').onclick=()=>{renderer.render(scene,camera);renderer.domElement.toBlob(b=>{download(b,`Grand_Remix_${state.view}_${state.mode}.png`);toast('Vue 3D enregistrée');});};
async function glb(){const ex=new GLTFExporter();const copy=model.clone(true);copy.traverse(o=>{if(o.name==='Murs_et_plafond')o.visible=true;if(o.isLine)o.visible=false;});return await ex.parseAsync(copy,{binary:true,onlyVisible:true,trs:false,maxTextureSize:512});}
$('#export-glb').onclick=async()=>{const b=$('#export-glb');b.disabled=true;b.textContent='Export…';try{download(new Blob([await glb()],{type:'model/gltf-binary'}),`Grand_Remix_Plan_${state.variant}.glb`);toast('Modèle GLB exporté en mètres');}catch(e){toast('Échec de l’export : '+e.message);}finally{b.disabled=false;b.textContent='Exporter en GLB';}};
function resize(){const r=host.getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);}new ResizeObserver(resize).observe(host);resize();
controls.addEventListener('start',()=>transition=null);
let last=0,elapsed=0,screenFrame=0,lastLightingFrame=0;
function frame(now){requestAnimationFrame(frame);let dt=Math.min((now-last)/1000,.05);last=now;if(state.motion)elapsed+=dt;
fogPreview.update(dt,now/1000);
if(transition){let a=Math.min(1,(now-transition.start)/800),s=a*a*(3-2*a);camera.position.lerpVectors(transition.a,transition.b,s);controls.target.lerpVectors(transition.ta,transition.tb,s);if(a>=1)transition=null;}
if(entrance){let t=Math.min(1,(now-entrance.start)/7500),lengths=routePoints.slice(1).map((p,i)=>p.distanceTo(routePoints[i])),distance=t*lengths.reduce((a,b)=>a+b,0),idx=0;while(idx<lengths.length-1&&distance>lengths[idx]){distance-=lengths[idx];idx++;}performer.position.lerpVectors(routePoints[idx],routePoints[idx+1],distance/lengths[idx]);performer.position.y=H;let delta=routePoints[idx+1].clone().sub(routePoints[idx]);performer.rotation.y=Math.atan2(delta.x,delta.z);if(t>=1){entrance=null;performer.rotation.y=0;}}
lightingEditor?.tick(now);
if(now-lastLightingFrame>40){renderFixtures(elapsed);lastLightingFrame=now;}
if(now-screenFrame>70){drawVJ(elapsed);screenFrame=now;}controls.update();renderer.render(scene,camera);
let r=host.getBoundingClientRect();for(const l of labelItems){let p=l.pos.clone().project(camera),visible=state.labels&&(!l.rigOnly||state.rigFocus)&&p.z<1&&p.z>-1&&Math.abs(p.x)<.99&&Math.abs(p.y)<.96;l.e.style.display=visible?'block':'none';if(visible){l.e.style.left=(p.x*.5+.5)*r.width+'px';l.e.style.top=(-p.y*.5+.5)*r.height+'px';}}
}
// A narrow read-only diagnostic surface is kept for local verification and GLB export.
window.grandRemix={state,inventory,dimensions:{width:W,stageDepth:D,stageHeight:H,roomDepth:ROOM,ceiling:CEILING},screen:E,projector:P,layout,renderer,scene,model,camera,controls,performer,routePoints,exportGLB:glb,getFrame:()=>renderer.info.render};
function applyRigView(){state.rigFocus=$('#rig-focus').checked;for(const m of rigMeshes)m.material=state.rigFocus?rigHighlight:metal;fixtureLayer.visible=$('#fixtures-visible').checked;applyMode();}
$('#rig-focus').addEventListener('change',applyRigView);$('#fixtures-visible').addEventListener('change',applyRigView);
lightingEditor=createLightingEditor({fixtures,colors,geometryId:layout.geometryId,getColors:()=>fixtureColors,setColors:value=>{fixtureColors=value;try{localStorage.setItem(colorStorageKey,JSON.stringify(value));}catch{}},apply:applyMode,roomPreset:dark=>{state.roomDark=dark;state.level=1;$('#light-level').value=100;$('#level-value').textContent='100 %';if(!dark){state.mode='setup';state.beams=true;state.motion=true;$('#beams').checked=true;$('#motion').checked=true;$('#fixtures-visible').checked=true;fixtureLayer.visible=true;fogPreview.set({on:true,rate:.35});syncFog();view('overview');}},select:f=>showDetails(f.g.userData.details),defaultAngles:baseAngles,capture:()=>({roomDark:state.roomDark,mode:state.mode,level:state.level,camera:camera.position.toArray(),target:controls.target.toArray(),shell:state.shell,beams:state.beams,fog:fogPreview.state}),restore:v=>{transition=null;state.roomDark=!!v.roomDark;fogPreview.set(v.fog);syncFog();state.mode=v.mode;state.level=v.level;state.shell=!!v.shell;state.beams=!!v.beams;camera.position.fromArray(v.camera);controls.target.fromArray(v.target);for(const id of ['shell','beams'])$('#'+id).checked=state[id];$('#light-level').value=state.level*100;$('#level-value').textContent=Math.round(state.level*100)+' %';}});
$('#fog-toggle').onclick=()=>{fogPreview.toggle();syncFog();};$('#fog-rate').oninput=e=>{fogPreview.set({...fogPreview.state,rate:Number(e.target.value)/100});syncFog();};syncFog();
applyRigView();
$('#geometry-id').textContent=layout.revision+' · Géométrie '+layout.geometryId;applyMode();drawVJ(0);$('#loading').style.display='none';requestAnimationFrame(frame);
window.addEventListener('error',e=>{console.error('Maquette 3D',e.message);});
