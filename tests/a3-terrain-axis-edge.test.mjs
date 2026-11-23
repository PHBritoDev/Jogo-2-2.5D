import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAxis, buildTerrainArrays } from '../world3d-terrain.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

for (const { fineHalf, fineCell, outerSteps, growth } of [
  { fineHalf: 206, fineCell: 2.5, outerSteps: 8, growth: 1.075 },
  { fineHalf: 166, fineCell: 2.5, outerSteps: 8, growth: 1.075 },
  { fineHalf: 125, fineCell: 2, outerSteps: 8, growth: 1 },
  { fineHalf: 124, fineCell: 2, outerSteps: 8, growth: 1.075 },
]) {
  test(`exterior joins actual fine-grid edge ${fineHalf}/${fineCell}`, () => {
    const axis = buildAxis(fineHalf, fineCell, outerSteps, growth);
    const steps = Math.round(fineHalf / fineCell);
    const edge = steps * fineCell;
    const leftEdge = outerSteps;
    const rightEdge = outerSteps + 2 * steps;
    close(axis[leftEdge], -edge);
    close(axis[rightEdge], edge);
    close(axis[leftEdge] - axis[leftEdge - 1], fineCell);
    close(axis[rightEdge + 1] - axis[rightEdge], fineCell);
    for (let i = 1; i < axis.length; i++) assert.ok(axis[i] > axis[i - 1]);
  });
}

test('fractional Eldoria X/Z terrain has connected triangles and uniform first outer cell', () => {
  const terrain = { height: () => 0 };
  const { ax, az, positions, indices, nx, nz } = buildTerrainArrays(terrain, {
    fineHalf: 206, fineHalfZ: 166, fineCell: 2.5, outerSteps: 4, growth: 1.075,
  });
  assert.equal(positions.length, nx * nz * 3);
  assert.equal(indices.length, (nx - 1) * (nz - 1) * 6);
  for (const axis of [ax, az]) {
    for (let i = 1; i < axis.length; i++) assert.ok(axis[i] > axis[i - 1]);
  }
  for (const index of indices) assert.ok(index >= 0 && index < nx * nz);
  assert.ok(positions.every(Number.isFinite));
});
