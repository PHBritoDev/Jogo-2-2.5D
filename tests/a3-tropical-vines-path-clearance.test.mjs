import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planTropical } from '../eldoria-undergrowth.js';

const trees = Array.from({ length: 20 }, (_, i) => ({ x: i * 4, z: 0, h: 12 }));
const world = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

function vineFootprintFree(isFree, x, z) {
  const radius = .4, gridSteps = 4;
  for (let ix = -gridSteps; ix <= gridSteps; ix++) {
    for (let iz = -gridSteps; iz <= gridSteps; iz++) {
      const dx = ix * radius / gridSteps, dz = iz * radius / gridSteps;
      if (dx * dx + dz * dz > radius * radius + 1e-9) continue;
      if (!isFree(x + dx, z + dz)) return false;
    }
  }
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16;
    if (!isFree(x + Math.cos(a) * radius, z + Math.sin(a) * radius)) return false;
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

test('cipó é rejeitado quando a máscara bloqueia um bolsão dentro do envelope', () => {
  const singleTree = [{ x: 0, z: 0, h: 12 }];
  const baseline = planTropical({ trees: singleTree, zone: null, isFree: () => true, seed: 2926 });
  const target = baseline.vines[0];
  // O bloqueio fica a 0,2 m na direção longitudinal da malha, fora do centro e do anel de 0,4 m.
  const blockedX = target.x + Math.cos(target.rot) * .2;
  const blockedZ = target.z - Math.sin(target.rot) * .2;
  const isFree = (x, z) => Math.hypot(x - blockedX, z - blockedZ) > .025;

  assert.ok(isFree(target.x, target.z), 'o pivô continua livre');
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16;
    assert.ok(isFree(target.x + Math.cos(a) * .4, target.z + Math.sin(a) * .4), 'o perímetro continua livre');
  }
  assert.equal(isFree(blockedX, blockedZ), false, 'o bolsão interno está bloqueado');

  const filtered = planTropical({ trees: singleTree, zone: null, isFree, seed: 2926 });
  assert.ok(!filtered.vines.some(v => v.x === target.x && v.z === target.z), 'o cipó que cobre o bolsão é removido');
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

test('árvores do plano tropical sem h explícito geram cipós finitos e respeitam a escala', () => {
  // Forma real de planTropicalBelt: sp/s existem; h não é emitido pelo planejador.
  const forestTrees = [
    { sp: 'sumauma', x: 0, z: 0, s: 1.1 },
    { sp: 'figueira', x: 12, z: 0, s: .9 },
    { sp: 'copaLarga', x: 24, z: 0, s: 1 },
    { sp: 'palmeira', x: 36, z: 0, s: 1 },
    { sp: 'embauba', x: 48, z: 0, s: 1 }
  ];
  const plan = planTropical({ trees: forestTrees, zone: null, isFree: () => true, seed: 2926 });
  assert.ok(plan.vines.length > 0, 'a mata mantém cipós nas árvores');
  assert.ok(plan.vines.every(v => Number.isFinite(v.top) && Number.isFinite(v.len) && v.top > 0 && v.len > 0),
    'nenhum cipó pode receber posição/comprimento NaN');

  const tall = planTropical({ trees: [{ sp: 'sumauma', x: 0, z: 0, s: 1 }], zone: null, isFree: () => true, seed: 2926 });
  const regular = planTropical({ trees: [{ sp: 'figueira', x: 0, z: 0, s: 1 }], zone: null, isFree: () => true, seed: 2926 });
  const explicit = planTropical({ trees: [{ sp: 'sumauma', x: 0, z: 0, s: 1, h: 10 }], zone: null, isFree: () => true, seed: 2926 });
  assert.ok(tall.vines[0].len > regular.vines[0].len * 2.3, 'sumaúma usa a altura de 26 m e as demais a base conservadora de 11 m');
  assert.ok(explicit.vines[0].len < tall.vines[0].len, 'h explícito do cinturão continua tendo precedência');
});
