import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./eldoria-water.js', import.meta.url), 'utf8');

test('shader de agua nao usa smoothstep com bordas numericas invertidas', () => {
  const calls = [...source.matchAll(/smoothstep\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,/g)];
  assert.ok(calls.length >= 5, 'espera chamadas de smoothstep no shader');
  for (const [, low, high] of calls) {
    assert.ok(Number(low) < Number(high), `smoothstep com bordas invertidas: ${low}, ${high}`);
  }
});

test('efeitos de distancia e espuma preservam a direcao fisica pretendida', () => {
  assert.match(source, /1\.0 - smoothstep\(15\.0, 80\.0, length\(cameraPosition - vWorld\)\)/);
  assert.match(source, /1\.0 - smoothstep\(18\.0, 70\.0, camDist\)/);
  assert.match(source, /1\.0 - smoothstep\(0\.0, \.9, d\)/);
});
