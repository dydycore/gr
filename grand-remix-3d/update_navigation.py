from pathlib import Path
p=Path('scene.js');s=p.read_text(encoding='utf-8');needle='let last=0,elapsed=0,screenFrame=0,lastLightingFrame=0;'
nav='''// Keyboard travel is optional and leaves form controls with their native keys.
const travelKeys=new Set(),travelForward=new THREE.Vector3(),travelRight=new THREE.Vector3(),travelDelta=new THREE.Vector3();
const travelMap={ArrowUp:'forward',KeyW:'forward',ArrowDown:'back',KeyS:'back',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
const editingField=()=>document.activeElement?.matches('input,select,textarea,[contenteditable="true"]');
function travel(dt){if(!travelKeys.size)return;if(editingField()){travelKeys.clear();return;}transition=null;
travelForward.subVectors(controls.target,camera.position);travelForward.y=0;if(travelForward.lengthSq()<.00001)travelForward.set(0,0,-1);travelForward.normalize();travelRight.crossVectors(travelForward,new THREE.Vector3(0,1,0));
const active=new Set([...travelKeys].map(code=>travelMap[code]));travelDelta.set(0,0,0);if(active.has('forward'))travelDelta.add(travelForward);if(active.has('back'))travelDelta.sub(travelForward);if(active.has('right'))travelDelta.add(travelRight);if(active.has('left'))travelDelta.sub(travelRight);
if(travelDelta.lengthSq()){travelDelta.normalize().multiplyScalar(dt*2.2);camera.position.add(travelDelta);controls.target.add(travelDelta);lastCameraChange=performance.now();}}
window.addEventListener('keydown',e=>{if(!travelMap[e.code]||editingField()||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();const fresh=!travelKeys.has(e.code);travelKeys.add(e.code);if(fresh)travel(.055);});
window.addEventListener('keyup',e=>travelKeys.delete(e.code));window.addEventListener('blur',()=>travelKeys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)travelKeys.clear();});
'''
assert needle in s;s=s.replace(needle,nav+needle).replace('fogPreview.update(dt,now/1000);','travel(dt);fogPreview.update(dt,now/1000);');p.write_text(s,encoding='utf-8')
p=Path('index.template.html');s=p.read_text(encoding='utf-8').replace('Vue 3D. Glisser pour tourner','Vue 3D. W A S D ou flèches pour se déplacer. Glisser pour tourner');p.write_text(s,encoding='utf-8')
p=Path('build-studio-appendix.py');s=p.read_text(encoding='utf-8').replace('Souris : glisser pour tourner ; molette pour avancer/reculer ; clic droit maintenu pour se déplacer.','Souris : glisser pour tourner, molette pour avancer/reculer, clic droit pour déplacer. Clavier : W/A/S/D ou flèches.');p.write_text(s,encoding='utf-8')
