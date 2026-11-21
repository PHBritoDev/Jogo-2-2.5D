import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./ai-change-guard.mjs',import.meta.url));
function git(dir,...args){
 const r=spawnSync('git',args,{cwd:dir,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 return r.stdout.trim();
}
function scenario(changes){
 const dir=mkdtempSync(join(tmpdir(),'ai-guard-'));
 try{
  git(dir,'init','-q');
  git(dir,'config','user.email','qa@example.invalid');
  git(dir,'config','user.name','QA Test');
  writeFileSync(join(dir,'start.txt'),'baseline\n');
  git(dir,'add','.');
  git(dir,'commit','-qm','baseline');
  const base=git(dir,'rev-parse','HEAD');
  for(const [name,value] of Object.entries(changes)){
   const parts=name.split('/');
   if(parts.length>1)mkdirSync(join(dir,...parts.slice(0,-1)),{recursive:true});
   writeFileSync(join(dir,name),value);
  }
  git(dir,'add','.');
  git(dir,'commit','-qm','changes');
  const r=spawnSync(process.execPath,[script,base],{cwd:dir,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  return JSON.parse(readFileSync(join(dir,'artifacts/ai-coordinator/report.json'),'utf8'));
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('Detecta alterações na entrada do jogo como alto risco sem alterar arquivos',()=>{
 const data=scenario({'index.html':'<html></html>','assets/test.glb':'fake'});
 assert.equal(data.counts.alto,1);
 assert.equal(data.counts.medio,1);
 assert.equal(data.advisoryOnly,true);
 assert.ok(data.areas.includes('entrada'));
});
test('Detecta nomes de credenciais mesmo sem examinar conteúdo secreto',()=>{
 const data=scenario({'.env.production':'DUMMY=1\n'});
 assert.deepEqual(data.suspiciousPaths,['.env.production']);
});
test('Documentação comum é baixo risco e não bloqueia',()=>{
 const data=scenario({'docs/notes.md':'just docs'});
 assert.equal(data.counts.baixo,1);
 assert.equal(data.counts.alto,0);
});
test('Exige SHA-base explícito e válido',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ai-guard-bad-'));
 try{
  const res=spawnSync(process.execPath,[script,'main'],{cwd:dir,encoding:'utf8'});
  assert.equal(res.status,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
