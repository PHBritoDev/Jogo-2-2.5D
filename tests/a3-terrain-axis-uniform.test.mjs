import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAxis, buildTerrainArrays } from '../world3d-terrain.js';

test('crescimento uniforme produz grade finita e simétrica', () => {
  const axis = buildAxis(4, 2, 3, 1);
  assert.deepEqual(axis, [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10]);
  assert.ok(axis.every(Number.isFinite));
});

test('malha uniforme possui posições/índices válidos para GPU', () => {
  const mesh = buildTerrainArrays({ height: () => 0 }, {
    cx: 0, cz: 0, fineHalf: 4, fineCell: 2, outerSteps: 3, growth: 1
  });
  assert.ok([...mesh.positions].every(Number.isFinite));
  assert.ok([...mesh.indices].every(v => v < mesh.positions.length / 3));
  assert.equal(mesh.indices.length, (mesh.nx - 1) * (mesh.nz - 1) * 6);
});

test('grade antiga com crescimento normal mantém coordenadas', () => {
  assert.deepEqual(buildAxis(4, 2, 2, 2), [-10, -6, -4, -2, 0, 2, 4, 6, 10]);
});
