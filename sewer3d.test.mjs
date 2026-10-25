import test from 'node:test';
import assert from 'node:assert/strict';
import { SEWER, sewerWalkable, sewerCheckpoint, sewerZone } from './sewer3d.js';

test('túnel, salas e caminho vazio são caminháveis; buraco, paredes e caminho da horda não', () => {
  for (const p of [{ x: 0, z: 40 }, { x: 0, z: 2 }, { x: 40, z: -24 }, { x: 40, z: -45 }, { x: 40, z: -75 }]) assert.ok(sewerWalkable(p.x, p.z), JSON.stringify(p));
  assert.equal(sewerWalkable(SEWER.hole.x, SEWER.hole.z), false);
  assert.equal(sewerWalkable(6, 30), false);
  assert.equal(sewerWalkable(58, -24), false);
  assert.equal(sewerWalkable(20, -10), false);
});

test('todos os pontos de volta e de inimigos ficam em chão firme', () => {
  for (const c of Object.values(SEWER.checkpoints)) assert.ok(sewerWalkable(c.x, c.z), JSON.stringify(c));
  for (const p of SEWER.feedingSpots) assert.ok(sewerWalkable(p.x, p.z), JSON.stringify(p));
  assert.ok(sewerWalkable(SEWER.warden.x, SEWER.warden.z));
  assert.equal(SEWER.feedingSpots.length, 5);
});

test('pontos de volta acompanham a etapa', () => {
  assert.equal(sewerCheckpoint(4, 2), SEWER.checkpoints.entrance);
  assert.equal(sewerCheckpoint(4, 3), SEWER.checkpoints.feeding);
  assert.equal(sewerCheckpoint(5, 0), SEWER.checkpoints.path);
  assert.equal(sewerCheckpoint(7, 0), SEWER.checkpoints.portal);
  assert.equal(sewerZone(0, 30), 'tunnel');
  assert.equal(sewerZone(40, -75), 'strange');
});
