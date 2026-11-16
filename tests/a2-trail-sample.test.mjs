import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Load the production module without its WebGL-only shader dependency.
const source = await readFile(new URL('../vfx-trail3d.js', import.meta.url), 'utf8');
const moduleSource = source.replace(/^import .*?;\\s*$/m, '');
const { trailSampleValid, volumeTrail } = await import('data:text/javascript,' + encodeURIComponent(moduleSource));

test('trail sample rejects non-finite time and coordinates', () => {
  assert.equal(trailSampleValid(1, { x: 1, y: 2, z: 3 }), true);
  for (const point of [null, undefined, 2, {x: NaN,y: 1,z: 1}, {x: 1,y: Infinity,z: 1}, {x: 1,y: 1,z: undefined}]) {
    assert.equal(trailSampleValid(1, point), false);
  }
  assert.equal(trailSampleValid(Infinity, {x: 1,y: 2,z: 3}), false);
});

test('trail runtime gates buffer writes and clears invalid time', () => {
  // Keep regression tied to the actual update path, not just the exported predicate.
  assert.match(volumeTrail.toString(), /emitting&&time!==last&&trailSampleValid\\(time,point\\)/);
  assert.match(volumeTrail.toString(), /!Number\\.isFinite\\(time\\)/);
});
