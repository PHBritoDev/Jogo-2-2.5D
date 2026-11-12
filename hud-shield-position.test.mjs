import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('./mundo-3d-prototype.html', import.meta.url),'utf8');
test('HUD usa ESCUDO único no lugar de DEF',()=>{
  const actions=html.split('<div id="actions">')[1]?.split('</div>')[0] || '';
  assert.equal((actions.match(/id="shield"/g)||[]).length,1,'um botão ESCUDO');
  assert.doesNotMatch(actions,/id="defend"|>DEF<|>BLOQUEIO</,'remover botão de defesa legado');
  const order=['attack','shield','jump','dash'];
  const positions=order.map(id=>actions.indexOf('id="'+id+'"'));
  assert.ok(positions.every(p=>p>=0),'todos os controles existem');
  assert.ok(positions.every((p,i)=>i===0||p>positions[i-1]),'escudo ocupa a posição antiga do DEF');
  assert.match(actions,/<button id="shield"[^>]*data-key="G"/,'atalho G preservado');
});
