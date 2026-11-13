import test from 'node:test';
import assert from 'node:assert/strict';
import { SwordRites } from '../sword-rites3d.js';

// Characterization, not a proposed gameplay fix: large stalls are deliberately capped.
test('a 500ms stall advances the combat clock by at most 250ms', () => {
  const rites = new SwordRites();
  rites.cooldowns.prota = 2;
  rites.update(0.5);
  assert.ok(Math.abs(rites.time - 0.25) < 1e-8);
  assert.ok(Math.abs(rites.cooldowns.prota - 1.75) < 1e-8);
});

test('equivalent 120Hz frames advance 500ms of combat time', () => {
  const rites = new SwordRites();
  rites.cooldowns.prota = 2;
  for (let i = 0; i < 60; i++) rites.update(1 / 120);
  assert.ok(Math.abs(rites.time - 0.5) < 1e-8);
  assert.ok(Math.abs(rites.cooldowns.prota - 1.5) < 1e-8);
});

test('paused frames do not advance combat clock or cooldowns', () => {
  const rites = new SwordRites();
  rites.cooldowns.prota = 2;
  rites.update(0.5, { paused: true });
  assert.equal(rites.time, 0);
  assert.equal(rites.cooldowns.prota, 2);
});
