import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual joystick handlers from the shipped world controller with a DOM pointer-event stub.
function harness() {
  const source = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  const start = source.indexOf('let joyX=0,joyY=0,joyActive=');
  const end = source.indexOf('let actionUntil=0', start);
  assert.ok(start >= 0 && end > start, 'joystick controller is present');
  const handlers = new Map();
  const stick = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    addEventListener: (type, fn) => handlers.set(type, fn),
    setPointerCapture() {}
  };
  const knob = { style: { transform: '' } };
  const context = { document: { getElementById: id => id === 'stick' ? stick : knob }, Math };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end) + '\nglobalThis.readJoy=()=>({x:joyX,y:joyY,active:joyActive});globalThis.resetJoy=()=>endJoy();', context);
  const send = (type, pointerId, x = 50, y = 50) => handlers.get(type)({ pointerId, clientX: x, clientY: y });
  return { send, read: context.readJoy, reset: context.resetJoy, knob };
}

test('secondary finger cannot redirect or release the joystick', () => {
  const h = harness();
  h.send('pointerdown', 11, 82, 50);
  assert.ok(h.read().x > .9);
  h.send('pointerdown', 12, 18, 50);
  h.send('pointermove', 12, 18, 50);
  assert.ok(h.read().x > .9, 'secondary finger did not reverse movement');
  h.send('pointerup', 12);
  assert.equal(h.read().active, true, 'secondary finger did not stop walking');
  h.send('pointermove', 11, 50, 18);
  assert.ok(h.read().y < -.9, 'owner finger can still steer');
  h.send('pointerup', 11);
  assert.deepEqual({ x: h.read().x, y: h.read().y, active: h.read().active }, { x: 0, y: 0, active: false });
});

test('cancel of non-owner is ignored, owner cancel and blur reset movement', () => {
  const h = harness();
  h.send('pointerdown', 4, 82, 50);
  h.send('pointercancel', 5);
  assert.equal(h.read().active, true);
  h.send('pointercancel', 4);
  assert.equal(h.read().active, false);
  h.send('pointerdown', 6, 82, 50);
  h.reset();
  assert.deepEqual({ x: h.read().x, active: h.read().active }, { x: 0, active: false });
  h.send('pointerdown', 7, 18, 50);
  assert.ok(h.read().x < -.9, 'new finger owns joystick after reset');
});

test('losing capture of the owning finger stops movement without a pointerup', () => {
  const h = harness();
  h.send('pointerdown', 21, 82, 50);
  h.send('lostpointercapture', 22);
  assert.equal(h.read().active, true, 'capture loss for unrelated finger is ignored');
  h.send('lostpointercapture', 21);
  assert.deepEqual({ x: h.read().x, y: h.read().y, active: h.read().active }, { x: 0, y: 0, active: false });
  h.send('pointerdown', 23, 18, 50);
  assert.ok(h.read().x < -.9, 'a new finger can take control after capture is lost');
});
