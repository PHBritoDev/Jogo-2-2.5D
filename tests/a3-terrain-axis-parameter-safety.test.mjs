import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAxis, buildTerrainArrays } from '../world3d-terrain.js';

test('malformed terrain axis configuration fails before infinite loops', () => {
  for (const args of [
    [4, 0, 3, 1], [4, -2, 3, 1], [4, NaN, 3, 1],
    [4, Infinity, 3, 1], [4, 2, Infinity, 1],
    [4, 2, -1, 1], [4, 2, 2.5, 1], [4, 2, 3, 0],
    [4, 2, 3, NaN], [Infinity, 2, 3, 1],
    [1e9, 0.001, 3, 1], [4, 2, 1000, 1],
  ]) {
    assert.throws(() => buildAxis(...args), RangeError, JSON.stringify(args));
  }
});

test('normal production terrain grid remains finite and ordered', () => {
  const axis = buildAxis(124, 2, 40, 1.075);
  assert.equal(axis.length, 205);
  assert.ok(axis.every(Number.isFinite));
  assert.ok(axis.every((v, i) => i === 0 || v > axis[i - 1]));
  assert.deepEqual(buildAxis(4, 2, 3, 1), [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10]);
});

test('terrain array builder rejects invalid axis configuration', () => {
  assert.throws(() => buildTerrainArrays({ height: () => 0 }, { fineCell: 0 }), RangeError);
});


test('terrain array world offsets cannot collapse GPU cells or overflow', () => {
  const flat = { height: () => 0 };
  assert.throws(() => buildTerrainArrays(flat, { cx: 1e12, fineHalf: 4, fineCell: 2, outerSteps: 2, growth: 1 }), /world-space axis/);
  assert.throws(() => buildTerrainArrays(flat, { cz: 1e100, fineHalf: 4, fineCell: 2, outerSteps: 2, growth: 1 }), /world-space axis/);
  const valid = buildTerrainArrays(flat, { cx: 100, cz: -100, fineHalf: 4, fineCell: 2, outerSteps: 2, growth: 1 });
  assert.ok(valid.positions.every(Number.isFinite));
});

test('terrain array rejects heights that overflow GPU Float32', () => {
  assert.throws(() => buildTerrainArrays({ height: () => 1e100 }, { fineHalf: 4, fineCell: 2, outerSteps: 2, growth: 1 }), /terrain height/);
  assert.throws(() => buildTerrainArrays({ height: () => NaN }, { fineHalf: 4, fineCell: 2, outerSteps: 2, growth: 1 }), /terrain height/);
});
