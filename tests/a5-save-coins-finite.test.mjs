import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT1, migrateProgress } from '../act1-flow.js';

test('A5: restore V6 checkpoints without duplicating narrative rewards', () => {
  const saved = { version: ACT1.version, act1Rev: ACT1.rev, questStep: 6,
    act1Sub: 0, coins: 23, playerName: 'Viajante',
    portalOpened: true, portalRewardClaimed: true, wardenDefeated: true };
  const restored = migrateProgress(saved);
  const reloaded = migrateProgress(restored);
  assert.equal(restored.questStep, 6);
  assert.equal(restored.portalRewardClaimed, true);
  assert.equal(restored.wardenDefeated, true);
  assert.deepEqual(reloaded, restored);
});

test('A5: corrupt non-finite coin balances cannot survive load/reload', () => {
  for (const coins of [Infinity, -Infinity, 'Infinity', '-Infinity', 'NaN', NaN]) {
    const restored = migrateProgress({ version: ACT1.version, coins, questStep: 3, act1Sub: 1 });
    assert.equal(restored.coins, 0);
    assert.equal(restored.questStep, 3);
    assert.equal(restored.act1Sub, 1);
    assert.equal(migrateProgress(restored).coins, 0);
  }
});

test('A5: valid and legacy coin balances retain their value', () => {
  for (const version of [5, ACT1.version]) {
    assert.equal(migrateProgress({ version, coins: 18.9 }).coins, 18);
    assert.equal(migrateProgress({ version, coins: -5 }).coins, 0);
  }
});
