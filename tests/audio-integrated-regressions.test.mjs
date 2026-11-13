import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audio = readFileSync(new URL('../audio3d.js', import.meta.url), 'utf8');
function bodyBetween(start, end) {
  const i = audio.indexOf(start);
  const j = audio.indexOf(end, i + start.length);
  assert.ok(i >= 0 && j > i, `não foi possível isolar ${start}`);
  return audio.slice(i, j);
}
test('A-001: ruído de impacto não termina antes da cauda solicitada', () => {
  const b = bodyBetween('function burst(', 'function tone(');
  assert.match(b, /src\.buffer\s*=\s*noiseBuf/);
  assert.match(b, /src\.loop\s*=\s*true/);
  assert.ok(b.indexOf('src.loop = true') < b.indexOf('src.start('));
  assert.match(b, /src\.stop\(t \+ dur \+ \.05\)/);
});
test('A-005: trovão de três segundos não esgota buffer de dois segundos', () => {
  const b = bodyBetween('thunder() {', '/** MOD 203');
  assert.match(b, /src\.loop\s*=\s*true/);
  assert.ok(b.indexOf('src.loop = true') < b.indexOf('src.start('));
  assert.match(b, /src\.stop\(t \+ 3\.1\)/);
});
test('A-002: pausa solicitada pelo jogo sobrevive a unlock e troca de aba', () => {
  assert.match(audio, /let pausedByGame\s*=\s*false/);
  const unlock = bodyBetween('function unlock()', '/* MOD 194');
  assert.match(unlock, /!pausedByGame\s*&&\s*!document\.hidden/);
  assert.match(unlock, /visibilitychange[\s\S]*?pausedByGame/);
  const pause = bodyBetween('pause(on)', 'portalEnter()');
  assert.match(pause, /pausedByGame\s*=\s*!!on/);
  assert.match(pause, /pausedByGame\s*\|\|\s*document\.hidden/);
});
test('A-003: modo silent não cria pads a cada ciclo', () => {
  const tick = bodyBetween('tick(dt, night)', 'function env(');
  assert.match(tick, /mode\s*===\s*'silent'/);
  assert.ok(tick.indexOf("mode === 'silent'") < tick.indexOf('pad(night'));
});
