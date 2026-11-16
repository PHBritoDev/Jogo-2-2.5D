import assert from 'node:assert/strict';
import test from 'node:test';
import { scatterForest } from '../world3d-terrain.js';

const terrain = {
  area: { cx: 0, cz: 0, hx: 80, hz: 80 },
  extraAreas: [],
  boundaryDistance: () => -20,
  waterDepth: () => -99,
  height: () => 0,
};

test('invalid boundary samples cannot spawn forest trees', () => {
  const options = { seed: 9137, attempts: 1500 };
  assert.ok(scatterForest(terrain, options).length > 0, 'valid terrain must remain wooded');
  for (const value of [NaN, Infinity, -Infinity]) {
    const invalid = { ...terrain, boundaryDistance: () => value };
    assert.deepEqual(scatterForest(invalid, options), [], 'invalid boundary must not place trees');
  }
});

test('invalid boundary samples are skipped without clearing valid neighboring cells', () => {
  const options = { seed: 9137, attempts: 1500 };
  const baseline = scatterForest(terrain, options);
  const partial = { ...terrain, boundaryDistance: (x) => x < 0 ? NaN : -20 };
  const filtered = scatterForest(partial, options);
  assert.ok(filtered.length > 0, 'valid half must remain forested');
  assert.ok(filtered.length < baseline.length, 'invalid half must be rejected');
  assert.ok(filtered.every(tree => tree.x >= 0), 'all remaining trees have finite boundary samples');
});

test('finite double elevations outside Float32 range never create GPU-invalid trees', () => {
  const options = { seed: 9137, attempts: 1500 };
  const overflowValley = { ...terrain, height: () => 1e100 };
  assert.deepEqual(scatterForest(overflowValley, options), []);
  const hillside = { ...terrain, boundaryDistance: () => 15, height: () => -1e100 };
  assert.deepEqual(scatterForest(hillside, options), []);
  const validHillside = { ...hillside, height: () => 4 };
  assert.ok(scatterForest(validHillside, options).length > 0, 'valid hillside elevations still produce trees');
});

test('invalid optional forest regions cannot erase the valid base forest', () => {
  const options = { seed: 9137, attempts: 1500 };
  const baseline = scatterForest(terrain, options);
  assert.ok(baseline.length > 0);
  for (const extra of [
    { cx: NaN, cz: 0, hx: 20, hz: 20 },
    { cx: 0, cz: Infinity, hx: 20, hz: 20 },
    { cx: 0, cz: 0, hx: -20, hz: 20 },
    { cx: 1e100, cz: 0, hx: 20, hz: 20 },
    null,
  ]) {
    assert.deepEqual(scatterForest({ ...terrain, extraAreas: [extra] }, options), baseline);
  }
});

test('invalid primary forest span returns no GPU-invalid coordinates', () => {
  const options = { seed: 9137, attempts: 1500 };
  for (const cx of [NaN, Infinity, 1e100]) {
    assert.deepEqual(scatterForest({ ...terrain, area: { ...terrain.area, cx } }, options), []);
  }
});
