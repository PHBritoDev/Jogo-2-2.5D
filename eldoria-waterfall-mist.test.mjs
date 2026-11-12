import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./eldoria-waterfall3d.js', import.meta.url), 'utf8');

test('névoa da cachoeira usa interpolação GLSL com bordas ordenadas', () => {
  assert.ok(source.includes('(1.0 - smoothstep(.1, .5, r))'), 'atenuação radial definida no GLSL');
  assert.ok(!source.includes('smoothstep(.5, .1, r)'), 'não permitir limites invertidos');
});
