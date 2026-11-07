import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const shader = readFileSync(new URL('./eldoria-water.js', import.meta.url), 'utf8');
test('lago reduz espuma de margem sem alterar o comportamento do rio', () => {
  assert.match(shader, /if \(uRadial > \.5\) foam \*= \.06;/);
  assert.match(shader, /uRadial > \.5 \? vWorld\.xz \* \.32/);
  assert.match(shader, /foam = max\(foam, ring \* r\.w\)/);
});
