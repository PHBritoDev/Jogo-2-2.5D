import assert from 'node:assert/strict';
import test from 'node:test';
import { scatterForest } from '../world3d-terrain.js';

// Foothill cells are outside the valley but inside the tree line.
// This reproduces a reserved exterior corridor being populated with
// decorative conifers despite the caller's isFree clearance mask.
const foothill = {
  area: { cx: 0, cz: 0, hx: 80, hz: 80 },
  extraAreas: [],
  boundaryDistance: () => 20,
  waterDepth: () => -99,
  height: () => 0,
};

test('foothill trees respect reserved paths and route clearance', () => {
  const options = { seed: 9137, attempts: 1500 };
  const baseline = scatterForest(foothill, { ...options, isFree: () => true });
  assert.ok(baseline.length > 0, 'fixture must actually generate hillside trees');
  assert.ok(baseline.every(tree => tree.kind === 'conifer' && tree.collide === false));
  let checks = 0;
  const blocked = scatterForest(foothill, {
    ...options,
    isFree: () => { checks++; return false; },
  });
  assert.ok(checks > 0, 'hillside must consult the caller clearance mask');
  assert.deepEqual(blocked, [], 'no trees should appear on a reserved hillside route');
});

test('foothill tree scatter preserves water clearance', () => {
  const flooded = { ...foothill, waterDepth: () => 0 };
  assert.deepEqual(scatterForest(flooded, { seed: 9137, attempts: 1500 }), []);
});

test('valley scatter remains subject to the same clearance', () => {
  const valley = { ...foothill, boundaryDistance: () => -20 };
  assert.deepEqual(scatterForest(valley, {
    seed: 9137, attempts: 1500, isFree: () => false,
  }), []);
});
