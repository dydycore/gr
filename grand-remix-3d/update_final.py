from pathlib import Path
import re,base64
r=Path.cwd()
p=r/'scene.js';s=p.read_text(encoding='utf-8')
s=s.replace("label('DJ · GAUCHE'","label('DJ'").replace("label('SLAM · ENTRE DJ ET ÉCRAN'","label('Artiste'")
s=re.sub(r"label\('COULISSE · ACCÈS PROPOSÉ'.*?;\n",'',s)
s=re.sub(r'const travelKeys=new Set\(\).*?let last=0', 'let last=0',s,flags=re.S).replace('travel(dt);fogPreview','fogPreview')
# A geometry edge contour follows each fixture head without emitting light or intercepting clicks.
s=s.replace("clickable(g,{title:`${f.id}","item.outlines=[];const housing=[];g.traverse(o=>{if(o.isMesh&&o.material!==lensmat&&o.name!=='Base_indicative')housing.push(o);});for(const mesh of housing){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,30),new THREE.LineBasicMaterial({color:'#62ef9b',transparent:true,opacity:.8,depthWrite:false}));edge.visible=false;edge.raycast=()=>{};mesh.add(edge);item.outlines.push(edge);}\nclickable(g,{title:`${f.id}")
s=s.replace("const active=$('#fixtures-visible').checked", "for(const edge of f.outlines)edge.visible=$('#fixture-select')?.value===f.id;\n  const active=$('#fixtures-visible').checked")
logo=Path(r'C:/Users/VJSDMT~1/AppData/Local/Temp/codex-clipboard-265840a7-c693-4ace-b931-e117144d63ae.png').read_bytes()
(r/'event-logo-data.js').write_text("export default 'data:image/png;base64,"+base64.b64encode(logo).decode()+"';\n",encoding='utf-8')
s="import eventLogoData from './event-logo-data.js';\n"+s
s=s.replace("// White diffuse fabric remains", "const eventLogo=new Image();eventLogo.src=eventLogoData;\n// White diffuse fabric remains")
a=s.index('function drawVJ(t)');b=s.index('\nconst decorative=',a)
s=s[:a]+'''function drawVJ(t){ctx.fillStyle=state.videoOn?'#ffffff':'#000000';ctx.fillRect(0,0,512,512);
if(state.videoOn&&eventLogo.complete&&eventLogo.naturalWidth){const phase=t%10/10*Math.PI*2,size=420+6*Math.sin(phase);ctx.drawImage(eventLogo,(512-size)/2,(512-size)/2,size,size);
// Keep the original lettering intact. Fine turquoise arcs and travelling dots frame it.
ctx.strokeStyle='#bde6e8';ctx.lineWidth=1;for(let j=0;j<2;j++){ctx.beginPath();ctx.ellipse(256,256,235-j*9,213-j*9,0,phase+j*Math.PI,phase+j*Math.PI+1.25);ctx.stroke();}
for(let j=0;j<3;j++){let a=phase+j*Math.PI*2/3;ctx.fillStyle=j===1?'#1e2728':'#159ba6';ctx.beginPath();ctx.arc(256+235*Math.cos(a),256+213*Math.sin(a),2.2,0,Math.PI*2);ctx.fill();}}
vjTexture.needsUpdate=true;}
'''+s[b:]
s=s.replace('Projection de démonstration active sur toile blanche.','Visuel de la soirée animé · boucle de 10 secondes sur toile blanche.')
s=s.replace('<p class="note" id="video-status"></p>','<p class="note" id="video-status"></p><a href="media/Grand_Slam_Boucle_10s.mp4" download>Télécharger le clip animé · MP4</a>')
p.write_text(s,encoding='utf-8')
p=r/'index.template.html';s=p.read_text(encoding='utf-8').replace('Flèches pour avancer, reculer et se déplacer sur les côtés. ','').replace('Flèches : avancer, reculer, côtés · ','');p.write_text(s,encoding='utf-8')
p=r/'build-studio-appendix.py';s=p.read_text(encoding='utf-8').replace('Flèches : avancer, reculer et aller sur les côtés ; glisser la souris pour tourner.','Souris : glisser pour tourner ; molette pour avancer/reculer ; clic droit maintenu pour se déplacer.').replace('Cliquer sur un appareil ou choisir son numéro.','Cliquer sur un appareil ou choisir son numéro : un contour vert indique la sélection.');p.write_text(s,encoding='utf-8')
p=r/'../pdf/grand_remix/build_plan_v18.py';s=p.read_text(encoding='utf-8').replace("'SLAM ENTRE DJ ET E1'","'Artiste'").replace("'SLAM',","'Artiste',");p.write_text(s,encoding='utf-8')
p=r/'build_site.cjs';s=p.read_text(encoding='utf-8').replace("'', 'documents','previews'","'', 'documents','previews','media'").replace("fs.copyFileSync(path.join(root,'portal.template.html'),path.join(dist,'index.html'));","fs.writeFileSync(path.join(dist,'index.html'),fs.readFileSync(path.join(root,'portal.template.html'),'utf8').replace(/Géométrie commune : [a-f0-9]+/g,'Géométrie commune : '+layout.geometryId));\nfs.copyFileSync(path.join(root,'media/Grand_Slam_Boucle_10s.mp4'),path.join(dist,'media/Grand_Slam_Boucle_10s.mp4'));")
p.write_text(s,encoding='utf-8')
print('Navigation souris, contour vert, libelles et animation integres.')
