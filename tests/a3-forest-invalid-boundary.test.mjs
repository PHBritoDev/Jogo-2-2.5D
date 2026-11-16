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
