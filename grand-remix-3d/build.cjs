const fs=require('fs');const path=require('path');const esbuild=require('esbuild');
esbuild.buildSync({entryPoints:[path.join(__dirname,'scene.js')],bundle:true,minify:true,format:'iife',target:'es2020',outfile:path.join(__dirname,'app.bundle.js')});
const html=fs.readFileSync(path.join(__dirname,'index.template.html'),'utf8').replace('/* APP_BUNDLE */',()=>fs.readFileSync(path.join(__dirname,'app.bundle.js'),'utf8').replace(/<\/script/gi,'<\\/script'));
fs.writeFileSync(path.join(__dirname,'Grand_Remix_3D.html'),html);
fs.writeFileSync(path.join(__dirname,'index.html'),html);
console.log('Maquette autonome créée : '+html.length+' caractères');
