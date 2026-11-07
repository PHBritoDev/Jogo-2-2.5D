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
let n=0,bytes=0;
for(const name of entries){
  if(name==='.nojekyll'){fs.writeFileSync(path.join(dst,name),'');continue;}
  const ext=path.extname(name).toLowerCase();
  if(FORBIDDEN.test(name)||!EXTENSIONS.has(ext))continue;
  const input=path.join(src,name),output=path.join(dst,name);
  if(ext==='.js'){
    const js=fs.readFileSync(input,'utf8');
    const result=esbuild.transformSync(js,{
      loader:'js',target:'es2020',minifyWhitespace:true,
      minifySyntax:true,minifyIdentifiers:false,charset:'utf8',
      legalComments:'none',sourcefile:name
    });
    fs.writeFileSync(output,result.code);
  }else fs.copyFileSync(input,output);
  bytes+=fs.statSync(output).size;n++;
}
fs.writeFileSync(path.join(dst,'.nojekyll'),'');
fs.writeFileSync(path.join(dst,'COPYRIGHT.txt'),
  'A Batalha Contra os 7 Pecados Capitais - Copyright (c) 2026 PHBritoDev. Direitos sobre materiais originais reservados. Conteudos de terceiros sujeitos as respectivas licencas.\n');
const hashes={};
for(const name of fs.readdirSync(dst).sort()){
  if(name==='release-manifest.json'||name==='.nojekyll')continue;
  const file=path.join(dst,name);if(!fs.statSync(file).isFile())continue;
  hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
const manifest={schema:1,sourceCommit:process.env.GITHUB_SHA||'local',buildKind:'browser-distribution',files:hashes};
fs.writeFileSync(path.join(dst,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({files:n,bytes,output:dst,sourceCommit:manifest.sourceCommit,manifestEntries:Object.keys(hashes).length}));
