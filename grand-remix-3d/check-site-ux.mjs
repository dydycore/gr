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
assert.equal(pdfPreviewCount,9,'Le dossier technique doit publier les neuf aperçus PDF.');
for(let page=1;page<=9;page++)assert.ok(fs.statSync(path.join(site,'previews',`plan-${page}.png`)).size>100,`Aperçu PDF ${page} absent`);
for(const id of ['dream','red_alert','warm','pinky','hiphop'])assert.ok(fs.statSync(path.join(site,'media','backgrounds',`${id}.mp4`)).size>100000,`Fond vidéo ${id} absent`);
assert.ok(!fs.readdirSync(path.join(site,'media','backgrounds')).some(name=>name.includes('-source')),'Les sources vidéo brutes ne doivent pas être publiées');

const model=fs.readFileSync(path.join(site,'maquette.html'),'utf8');
const sidebar=fs.readFileSync(path.join(root,'sidebar-layout.js'),'utf8');
const info=fs.readFileSync(path.join(root,'portal.template.html'),'utf8');
assert.ok(!model.includes('ambience-save-shortcut')&&!model.includes('ambience-save-changes'),'Les sauvegardes doublonnées sont supprimées.');
assert.ok(!model.includes('show-flashes'),'La case Flashs redondante est supprimée.');
assert.ok(model.includes('data-block-flash="1"')&&model.includes('data-block-flash="2"'),'Les rythmes natifs 1 Hz et 2 Hz restent disponibles dans les séquences.');
assert.ok(model.includes('id="scene-save" disabled>Ajouter une ambiance</button>'),'Ajouter une ambiance est toujours disponible.');
assert.ok(model.includes('id="scene-update">Remplacer</button>'),'Remplacer reste disponible.');
assert.ok(sidebar.includes('display.el,imports.el,exports.el,technical.el'),'Importer doit précéder Exporter dans le panneau.');
assert.ok(info.indexOf('id="guide-import"')<info.indexOf('id="guide-export"'),'Importer doit précéder Exporter dans Info.');
assert.ok(!info.includes('<dt>Nom de l’ambiance</dt>')&&!info.includes('<dt>Enregistrer / Enregistrer sous…</dt>')&&!info.includes('<dt>Flashs</dt>'),'Info doit correspondre à la nouvelle interface.');

assert.ok(model.includes('id="fixture-save"')&&model.includes('id="color-reset"'),'Enregistrer doit être placé à côté de Rétablir ce spot.');
assert.ok(sidebar.includes("disclosure('selected-equipment'")&&sidebar.includes("selected.body.appendChild(selectedDetail)"),'Les descriptions des objets cliqués doivent rester visibles dans la barre latérale.');
assert.ok(model.includes('selectedPanel.hidden=false')&&model.includes('selectedPanel.open=true'),'Un clic 3D doit ouvrir les informations de l’élément.');
assert.ok(model.includes('id="fog-rate" min="0" max="100" step="1" value="30"'),'Le nouveau curseur affiche 0 à 100%.');
assert.ok(info.includes('ancien 20 % = nouveau 100 %')&&info.includes('ancien 7 % = nouveau 35 %'),'Info doit expliquer la nouvelle échelle.');
console.log('Accueil vérifié : logo original, 4 rubriques, liens, médias, maquette et plans présents.');
