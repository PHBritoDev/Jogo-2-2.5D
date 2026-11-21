import test from 'node:test';
import assert from 'node:assert/strict';
import { VOLCANO, volcanoWalkable, volcanoCheckpoint } from './volcano3d.js';

test('salas e túneis do vulcão são caminháveis; a sala do ouro só depois da porta', () => {
  for (const p of [{ x: 0, z: 40 }, { x: 0, z: 0 }, { x: 0, z: -46 }, { x: 0, z: -82 }]) assert.ok(volcanoWalkable(p.x, p.z), JSON.stringify(p));
  assert.equal(volcanoWalkable(VOLCANO.gold.x, VOLCANO.gold.z), false);
  assert.equal(volcanoWalkable(VOLCANO.gold.x, VOLCANO.gold.z, { doorOpen: true }), true);
  assert.equal(volcanoWalkable(15, 20), false);
});

test('inimigos e pontos de volta ficam em chão firme; contagens do roteiro', () => {
  for (const p of [...VOLCANO.labSpots, ...VOLCANO.hallSpots, VOLCANO.miniboss, ...Object.values(VOLCANO.checkpoints)]) assert.ok(volcanoWalkable(p.x, p.z), JSON.stringify(p));
  assert.equal(VOLCANO.labSpots.length, 3);
  assert.equal(VOLCANO.hallSpots.length, 5);
  assert.equal(volcanoCheckpoint(0), VOLCANO.checkpoints.entrance);
  assert.equal(volcanoCheckpoint(4), VOLCANO.checkpoints.throne);
});

test('rota elevada da câmara ligada aos respiradouros e aos checkpoints dos saves anteriores', () => {
  const M = VOLCANO.magma;
  for (const p of [{ x: 0, z: 174 }, { x: -7, z: 156 }, { x: -15, z: 137 }, { x: -7.5, z: 124.5 }, { x: 0, z: 112 }, { x: 9, z: 96 }, { x: 4.5, z: 88.5 }, { x: 0, z: 80 }]) assert.ok(volcanoWalkable(p.x, p.z), JSON.stringify(p));
  for (const p of [{ x: 10, z: 112 }, { x: -12, z: 120 }, { x: 20, z: 100 }]) assert.equal(volcanoWalkable(p.x, p.z), false, 'lago de lava não é chão: ' + JSON.stringify(p));
  for (const v of M.vents) assert.ok(volcanoWalkable(v.x, v.z) && Math.hypot(v.x - M.landing.x, v.z - M.landing.z) + v.r < M.landing.r, 'respiradouro dentro do patamar, contornável');
  assert.ok(Math.abs(M.landing.x) + M.causeway.r < M.landing.r, 'calçada livre ao lado dos respiradouros');
  assert.equal(VOLCANO.checkpoints.entrance.z, 172);
});
