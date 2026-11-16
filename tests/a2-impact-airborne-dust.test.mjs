import test from 'node:test';
import assert from 'node:assert/strict';
import { impactTouchesGround, impactGroundHeight, impactRecordValid, impactDirectionValid, impactPoolCapacity } from '../vfx-impact3d.js';

test('ground contact accepts nearby finite impact heights', () => {
  assert.equal(impactTouchesGround(0, 0), true);
  assert.equal(impactTouchesGround(4.999, 0), true);
  assert.equal(impactTouchesGround(-1, 0), true);
});

test('airborne, buried and invalid heights cannot spawn terrain effects', () => {
  assert.equal(impactTouchesGround(5, 0), false);
  assert.equal(impactTouchesGround(50, 0), false);
  assert.equal(impactTouchesGround(-1.001, 0), false);
  for (const invalid of [NaN, Infinity, -Infinity, undefined]) {
    assert.equal(impactTouchesGround(invalid, 0), false);
    assert.equal(impactTouchesGround(0, invalid), false);
  }
});


test('invalid horizontal coordinates never reach the terrain sampler', () => {
  const calls = [];
  const ground = (x, z) => { calls.push([x, z]); return 2; };
  assert.equal(impactGroundHeight(ground, { x: 3, z: 4 }), 2);
  assert.deepEqual(calls, [[3, 4]]);
  for (const x of [NaN, Infinity, -Infinity, undefined]) {
    assert.ok(Number.isNaN(impactGroundHeight(ground, { x, z: 4 })));
  }
  for (const z of [NaN, Infinity, -Infinity, undefined]) {
    assert.ok(Number.isNaN(impactGroundHeight(ground, { x: 3, z })));
  }
  assert.ok(Number.isNaN(impactGroundHeight(ground, null)));
  assert.deepEqual(calls, [[3, 4]], 'invalid impacts must not invoke terrain lookup');
});

test('malformed impacts are rejected before entering pooled VFX', () => {
  const valid = { time: 1, point: { x: 2, y: 3, z: 4 }, size: 2 };
  assert.equal(impactRecordValid(valid), true);
  assert.equal(impactRecordValid({ ...valid, size: 0 }), false);
  assert.equal(impactRecordValid({ ...valid, size: -2 }), false);
  assert.equal(impactRecordValid({ ...valid, size: Infinity }), false);
  assert.equal(impactRecordValid({ ...valid, time: NaN }), false);
  assert.equal(impactRecordValid({ ...valid, point: null }), false);
  for (const axis of ['x', 'y', 'z']) {
    for (const invalid of [NaN, Infinity, -Infinity, undefined]) {
      assert.equal(impactRecordValid({
        ...valid, point: { ...valid.point, [axis]: invalid }
      }), false, `${axis}=${invalid} must be rejected`);
    }
  }
  assert.equal(impactRecordValid(valid), true, 'a valid event still works after invalid input');
});


test('impact directions reject degenerate and nonfinite vectors without blocking valid combat', () => {
  assert.equal(impactDirectionValid({ x: 0, y: 1, z: 0 }), true);
  assert.equal(impactDirectionValid({ x: -2, y: 0, z: 4 }), true);
  assert.equal(impactDirectionValid({ x: 0, y: 0, z: 0 }), false);
  assert.equal(impactDirectionValid({ x: 1e308, y: 0, z: 0 }), false);
  for (const bad of [null, undefined, {}, { x: NaN, y: 1, z: 0 }, { x: 0, y: Infinity, z: 0 }]) {
    assert.equal(impactDirectionValid(bad), false);
  }
  assert.equal(impactDirectionValid({ x: 0, y: 1, z: 0 }), true);
});


test('impact pool capacity remains bounded and usable after malformed config', () => {
  for (const bad of [0, -1, 1.5, NaN, Infinity, -Infinity, null, undefined, '6', 65, 1e12]) {
    assert.equal(impactPoolCapacity(bad), 6, `bad capacity ${String(bad)}`);
  }
  for (const good of [1, 2, 6, 64]) assert.equal(impactPoolCapacity(good), good);
});
