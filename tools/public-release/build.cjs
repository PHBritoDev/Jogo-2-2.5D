#!/usr/bin/env node
/**
 * Generate a RELEASE-ONLY static build of the 3D game.
 *
 * Security boundary: this excludes development docs, original Blender scripts,
 * GitHub workflows, source maps, tests and project documents. Files delivered
 * to the browser (GLBs, shaders, JS) REMAIN downloadable by any visitor.
 *
 * Run from repository root after: npm install --no-save --no-package-lock esbuild@0.25.12
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const esbuild=require('esbuild');
const src=path.resolve(process.env.RELEASE_SOURCE||'.');
const dst=path.resolve(process.env.RELEASE_OUT||'dist-public');
if(dst===src||dst.startsWith(src+path.sep)===false&&src.startsWith(dst+path.sep))throw Error('Unsafe output directory');
const EXTENSIONS=new Set(['.html','.css','.js','.glb','.png','.jpg','.jpeg','.webp','.svg','.gif','.ogg','.mp3','.wav','.mp4','.webm','.woff','.woff2','.ico','.wasm','.ktx2','.hdr','.bin']);
const REQUIRED=['index.html','mundo-3d-prototype.html','mundo-3d-prototype.js'];
const FORBIDDEN=/\.(?:map|mjs|cjs|py|md|pdf|txt|zip|blend|psd|kra|pem|key|env|log)$/i;
const entries=fs.readdirSync(src,{withFileTypes:true}).filter(x=>x.isFile()).map(x=>x.name).sort();
for(const name of REQUIRED)if(!entries.includes(name))throw Error('Missing mandatory runtime: '+name);
fs.rmSync(dst,{recursive:true,force:true});fs.mkdirSync(dst,{recursive:true});
const distributionFiles=[];
let bytes=0;
function record(name){
  distributionFiles.push(name);
  bytes+=fs.statSync(path.join(dst,name)).size;
}
function copyAsset(name){
  const output=path.join(dst,name);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.copyFileSync(path.join(src,name),output);
  record(name);
}
for(const name of entries){
  if(name==='.nojekyll'){fs.writeFileSync(path.join(dst,name),'');continue;}
  const ext=path.extname(name).toLowerCase();
  if(FORBIDDEN.test(name)||!EXTENSIONS.has(ext))continue;
  const input=path.join(src,name),output=path.join(dst,name);
  // The legacy loader fetches and performs literal string/regex substitutions on the
  // world source before importing it from blob:. Minifying either file can break
  // its import-path rewriting and fall back to obsolete Mod 181 snippets.
  // Preserve these two bytes exactly until the loader is safely refactored.
  if(name==='mundo-3d-prototype.js'||name==='mod181-loader.js'){
    fs.copyFileSync(input,output);
  }else if(ext==='.js'){
    const js=fs.readFileSync(input,'utf8');
    const result=esbuild.transformSync(js,{
      loader:'js',target:'esnext',minifyWhitespace:true,
      minifySyntax:true,minifyIdentifiers:false,charset:'utf8',
      legalComments:'none',sourcefile:name
    });
    fs.writeFileSync(output,result.code);
  }else fs.copyFileSync(input,output);
  record(name);
}
// Preserve relative URLs for the playable protagonist and authored media.
// Only these game modules are needed from the aerial-combat laboratory.
for(const file of ['world-protagonist.js','controller.js','rig.js','shadows.js']){
  copyAsset('experiments/aerial-combat/'+file);
}
const menu='assets/ui/menu/';
for(const file of ['cinematic/environment.webp','cinematic/worlds-hero.webp','fonts/cinzel-latin.woff2',
  'fonts/OFL.txt','hero-menu.glb','storm-effigy.glb','polyhaven/clouds.hdr',
  'polyhaven/rock_face_02/rock-menu.glb','polyhaven/rock_face_02/textures/rock_face_02_diff_1k.webp']){
  copyAsset(menu+file);
}
const fort=menu+'polyhaven/modular_fort_01/modular_fort_01.gltf';
copyAsset(fort);
const model=JSON.parse(fs.readFileSync(path.join(src,fort),'utf8'));
for(const {uri} of [...model.buffers,...model.images]){
  if(!/^(?:textures\/)?[\w-]+\.(?:bin|webp)$/.test(uri))throw Error('Unexpected fort resource: '+uri);
  copyAsset(path.posix.join(path.posix.dirname(fort),uri));
}
copyAsset('assets/ganancia/xisto-fossil.webp');
const audioFile='audio/audio-manifest.json';
const audio=JSON.parse(fs.readFileSync(path.join(src,audioFile),'utf8'));
const tracks=audio.assets.map(({arquivo,assetId,categoria,evento,loop,licenca})=>{
  if(!/^audio\/(?:sfx|amb|musica)\/[\w-]+\.mp3$/.test(arquivo))throw Error('Unexpected audio path: '+arquivo);
  copyAsset(arquivo);
  return {arquivo,assetId,categoria,evento,loop,licenca};
});
fs.writeFileSync(path.join(dst,audioFile),JSON.stringify({versao:audio.versao,assets:tracks}));
record(audioFile);
fs.writeFileSync(path.join(dst,'.nojekyll'),'');
fs.writeFileSync(path.join(dst,'COPYRIGHT.txt'),
  'A Batalha Contra os 7 Pecados Capitais - Copyright (c) 2026 PHBritoDev. Direitos sobre materiais originais reservados. Conteudos de terceiros sujeitos as respectivas licencas.\n');
const hashes={};
record('COPYRIGHT.txt');
for(const name of distributionFiles.sort()){
  const file=path.join(dst,name);
  hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
const manifest={schema:1,sourceCommit:process.env.GITHUB_SHA||'local',buildKind:'browser-distribution',files:hashes};
fs.writeFileSync(path.join(dst,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({files:distributionFiles.length,bytes,output:dst,sourceCommit:manifest.sourceCommit,manifestEntries:Object.keys(hashes).length}));
