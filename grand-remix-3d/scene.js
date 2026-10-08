import {batchStaticSurfaces} from './static-batching.js';
import {createAudienceMaterials,batchAudience} from './audience-batching.js';
import {createFrameLimiter} from './frame-limiter.mjs';
import {createAdaptiveCadence} from './adaptive-cadence.mjs';
import {createRenderScheduler} from './render-scheduler.mjs';
import {simplifySidebar} from './sidebar-layout.js';
import {ambienceDefinitions,createAmbience,ambienceDuration} from './ambiences.js';
import {ambienceFadeFraction,blendAmbienceFixture} from './ambience-transition.js';
import {drawEventVisual} from './event-motion.js';
import {getVisualFontRevision,preloadVisualFonts} from './visual-scenes-colour.js';
import {createSceneRecorder,sceneRecordingFilename} from './video-recorder.js';
import {getOfflineSceneExportSupport,exportOfflineScene} from './offline-scene-recorder.js';
import {createExportPlan,exportFrameAt,MAX_EXPORT_SECONDS} from './export-sequence.js';
import {isVideoExportDocument,installBackgroundExport,installExportRenderer} from './background-export.js';
import {syncVideoBackgroundPlayback,getVideoBackgroundRevision,getVideoBackgroundStatus,awaitVideoBackgroundFrame} from './video-backgrounds.js';
import eventLogoData from './event-logo-data.js';
import layout from './implantation.json';
import {createLightingEditor} from './lighting-editor.js';
import {profiles,wheel,sanitizeFx,motionAngles,coneHitsSphere} from './fixture-profiles.js';
import {createGoboPreview} from './gobo-preview.js';
import atmosphere from './atmosphere.json';
import {createBeamClipper} from './beam-volume.js';
import {distributionFor,distributionTexture} from './optical-distributions.js';
import {createPhysicalRenderer} from './physical-renderer.js';
import {createFogPreview} from './fog-preview.js';
import {bindTouchTravel} from './touch-travel.js';
let lightingEditor=null;
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

