const fs=require('fs'),path=require('path'),esbuild=require('esbuild');
const root=__dirname;
const htmlTemplate=fs.readFileSync(path.join(root,'index.template.html'),'utf8');
if(!htmlTemplate.includes('/* APP_BUNDLE */'))throw new Error('Placeholder APP_BUNDLE introuvable.');
const bundle=esbuild.buildSync({
 entryPoints:[path.join(root,'scene.js')],bundle:true,minify:true,format:'iife',target:'es2020',write:false
}).outputFiles[0].text;
const html=htmlTemplate.replace('/* APP_BUNDLE */',()=>bundle.replace(/<\/script/gi,'<\\/script'));
const destination=path.join(root,'Grand_Remix_3D_optimise.html');
fs.writeFileSync(destination,html);
console.log('Aperçu de test créé : '+destination);
console.log('Cette commande ne modifie ni le site Netlify ni les HTML originaux.');
