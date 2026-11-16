import test from 'node:test';
import assert from 'node:assert/strict';
import { planRemansoLog } from '../eldoria-forest-places3d.js';

test('Remanso: tronco acompanha declive e mantém as duas extremidades acima do chão', () => {
  const ground = (x, z) => .18 * x - .12 * z;
  const plan = planRemansoLog(ground, { x: 5, z: -120 });
  assert.ok(plan.length > 3.6);
  assert.ok(Math.abs(Math.hypot(plan.b.x - plan.a.x, plan.b.z - plan.a.z) - 3.6) < 1e-10);
  for (const p of [plan.a, plan.b]) assert.ok(p.y >= ground(p.x, p.z) + .35 - 1e-10);
  assert.ok(Math.abs(plan.center.y - (plan.a.y + plan.b.y) / 2) < 1e-10);
});

test('Remanso: lombada central não enterra o tronco', () => {
  const ground = (x, z) => 2 * Math.exp(-((x - 5) ** 2 + (z + 120) ** 2) * 4);
  const plan = planRemansoLog(ground, { x: 5, z: -120 });
  assert.ok(plan.center.y >= ground(5, -120) + .35 - 1e-10);
  assert.ok(plan.a.y >= ground(plan.a.x, plan.a.z) + .35 - 1e-10);
});

test('Remanso: terreno plano preserva comprimento e altura', () => {
  const plan = planRemansoLog(() => 4, { x: 5, z: -120 });
  assert.ok(Math.abs(plan.length - 3.6) < 1e-10);
  assert.equal(plan.center.y, 4.35);
});
