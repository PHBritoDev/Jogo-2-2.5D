import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterVhazraelScene } from '../act1-flow.js';

test('Epílogo de Eldória liga Vhazrael ao caminho vulcânico sem antecipar destinos', () => {
  const steps = afterVhazraelScene();
  const talks = steps.filter(s => s.type === 'say');
  assert.equal(steps[0].type, 'shot');
  assert.equal(steps.at(-2).type, 'do');
  assert.equal(steps.at(-2).id, 'escuro');
  assert.equal(steps.at(-1).type, 'wait');
  assert.ok(talks.some(s => /cargas enviadas para as montanhas/i.test(s.text)));
  assert.ok(talks.some(s => /região vulcânica/i.test(s.text)));
  assert.ok(talks.some(s => /sobreviveram/i.test(s.text)));
  assert.ok(talks.every(s => !/Ilyan|crianças morreram|crianças foram salvas/i.test(s.text)));
});

test('Epílogo respeita flags reais sem declarar destinos não comprovados', () => {
  const plain = afterVhazraelScene().filter(s => s.type === 'say').map(s => s.text).join(' ');
  const full = afterVhazraelScene({ childrenFreed: true, wardenDefeated: true }).filter(s => s.type === 'say').map(s => s.text).join(' ');
  assert.doesNotMatch(plain, /Conseguimos abrir as jaulas/);
  assert.match(full, /Conseguimos abrir as jaulas/);
  assert.match(full, /guardião da passagem caiu/);
  assert.doesNotMatch(full, /crianças estão salvas|Ilyan morreu|Ilyan vive/i);
});

test('Abrir as jaulas não rende estatística falsa de resgate', () => {
  const src = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.match(src, /childrenFreed=true;/);
  assert.doesNotMatch(src, /childrenFreed=true;\s*bumpStat\(['"]rescues['"]\)/);
  assert.match(src, /afterVhazraelScene\(\{childrenFreed,wardenDefeated\}\)/);
});

test('Ilyan aparece no mundo 3D e na cena da cela sem forçar destinos não aprovados', async () => {
  const { ilyanVillageScene, holeScene } = await import('../act1-flow.js');
  const src = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(ilyanVillageScene().some(s => s.who?.includes('Ilyan')));
  assert.ok(holeScene({ilyanPresent:true}).some(s => s.actor==='ilyan'));
  assert.ok(!holeScene({ilyanPresent:false}).some(s => s.actor==='ilyan'));
  assert.match(src,/ILYAN_WELL/);
  assert.match(src,/npcFactory\.create\(\{sex:'man',role:'idle'/);
  assert.match(src,/syncIlyanPlacement\(\)/);
  assert.match(src,/holeScene\(\{ilyanPresent:!!ilyanNpc\}\)/);
});

test('Ilyan tem conversas interativas na vila e na cela; vendedor aponta Téo', async () => {
  const {ilyanPrisonScene} = await import('../act1-flow.js');
  const src = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.match(ilyanPrisonScene().map(x=>x.text||'').join(' '),/galeria ao sul/);
  assert.match(src,/inSewer\?ilyanPrisonScene\(\):ilyanVillageScene\(\)/);
  assert.match(src,/if\(key==='vendor'\)return vendorRoots\[1\]/);
  assert.match(src,/const v=vendorRoots\[1\],to=/);
});
