import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planTropical } from '../eldoria-undergrowth.js';

const trees = Array.from({ length: 20 }, (_, i) => ({ x: i * 4, z: 0, h: 12 }));
const world = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

function vineFootprintFree(isFree, x, z) {
  if (!isFree(x, z)) return false;
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16;
    if (!isFree(x + Math.cos(a) * .4, z + Math.sin(a) * .4)) return false;
  }
  return true;
}

test('cipós tropicais respeitam o corredor livre, assim como as folhas', () => {
  const isFree = (x, z) => Math.abs(z) > 2.2;
  const plan = planTropical({ trees, zone: null, isFree, seed: 2926 });
  const unobstructed = planTropical({ trees, zone: null, isFree: () => true, seed: 2926 });

  assert.ok(plan.leaves.length > 0, 'folhas continuam presentes fora da trilha');
  assert.ok(plan.vines.length > 0, 'cipós continuam presentes nas laterais');
  assert.equal(unobstructed.vines.length, 40, 'o filtro não altera a densidade quando todo o terreno está livre');
  assert.ok(plan.vines.length < unobstructed.vines.length, 'cipós dentro do corredor são removidos');
  assert.ok(plan.leaves.every(p => isFree(p.x, p.z)), 'folhas respeitam a máscara');
  assert.ok(plan.vines.every(p => vineFootprintFree(isFree, p.x, p.z)), 'a malha completa e sua oscilação ficam fora do corredor');
});

test('sem área livre, nenhum cipó ou folha é planejado', () => {
  const plan = planTropical({ trees, zone: null, isFree: () => false, seed: 2926 });
  assert.equal(plan.leaves.length, 0);
  assert.equal(plan.vines.length, 0);
});

test('o cinturão real conecta buildTropical à máscara de trilhas e clareiras', () => {
  assert.match(world, /import \{buildUndergrowth,buildTropical\} from '\.\/eldoria-undergrowth\.js'/);
  assert.match(world, /const beltTropical=buildTropical\(THREE,\{[\s\S]{0,900}?isFree:\(x,z\)=>beltFree\(x,z,-1\.5\)\}\);/);
});

test('filtrar cipós não desloca o RNG das folhas nem das árvores seguintes', () => {
  const pair = [{ x: 0, z: 0, h: 12 }, { x: 100, z: 0, h: 12 }];
  const unobstructed = planTropical({ trees: pair, zone: null, isFree: () => true, seed: 2926 });
  const filtered = planTropical({
    trees: pair,
    zone: null,
    isFree: (x, z) => Math.hypot(x, z) >= 2.2,
    seed: 2926
  });

  assert.deepEqual(filtered.leaves, unobstructed.leaves, 'folhas e sequência das árvores seguintes permanecem idênticas');
  assert.deepEqual(
    filtered.vines,
    unobstructed.vines.filter(v => vineFootprintFree((x, z) => Math.hypot(x, z) >= 2.2, v.x, v.z)),
    'somente os cipós dentro da máscara são removidos; os seguintes conservam os mesmos dados'
  );
  assert.ok(filtered.vines.length < unobstructed.vines.length, 'o caso determinístico realmente filtra um cipó');
});
