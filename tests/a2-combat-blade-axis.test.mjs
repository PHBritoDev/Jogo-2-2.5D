import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../combat-rig3d.js', import.meta.url), 'utf8');

test('combat bake preserves non-Mixamo palm-to-finger blade calibration', () => {
  assert.match(source, /MiddleProximal/);
  assert.match(source, /localAxis\.subVectors\(p1,p\)\.normalize\(\)\.applyQuaternion\(handQ\.clone\(\)\.invert\(\)\)/);
  const calibrated = source.indexOf("const child=bones.RightHand.children.find");
  const used = source.indexOf("axis.copy(localAxis).applyQuaternion(wq)");
  assert.ok(calibrated >= 0 && used > calibrated, 'calibration must precede blade aiming');
  const between = source.slice(calibrated, used);
  assert.doesNotMatch(between, /localAxis\.set\(0,1,0\)\s*;/, 'calibrated axis must not be overwritten');
});

test('Mixamo hand retains legacy +Y axis fallback', () => {
  assert.match(source, /bones\.RightHand\.name\.includes\('mixamorig'\)\)localAxis\.set\(0,1,0\)/);
});
