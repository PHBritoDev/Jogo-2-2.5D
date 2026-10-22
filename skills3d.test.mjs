import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, MANA, unlockedSkills, newlyUnlocked, canCast, regenMana, manaFromHit, cooldownFraction } from './skills3d.js';

test('começa só com a espada; Skill 1 e 2 chegam antes do Primeiro Bispo', () => {
  assert.equal(unlockedSkills({ questStep: 0 }).size, 0);
  assert.deepEqual([...unlockedSkills({ questStep: 4 })], ['magic']);
  assert.deepEqual([...unlockedSkills({ questStep: 6 })], ['magic', 'magic2']);
  assert.ok(!unlockedSkills({ questStep: 7 }).has('magic3'), 'Sol só depois de Valério');
  assert.ok(!unlockedSkills({ questStep: 7 }).has('ultimate'));
  assert.ok(unlockedSkills({ questStep: 7, bishopsDefeated: 1 }).has('magic3'));
});

test('revelação lista só o que acabou de abrir', () => {
  assert.deepEqual(newlyUnlocked(unlockedSkills({ questStep: 3 }), unlockedSkills({ questStep: 4 })), ['magic']);
  assert.deepEqual(newlyUnlocked(unlockedSkills({ questStep: 4 }), unlockedSkills({ questStep: 4 })), []);
});

test('bloqueio, recarga e mana têm motivos claros', () => {
  const unlocked = unlockedSkills({ questStep: 6 });
  assert.equal(canCast('magic3', { unlocked, mana: 100 }).ok, false);
  assert.match(canCast('magic3', { unlocked, mana: 100 }).reason, /Valério/);
  assert.equal(canCast('magic', { unlocked, mana: 100, cooldownUntil: { magic: 1000 }, now: 0 }).ok, false);
  assert.equal(canCast('magic2', { unlocked, mana: 10 }).ok, false);
  assert.equal(canCast('magic2', { unlocked, mana: SKILLS.magic2.mana }).ok, true);
});

test('custos e recargas crescem com o poder da habilidade', () => {
  const ids = ['magic', 'magic2', 'magic3', 'ultimate'];
  for (let i = 1; i < ids.length; i++) {
    assert.ok(SKILLS[ids[i]].mana > SKILLS[ids[i - 1]].mana);
    assert.ok(SKILLS[ids[i]].cooldown > SKILLS[ids[i - 1]].cooldown);
  }
});

test('mana regenera mais devagar em combate e golpes têm limite por intervalo', () => {
  assert.ok(regenMana(0, 1, true) < regenMana(0, 1, false));
  assert.equal(regenMana(99, 10, false), MANA.max);
  const a = manaFromHit(10, -10000, 0);
  assert.equal(a.mana, 10 + MANA.hitGain);
  const b = manaFromHit(a.mana, a.lastGainAt, 100);
  assert.equal(b.mana, a.mana, 'segundo acerto imediato não rende mana');
  assert.equal(cooldownFraction('magic', { magic: 900 }, 0), 900 / SKILLS.magic.cooldown);
  assert.equal(cooldownFraction('magic', {}, 0), 0);
});
