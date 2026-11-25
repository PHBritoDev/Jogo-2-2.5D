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

test('forest sampling budget is finite, bounded and deterministic for mobile', () => {
  const valid = scatterForest(terrain, { seed: 9137 });
  for (const attempts of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(scatterForest(terrain, { seed: 9137, attempts }), valid);
  }
  assert.deepEqual(scatterForest(terrain, { attempts: -20 }), []);
  assert.deepEqual(scatterForest(terrain, { attempts: 0 }), []);
  assert.deepEqual(
    scatterForest(terrain, { seed: 9137, attempts: 100.9 }),
    scatterForest(terrain, { seed: 9137, attempts: 100 }),
  );
  assert.deepEqual(
    scatterForest(terrain, { seed: 9137, attempts: 1000000 }),
    scatterForest(terrain, { seed: 9137, attempts: 10000 }),
  );
  assert.deepEqual(
    scatterForest(terrain, { seed: 9137, attempts: Infinity, lowSpec: true }),
    scatterForest(terrain, { seed: 9137, attempts: 2600, lowSpec: true }),
  );
});


test('malformed primary forest extents do not create reversed or unsafe spans', () => {
  const options = { seed: 9137, attempts: 1500 };
  for (const area of [
    null,
    { ...terrain.area, hx: -1 },
    { ...terrain.area, hz: -1 },
    { ...terrain.area, hx: Infinity },
    { ...terrain.area, hz: NaN },
    { ...terrain.area, cx: 3e38, hx: 3e38 },
    { ...terrain.area, cz: -3e38, hz: 3e38 },
  ]) {
    assert.deepEqual(scatterForest({ ...terrain, area }, options), []);
  }
  assert.ok(scatterForest(terrain, options).length > 0, 'valid primary region still supports forest');
});

test('malformed optional forest containers preserve the valid primary region', () => {
  const options = { seed: 9137, attempts: 1500 };
  const baseline = scatterForest(terrain, options);
  assert.ok(baseline.length > 0);
  for (const extraAreas of [42, {}, 'broken', { 0: terrain.area, length: 1 }]) {
    assert.deepEqual(scatterForest({ ...terrain, extraAreas }, options), baseline);
  }
});

test('optional regions cannot invalidate the combined Float32 sampling span', () => {
  const west = { cx: -2e38, cz: 0, hx: 1e37, hz: 20 };
  const east = { cx: 2e38, cz: 0, hx: 1e37, hz: 20 };
  const options = { seed: 9137, attempts: 200 };
  let sampled = 0;
  const probe = {
    ...terrain,
    extraAreas: [west, east],
    boundaryDistance: () => { sampled++; return -20; },
  };
  const actual = scatterForest(probe, options);
  assert.equal(sampled, 200, 'invalid union must not abort forest sampling');
  assert.deepEqual(
    actual,
    scatterForest({ ...terrain, extraAreas: [west] }, options),
    'overflowing optional region is ignored without changing deterministic samples',
  );
});
