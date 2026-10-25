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
