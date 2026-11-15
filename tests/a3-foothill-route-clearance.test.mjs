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


test('foothill route mask removes only blocked tree positions', () => {
  const options = { seed: 9137, attempts: 1500 };
  const baseline = scatterForest(foothill, options);
  const keep = (x, z) => x >= 0;
  const filtered = scatterForest(foothill, { ...options, isFree: keep });
  assert.ok(filtered.length > 0, 'unblocked hillside must retain vegetation');
  assert.ok(filtered.length < baseline.length, 'reserved half of hillside must lose trees');
  assert.ok(filtered.every(tree => keep(tree.x, tree.z)), 'every retained tree must clear the path mask');
});

test('foothill shoreline cutoff is enforced without clearing dry hillside', () => {
  const options = { seed: 9137, attempts: 1500 };
  const flooded = { ...foothill, waterDepth: () => -.24 };
  const dry = { ...foothill, waterDepth: () => -.26 };
  assert.deepEqual(scatterForest(flooded, options), [], 'shallow water margin must remain clear');
  assert.ok(scatterForest(dry, options).length > 0, 'dry slope must keep its conifers');
});

test('nonfinite water readings never plant trees in valley or foothills', () => {
  for (const depth of [NaN, Infinity, -Infinity]) {
    for (const distance of [-20, 20]) {
      const invalid = { ...foothill, boundaryDistance: () => distance, waterDepth: () => depth };
      assert.deepEqual(scatterForest(invalid, { seed: 9137, attempts: 1500 }), [],
        `invalid water depth ${depth} at boundary ${distance} must be rejected`);
    }
  }
});

test('nonfinite foothill elevations never generate floating conifers', () => {
  for (const elevation of [NaN, Infinity, -Infinity]) {
    const invalid = { ...foothill, height: () => elevation };
    assert.deepEqual(scatterForest(invalid, { seed: 9137, attempts: 1500 }), [],
      `invalid elevation ${elevation} must not produce vegetation`);
  }
});

test('nonfinite valley elevations never generate invalid tree instances', () => {
  const options = { seed: 9137, attempts: 1500 };
  const valley = { ...foothill, boundaryDistance: () => -20 };
  assert.ok(scatterForest(valley, options).length > 0, 'valid valley should retain its forest');
  for (const elevation of [NaN, Infinity, -Infinity]) {
    const invalid = { ...valley, height: () => elevation };
    assert.deepEqual(scatterForest(invalid, options), [],
      `invalid valley elevation ${elevation} must not generate trees`);
  }
});

test('valley height filtering preserves dry, walkable vegetation', () => {
  const options = { seed: 9137, attempts: 1500 };
  const valley = { ...foothill, boundaryDistance: () => -20 };
  const valid = scatterForest(valley, options);
  const selectivelyInvalid = {
    ...valley,
    height: (x) => x < 0 ? NaN : 0,
  };
  const filtered = scatterForest(selectivelyInvalid, options);
  assert.ok(filtered.length > 0, 'valid valley cells should remain wooded');
  assert.ok(filtered.length < valid.length, 'invalid valley cells must lose their trees');
  assert.ok(filtered.every(tree => tree.x >= 0), 'all retained trees have valid elevations');
});
