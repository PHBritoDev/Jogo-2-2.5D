import test from 'node:test';
import assert from 'node:assert/strict';
import { impactTouchesGround, impactGroundHeight, impactGroundSnapshot, impactRecordValid, impactDirectionValid, impactPoolCapacity, impactHasStableId } from '../vfx-impact3d.js';

test('ground contact uses a bounded skill-specific height window', () => {
  assert.equal(impactTouchesGround(0, 0), true);
  assert.equal(impactTouchesGround(1.6, 0), true, 'the default covers the 1.3 m X launch height plus margin');
  assert.equal(impactTouchesGround(1.6001, 0), false);
  assert.equal(impactTouchesGround(2.1, 0, 2.5), true, 'portals start at 2.1 m');
  assert.equal(impactTouchesGround(2.5, 0, 2.5), true);
  assert.equal(impactTouchesGround(2.5001, 0, 2.5), false);
  assert.equal(impactTouchesGround(4.999, 0, 2.5), false, 'an aerial impact must not paint the floor from five metres up');
  assert.equal(impactTouchesGround(-.35, 0), true, 'small collision penetration is tolerated');
  assert.equal(impactTouchesGround(-.351, 0), false, 'buried impacts do not create surface effects');
});

test('airborne, buried and malformed heights or reaches cannot spawn terrain effects', () => {
  for (const [point, ground, reach] of [
    [3, 0, 1.6], [50, 0, 2.5], [-.36, 0, 1.6],
    [0, NaN, 1.6], [0, Infinity, 1.6], [0, 0, NaN],
    [0, 0, Infinity], [0, 0, -1], [0, 0, 3.01]
  ]) assert.equal(impactTouchesGround(point, ground, reach), false);
  for (const invalid of [NaN, Infinity, -Infinity, undefined]) {
    assert.equal(impactTouchesGround(invalid, 0), false);
    assert.equal(impactTouchesGround(0, invalid), false);
  }
});

test('ground snapshot samples height and normal once per impact, not per rendered frame', () => {
  const calls = [], ground = (x, z) => { calls.push([x, z]); return 0; }, normal = [9, 9, 9];
  const snapshot = impactGroundSnapshot(ground, { x: 3, y: 1.3, z: 4 }, 1.6, normal);
  assert.equal(snapshot.height, 0);
  assert.equal(snapshot.touches, true);
  assert.strictEqual(snapshot.normal, normal);
  assert.deepEqual(normal, [0, 1, 0]);
  assert.deepEqual(calls, [[3, 4], [3.6, 4], [2.4, 4], [3, 4.6], [3, 3.4]],
    'one height sample plus four normal samples are cached at emit time');

  const airborneCalls = [], airborneNormal = [9, 9, 9];
  const airborne = impactGroundSnapshot((x, z) => { airborneCalls.push([x, z]); return 0; },
    { x: 3, y: 3.2, z: 4 }, 1.6, airborneNormal);
  assert.equal(airborne.touches, false);
  assert.deepEqual(airborneNormal, [0, 1, 0]);
  assert.deepEqual(airborneCalls, [[3, 4]], 'airborne impacts skip the four normal samples entirely');
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


test('anonymous impact events remain independent while stable IDs deduplicate', () => {
  for (const anonymous of [undefined, null, '', NaN, Infinity, {}, []]) {
    assert.equal(impactHasStableId(anonymous), false);
  }
  for (const stable of ['hit-1', 0, 12, -3]) {
    assert.equal(impactHasStableId(stable), true);
  }
  // Mirrors the production guard: only explicit stable IDs enter the dedupe set.
  const seen = new Set();
  const accept = id => {
    if (!impactHasStableId(id)) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  };
  assert.equal(accept(undefined), true);
  assert.equal(accept(undefined), true);
  assert.equal(accept('hit-1'), true);
  assert.equal(accept('hit-1'), false);
  assert.equal(accept(0), true);
  assert.equal(accept(0), false);
});
