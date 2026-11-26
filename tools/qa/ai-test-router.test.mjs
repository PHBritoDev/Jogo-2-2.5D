import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./ai-test-router.mjs',import.meta.url));
function run(files){
 const dir=mkdtempSync(join(tmpdir(),'qa-ai-router-'));
 try{
  mkdirSync(join(dir,'artifacts/ai-coordinator'),{recursive:true});
  writeFileSync(join(dir,'artifacts/ai-coordinator/report.json'),JSON.stringify({base:'a'.repeat(40),head:'b'.repeat(40),files:files.map(file=>({file}))}));
  writeFileSync(join(dir,'artifacts/ai-coordinator/report.md'),'# Relatório inicial\n');
  const res=spawnSync(process.execPath,[script],{cwd:dir,encoding:'utf8'});
  assert.equal(res.status,0,res.stderr);
  return {data:JSON.parse(readFileSync(join(dir,'artifacts/ai-coordinator/test-plan.json'),'utf8')),report:readFileSync(join(dir,'artifacts/ai-coordinator/report.md'),'utf8'),handoff:readFileSync(join(dir,'artifacts/ai-coordinator/HANDOFF.md'),'utf8')};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('Ato 1 pede validação narrativa e Android, sem aprovar automaticamente',()=>{
 const {data,report}=run(['act1-flow.js','eldoria-preview.js']);
 assert.ok(data.selected.some(x=>x.id==='ato1'));
 assert.ok(report.includes('Android físico'));
 assert.ok(report.includes('não executou'));
});
test('Mudança de autenticação alerta segurança',()=>{
 const {data}=run(['src/auth/session.js']);
 assert.ok(data.selected.some(x=>x.id==='security'));
});
test('Mudança só na documentação não inventa teste executado',()=>{
 const {data}=run(['docs/README.md']);
 assert.equal(data.selected.length,0);
 assert.ok(data.warning.includes('NAO executa'));
});
test('Testes duplicados são deduplicados',()=>{
 const {data}=run(['zarkhael-hydra3d.js','zarkhael-blackflame3d.js']);
 assert.equal(data.commands.length,new Set(data.commands).size);
});

test('Handoff contém alterações reais e não reivindica testes executados',()=>{
 const {handoff}=run(['act1-flow.js','world3d-terrain.js']);
 assert.ok(handoff.includes('act1-flow.js'));
 assert.ok(handoff.includes('world3d-terrain.js'));
 assert.ok(handoff.includes('não executadas'));
 assert.ok(handoff.includes('não fazer merge') || handoff.includes('Não fazer merge'));
 assert.ok(!handoff.includes('Todos os testes passaram'));
});
