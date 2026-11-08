// Static preview only: excludes Git metadata, tooling, reports and temporary documents.
const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),output=path.join(root,'aerial-preview-dist');
const skip=new Set(['node_modules','docs','tools','scripts','aerial-results','aerial-preview-dist']);
const extensions=new Set(['.html','.js','.css','.glb','.gltf','.bin','.json','.png','.jpg','.jpeg','.webp','.svg','.ico','.ktx2','.mp3','.wav','.ogg','.m4a','.woff','.woff2','.ttf']);
fs.mkdirSync(output,{recursive:true});let files=0,bytes=0;
function copy(dir,relative=''){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.')||skip.has(entry.name)||entry.isSymbolicLink())continue;
  const name=path.join(relative,entry.name),source=path.join(dir,entry.name),destination=path.join(output,name);
  if(entry.isDirectory()){copy(source,name);continue;}
  if(!extensions.has(path.extname(entry.name).toLowerCase())||/\.test\./.test(entry.name))continue;
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);files++;bytes+=fs.statSync(source).size;
 }
}
copy(root);
for(const file of ['mundo-3d-prototype.html','mundo-3d-prototype.js','Prota_otimizado_2K.glb','Protagonista.glb','protagonist-aerial3d.js','experiments/aerial-combat/index.html'])if(!fs.existsSync(path.join(output,file)))throw Error('Preview missing '+file);
console.log(JSON.stringify({files,bytes,output:'aerial-preview-dist'}));
