#!/usr/bin/env node
// Compara o guia de IAs com caminhos estruturais reais sem instalar pacotes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const important=[
 'README.md','AGENTS.md','PROMPT_MESTRE_DO_JOGO.md','ARQUITETURA.md',
 'index.html','mundo-3d-prototype.html','mundo-3d-prototype.js','mod181-loader.js',
 'powers3d.js','skills3d.js','dimensions3d.js','hud3d.css',
 'act1-flow.js','act2-flow.js','act3-flow.js','act4-flow.js','act5-flow.js','act6-flow.js',
 'enemy1-squad-runtime3d.js','zarkhael-hydra3d.js','veraxion-lunar-ultimate3d.js',
 'tools/visual-lab/README.md','.github/workflows/laboratorio-visual.yml',
 'docs/GUIA-PARA-IAS.md','docs/VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md',
 'docs/GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf'
];
const docs=['README.md','AGENTS.md','docs/GUIA-PARA-IAS.md'];
const mistakes=[];
for(const f of important)if(!fs.existsSync(path.join(root,f)))mistakes.push('Arquivo essencial inexistente: '+f);
for(const file of docs){
 const filename=path.join(root,file);
 if(!fs.existsSync(filename))continue;
 const source=fs.readFileSync(filename,'utf8');
 for(const match of source.matchAll(/\[[^\]\n]+\]\(([^)]+)\)/g)){
  const raw=match[1].trim().replace(/^<|>$/g,'');
  if(!raw||/^(?:https?:\/\/|mailto:|#)/i.test(raw))continue;
  const candidate=raw.split('#')[0].split('?')[0];
  let decoded;
  try {decoded=decodeURIComponent(candidate);} catch {mistakes.push(file+': link invalido '+raw);continue;}
  const target=path.resolve(path.dirname(filename),decoded);
  if(!target.startsWith(root+path.sep) && target!==root){mistakes.push(file+': link sai do repo '+raw);continue;}
  if(!fs.existsSync(target))mistakes.push(file+': link quebrado '+raw);
 }
}
if(mistakes.length){for(const m of mistakes)console.error('[Mapa IA] '+m);process.exitCode=1;}
else console.log('[Mapa IA] OK — '+important.length+' caminhos e links locais dos guias conferidos');
