from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent
d=json.loads((root/'implantation.json').read_text(encoding='utf-8'))
d['screen']['contentDiameter']=1.48
d['screen']['visibleBorder']=.01
d.pop('geometryId');d['geometryId']=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()[:12]
(root/'implantation.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
s=(root/'scene.js').read_text(encoding='utf-8')
s=s.replace("const circle=new THREE.Mesh(new THREE.CircleGeometry(E.diameter/2,96),new THREE.MeshBasicMaterial({map:vjTexture,side:THREE.DoubleSide}));screen.add(circle);", "const circle=new THREE.Mesh(new THREE.CircleGeometry(E.diameter/2,96),new THREE.MeshBasicMaterial({color:'#000000',side:THREE.DoubleSide}));screen.add(circle);\nconst visibleImage=new THREE.Mesh(new THREE.CircleGeometry(E.contentDiameter/2,96),new THREE.MeshBasicMaterial({map:vjTexture,side:THREE.DoubleSide}));visibleImage.position.z=.002;screen.add(visibleImage);")
s=s.replace('Gabarit agrandi de 1 cm autour du cercle pour le réglage du masque.','Image visible Ø 1,48 m : bord noir intérieur de 1 cm sur l’écran Ø 1,50 m. Le gabarit natif dépasse légèrement pour permettre le réglage du masque.')
(root/'scene.js').write_text(s,encoding='utf-8')
h=(root/'index.template.html').read_text(encoding='utf-8')
h=h.replace('Écran Ø 1,50 m · image native 2,432 × 1,52 m','Écran Ø 1,50 m · image visible Ø 1,48 m<br>Bord noir intérieur : 1 cm<br>Image native 2,432 × 1,52 m')
h=h.replace('Marge de couverture de 1 cm en haut et en bas autour du cercle Ø 1,50 m, puis masque circulaire. Cette marge ne doit pas devenir un halo projeté hors écran.','Image visible masquée à Ø 1,48 m sur l’écran Ø 1,50 m : bord noir intérieur de 1 cm. Le gabarit natif de 1,52 m de haut garde une réserve de réglage ; il doit être noir hors du cercle visible.')
(root/'index.template.html').write_text(h,encoding='utf-8')
p=root.parent/'pdf/grand_remix/build_plan_v09.py';s=p.read_text(encoding='utf-8')
s=s.replace('soit 1 cm de marge verticale de chaque côté du cercle pour le réglage.','image visible Ø 1,48 m, bord noir intérieur de 1 cm. Réserve native pour réglage du masque.')
s=s.replace('1 cm en haut et en bas pour régler le masque circulaire, sans halo final.','image visible masquée Ø 1,48 m sur écran Ø 1,50 m, bord noir intérieur de 1 cm. Réserve native pour réglage, sans halo extérieur.')
s=s.replace("txt(ex,ez-11,'Ø 1,50 m',9,True,VIOLET,'center')","txt(ex,ez-11,'Ø 1,50 m',9,True,VIOLET,'center'); txt(ex,ez-24,'image Ø 1,48 m',6.5,False,VIOLET,'center')")
p.write_text(s,encoding='utf-8')
print(d['geometryId'])
