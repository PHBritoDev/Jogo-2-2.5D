import test from 'node:test';
import assert from 'node:assert/strict';
import { impactTouchesGround } from '../vfx-impact3d.js';

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
