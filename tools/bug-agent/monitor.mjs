#!/usr/bin/env node
// A1 robot: inexpensive, dependency-free regression sentinel. Produces evidence, never silently edits gameplay.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const out=path.join(root,'bug-agent-results');fs.mkdirSync(out,{recursive:true});
const specs=[
 ['mapa-e-save','map3d.test.mjs','tools/agentes-externos/a1-save-fallback.test.mjs'],
 ['vida-e-hud','hearts3d.test.mjs'],
 ['historia-e-checkpoint','act1-flow.test.mjs'],
 ['dimensoes-e-chefes','dimensions3d.test.mjs'],
 ['terreno-base','world3d-terrain.test.mjs'],
 ['npc-sem-travada','tests/npcs-vivos.test.mjs'],
 ['fotografo','tools/visual-lab/scene-capture-core.test.cjs','tools/visual-lab/photographer.test.cjs']
];
const results=[];
for(const [name,...files] of specs){
 const res=spawnSync(process.execPath,['--test',...files],{cwd:root,encoding:'utf8',timeout:90000,maxBuffer:1024*1024*8});
 const log=[res.stdout||'',res.stderr||'',res.error?String(res.error):''].join('\n');
 fs.writeFileSync(path.join(out,name+'.log'),log);
 const ok=res.status===0&&!res.error;
 results.push({name,files,ok,exitCode:res.status,signal:res.signal,error:res.error?String(res.error):null,log:name+'.log',tail:log.slice(-2000)});
 console.log((ok?'OK':'FAIL')+' '+name);
}
const report={schema:'bug-agent/v1',timestamp:new Date().toISOString(),commit:process.env.GITHUB_SHA||'local',run:process.env.GITHUB_RUN_ID||null,results,ok:results.every(x=>x.ok)};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
fs.appendFileSync(path.join(out,'index.md'),'# Agente A1 — rodada automática\n\n'+results.map(x=>'- '+(x.ok?'✅':'❌')+' **'+x.name+'** — `'+x.log+'`').join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,fs.readFileSync(path.join(out,'index.md')));
if(!report.ok)process.exitCode=1;
