import assert from 'node:assert/strict';
import test from 'node:test';
import { colorTerrain } from '../world3d-terrain.js';

const positions = new Float32Array([0, 0, 0, 2, 0, 2]);
const normals = new Float32Array([0, 1, 0, 0, 1, 0]);
const terrain = {
  extraAreas: [],
  boundaryDistance: () => -20,
  waterDepth: () => -1,
};
const palette = extraAreas => [...colorTerrain({ ...terrain, extraAreas }, positions, normals)];

test('invalid optional area containers preserve the original ground colors', () => {
  const baseline = palette([]);
  for (const areas of [null, 42, {}, 'broken']) {
    assert.deepEqual(palette(areas), baseline);
  }
});

test('invalid optional area entries do not crash or poison vertex colors', () => {
  const baseline = palette([]);
  for (const area of [null, 42, {}, { cx: NaN, cz: 0, hx: 5, hz: 5 },
    { cx: 0, cz: Infinity, hx: 5, hz: 5 },
    { cx: 0, cz: 0, hx: -5, hz: 5 }]) {
    assert.deepEqual(palette([area]), baseline);
  }
});

test('valid tinted optional regions still change colors and stay finite', () => {
  const baseline = palette([]);
  const region = { cx: 0, cz: 0, hx: 12, hz: 12, tint: [[0.2, 0.15, 0.1], [0.3, 0.2, 0.1]] };
  const tinted = palette([region]);
  assert.notDeepEqual(tinted, baseline);
  assert.ok(tinted.every(Number.isFinite));
  assert.deepEqual(palette([null, region, { cx: NaN }]), tinted);
});

test('malformed tint palettes and strengths cannot poison GPU vertex colors', () => {
  const region = { cx: 0, cz: 0, hx: 12, hz: 12 };
  const fallback = palette([region]);
  for (const tint of [[], [null, null], [[NaN, 0, 0], [1, 0, 0]],
    [[Infinity, 0, 0], [0, 0, 0]], [[2, 0, 0], [0, 0, 0]],
    [[0, 0], [0, 0, 0]], 'invalid']) {
    assert.deepEqual(palette([{ ...region, tint }]), fallback);
  }
  for (const tintStrength of [NaN, Infinity, -1, 2, 'invalid']) {
    assert.deepEqual(palette([{ ...region, tintStrength }]), fallback);
  }
  const valid = palette([{ ...region, tint: [[.2, .3, .4], [.4, .3, .2]], tintStrength: .5 }]);
  assert.ok(valid.every(Number.isFinite));
  assert.notDeepEqual(valid, fallback);
});
