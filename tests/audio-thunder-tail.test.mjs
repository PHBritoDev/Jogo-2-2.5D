import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audio = readFileSync(new URL('../audio3d.js', import.meta.url), 'utf8');
test('thunder keeps the 2s shared noise buffer active for the entire 3s tail', () => {
  const start = audio.indexOf('    thunder() {');
  const end = audio.indexOf('    /** MOD 203', start);
  assert.ok(start >= 0 && end > start, 'thunder implementation exists');
  const code = audio.slice(start, end);
  assert.match(code, /src\.buffer\s*=\s*noiseBuf/);
  assert.match(code, /src\.loop\s*=\s*true/);
  assert.ok(code.indexOf('src.loop = true') < code.indexOf('src.start(t)'), 'loop enabled before start');
  assert.match(code, /src\.stop\(t \+ 3\.1\)/);
  assert.match(code, /g\.gain\.exponentialRampToValueAtTime\(0\.0001, t \+ 3\)/);
});
