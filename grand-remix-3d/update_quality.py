from pathlib import Path
import json,hashlib,re
r=Path.cwd();p=r/'scene.js';s=p.read_text(encoding='utf-8');s=re.sub(r'<a href="media/Grand_Slam_Boucle_12s.mp4" download>.*?</a>','',s)
s=s.replace('vjCanvas.width=512;vjCanvas.height=512','vjCanvas.width=1024;vjCanvas.height=1024').replace('drawEventVisual(ctx,eventLogo,t);','drawEventVisual(ctx,eventLogo,t,1024);').replace("ctx.fillRect(0,0,512,512);}vjTexture", "ctx.fillRect(0,0,1024,1024);}vjTexture")
s=s.replace('vjTexture.colorSpace=THREE.SRGBColorSpace;','vjTexture.colorSpace=THREE.SRGBColorSpace;vjTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();')
s=s.replace('Math.sqrt(3200000/','Math.sqrt(4800000/')
p.write_text(s,encoding='utf-8')
p=r/'physical-renderer.js';s=p.read_text(encoding='utf-8').replace('  if(navigating)size.multiplyScalar(.65).floor();\n','').replace('  // fixture. Only resolution changes: no shader/light-count switch on click.','  // fixture. Keep full resolution throughout motion: no visible softening.');p.write_text(s,encoding='utf-8')
p=r/'build_site.cjs';s=p.read_text(encoding='utf-8');s=re.sub(r"fs.copyFileSync\(path.join\(root,'media/Grand_Slam_Boucle_12s.mp4'\).*?;\n",'',s);p.write_text(s,encoding='utf-8')
p=r/'implantation.json';d=json.loads(p.read_text(encoding='utf-8'));f=next(f for f in d['fixtures'] if f['id']=='1');ref=next(f for f in d['fixtures'] if f['id']=='101')['focus'];f['focus'].update({'role':'DJ','slamTarget':ref['slamTarget'],'danceTarget':ref['danceTarget'],'slamOn':True,'danceOn':True,'status':'Focus DJ demande ; reglage manuel de la decoupe, zoom propose 25 degres.'});d.pop('geometryId',None);d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12];p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=r/'../pdf/grand_remix/build_plan_v18.py';s=p.read_text(encoding='utf-8').replace('Zoom 1 : réorienté manuellement vers la piste x -2,00 / y -3,50, zoom proposé 25°. 101 : DJ, cible x -3,00 / y +2,61 / z +2,00 m.','Zoom 1 et lyre 101 : DJ par défaut, cible x -3,00 / y +2,61 / z +2,00 m. Zoom 1 proposé à 25°.');p.write_text(s,encoding='utf-8')
print('Géométrie',d['geometryId'],'; spot 1 -> DJ ; haute résolution stable ; lien clip supprimé.')
