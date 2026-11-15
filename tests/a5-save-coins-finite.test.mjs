import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT1, migrateProgress, afterVhazraelVictory } from '../act1-flow.js';

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

test('A5: final boss checkpoint is finite and reward is once-only even after corrupt counter', () => {
  for (const bishopsDefeated of [Infinity, -Infinity, NaN, 'Infinity', 'NaN', -12]) {
    const progress = migrateProgress({ version: ACT1.version, act1Rev: ACT1.rev,
      questStep: 7, bishopsDefeated, coins: 23 });
    const victory = afterVhazraelVictory(progress);
    assert.equal(victory.questStep, 8);
    assert.equal(victory.bishopsDefeated, 1);
    assert.equal(victory.coinsGained, ACT1.vhazraelReward);
    const saved = migrateProgress({ ...progress, ...victory,
      coins: progress.coins + victory.coinsGained });
    const reload = migrateProgress(saved);
    assert.equal(reload.bishopsDefeated, 1);
    assert.equal(reload.questStep, 8);
    assert.equal(reload.coins, 23 + ACT1.vhazraelReward);
    assert.equal(afterVhazraelVictory(reload).coinsGained, 0);
    assert.deepEqual(migrateProgress(reload), reload);
  }
});

test('A5: already claimed boss and portal rewards stay claimed through reload', () => {
  const progress = migrateProgress({ version: ACT1.version, act1Rev: ACT1.rev,
    questStep: 8, bishopsDefeated: 2, coins: 80, portalRewardClaimed: true,
    vhazraelRewardClaimed: true, wardenDefeated: true, portalOpened: true });
  const repeat = afterVhazraelVictory(progress);
  assert.equal(repeat.coinsGained, 0);
  assert.equal(repeat.bishopsDefeated, 2);
  const reloaded = migrateProgress({ ...progress, ...repeat });
  assert.equal(reloaded.portalRewardClaimed, true);
  assert.equal(reloaded.wardenDefeated, true);
  assert.equal(reloaded.portalOpened, true);
  assert.equal(reloaded.coins, 80);
  assert.equal(afterVhazraelVictory(reloaded).coinsGained, 0);
});
