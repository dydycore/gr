import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const site=path.join(root,'site');
const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
const logo='Grand_Slam_Logo_Transparent.png';
assert.ok(fs.existsSync(path.join(site,'media',logo)),'Le logo doit être inclus dans le dossier publié.');
assert.ok(fs.statSync(path.join(site,'media',logo)).size>10000,'Le logo ne doit pas être vide.');
assert.ok(html.includes(`src="media/${logo}"`),'Le logo doit être visible sur la première page.');
assert.ok(/alt="[^"]+Grand Slam[^"]+"/.test(html),'Le logo doit avoir un texte alternatif.');
assert.ok(html.includes('prefers-reduced-motion'),'Les transitions doivent respecter les préférences de mouvement.');
for(const p of ['projet','maquette','plans','validation']){
 assert.ok(html.includes(`id="panel-${p}"`),`Panneau ${p} introuvable`);
 assert.ok(html.includes(`href="#${p}"`),`Accès ${p} introuvable`);
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'Les identifiants HTML doivent être uniques.');
const directLinks=[...html.matchAll(/<a\b[^>]*href="#([^"]+)"/g)].map(m=>m[1]);
for(const target of directLinks){
 assert.ok(ids.includes('panel-'+target)||ids.includes(target),`Lien vers #${target} non défini`);
}
for(const file of ['index.html','maquette.html','documents/Grand-Remix-Plan-Technique-V18.pdf','previews/plan-2.png']){
 assert.ok(fs.statSync(path.join(site,file)).size>100,`Ressource absente : ${file}`);
}
const pdfPreviewCount=fs.readdirSync(path.join(site,'previews')).filter(f=>/^plan-\d+\.png$/.test(f)).length;
assert.equal(pdfPreviewCount,8,'La publication existante doit conserver ses huit aperçus PDF.');
console.log('Accueil vérifié : logo original, 4 rubriques, liens, médias, maquette et plans présents.');
