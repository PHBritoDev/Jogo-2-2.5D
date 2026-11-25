import test from 'node:test';
import assert from 'node:assert/strict';
import { planTropical } from '../eldoria-undergrowth.js';

const trees = Array.from({ length: 20 }, (_, i) => ({ x: i * 4, z: 0, h: 12 }));

test('cipós tropicais respeitam o corredor livre, assim como as folhas', () => {
  const isFree = (x, z) => Math.abs(z) > 2.2;
  const plan = planTropical({ trees, zone: null, isFree, seed: 2926 });
  const unobstructed = planTropical({ trees, zone: null, isFree: () => true, seed: 2926 });

  assert.ok(plan.leaves.length > 0, 'folhas continuam presentes fora da trilha');
  assert.ok(plan.vines.length > 0, 'cipós continuam presentes nas laterais');
  assert.equal(unobstructed.vines.length, 40, 'o filtro não altera a densidade quando todo o terreno está livre');
  assert.ok(plan.vines.length < unobstructed.vines.length, 'cipós dentro do corredor são removidos');
  assert.ok(plan.leaves.every(p => isFree(p.x, p.z)), 'folhas respeitam a máscara');
  assert.ok(plan.vines.every(p => isFree(p.x, p.z)), 'nenhum cipó ocupa o corredor da trilha');
});

test('sem área livre, nenhum cipó ou folha é planejado', () => {
  const plan = planTropical({ trees, zone: null, isFree: () => false, seed: 2926 });
  assert.equal(plan.leaves.length, 0);
  assert.equal(plan.vines.length, 0);
});
