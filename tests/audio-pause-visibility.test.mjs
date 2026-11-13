import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../audio3d.js', import.meta.url), 'utf8');
test('pausa do jogo prevalece sobre retorno à aba e desbloqueio', () => {
  const pauseBody = source.match(/pause\(on\) \{([^}]*)\}/)?.[1];
  const visibilityBody = source.match(/document\.addEventListener\('visibilitychange', \(\) => \{([^}]*)\}\)/)?.[1];
  assert.ok(pauseBody && visibilityBody);
  assert.match(source, /if \(ready\) \{ if \(!pausedByGame && !document\.hidden/);
  const events = [];
  const sandbox = { ctx: { suspend: () => events.push('suspend'), resume: () => events.push('resume') }, document: { hidden: false } };
  vm.createContext(sandbox);
  vm.runInContext(`let pausedByGame = false; function pause(on) {${pauseBody}} function visibility() {${visibilityBody}}`, sandbox);
  vm.runInContext('pause(true)', sandbox);
  sandbox.document.hidden = true;
  vm.runInContext('visibility()', sandbox);
  sandbox.document.hidden = false;
  vm.runInContext('visibility()', sandbox);
  assert.deepEqual(events, ['suspend', 'suspend'], 'voltar à aba não pode cancelar pausa do jogo');
  vm.runInContext('pause(false)', sandbox);
  assert.equal(events.at(-1), 'resume');
  sandbox.document.hidden = true;
  vm.runInContext('pause(false)', sandbox);
  assert.equal(events.at(-1), 'suspend', 'pausa liberada não retoma áudio em aba oculta');
});
