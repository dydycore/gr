// Prépare uniquement le dossier de publication de l'actuel site Netlify.
// N'écrase ni l'accueil, ni les PDF, ni les autres médias.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=__dirname,site=path.join(root,'site');

for(const file of ['check-published-lighting.mjs','check-frame-limiter.mjs','check-site-ux.mjs']){
 execFileSync(process.execPath,[file],{cwd:root,stdio:'inherit'});
}
execFileSync(process.execPath,['preview-performance.cjs'],{cwd:root,stdio:'inherit'});
const model=path.join(root,'Grand_Remix_3D_optimise.html');
const target=path.join(site,'maquette.html');
const contents=fs.readFileSync(model,'utf8');
if(!contents.includes('pinky love')||!contents.includes('Ouverture — copie'))
 throw new Error('Les scènes publiques ne sont pas intégrées à la maquette compilée.');
if(!fs.existsSync(path.join(site,'index.html'))||!fs.existsSync(path.join(site,'media','Grand_Slam_Logo_Transparent.png')))
 throw new Error('L’accueil ou le logo manquent dans le dossier site.');
fs.copyFileSync(model,target);
console.log('Site prêt pour Netlify : '+site);
console.log('7 ambiances et 2 scènes publiques incluses. Aucun déploiement n’a été effectué.');
