import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain, scatterForest } from '../world3d-terrain.js';

const MIN_SPACING = 2.25;
function verifySpacing(trees) {
  // Independent brute-force oracle for the spatial-bucket placement.
  for (let i = 0; i < trees.length; i++) {
    for (let j = i + 1; j < trees.length; j++) {
      const a = trees[i], b = trees[j];
      const distSq = (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
      assert.ok(distSq + 1e-9 >= MIN_SPACING ** 2, `trees ${i}/${j} overlap at ${Math.sqrt(distSq)} m`);
    }
  }
}

test('forest retains dense natural clusters without overlapping tree trunks', () => {
  const terrain = createTerrain();
  const trees = scatterForest(terrain, { seed: 9137 });
  assert.ok(trees.length >= 800, 'do not empty the forest for spacing');
  assert.ok(trees.some(tree => tree.kind === 'oak'));
  assert.ok(trees.some(tree => tree.kind === 'conifer'));
  assert.ok(trees.some(tree => tree.kind === 'round'));
  const previous = scatterForest(terrain, { seed: 9137, attempts: 2600 });
  assert.deepEqual(trees.slice(0, previous.length), previous, 'existing tree transforms must survive the density update');
  verifySpacing(trees);
  assert.deepEqual(trees, scatterForest(terrain, { seed: 9137 }), 'placements must remain deterministic');
});

test('low spec and route exclusion retain spacing and clear protected paths', () => {
  const terrain = createTerrain();
  const trees = scatterForest(terrain, { seed: 9137, lowSpec: true, isFree: (x, z) => Math.hypot(x, z + 64) > 60 });
  assert.deepEqual(trees, scatterForest(terrain, {
    seed: 9137, attempts: 2600, lowSpec: true, isFree: (x, z) => Math.hypot(x, z + 64) > 60
  }), 'low-detail distribution must retain its original budget and transforms');
  assert.ok(trees.length > 100);
  assert.ok(trees.every(tree => Math.hypot(tree.x, tree.z + 64) > 60));
  verifySpacing(trees);
});
