import assert from 'node:assert/strict';
import test from 'node:test';
import { scatterForest } from '../world3d-terrain.js';

const base = {
  area: { cx: 0, cz: 0, hx: 80, hz: 80 }, extraAreas: [],
  boundaryDistance: () => -20, waterDepth: () => -99,
  height: () => 0,
};
const options = { seed: 9137, attempts: 1500 };

test('forest preserves trees on level and gently sloping ground', () => {
  const flat = scatterForest(base, options);
  const gentle = scatterForest({ ...base, height: (x) => x * .2 }, options);
  assert.ok(flat.length > 0);
  assert.equal(gentle.length, flat.length, 'gentle grade must not thin the forest');
});

test('forest rejects trees on near-vertical terrain in valley and foothills', () => {
  for (const boundary of [-20, 20]) {
    const terrain = { ...base, boundaryDistance: () => boundary, height: (x) => x * 3 };
    assert.deepEqual(scatterForest(terrain, options), [], 'steep grade must remain clear');
  }
});

test('forest retains flat pockets next to steep slopes', () => {
  const terrain = { ...base, height: (x) => x < 0 ? x * 3 : 0 };
  const trees = scatterForest(terrain, options);
  assert.ok(trees.length > 0);
  assert.ok(trees.every(t => t.x >= 0), 'steep negative-X hillside must stay clear');
});

test('forest rejects narrow raised shelves even when central gradient cancels out', () => {
  // The center of a narrow raised shelf is higher than both neighbors;
  // central differences alone falsely classify that tree root as flat.
  const terrain = { ...base, height: (x) => Math.abs(x) < 1 ? 4 : 0 };
  const trees = scatterForest(terrain, options);
  assert.ok(trees.length > 0, 'level ground away from shelf must remain forested');
  assert.ok(trees.every(t => Math.abs(t.x) >= 2.25),
    'no tree root may straddle the unsupported raised shelf');
});
