import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Contrato estático intencional: QA auditivo e medição do sinal real seguem pendentes.
const source = readFileSync(new URL('../audio3d.js', import.meta.url), 'utf8');
test('ruídos longos repetem o buffer para não terminar antes do envelope', () => {
  const start = source.indexOf('function burst(');
  const end = source.indexOf('function tone(', start);
  assert.ok(start >= 0 && end > start, 'helper burst deve existir');
  const burst = source.slice(start, end);
  assert.match(burst, /src\.buffer\s*=\s*noiseBuf/);
  assert.match(burst, /src\.loop\s*=\s*true/);
  assert.ok(burst.indexOf('src.loop = true') < burst.indexOf('src.start('), 'loop antes de start');
  assert.match(burst, /src\.stop\(t \+ dur \+ \.05\)/, 'stop mantém duração limitada');
});
test('efeitos longos continuam usando o helper de ruído', () => {
  assert.match(source, /voidCharge\(\)[\s\S]*?burst\('bandpass', 180, 1\.2, \.16, 5\.5/);
  assert.match(source, /novaBlast\(\)[\s\S]*?burst\('lowpass', 900, \.6, \.6, 2\.8/);
});
