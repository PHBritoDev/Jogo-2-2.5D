import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DIMENSIONS } from './dimensions3d.js';

// MOD 219 — o limite de movimento (±1900) prendia o herói nas áreas internas além de x = -1900 (caverna de gelo em
// -2000, dimensão distorcida em -2400, torre em -2800): só dava para andar em linha reta no eixo Z.
test('MOD 219: o limite de movimento cobre todas as áreas internas e dimensões', () => {
  const src = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  const bounds = [...src.matchAll(/MathUtils\.clamp\([^;]*?,-(\d+),(\d+)\)/g)].map(m => +m[2]);
  assert.ok(bounds.length >= 6);
  const far = Math.max(...Object.values(DIMENSIONS).map(d => Math.abs(d.center.x) + d.radius));
  for (const b of bounds) assert.ok(b > far, 'limite ' + b + ' menor que ' + far);
});
