import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../eldoria-cenario-preview.html',import.meta.url),'utf8');
const details=readFileSync(new URL('../eldoria-scene-details.js',import.meta.url),'utf8');
test('prévia usa somente os módulos do cenário, não toca personagens e combate',()=>{
  assert.match(html,/import \{buildEldoriaDetails\}/);
  assert.match(html,/data-place="vila"/);
  assert.match(html,/data-place="rio"/);
  assert.doesNotMatch(html,/Demonio1\.glb|Protagonista\.glb|Bispo1\.0\.glb/);
});
test('todos os modelos GLB referenciados existem no repositório',()=>{
  const names=[...html.matchAll(/'([\w-]+\.glb)'/g)].map(x=>x[1]);
  assert.ok(names.length>=8);
  for(const name of names)assert.ok(existsSync(new URL('../'+name,import.meta.url)),name);
});
test('script da prévia e detalhes têm sintaxe JS válida',()=>{
  const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script?.length>3000);
  for(const [name,source] of [['preview',script],['details',details]]){
    const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
    assert.equal(result.status,0,name+': '+result.stderr);
  }
});
test('prévia possui verificação FPS e tratamento de falha de GLB',()=>{
  assert.match(html,/renderer\.info\.render\.calls/);
  assert.match(html,/Falha em:/);
  assert.match(html,/readyStats/);
});
test('vegetação usa InstancedMesh e respeita rio, estradas e vila',()=>{
  assert.match(details,/new THREE\.InstancedMesh/);
  assert.match(details,/streamDistance\(x,z\)/);
  assert.match(details,/roadDistance\(x,z\)/);
  assert.match(details,/village<18/);
});