const $=s=>document.querySelector(s),host=$('#viewport');
const exportVideoMode=isVideoExportDocument();let backgroundExportBusy=false,exportPrepared=!exportVideoMode;
let exportTimelineTime=0;
let renderScheduler=null,viewportVisible=true,viewportHasSize=true;
function invalidateRender(){renderScheduler?.invalidate();}
function projectionEnabled(){return state.videoOn&&(exportVideoMode||!document.hidden&&viewportVisible&&viewportHasSize&&!backgroundExportBusy);}
function syncRenderVideo(){syncVideoBackgroundPlayback({enabled:projectionEnabled(),playing:state.motion&&!backgroundExportBusy,mode:state.videoMode||state.ambience||'opening',time:elapsed});}
if(exportVideoMode){const style=document.createElement('style');style.textContent='html,body{width:1280px!important;height:720px!important;overflow:hidden!important}header,.side,.toolbar,#labels,.scene-caption,.compass{display:none!important}main,.view{display:block!important;width:1280px!important;height:720px!important;min-height:0!important}';document.head.appendChild(style);}
const {width:W,stageDepth:D,stageHeight:H,grid:GRID,ceiling:CEILING,roomDepth:ROOM}=layout.venue;
const E=layout.screen,P=layout.projector,J=layout.dj,BAR=layout.bar;
const EX=E.x,EZ=-E.y,PZ=-P.y,PX=P.x,PY=P.z;
const scene=new THREE.Scene();scene.background=new THREE.Color('#151c24');
const model=new THREE.Group();model.name='Grand_Remix_V18_Metres';scene.add(model);
model.userData={units:'metres',revision:'V18',date:'2026-10-07',coordinates:'X droite public ; Y hauteur ; Z vers public. Pour le plan : x=X, y=-Z, z=Y.',status:'Implantation proposee ; pas un releve ni une validation technique'};
const camera=new THREE.PerspectiveCamera(46,1,.10,80);camera.position.set(0,2.43,9.9);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.14;controls.rotateSpeed=.45;controls.zoomSpeed=.8;controls.panSpeed=.65;controls.enablePan=true;controls.enableZoom=true;controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.target.set(0,1.4,.3);controls.maxDistance=32;controls.minDistance=1.2;controls.maxPolarAngle=Math.PI*.497;
const state={mode:'setup',ambience:null,ambienceCustomized:false,ambiencePlaying:false,savedAmbience:null,artistVisible:true,flashes:true,view:'overview',level:1,roomDark:false,videoOn:true,videoMode:'opening',beams:true,projectionGuides:false,people:false,labels:true,shell:true,motion:true,route:true,variant:'A',projectionProtection:true};
let ambienceFade=null;
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
function cylinder(radius,length,pos,material=metal,parent=model){let m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,32),material);m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function rod(a,b,r=.016,material=metal,parent=model){let delta=b.clone().sub(a),m=cylinder(r,delta.length(),a.clone().add(b).multiplyScalar(.5),material,parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
function point(x,y,z){return new THREE.Vector3(x,z,-y);}
function clickable(obj,data){obj.userData.details=data;pickables.push(obj);return obj;}
function label(text,pos,proposed=false,small=false){let e=document.createElement('div');e.textContent=text;e.className='overlay-label'+(proposed?' proposed':'')+(small?' small':'');$('#labels').appendChild(e);let item={e,pos};labelItems.push(item);return item;}
const hemi=new THREE.HemisphereLight('#dcecf5','#605e62',2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight('#ffecd2',2.2);sun.position.set(-5,13,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:35});sun.shadow.bias=-.0008;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;scene.add(sun);
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
const barGlow=new THREE.PointLight('#ffc078',4.5,7,2);barGlow.castShadow=true;barGlow.shadow.mapSize.set(1024,1024);barGlow.shadow.autoUpdate=false;barGlow.shadow.needsUpdate=true;barGlow.position.set(3.05,1.65,4.4);scene.add(barGlow);
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
label('DJ',new THREE.Vector3(J.x,1.9,-J.y),true);
const fogMachine=group('F1_Antari_position_proposee');fogMachine.position.copy(point(atmosphere.x,atmosphere.y,atmosphere.z));
box(atmosphere.width,atmosphere.height,atmosphere.depth,0,atmosphere.height/2,0,black,fogMachine,'Boitier_F1');
box(.42,.035,.20,0,atmosphere.height+.018,0,metal,fogMachine,'Poignee_F1');
box(.17,.075,.008,.16,.17,atmosphere.depth/2+.005,mat('#11151b'),fogMachine,'Sortie_brouillard');
const fogLed=box(.023,.012,.01,-.20,.23,atmosphere.depth/2+.009,new THREE.MeshBasicMaterial({color:'#75282b'}),fogMachine);
clickable(fogMachine,{title:'F1 · Machine à brouillard',status:'Au sol entre enceinte gauche et booth DJ reculé de 30 cm',type:'proposed',fog:true,text:atmosphere.status,measure:'Antari F-1W inventoriée. Centre x −3,62 ; y +1,43 m. Posée sur scène. Encombrement indicatif 60,8 × 27,5 × 28,6 cm.'});
const fogPreview=createFogPreview({scene,projectionSource:()=>state.videoOn?{screen:[EX,E.z,EZ,E.contentDiameter/2],origin:[PX,PY-P.lensDown,PZ-P.lensForward],texture:vjTexture}:null,origin:fogMachine.position.clone().add(new THREE.Vector3(.16,.17,atmosphere.depth/2+.04))});
function syncFog(){const s=fogPreview.state;$('#fog-toggle').textContent=s.on?'Arrêter la machine':'Démarrer la machine';$('#fog-toggle').setAttribute('aria-pressed',s.on);$('#fog-rate').value=Math.round(s.rate*100);$('#fog-value').textContent=Math.round(s.rate*100)+' %';$('#fog-status').textContent=s.on?'Émission en cours · diffusion illustrative':'Émission arrêtée · dissipation progressive';const hint=document.querySelector('#fog-settings .disclosure-hint');if(hint)hint.textContent=s.on?'Émission · '+Math.round(s.rate*100)+' %':'Machine arrêtée';fogLed.material.color.set(s.on?'#7beec4':'#75282b');invalidateRender();}
const slam=group('Zone_slam');slam.position.x=layout.slam.x;const slamLine=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-.75,H+.005,-.35],[.75,H+.005,-.35],[.75,H+.005,-1.85],[-.75,H+.005,-1.85]].map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:'#62bda8'}));slam.add(slamLine);
rod(new THREE.Vector3(-.23,H,-1.1),new THREE.Vector3(-.23,H+1.46,-1.1),.012,metal,slam);cylinder(.14,.025,new THREE.Vector3(-.23,H+.012,-1.1),black,slam);
rod(new THREE.Vector3(-.23,H+1.44,-1.1),new THREE.Vector3(-.23,H+1.50,-.92),.021,black,slam);
const artistLabel=label('Artiste',new THREE.Vector3(layout.slam.x,H+.20,-.6));
// Shared screen position: brought inward from the wall; front plane retained.
const screen=group('E1_ecran_avant_droit_ecarte_du_mur');screen.position.set(EX,E.z,EZ);
const vjCanvas=document.createElement('canvas');vjCanvas.width=1024;vjCanvas.height=1024;const ctx=vjCanvas.getContext('2d');const vjTexture=new THREE.CanvasTexture(vjCanvas);vjTexture.colorSpace=THREE.SRGBColorSpace;vjTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
const circle=new THREE.Mesh(new THREE.CircleGeometry(E.diameter/2,96),new THREE.MeshStandardMaterial({color:'#f5f5f2',roughness:1,metalness:0,side:THREE.DoubleSide}));circle.castShadow=true;circle.receiveShadow=true;screen.add(circle);
const visibleImage=new THREE.Mesh(new THREE.CircleGeometry(E.contentDiameter/2,96),new THREE.MeshBasicMaterial({color:'#ffffff',map:vjTexture,side:THREE.FrontSide,transparent:true,depthWrite:false}));visibleImage.position.z=.003;visibleImage.receiveShadow=false;screen.add(visibleImage);
const rim=new THREE.Mesh(new THREE.TorusGeometry(E.diameter/2+.006,.018,10,96),metal);screen.add(rim);
for(let dx of [-.40,.40])rod(new THREE.Vector3(EX+dx,E.z+Math.sqrt((E.diameter/2)**2-dx**2),EZ),new THREE.Vector3(EX+dx,GRID,EZ),.006,metal,model).name='Suspension_E1_proposee';
clickable(screen,{title:'E1 · Écran rond',status:'Essai spatial V18',type:'proposed',text:'Écran estimé à 2 m, réserve de place Ø 2,10 m. Depuis V16 : écran seul décalé de 40 cm vers la droite vue public. Hauteur et recul conservés. Projecteur au repère provisoire précédent, décalage horizontal de 40 cm non validé avec la lentille de la salle. Écran sur la première barre : 80,7 cm derrière le nez de scène. Abaissé de 50 cm : bas 1,05 m, haut 3,05 m au-dessus du sol salle. Lyre 106 retirée de la maquette pour libérer le point d’accroche proposé. Suspension à faire valider par le DT. Image visible Ø 1,98 m : marge non projetée de 1 cm sur toile blanche sur l’écran Ø 2,00 m estimé. Le gabarit natif dépasse légèrement pour permettre le réglage du masque. Hauteur et accroches à valider.',measure:`Ø ${E.diameter.toFixed(2)} m · x +${EX.toFixed(2)} ; y ${E.y.toFixed(2)}
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
function person(x,z,height=1.7,base=0,parent=model,shared=null){const g=group('Repere_humain',parent);g.position.set(x,base,z);const bodymat=shared?.body??mat('#86969e',.8);let torso=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.39,12,32),bodymat);torso.position.y=height*.66;torso.castShadow=torso.receiveShadow=true;g.add(torso);let head=new THREE.Mesh(new THREE.SphereGeometry(.115,32,24),bodymat);head.position.y=height-.13;head.castShadow=head.receiveShadow=true;g.add(head);const nose=new THREE.Mesh(new THREE.SphereGeometry(.028,16,12),bodymat);nose.position.set(0,height-.145,.111);nose.scale.set(.7,1,1.2);nose.castShadow=nose.receiveShadow=true;g.add(nose);for(const side of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.009,12,8),shared?.eyes??mat('#4c5961'));eye.position.set(side*.041,height-.112,.103);g.add(eye);}for(let s of [-1,1]){rod(new THREE.Vector3(s*.09,.88,0),new THREE.Vector3(s*.14,.08,.045),.058,bodymat,g);rod(new THREE.Vector3(s*.17,1.32,0),new THREE.Vector3(s*.25,.88,.025),.04,bodymat,g);}return g;}
const performer=person(layout.slam.x,-layout.slam.y,1.70,H,model);performer.name='Artiste_slam_repere';
// Only the on-stage route is proposed: the basement-to-stage connection is unknown.
const route=group('Parcours_artiste_propose',extras);const routePoints=layout.artistRoute.map(([x,y])=>point(x,y,H+.025));
for(let i=1;i<routePoints.length;i++){let a=routePoints[i-1],b=routePoints[i],direction=b.clone().sub(a);let arrow=new THREE.ArrowHelper(direction.clone().normalize(),a,direction.length(),0xecc577,.18,.09);route.add(arrow);}
const waiting=box(.74,.018,.62,-3.36,H+.008,-3.15,new THREE.MeshBasicMaterial({color:'#a88847',transparent:true,opacity:.28}),route,'Attente_coulisse_proposee');
let entrance=null;
function setArtistVisible(visible){entrance=null;state.artistVisible=visible;performer.visible=visible;performer.position.set(layout.slam.x,H,-layout.slam.y);performer.rotation.y=0;syncArtistControls();}
function syncArtistControls(){if(!$('#artist-enter'))return;$('#artist-enter').disabled=!!entrance;$('#artist-exit').disabled=!!entrance||!performer.visible;$('#artist-status').textContent=entrance?(entrance.exiting?'Sortie en cours':'Entrée en cours'):performer.visible?'Artiste sur scène':'Scène sans artiste';}
function startArtistMovement(exiting=false){if(entrance||exiting&&!performer.visible)return;state.artistVisible=!exiting;state.ambienceCustomized=!!state.ambience||!!state.savedAmbience;state.ambiencePlaying=false;performer.visible=true;entrance={start:performance.now(),exiting};syncArtistControls();}
clickable(waiting,{title:'Arrivée de l’artiste',status:'Parcours proposé · à confirmer',type:'proposed',text:'Départ dans une coulisse côté DJ, passage derrière le DJ puis côté centre du mobilier, puis arrivée au micro. Les loges sont documentées au sous-sol ; le dossier ne localise pas leur connexion à la scène. L’ouverture et le trajet dessinés ne sont donc pas des accès existants confirmés.',measure:'Parcours sur scène uniquement\nZone d’attente et passage à valider avec le DT'});
person(J.x,-J.y-.51,1.72,H,model).name='DJ_repere';
const audience=group('Public_reperes_indicatifs'),audienceMaterials=createAudienceMaterials();
for(let row=0;row<4;row++)for(let col=0;col<5;col++){let x=-2.5+col*1.03+.13*Math.sin(row*3+col);if(Math.abs(x)<.5)x+=.65;let z=2.35+row*1.65+.20*Math.cos(col*5+row);let g=person(x,z,1.62+((col*7+row)%4)*.05,0,audience,audienceMaterials);g.rotation.y=Math.atan2(layout.slam.x-x,-layout.slam.y-z);}
const regie=group('Regie_indicative');box(1.8,.9,.72,.9,.45,9.85,black,regie,'Regie');box(.75,.045,.42,.65,.94,9.8,metal,regie,'Console_LX');box(.45,.27,.025,1.42,1.08,9.8,mat('#78a293'),regie,'Moniteur');label('RÉGIE',new THREE.Vector3(.9,1.5,9.85),false);
// Fixture positions from V06, with the original identifiers preserved.
const inventory=layout.fixtures;
const names={moving:'Intimidator Spot 375Z',source:'Source Four 36°',zoom:'Source Four 25/50 Zoom',colorado:'Colorado 1 Tri Tour',sl1:'DMG SL1 Mix',mini:'DMG Mini Mix',par:'PAR 56 WFL · 500 W'};
const colors={moving:'#ffffff',source:'#ffffff',zoom:'#ffffff',colorado:'#ffffff',sl1:'#ffffff',mini:'#ffffff',par:'#ffffff'};
const colorStorageKey='grand-remix-fixture-colors-v1';
const validColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
let fixtureColors={};
try{const saved=JSON.parse((exportVideoMode?null:localStorage.getItem(colorStorageKey))||'{}');for(const f of inventory)if(validColor(saved?.[f.id]))fixtureColors[f.id]=saved[f.id];}catch{}
for(const f of inventory)if(['source','zoom','par'].includes(f.kind)&&fixtureColors[f.id]!=='#000000')delete fixtureColors[f.id];
const fixtureColor=f=>fixtureColors[f.id]||colors[f.kind];
for(const f of inventory)if(f.kind==='moving'&&fixtureColors[f.id]&&fixtureColors[f.id]!=='#000000'&&!wheel.some(w=>w[1]===fixtureColors[f.id]))delete fixtureColors[f.id];
const danceTargets={'101':[2.3,0,2.2],'106':[-2.3,0,2.2],'102':[2.2,0,5],'105':[-2.2,0,5],'103':[2,0,8.3],'104':[-2,0,8.3],'111':[.8,.05,3.3],'112':[-.8,.05,3.3],S1:[-1.8,0,2.2],S6:[1.8,0,2.2],S3:[-1.8,0,5],S4:[1.8,0,5],S2:[-1.8,0,8.3],S5:[1.8,0,8.3]};
const fixtureLayer=group('LX_40_dont_6_NON_UTILISES_ROUGES');
function beam(origin,target,color,radius=.75){const len=origin.distanceTo(target),g=group('Faisceau_illustratif',extras),geo=new THREE.CylinderGeometry(.035,radius,1,24,1,true);geo.translate(0,-.5,0);
let material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});const cone=new THREE.Mesh(geo,material);g.add(cone);g.position.copy(origin);let patch=new THREE.Mesh(new THREE.PlaneGeometry(radius*2.7,radius*2.7),new THREE.MeshBasicMaterial({map:glowTexture,color,transparent:true,opacity:.23,depthWrite:false,blending:THREE.AdditiveBlending}));patch.rotation.x=-Math.PI/2;extras.add(patch);
let item={g,cone,patch,origin:origin.clone(),target:target.clone(),radius};beamItems.push(item);aim(item,target);return item;}
const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;const gc=glowCanvas.getContext('2d'),grad=gc.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'rgba(255,255,255,.8)');grad.addColorStop(.5,'rgba(255,255,255,.4)');grad.addColorStop(1,'rgba(255,255,255,0)');gc.fillStyle=grad;gc.fillRect(0,0,64,64);const glowTexture=new THREE.CanvasTexture(glowCanvas);
function aim(item,t){let direction=t.clone().sub(item.origin),length=direction.length();item.g.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),direction.normalize());item.cone.scale.y=length;item.patch.position.set(t.x,t.y+.015,t.z);}
for(const f of inventory){let g=group(`${f.id}_${names[f.kind]}`,fixtureLayer);g.position.copy(point(f.x,f.y,f.z));g.userData.plan={...f};const lensmat=new THREE.MeshBasicMaterial({color:colors[f.kind]});let head=group('Tete',g);
if(f.kind==='moving'){
 const standing=Number(f.id)>110;
 // Floor fixtures stand on their base. Keep the support below the complete
 // swept head volume, so it cannot clip the circular lens as the head turns.
 box(.24,.055,.19,0,standing?-.20:.18,0,black,g);
 for(let x of [-.115,.115])box(.027,.24,.045,x,standing?-.055:.05,0,metal,g);
 cylinder(.085,.21,new THREE.Vector3(0,0,0),black,head);
 cylinder(.066,.012,new THREE.Vector3(0,-.112,0),lensmat,head);
 head.position.y=standing?0:-.025;
}
else if(['source','zoom','par'].includes(f.kind)){let r=f.kind==='par'?.105:.065,len=f.kind==='source'?.38:.25;cylinder(r,len,new THREE.Vector3(0,0,0),black,head);cylinder(r*.85,.012,new THREE.Vector3(0,-len/2-.009,0),lensmat,head);box(r*2.5,.035,r*2.5,0,-len/2,0,black,head);for(let x of [-r*1.3,r*1.3])box(.016,.19,.035,x,.08,0,metal,g);}
else if(f.kind==='colorado'){box(.16,.07,.16,0,0,0,black,head);for(let x of [-.045,.045])for(let z of [-.045,.045])cylinder(.024,.008,new THREE.Vector3(x,-.04,z),lensmat,head);}
else{let w=f.kind==='sl1'?.6:.23;box(w,.07,.22,0,0,0,black,head);box(w*.9,.006,.19,0,-.04,0,lensmat,head);}
if(f.kind==='moving'&&Number(f.id)>110)box(.40,.56,.40,0,-.51,0,black,g,'Base_indicative');else if(f.kind!=='mini')rod(g.position.clone().add(new THREE.Vector3(0,.17,0)),new THREE.Vector3(g.position.x,GRID,g.position.z),.006,metal,fixtureLayer);
const initialTarget=point(...f.focus.slamTarget);
head.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),initialTarget.clone().sub(g.position).normalize());
let b=beam(g.position,initialTarget,colors[f.kind],f.focus.radius);
let item={...f,g,head,lensmat,beam:b,baseTarget:initialTarget};fixtures.push(item);
if(f.notUsed){const redBody=mat('#ed7777',.7);g.traverse(o=>{if(o.isMesh&&o.material!==lensmat&&o.name!=='Base_indicative')o.material=redBody;});g.name+='__NON_UTILISE';}
// Faint fixture-body locator, independent of illumination: it never lights
// the floor, the artist, or the screen. Keep the off lens dark.
g.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial&&o.name!=='Base_indicative'){o.material=o.material.clone();o.material.emissive.set(f.notUsed?'#692b2b':'#303740');o.material.emissiveIntensity=.25;}});
item.outlines=[];const housing=[];g.traverse(o=>{if(o.isMesh&&o.material!==lensmat&&o.name!=='Base_indicative')housing.push(o);});for(const mesh of housing){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,30),new THREE.LineBasicMaterial({color:'#62ef9b',transparent:true,opacity:.8,depthWrite:false}));edge.visible=false;edge.raycast=()=>{};mesh.add(edge);item.outlines.push(edge);}
clickable(g,{title:`${f.id} · ${names[f.kind]}`,status:f.proposed?'Position proposée · DT':'Position reprise du plan LX',type:f.proposed?'proposed':'confirmed',text:f.kind==='par'?'Un des six PAR inventoriés, proposé sur la barre de salle pour la piste. Disponibilité, charge, accroche, alimentation et orientation à confirmer.':f.kind==='moving'?'Lyre du kit existant. Les orientations vers la piste sont des intentions d’éclairage. Limiter les mouvements pour protéger l’écran et éviter l’éblouissement.':'Appareil de l’inventaire du Ministère. Son emplacement est repris graphiquement du plan LX ; conserver le point réel et le patch de la salle.',measure:`Focus : ${f.focus.role}. Vidéo + slam : ${f.focus.slamOn?'ALLUMÉ':'ÉTEINT'} ; vidéo + danse : ${f.focus.danceOn?'ALLUMÉ':'ÉTEINT'}.\nCible slam (x,y,z) : ${f.focus.slamTarget.join(" ; ")} m ; cible danse : ${f.focus.danceTarget.join(" ; ")} m.\nParcours protégés autour de E1 dans la maquette ; mouvements et focus à programmer puis valider par le DT.\nRepère ${f.id} · x ${f.x.toFixed(2)} ; y ${f.y.toFixed(2)} m\nHauteur représentée ${f.z.toFixed(2)} m / sol salle`});
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
 f.optics=distributionFor(f.kind);f.previewPower=f.optics.power;f.actualLight.penumbra=f.optics.penumbra;const distribution=distributionTexture(f.kind);if(distribution)f.actualLight.map=distribution;
 f.actualLight.decay=2;f.actualLight.distance=20;f.actualLight.castShadow=true;f.actualLight.shadow.mapSize.set(1024,1024);f.actualLight.shadow.camera.near=.08;f.actualLight.shadow.bias=-.00005;f.actualLight.shadow.normalBias=.005;f.actualLight.shadow.autoUpdate=false;f.actualLight.shadow.needsUpdate=true;
 if(f.kind==='moving'){f.goboPreview=createGoboPreview();f.actualLight.map=f.goboPreview.texture;f.actualLight.castShadow=true;f.actualLight.penumbra=.08;}
 f.beam.patch.visible=false;
}
const audienceBatchStats=batchAudience(audience);
const staticBatchStats=batchStaticSurfaces([room,bar,rig]);host.dataset.staticDrawCallsSaved=String(staticBatchStats.reduced+audienceBatchStats.reduced);host.dataset.audienceMeshes=String(audienceBatchStats.after);
const renderRoom=createPhysicalRenderer(renderer,scene,camera,spots,{fog:fogPreview});
const volumeSolids=[...room.children,...shell.children,...bar.children,...dj.children,...decor.children].filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry');
const clipBeam=createBeamClipper(volumeSolids);
const lightRay=new THREE.Raycaster();const screenCenter=new THREE.Vector3(EX,E.z,EZ),hazeSample=new THREE.Vector3();
function baseAngles(f){const cue=state.mode==='dance'?'dance':'slam',d=point(...f.focus[cue+'Target']).sub(f.g.position).normalize();return {pan:THREE.MathUtils.radToDeg(Math.atan2(d.x,d.z)),tilt:THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(-d.y,-1,1)))};}
function renderFixtures(time){
 model.updateMatrixWorld(true);let anyLight=false;const fade=ambienceFadeProgress();
 for(const f of fixtures){const timeline=lightingEditor?.sample?.(f,time,state.flashes),rawFx=timeline?.fx||lightingEditor?.fx(f)||sanitizeFx({},f.kind),cue=state.mode==='dance'?'dance':'slam';
  const base=baseAngles(f),angles=motionAngles(rawFx.pan??base.pan,rawFx.tilt??base.tilt,rawFx,time);
  const requested={fx:{...rawFx,dimmer:rawFx.dimmer*state.level},color:timeline?.color||fixtureColor(f),pan:angles.pan,tilt:angles.tilt,goboAngle:rawFx.gobo&&rawFx.rotation?THREE.MathUtils.degToRad(rawFx.rotation*time):0};
  const displayed=ambienceFade?blendAmbienceFixture(ambienceFade.lights.get(f.id),requested,f.kind,fade):requested;
  const fx=displayed.fx,lightColor=displayed.color;
  let target=point(...f.focus[cue+'Target']),direction=target.clone().sub(f.g.position).normalize(),length=f.g.position.distanceTo(target);
  if(f.kind==='moving'){
   const p=THREE.MathUtils.degToRad(displayed.pan),t=THREE.MathUtils.degToRad(displayed.tilt);
   direction.set(Math.sin(p)*Math.sin(t),-Math.cos(t),Math.cos(p)*Math.sin(t));
   lightRay.set(f.g.position.clone().addScaledVector(direction,.24),direction);const hit=lightRay.intersectObjects([room,shell,bar,dj],true)[0];length=hit?hit.distance+.24:15;target=f.g.position.clone().addScaledVector(direction,length);
  }
  const originalLength=length;
  if(f.kind!=='moving'){lightRay.set(f.g.position.clone().addScaledVector(direction,.08),direction);const hit=lightRay.intersectObjects([room,shell,bar,dj],true)[0];if(hit&&hit.distance+.08<length){length=hit.distance+.08;target=f.g.position.clone().addScaledVector(direction,length);}}
  const optics=distributionFor(f.kind,fx.zoom);const radius=Math.tan(THREE.MathUtils.degToRad(optics.field/2))*length;
  const intersects=coneHitsSphere(f.g.position.toArray(),direction.toArray(),length,radius/length,screenCenter.toArray(),E.reservationDiameter/2+.15);
  f.previewBlocked=f.notUsed||!f.focus[cue+'On']||intersects;
  const cueLevel=1;const active=$('#fixtures-visible').checked&&!f.previewBlocked&&lightColor!=='#000000'&&fx.dimmer>0;anyLight ||= active;
  f.displayedAmbience={...displayed,fx:{...fx,dimmer:active?fx.dimmer:0}};
  const selectedFixture=$('#fixture-select')?.value===f.id;
  for(const edge of f.outlines){edge.visible=selectedFixture||active;edge.material.color.set(selectedFixture?'#62ef9b':'#b99adb');edge.material.opacity=selectedFixture ? .8 : .45;}
  f.head.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),direction);
  let localHaze=0;
  if(active&&state.beams&&fogPreview.density>.001)for(let sample=1;sample<=5;sample++){hazeSample.copy(f.g.position).addScaledVector(direction,length*(sample-.5)/5);localHaze+=fogPreview.sampleDensity(hazeSample)/5;}
  const beamVisible=state.beams&&active&&localHaze>.003&&optics.haze>0;
  // Clipping casts 49 outer rays. Hidden haze shells need no geometry update;
  // the clipper's direction/zoom cache refreshes them when they reappear.
  if(beamVisible)clipBeam(f.beam,direction,radius/length);
  f.beam.g.visible=beamVisible;f.beam.patch.visible=false;
  f.beam.cone.material.opacity=active?.10*optics.haze*fx.dimmer/100*cueLevel*Math.min(1,localHaze):0;
  f.lensmat.color.set(active?lightColor:'#252a30');f.beam.cone.material.color.copy(f.lensmat.color);
  f.actualLight.position.copy(f.g.position).addScaledVector(direction,.24);f.actualLight.target.position.copy(target);f.actualLight.color.set(lightColor);f.actualLight.angle=Math.atan(radius/length);
  if(!f.shadowTarget||f.shadowTarget.distanceToSquared(target)>1e-6||f.shadowRadius!==radius||entrance){f.actualLight.shadow.needsUpdate=true;f.shadowTarget=target.clone();f.shadowRadius=radius;}f.actualLight.visible=active;
  f.actualLight.intensity=active?optics.power*fx.dimmer/100*cueLevel:0;f.previewDimmer=fx.dimmer;
  // An open aperture does not visibly rotate. Keep its white mask, and draw
  // a changed motif at absolute time when an extinguished fixture turns on.
  if(active&&f.goboPreview){const angle=fx.gobo?displayed.goboAngle:0;if(f.lastGobo!==fx.gobo||f.lastGoboAngle!==angle){f.goboPreview.draw(fx.gobo,angle);f.lastGobo=fx.gobo;f.lastGoboAngle=angle;}}
 }
 fogPreview.setVisible(true);
 if(lightingEditor){const f=fixtures.find(f=>f.id===$('#fixture-select').value);$('#color-fixture-note').textContent=f?.notUsed?'NON UTILISÉ durant l’événement · rouge de repérage uniquement.':f?.previewDimmer===0?'Spot éteint (intensité 0 %).':f?.previewBlocked?'Faisceau coupé : réserve de l’écran ou appareil maintenu éteint.':f?`${distributionFor(f.kind).label}. ${f.y>(f.focus.role==='DJ'?layout.dj.y+.51:layout.slam.y)+.3?'Depuis le fond : contre-jour ou dessus.':f.y<(f.focus.role==='DJ'?layout.dj.y+.51:layout.slam.y)-.3?'Depuis la salle : éclairage de face.':'Éclairage latéral / dessus.'}`:'Prévisualisation active.';}
}
const eventLogo=new Image();eventLogo.src=eventLogoData;
// Keep video radiance separate from diffuse cloth shading: room/bar shadows
// must not be added over an unobstructed projected image. Off reveals real cloth.
let lastVideoKey='';
function cancelAmbienceFade(){ambienceFade=null;visibleImage.material.opacity=1;lastVideoKey='';}
function beginAmbienceFade(forExport=false){
 if(exportVideoMode&&!forExport){cancelAmbienceFade();return;}
 let image=null;if(visibleImage.visible&&visibleImage.material.opacity>0){image=document.createElement('canvas');image.width=vjCanvas.width;image.height=vjCanvas.height;image.getContext('2d').drawImage(vjCanvas,0,0);}
 ambienceFade={started:null,lights:new Map(fixtures.filter(f=>f.displayedAmbience).map(f=>[f.id,{...f.displayedAmbience,fx:{...f.displayedAmbience.fx}}])),image,opacity:image?visibleImage.material.opacity:0};
 lastVideoKey='';
}
function ambienceFadeProgress(){
 if(!ambienceFade)return 1;
 const movie=getVideoBackgroundStatus(),needsMovie=state.videoOn&&['dream','red_alert','warm','pinky','hiphop'].includes(state.videoMode);
 if(needsMovie&&(movie.mode!==state.videoMode||!movie.frameReady&&!movie.failed))return 0;
 const now=exportVideoMode?exportTimelineTime*1000:performance.now();
 if(ambienceFade.started===null)ambienceFade.started=now;
 return ambienceFadeFraction((now-ambienceFade.started)/1000);
}
function drawVJ(t){
 syncVideoBackgroundPlayback({enabled:projectionEnabled(),playing:state.motion&&!backgroundExportBusy,mode:state.videoMode||state.ambience||'opening',time:t});
 const background=getVideoBackgroundStatus(),needsMovie=['dream','red_alert','warm','pinky','hiphop'].includes(state.videoMode);
 const ready=state.videoOn&&(!needsMovie||(background.mode===state.videoMode&&background.frameReady)),fade=ambienceFadeProgress(),old=ambienceFade?.image;
 if(!ready){
  if(old&&fade<1){ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';ctx.drawImage(old,0,0);ctx.restore();visibleImage.material.opacity=ambienceFade.opacity*(1-fade);visibleImage.visible=visibleImage.material.opacity>0;vjTexture.needsUpdate=true;}
  else{visibleImage.visible=false;visibleImage.material.opacity=1;}
  lastVideoKey='';return;
 }
 visibleImage.visible=true;visibleImage.material.opacity=ambienceFade?ambienceFade.opacity+(1-ambienceFade.opacity)*fade:1;
 const visualMode=state.videoMode||state.ambience||'opening';
 const key=visualMode+':'+t+':'+eventLogo.complete+':'+getVideoBackgroundRevision()+':'+getVisualFontRevision()+':'+fade;
 if(key===lastVideoKey)return;
 lastVideoKey=key;drawEventVisual(ctx,eventLogo,t,1024,visualMode);
 if(old&&fade<1){
  const opacity=Math.max(.00001,visibleImage.material.opacity),newWeight=fade/opacity,oldWeight=(1-fade)*ambienceFade.opacity/opacity;
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1-newWeight;ctx.fillStyle='#000000';ctx.fillRect(0,0,vjCanvas.width,vjCanvas.height);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=oldWeight;ctx.drawImage(old,0,0);ctx.restore();
 }
 vjTexture.needsUpdate=true;
}

const decorative=[];model.traverse(o=>{let f=o;while(f&&f!==fixtureLayer)f=f.parent;if(!f&&o!==visibleImage&&o.isMesh&&o.material?.isMeshBasicMaterial)decorative.push({material:o.material,color:o.material.color.clone(),bar:o.parent===bar});});
function applyMode(){invalidateRender();barGlow.shadow.needsUpdate=true;sun.shadow.needsUpdate=true;for(const f of fixtures)f.actualLight.shadow.needsUpdate=true;const mode=state.mode;
// Fixed exposure and no invisible work-light: switching off a fixture really
// removes its contribution, including when the current preset is Montage.
hemi.intensity=0;sun.intensity=0;renderer.toneMappingExposure=1.15;
scene.background.set('#070b13');barGlow.intensity=4.5;
for(const d of decorative)d.material.color.copy(state.roomDark&&!d.bar?new THREE.Color('#000000'):d.color);
// drawVJ alone owns decoded-frame visibility, also when settings change while
// the first MP4 frame is loading. Never reveal an old canvas via state.videoOn.
drawVJ(elapsed);rigHighlight.emissiveIntensity=state.roomDark?0:.4;reserveRing.visible=state.videoOn&&state.projectionGuides;
renderFixtures(elapsed);
projectionGuide.visible=state.projectionGuides&&state.videoOn;audience.visible=state.people;shell.visible=state.shell;cutaway.visible=!state.shell;route.visible=state.route&&!state.roomDark;
$('#caption').textContent=state.savedAmbience?.name||lightingEditor?.presetName(state.ambience,ambienceDefinitions.find(p=>p.id===state.ambience)?.name)||'La scène · DJ, artiste et projection';
document.querySelectorAll('[data-ambience]').forEach(b=>{b.setAttribute('aria-pressed',!state.savedAmbience&&b.dataset.ambience===state.ambience);const p=ambienceDefinitions.find(p=>p.id===b.dataset.ambience);b.textContent=lightingEditor?.presetName(p.id,p.name)||p.name;});document.querySelectorAll('#saved-ambience-buttons button').forEach(b=>b.setAttribute('aria-pressed',state.savedAmbience!==null&&Number(b.dataset.savedIndex)===state.savedAmbience.index));const description=ambienceDefinitions.find(p=>p.id===state.ambience)?.description;$('#ambience-status').textContent=description||'Réglage libre · blanc 100 % · S6 et 112 éteints';$('#ambience-restart').disabled=!state.ambience&&!state.savedAmbience;$('#ambience-play').textContent=state.ambiencePlaying?'Arrêter le défilement':'Lire les ambiances';$('#ambience-restart').textContent='Rejouer';syncAmbienceName();
lightingEditor?.sync();syncVideo();
}
const presets={overview:{p:[0,2.43,9.9],t:[0,1.4,.3]},public:{p:[-.65,1.75,7.8],t:[0,1.7,-1.1]},top:{p:[0,21,3.3],t:[0,0,3.3]},stage:{p:[0,2.26,-2.8],t:[0,1.4,7.0]},projection:{p:[-1.8,2.3,6.8],t:[2.25,2.35,1.7]},rig:{p:[7.8,9.8,10.5],t:[0,2.5,.7]}};
let transition=null;
function view(name){state.view=name;state.shell=['overview','public','stage'].includes(name);$('#shell').checked=state.shell;if(name==='rig'){$('#rig-focus').checked=true;applyRigView();}applyMode();transition={start:performance.now(),a:camera.position.clone(),b:new THREE.Vector3(...presets[name].p),ta:controls.target.clone(),tb:new THREE.Vector3(...presets[name].t)};document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===name));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));function activateAmbience(id){const p=ambienceDefinitions.find(p=>p.id===id);if(!p)return;beginAmbienceFade();state.ambience=p.id;state.videoMode=lightingEditor.presetVideoMode(p.id,p.videoMode||p.id);state.savedAmbience=null;setArtistVisible(lightingEditor.presetArtist(p.id,p.artistVisible??true));state.ambienceCustomized=false;state.mode=p.mode;state.roomDark=true;state.videoOn=lightingEditor?.presetVideo(p.id,p.videoOn)??p.videoOn;state.flashes=true;state.level=1;state.motion=true;state.beams=true;$('#light-level').value=100;$('#level-value').textContent='100 %';$('#motion').checked=true;$('#beams').checked=true;$('#fixtures-visible').checked=true;fixtureLayer.visible=true;elapsed=0;fogPreview.set(lightingEditor.presetFog?.(p.id,p.fog)||p.fog||{on:false,rate:.35});syncFog();lightingEditor.applyPreset(createAmbience(p.id,fixtures));drawVJ(0);}
const ambienceButtons=$('#ambience-buttons');for(const p of ambienceDefinitions){const b=document.createElement('button');b.dataset.ambience=p.id;b.setAttribute('aria-pressed','false');b.textContent=p.name;b.title=p.description;b.onclick=()=>{state.ambiencePlaying=false;activateAmbience(p.id);};ambienceButtons.appendChild(b);}
$('#ambience-restart').onclick=()=>{if(state.ambience||state.savedAmbience){cancelAmbienceFade();elapsed=0;state.motion=true;$('#motion').checked=true;applyMode();}};
$('#ambience-play').onclick=()=>{state.ambiencePlaying=!state.ambiencePlaying;if(state.ambiencePlaying)activateAmbience(ambienceDefinitions[0].id);else applyMode();};

$('#light-level').oninput=e=>{cancelAmbienceFade();state.level=Number(e.target.value)/100;$('#level-value').textContent=e.target.value+' %';applyMode();};
for(const [id,key] of [['beams','beams'],['public','people'],['labels-check','labels'],['shell','shell'],['motion','motion'],['route','route']])$('#'+id).onchange=e=>{state[key]=e.target.checked;applyMode();};
$('#entrance').onclick=()=>startArtistMovement(false);
// Picking resolves a clicked component to its equipment parent.
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;let r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);let hit=ray.intersectObjects(pickables,true).find(h=>{let p=h.object;while(p){if(!p.visible)return false;p=p.parent;}return true;});if(hit){let o=hit.object;while(o&&!o.userData.details)o=o.parent;if(o)showDetails(o.userData.details);}});
function showDetails(d){if(d.fixtureId){const panel=$('#spot-settings');if(panel)panel.open=true;lightingEditor?.select(fixtures.find(f=>f.id===d.fixtureId));$('#color-editor').scrollIntoView({block:'nearest'});}if(d.fog){const panel=$('#fog-editor').closest('details');if(panel)panel.open=true;}if(d.fog)$('#fog-editor').scrollIntoView({block:'nearest'});$('#detail').replaceChildren();let add=(tag,text,cls)=>{let el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;$('#detail').appendChild(el);return el;};add('p','ÉQUIPEMENT SÉLECTIONNÉ','eyebrow');add('h2',d.title);add('span',d.status,'badge '+(d.type==='proposed'?'proposed':''));add('p',d.text);add('div',d.measure,'measure');}
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',2800);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
$('#capture').onclick=()=>{renderRoom();renderer.domElement.toBlob(b=>{download(b,`Grand_Remix_${state.view}_${state.mode}.png`);toast('Vue 3D enregistrée');});};
async function glb(){const ex=new GLTFExporter();const copy=model.clone(true);copy.traverse(o=>{if(o.name==='Murs_et_plafond')o.visible=true;if(o.isLine)o.visible=false;});return await ex.parseAsync(copy,{binary:true,onlyVisible:true,trs:false,maxTextureSize:512});}
$('#export-glb').onclick=async()=>{const b=$('#export-glb');b.disabled=true;b.textContent='Export…';try{download(new Blob([await glb()],{type:'model/gltf-binary'}),`Grand_Remix_Plan_${state.variant}.glb`);toast('Modèle GLB exporté en mètres');}catch(e){toast('Échec de l’export : '+e.message);}finally{b.disabled=false;b.textContent='Exporter en GLB';}};
let viewportWidth=1,viewportHeight=1,lastLabelKey='',viewportPixelRatio=0,resizeRequest=null;
function resize(){
 const r=host.getBoundingClientRect();viewportHasSize=r.width>0&&r.height>0;
 if(viewportHasSize){const ratio=exportVideoMode?1:Math.min(window.devicePixelRatio||1,2,Math.sqrt(4800000/Math.max(1,r.width*r.height)));
  if(viewportWidth!==r.width||viewportHeight!==r.height||viewportPixelRatio!==ratio){const ratioChanged=viewportPixelRatio!==ratio;viewportWidth=r.width;viewportHeight=r.height;viewportPixelRatio=ratio;lastLabelKey='';camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(ratioChanged)renderer.setPixelRatio(ratio);renderer.setSize(r.width,r.height,false);invalidateRender();}
 }
 renderScheduler?.reconcile();
}
function queueResize(){if(resizeRequest===null)resizeRequest=requestAnimationFrame(()=>{resizeRequest=null;resize();});}
if(typeof ResizeObserver==='function')new ResizeObserver(queueResize).observe(host);
window.addEventListener('resize',queueResize,{passive:true});resize();
if(!exportVideoMode&&typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{const entry=entries[entries.length-1];viewportVisible=entry.isIntersecting;renderScheduler?.reconcile();syncRenderVideo();},{threshold:0}).observe(host);
let lastCameraChange=0;controls.addEventListener('start',()=>{transition=null;invalidateRender();});controls.addEventListener('change',()=>{lastCameraChange=performance.now();invalidateRender();});
// Keyboard travel is optional and leaves form controls with their native keys.
const travelKeys=new Set(),travelForward=new THREE.Vector3(),travelRight=new THREE.Vector3(),travelDelta=new THREE.Vector3();
const travelMap={ArrowUp:'forward',KeyW:'forward',ArrowDown:'back',KeyS:'back',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',TouchForward:'forward',TouchBack:'back'};
const editingField=()=>document.activeElement?.matches('input,select,textarea,[contenteditable="true"]');
function travel(dt){if(!travelKeys.size)return;if(editingField()){travelKeys.clear();return;}transition=null;
travelForward.subVectors(controls.target,camera.position);travelForward.y=0;if(travelForward.lengthSq()<.00001)travelForward.set(0,0,-1);travelForward.normalize();travelRight.crossVectors(travelForward,new THREE.Vector3(0,1,0));
const active=new Set([...travelKeys].map(code=>travelMap[code]));travelDelta.set(0,0,0);if(active.has('forward'))travelDelta.add(travelForward);if(active.has('back'))travelDelta.sub(travelForward);if(active.has('right'))travelDelta.add(travelRight);if(active.has('left'))travelDelta.sub(travelRight);
if(travelDelta.lengthSq()){travelDelta.normalize().multiplyScalar(dt*2.2);camera.position.add(travelDelta);controls.target.add(travelDelta);lastCameraChange=performance.now();}}
window.addEventListener('keydown',e=>{if(!travelMap[e.code]||editingField()||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();const fresh=!travelKeys.has(e.code);travelKeys.add(e.code);if(fresh)travel(.055);invalidateRender();});
window.addEventListener('keyup',e=>travelKeys.delete(e.code));window.addEventListener('blur',()=>travelKeys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)travelKeys.clear();renderScheduler?.reconcile();syncRenderVideo();});
bindTouchTravel({buttons:document.querySelectorAll('[data-travel]'),keys:travelKeys,step:travel,invalidate:invalidateRender,window,document});
for(const event of ['input','change','click'])document.addEventListener(event,invalidateRender,{passive:true});
let last=0,elapsed=0,screenFrame=0,lastLightingFrame=0,perfFrames=0,perfStart=0,perfWork=0,clockRunning=false;
const fpsLimitKey='grand-remix-render-fps';
let preferredFps=30;
try{preferredFps=!exportVideoMode&&localStorage.getItem(fpsLimitKey)==='60'?60:30;}catch{}
const frameLimiter=createFrameLimiter(preferredFps);
const adaptiveCadence=createAdaptiveCadence(preferredFps),fastStrobe=fixtures.find(f=>f.id==='SL1');
function cameraCutaway(){
 // When orbiting out of the room, remove the near architectural shell rather
 // than letting its polygon cover the model. Keep the far interior surfaces.
 const leftVisible=camera.position.x>-W/2+1.0,rightVisible=camera.position.x<W/2-1.0,backVisible=camera.position.z<ROOM-1.0,ceilingVisible=camera.position.y<CEILING-.55;
 for(const wall of shell.children){
  let visible=true;
  if(['Plafond','Panneau_acoustique','Poutre_plafond'].includes(wall.name))visible=ceilingVisible;
  else if(wall.name==='Mur_lateral')visible=wall.position.x<0?leftVisible:rightVisible;
  else if(['Mur_brique_fond_salle','Absorbeur_mur_fond'].includes(wall.name))visible=backVisible;
  else if(['Absorbeur_mur_lateral','Porte_salle_repere_photo','Repere_sortie_photo_position_indicative'].includes(wall.name)||wall.position.x<-W/2+.15)visible=leftVisible;
  if(wall.visible!==visible){wall.visible=visible;barGlow.shadow.needsUpdate=true;sun.shadow.needsUpdate=true;for(const f of fixtures)f.actualLight.shadow.needsUpdate=true;}
 }
}
function frame(now,{continuous=true}={}){
 if(!exportVideoMode){adaptiveCadence.setFloor(state.flashes&&fastStrobe&&lightingEditor?.hasTimeline(fastStrobe)?24:15);frameLimiter.setFps(adaptiveCadence.fps);}
 if(!frameLimiter.shouldRender(now))return false;
 const frameStarted=performance.now(),realDelta=last?Math.max(0,(now-last)/1000):0,animationDelta=clockRunning?realDelta:0;
 let dt=Math.min(realDelta,.1);last=now;clockRunning=state.motion;
 const movieStatus=getVideoBackgroundStatus(),waitingForMovie=state.videoOn&&['dream','red_alert','warm','pinky','hiphop'].includes(state.videoMode)&&(!movieStatus.frameReady||movieStatus.mode!==state.videoMode);if(state.motion&&!waitingForMovie)elapsed+=animationDelta;const cycleDuration=Math.max(2,Math.min(30,Number($('#scene-hold')?.value)||ambienceDuration));if(state.ambiencePlaying&&elapsed>=cycleDuration){const next=(ambienceDefinitions.findIndex(p=>p.id===state.ambience)+1)%ambienceDefinitions.length;activateAmbience(ambienceDefinitions[next].id);}const timeText=state.ambience?(state.motion?'Cycle de '+cycleDuration+' s':'En pause')+' · '+String(Math.floor(elapsed%cycleDuration)).padStart(2,'0')+' / '+cycleDuration+' s'+(state.ambienceCustomized?' · ajustée':''):'';if($('#ambience-time').textContent!==timeText)$('#ambience-time').textContent=timeText;
travel(dt);fogPreview.update(dt,now/1000);if(entrance)sun.shadow.needsUpdate=true;
if(transition){let a=Math.min(1,(now-transition.start)/800),s=a*a*(3-2*a);camera.position.lerpVectors(transition.a,transition.b,s);controls.target.lerpVectors(transition.ta,transition.tb,s);if(a>=1)transition=null;}
if(entrance){let t=Math.min(1,(now-entrance.start)/7500),exiting=entrance.exiting,path=exiting?[...routePoints].reverse():routePoints,lengths=path.slice(1).map((p,i)=>p.distanceTo(path[i])),distance=t*lengths.reduce((a,b)=>a+b,0),idx=0;while(idx<lengths.length-1&&distance>lengths[idx]){distance-=lengths[idx];idx++;}performer.position.lerpVectors(path[idx],path[idx+1],distance/lengths[idx]);performer.position.y=H;let delta=path[idx+1].clone().sub(path[idx]);performer.rotation.y=Math.atan2(delta.x,delta.z);if(t>=1){setArtistVisible(!exiting);for(const f of fixtures)f.actualLight.shadow.needsUpdate=true;}}
lightingEditor?.tick(now);
if(frameLimiter.fps<=30||now-lastLightingFrame>40){renderFixtures(elapsed);lastLightingFrame=now;}
if(now-screenFrame>=1000/30-1){drawVJ(elapsed);screenFrame=now;}if(ambienceFade&&ambienceFadeProgress()>=1)cancelAmbienceFade();controls.update();cameraCutaway();renderRoom(!!transition||performance.now()-lastCameraChange<220);
const labelKey=camera.matrixWorld.elements.join(',')+'|'+state.labels+'|'+state.rigFocus+'|'+performer.visible+'|'+viewportWidth+'x'+viewportHeight;if(labelKey!==lastLabelKey){lastLabelKey=labelKey;const r={width:viewportWidth,height:viewportHeight};for(const l of labelItems){let p=l.pos.clone().project(camera),visible=state.labels&&(l!==artistLabel||performer.visible)&&(!l.rigOnly||state.rigFocus)&&p.z<1&&p.z>-1&&Math.abs(p.x)<.99&&Math.abs(p.y)<.96;l.e.style.display=visible?'block':'none';if(visible){const halfWidth=l.e.offsetWidth/2+4,halfHeight=l.e.offsetHeight/2+4;l.e.style.left=Math.max(halfWidth,Math.min(r.width-halfWidth,(p.x*.5+.5)*r.width))+'px';l.e.style.top=Math.max(halfHeight,Math.min(r.height-halfHeight,(-p.y*.5+.5)*r.height))+'px';}}}
const workMs=performance.now()-frameStarted;host.dataset.renderActivity=continuous?'active':'idle';host.dataset.renderCap=String(frameLimiter.fps);
if(continuous){if(!exportVideoMode&&adaptiveCadence.record(now,workMs))frameLimiter.setFps(adaptiveCadence.fps);perfFrames++;perfWork+=workMs;if(now-perfStart>=2000){host.dataset.renderFps=(perfFrames*1000/(now-perfStart)).toFixed(1);host.dataset.renderCpuMs=(perfWork/perfFrames).toFixed(1);host.dataset.renderPixels=renderer.domElement.width+'x'+renderer.domElement.height;const status=document.getElementById('render-rate');if(status)status.textContent='FPS mesurés : '+host.dataset.renderFps+' · Résolution : '+host.dataset.renderPixels;perfStart=now;perfFrames=0;perfWork=0;}}
else{adaptiveCadence.reset();perfStart=now;perfFrames=0;perfWork=0;}
return true;
}
renderScheduler=createRenderScheduler({
 onFrame:frame,canRun:()=>!document.hidden&&!backgroundExportBusy&&exportPrepared&&(exportVideoMode||viewportVisible&&viewportHasSize),
 isAnimating:now=>state.motion||state.ambiencePlaying||lightingEditor?.isPlaying()||fogPreview.state.on||fogPreview.density>0||!!entrance||!!transition||!!ambienceFade||travelKeys.size>0||now-lastCameraChange<300,
 revision:()=>getVideoBackgroundRevision()+':'+getVisualFontRevision()+':'+eventLogo.complete,
 onSuspend:()=>{host.dataset.renderActivity='suspended';clockRunning=false;syncRenderVideo();},
 onResume:(duration,now)=>{
  last=now;clockRunning=false;frameLimiter.reset();adaptiveCadence.reset();perfStart=now;perfFrames=0;perfWork=0;lastLabelKey='';
  if(transition)transition.start+=duration;if(entrance)entrance.start+=duration;if(ambienceFade&&ambienceFade.started!==null)ambienceFade.started+=duration;
  lightingEditor?.shiftPlaybackClock?.(duration);syncRenderVideo();
 }
});
window.addEventListener('pagehide',()=>renderScheduler.dispose(),{once:true});
// A narrow read-only diagnostic surface is kept for local verification and GLB export.
const videoPanel=document.createElement('div');videoPanel.className='section';videoPanel.innerHTML='<p class="eyebrow">P1 · Vidéoprojecteur</p><button id="video-toggle">Éteindre le projecteur</button><p class="note" id="video-status"></p>';$('#color-editor').before(videoPanel);
function syncVideo(){const toggle=$('#video-toggle');if(!toggle)return;toggle.textContent=state.videoOn?'Éteindre le projecteur':'Allumer le projecteur';toggle.setAttribute('aria-pressed',String(state.videoOn));$('#video-status').textContent=state.videoOn?'Projection active.':'Projection éteinte.';}
$('#video-toggle').onclick=()=>{cancelAmbienceFade();state.videoOn=!state.videoOn;applyMode();};syncVideo();
window.grandRemix={state,inventory,dimensions:{width:W,stageDepth:D,stageHeight:H,roomDepth:ROOM,ceiling:CEILING},screen:E,projector:P,layout,renderer,scene,model,camera,controls,performer,routePoints,exportGLB:glb,getFrame:()=>renderer.info.render};
function applyRigView(){state.rigFocus=$('#rig-focus').checked;for(const m of rigMeshes)m.material=state.rigFocus?rigHighlight:metal;fixtureLayer.visible=$('#fixtures-visible').checked;applyMode();}
$('#rig-focus').addEventListener('change',applyRigView);$('#fixtures-visible').addEventListener('change',applyRigView);
lightingEditor=createLightingEditor({transient:exportVideoMode,fixtures,colors,geometryId:layout.geometryId,compatibleGeometryIds:layout.compatibleSceneGeometryIds||[],getColors:()=>fixtureColors,setColors:value=>{fixtureColors=value;try{if(!exportVideoMode)localStorage.setItem(colorStorageKey,JSON.stringify(value));}catch{}},apply:applyMode,onScenesChanged:renderSavedAmbiences,onSceneSelected:item=>{state.savedAmbience=item;state.ambienceCustomized=false;syncAmbienceName(true);},onEdit:()=>{cancelAmbienceFade();state.ambiencePlaying=false;state.ambienceCustomized=!!state.ambience||!!state.savedAmbience;},roomPreset:dark=>{cancelAmbienceFade();state.projectionGuides=false;if($('#projector-guides'))$('#projector-guides').checked=false;state.savedAmbience=null;state.ambience=null;state.videoMode='opening';state.ambiencePlaying=false;state.ambienceCustomized=false;state.roomDark=dark;state.videoOn=!dark;state.level=1;$('#light-level').value=100;$('#level-value').textContent='100 %';if(!dark){setArtistVisible(true);state.people=false;$('#public').checked=false;state.mode='setup';state.beams=true;state.motion=true;$('#beams').checked=true;$('#motion').checked=true;$('#fixtures-visible').checked=true;fixtureLayer.visible=true;fogPreview.reset();syncFog();view('overview');}},select:f=>showDetails(f.g.userData.details),defaultAngles:baseAngles,getTimelinePlayback:()=>state.motion,onTimelinePlayback:action=>{cancelAmbienceFade();state.ambiencePlaying=false;if(action==='restart'){elapsed=0;state.motion=true;}else state.motion=action==='resume';$('#motion').checked=state.motion;applyMode();},capture:()=>({rigFocus:state.rigFocus,route:state.route,projectionGuides:state.projectionGuides,selectedFixture:$('#fixture-select').value,people:state.people,view:state.view,fixtureVisible:fixtureLayer.visible,artistVisible:state.artistVisible,elapsed,flashes:state.flashes,ambience:state.ambience,ambienceCustomized:state.ambienceCustomized,motion:state.motion,roomDark:state.roomDark,videoOn:state.videoOn,videoMode:state.videoMode,mode:state.mode,level:state.level,camera:camera.position.toArray(),target:controls.target.toArray(),shell:state.shell,beams:state.beams,fog:fogPreview.state}),restore:(v,{preset=false}={})=>{if(exportVideoMode)cancelAmbienceFade();else if(!preset)beginAmbienceFade();if(!preset)transition=null;if(typeof v.rigFocus==='boolean'){state.rigFocus=v.rigFocus;$('#rig-focus').checked=v.rigFocus;for(const mesh of rigMeshes)mesh.material=v.rigFocus?rigHighlight:metal;}if(typeof v.route==='boolean'){state.route=v.route;$('#route').checked=v.route;}if(typeof v.projectionGuides==='boolean'){state.projectionGuides=v.projectionGuides;if($('#projector-guides'))$('#projector-guides').checked=v.projectionGuides;}if(v.selectedFixture&&fixtures.some(f=>f.id===v.selectedFixture))$('#fixture-select').value=v.selectedFixture;if(typeof v.people==='boolean'){state.people=v.people;$('#public').checked=v.people;}if(!preset&&v.view&&presets[v.view])state.view=v.view;if(typeof v.fixtureVisible==='boolean'){fixtureLayer.visible=v.fixtureVisible;$('#fixtures-visible').checked=v.fixtureVisible;}setArtistVisible(v.artistVisible!==false);state.flashes=true;state.savedAmbience=null;elapsed=v.motion===false&&Number.isFinite(v.elapsed)?Math.max(0,v.elapsed):0;if(!preset)state.ambiencePlaying=false;state.ambienceCustomized=!!v.ambienceCustomized;state.ambience=ambienceDefinitions.some(p=>p.id===v.ambience)?v.ambience:null;state.videoMode=ambienceDefinitions.some(p=>p.id===v.videoMode)?v.videoMode:state.ambience||'opening';state.motion=v.motion??true;$('#motion').checked=state.motion;state.roomDark=!!v.roomDark;state.videoOn=v.videoOn??!state.roomDark;fogPreview.set(v.fog);syncFog();state.mode=v.mode;state.level=v.level;state.beams=!!v.beams;if(!preset){state.shell=!!v.shell;camera.position.fromArray(v.camera);controls.target.fromArray(v.target);}for(const id of ['shell','beams'])$('#'+id).checked=state[id];$('#light-level').value=state.level*100;$('#level-value').textContent=Math.round(state.level*100)+' %';}});
$('#fog-clear').onclick=()=>{fogPreview.clear();syncFog();$('#fog-status').textContent='Brouillard vidé · machine arrêtée';applyMode();};
$('#fog-toggle').onclick=()=>{fogPreview.toggle();syncFog();};$('#fog-rate').oninput=e=>{fogPreview.set({...fogPreview.state,rate:Number(e.target.value)/100});syncFog();};syncFog();
function syncAmbienceName(force=false){const input=$('#scene-name');if(!input)return;const identity=state.savedAmbience?'saved-'+state.savedAmbience.index:state.ambience||'free';if(force||input.dataset.identity!==identity){input.dataset.identity=identity;input.value=state.savedAmbience?.name||lightingEditor?.presetName(state.ambience,ambienceDefinitions.find(p=>p.id===state.ambience)?.name)||'';lightingEditor?.setSceneName(input.value);}}
function renderSavedAmbiences(items){const list=$('#saved-ambience-buttons');if(!list)return;list.replaceChildren();$('#saved-ambience-heading').hidden=!items.length;for(const item of items){const b=document.createElement('button');b.textContent=item.name+(item.shared?' · partagée':'');b.title=item.shared?'Scène commune, personnalisable dans votre navigateur':'Scène locale';b.dataset.savedIndex=item.index;b.setAttribute('aria-pressed',String(state.savedAmbience?.index===item.index));b.onclick=()=>{lightingEditor.loadSaved(item.index);state.savedAmbience=item;renderSavedAmbiences(lightingEditor.sceneSummaries());applyMode();};list.appendChild(b);}}
simplifySidebar();
// Both options preserve the exact same lighting, shadow maps, fog and draw resolution.
const performanceSettings=document.querySelector('#view-settings .sidebar-detail-body');
if(performanceSettings){
 const rateRow=document.createElement('div');rateRow.className='row';
 const rateLabel=document.createElement('label');rateLabel.htmlFor='render-fps-limit';rateLabel.textContent='Cadence 3D';
 const rateSelect=document.createElement('select');rateSelect.id='render-fps-limit';
 rateSelect.setAttribute('aria-label','Cadence de rendu 3D');
 rateSelect.innerHTML='<option value="30">Auto · jusqu’à 30 FPS</option><option value="60">60 FPS · Fluide</option>';
 rateSelect.style.cssText='max-width:175px;padding:7px;background:#111c24;color:#e9ecef;border:1px solid #53616b;border-radius:6px;font:inherit';
 rateSelect.value=String(preferredFps);
 rateSelect.addEventListener('change',()=>{adaptiveCadence.setFps(Number(rateSelect.value));frameLimiter.setFps(adaptiveCadence.fps);invalidateRender();try{localStorage.setItem(fpsLimitKey,rateSelect.value);}catch{}});
 rateRow.append(rateLabel,rateSelect);performanceSettings.prepend(rateRow);
 const qualityNote=document.createElement('p');qualityNote.className='note';qualityNote.textContent='Les deux modes gardent la même résolution, les ombres, les gobos et le brouillard.';
 rateRow.after(qualityNote);
 const perfStatus=document.createElement('p');perfStatus.id='render-rate';perfStatus.className='note';perfStatus.textContent='FPS mesurés : en cours…';
 qualityNote.after(perfStatus);
}
renderSavedAmbiences(lightingEditor.sceneSummaries());
const artistControls=document.createElement('div');artistControls.className='studio-actions';artistControls.innerHTML='<button id="artist-enter">Entrée de l’artiste</button><button id="artist-exit">Sortie de l’artiste</button>';$('#quick-controls').appendChild(artistControls);
const artistStatus=document.createElement('p');artistStatus.id='artist-status';artistStatus.className='note';artistStatus.setAttribute('role','status');$('#quick-controls').appendChild(artistStatus);$('#artist-enter').onclick=()=>startArtistMovement(false);$('#artist-exit').onclick=()=>startArtistMovement(true);$('#entrance').hidden=true;syncArtistControls();
$('label[for="fog-rate"]').textContent='Quantité de brouillard';
const projectionRow=document.createElement('label');projectionRow.className='row';projectionRow.innerHTML='<span>Faisceau vidéo (repère)</span><input id="projector-guides" type="checkbox">';$('#view-settings .sidebar-detail-body').prepend(projectionRow);$('#projector-guides').onchange=e=>{state.projectionGuides=e.target.checked;applyMode();};$('label[for="beams"]').textContent='Faisceaux des spots (brouillard)';
applyRigView();
if(exportVideoMode){
 let plan=null,segmentIndex=-1,lastExportTime=0;
 const renderExportFrame=async time=>{
  exportTimelineTime=time;
  const frame=exportFrameAt(plan,time);
  if(frame.index!==segmentIndex){
   let fade=null;
   if(segmentIndex>=0){beginAmbienceFade(true);fade=ambienceFade;}
   const snapshot=frame.segment.scene;
   lightingEditor.restoreTemporaryScene({...snapshot,view:{...snapshot.view,motion:false,elapsed:0}});
   ambienceFade=fade;if(fade)fade.started=time*1000;
   segmentIndex=frame.index;state.ambiencePlaying=false;state.motion=false;transition=null;
  }
  elapsed=frame.time;
  if(state.videoOn)await awaitVideoBackgroundFrame(state.videoMode,frame.time);
  fogPreview.update(Math.min(.1,Math.max(0,time-lastExportTime)));lastExportTime=time;
  renderFixtures(frame.time);lastVideoKey='';drawVJ(frame.time);controls.update();cameraCutaway();renderRoom();
  if(ambienceFade&&ambienceFadeProgress()>=1)cancelAmbienceFade();
 };
 installExportRenderer({
  prepare:async snapshot=>{
   plan=createExportPlan(snapshot);
   await Promise.all([...new Set(plan.scenes.filter(s=>s.scene.view.videoOn).map(s=>s.scene.view.videoMode))].map(preloadVisualFonts));
   await eventLogo.decode();
   if(!eventLogo.naturalWidth)throw new Error('Le logo du visuel ne se charge pas. Réessayez.');
   if(document.fonts?.ready)await document.fonts.ready;
   await renderExportFrame(0);
   return {name:plan.name,durationSeconds:plan.durationSeconds};
  },
  exportOffline:async(options,onProgress)=>{
   if(!(await getOfflineSceneExportSupport({canvas:renderer.domElement})).supported)return null;
   const abort=new AbortController();window.addEventListener('pagehide',()=>abort.abort(),{once:true});
   const blob=await exportOfflineScene({canvas:renderer.domElement,durationSeconds:options.durationSeconds,maxDurationSeconds:MAX_EXPORT_SECONDS,onProgress,signal:abort.signal,renderFrame:renderExportFrame});
   return {blob,filename:sceneRecordingFilename(options.name,'mp4'),format:'MP4',durationSeconds:options.durationSeconds};
  },
  startLive:onError=>{
   let active=true,handle=null;const started=performance.now();
   const stop=()=>{active=false;cancelAnimationFrame(handle);};
   const tick=async now=>{if(!active)return;try{await renderExportFrame(Math.min(plan.durationSeconds-1/30,(now-started)/1000));if(active)handle=requestAnimationFrame(tick);}catch(error){stop();onError(error);}};
   handle=requestAnimationFrame(tick);window.addEventListener('pagehide',stop,{once:true});return stop;
  },
  createRecorder:callbacks=>createSceneRecorder({canvas:renderer.domElement,...callbacks,frameRate:30,maxDurationSeconds:MAX_EXPORT_SECONDS})
 });
}else{
 installBackgroundExport({capture:()=>state.ambiencePlaying?lightingEditor.captureAmbienceSequence():lightingEditor.captureCurrentScene($('#ambience-name')?.value||'Ambiance'),isSequence:()=>state.ambiencePlaying,onBusy:busy=>{backgroundExportBusy=busy;renderScheduler.reconcile();syncRenderVideo();}});
}
$('#geometry-id').textContent=layout.revision+' · Géométrie '+layout.geometryId;applyMode();drawVJ(0);renderRoom();queueMicrotask(()=>{document.body.classList.remove('is-loading');$('#loading').style.display='none';});renderScheduler.invalidate();
window.addEventListener('error',e=>{console.error('Maquette 3D',e.message);});
