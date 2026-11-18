import test from 'node:test';
import assert from 'node:assert/strict';
import { planRemansoLog, remansoBarkVertexY } from '../eldoria-forest-places3d.js';

test('Remanso: as duas pontas acompanham o declive sem elevação artificial', () => {
  const ground = (x, z) => .18 * x - .12 * z;
  const plan = planRemansoLog(ground, { x: 5, z: -120 });
  assert.equal(plan.length, 3.6);
  assert.ok(Math.abs(Math.hypot(plan.b.x - plan.a.x, plan.b.z - plan.a.z) - 3.6) < 1e-10);
  for (const p of [plan.a, plan.b]) assert.ok(Math.abs(p.y - ground(p.x, p.z) - plan.radius) < 1e-10);
});

test('Remanso: lombada central não levanta as extremidades do banco', () => {
  const ground = (x, z) => 2 * Math.exp(-((x - 5) ** 2 + (z + 120) ** 2) * 4);
  const plan = planRemansoLog(ground, { x: 5, z: -120 });
  assert.ok(plan.center.y > plan.a.y + 1);
  assert.ok(Math.abs(plan.a.y - ground(plan.a.x, plan.a.z) - plan.radius) < 1e-10);
  assert.ok(Math.abs(plan.b.y - ground(plan.b.x, plan.b.z) - plan.radius) < 1e-10);
});

test('Remanso: terreno plano preserva comprimento e contato', () => {
  const plan = planRemansoLog(() => 4, { x: 5, z: -120 });
  assert.equal(plan.length, 3.6);
  assert.equal(plan.center.y, 4.42);
});

test('Remanso: lombada deslocada não cria ponta suspensa', () => {
  const x = 5, z = -120, yaw = .6;
  const peakX = x + Math.cos(yaw) * .9, peakZ = z - Math.sin(yaw) * .9;
  const ground = (px, pz) => 1.5 * Math.exp(-((px - peakX) ** 2 + (pz - peakZ) ** 2) * 8);
  const plan = planRemansoLog(ground, { x, z, yaw });
  for (let i = 0; i <= 12; i++) {
    const p = plan.point(i / 12);
    assert.ok(Math.abs(p.y - ground(p.x, p.z) - plan.radius) < 1e-10, 'anel sem contato no ponto ' + i);
  }
});


test('Remanso: casca real apoia anéis afunilados no chão, sem fresta de 4–10 cm', () => {
  for (const terrainY of [-3, 0, 7.2]) {
    for (const ringRadius of [.32, .35, .38]) {
      for (const deformation of [.92, 1, 1.08]) {
        const bottom = remansoBarkVertexY(terrainY, ringRadius, -ringRadius, deformation);
        assert.ok(Math.abs(bottom - terrainY) < 1e-10, `contato raio ${ringRadius} deformação ${deformation}`);
        const top = remansoBarkVertexY(terrainY, ringRadius, ringRadius, deformation);
        assert.ok(top > terrainY + .5, 'seção do tronco mantém volume');
      }
    }
  }
});


test('Remanso: centros das tampas acompanham o raio de cada extremidade', () => {
  const ground = 2.5;
  for (const radius of [.32, .38]) {
    for (const deformation of [.95, 1, 1.05]) {
      const center = remansoBarkVertexY(ground, 0, 0, deformation, radius * deformation);
      const edgeMid = remansoBarkVertexY(ground, radius, 0, deformation);
      assert.ok(Math.abs(center - edgeMid) < 1e-10, 'centro e borda média da tampa devem compartilhar altura');
    }
  }
});
