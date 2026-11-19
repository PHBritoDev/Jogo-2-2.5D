import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { uploadUsedElements } from '../instance-upload3d.js';

function attr() {
  return {
    ranges: [],
    version: 0,
    addUpdateRange(start, count) { this.ranges.push({ start, count }); },
    clearUpdateRanges() { this.ranges.length = 0; },
    set needsUpdate(v) { if (v === true) this.version++; },
  };
}

test('upload parcial cobre só os elementos usados e substitui faixas antigas', () => {
  const a = attr();
  a.addUpdateRange(0, 99999);
  assert.equal(uploadUsedElements(a, 320), true);
  assert.deepEqual(a.ranges, [{ start: 0, count: 320 }]);
  assert.equal(a.version, 1);
  uploadUsedElements(a, 0);
  assert.deepEqual(a.ranges, [{ start: 0, count: 0 }]);
  assert.equal(uploadUsedElements(a, NaN), true);
  assert.equal(a.ranges[0].count, 0);
  assert.equal(uploadUsedElements(null, 16), false);
});

test('a jornada não reenvia a capacidade máxima do capim nem no mesmo quadro do streaming', () => {
  const w = fs.readFileSync(new URL('../jornada-world3d.js', import.meta.url), 'utf8');
  assert.match(w, /uploadUsedElements\(grass\.instanceMatrix, g \* 16\)/);
  assert.match(w, /uploadUsedElements\(flowers\.instanceMatrix, f \* 16\)/);
  assert.match(w, /uploadUsedElements\(grass\.instanceColor, g \* 3\)/);
  assert.match(w, /if \(job\) \{ vegWait = \.12; \}/);
  assert.doesNotMatch(w, /grass\.instanceMatrix\.needsUpdate = flowers\.instanceMatrix\.needsUpdate = true/);
});
