import test from 'node:test';
import assert from 'node:assert/strict';
import { bindMovementKeys } from '../desktop-movement.js';

function harness() {
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.pointerLockElement = null;
  doc.fullscreenElement = null;
  doc.hidden = false;
  const state = bindMovementKeys(win, doc);
  const key = (type, code) => {
    const event = new Event(type);
    Object.defineProperties(event, {
      code: { value: code },
      isComposing: { value: false },
      ctrlKey: { value: false },
      metaKey: { value: false },
      altKey: { value: false },
      repeat: { value: false },
      target: { value: null }
    });
    win.dispatchEvent(event);
  };
  const lock = target => {
    doc.pointerLockElement = target;
    doc.dispatchEvent(new Event('pointerlockchange'));
  };
  return { state, key, lock, doc };
}

test('A1: trocar diretamente o alvo do pointer lock libera WASD antigo', () => {
  const h = harness(), canvasA = {}, canvasB = {};
  h.lock(canvasA);
  h.key('keydown', 'KeyW');
  h.key('keydown', 'KeyD');
  assert.equal(h.state.w, true);
  assert.equal(h.state.d, true);
  h.lock(canvasB);
  assert.equal(h.state.w, false, 'W antigo não pode andar no novo canvas');
  assert.equal(h.state.d, false, 'D antigo não pode andar no novo canvas');
  h.key('keydown', 'KeyW');
  assert.equal(h.state.w, true, 'novo pressionamento deve responder imediatamente');
  h.lock(canvasB);
  assert.equal(h.state.w, true, 'notificação repetida do mesmo alvo não apaga tecla nova');
  h.lock(null);
  assert.equal(h.state.w, false, 'sair do pointer lock também libera movimento');
});

test('A1: duas teclas Shift mantêm sprint até ambas serem soltas', () => {
  const h = harness();
  h.key('keydown', 'ShiftLeft');
  h.key('keydown', 'ShiftRight');
  h.key('keyup', 'ShiftLeft');
  assert.equal(h.state.shift, true);
  h.key('keyup', 'ShiftRight');
  assert.equal(h.state.shift, false);
});

test('A1: nova captura de pointer lock limpa tecla iniciada sem captura', () => {
  const h = harness();
  h.key('keydown', 'KeyS');
  assert.equal(h.state.s, true);
  h.lock({});
  assert.equal(h.state.s, false);
});


test('A1: keydown duplicado não transfere uma tecla antiga para o novo contexto', () => {
  const h = harness(), canvasA = {}, canvasB = {};
  h.lock(canvasA);
  h.key('keydown', 'KeyW');
  // Browser may deliver a duplicate keydown before the pointerlockchange event.
  h.doc.pointerLockElement = canvasB;
  h.key('keydown', 'KeyW');
  h.doc.dispatchEvent(new Event('pointerlockchange'));
  assert.equal(h.state.w, false, 'a tecla do canvas antigo deve ser liberada');
});
