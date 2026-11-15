import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT1, migrateProgress, afterVhazraelVictory } from '../act1-flow.js';

test('A5: extreme finite coins are bounded on restore and remain stable after reload', () => {
  for (const value of [1e100, Number.MAX_VALUE, '1e100']) {
    const restored = migrateProgress({ version: ACT1.version, act1Rev: ACT1.rev,
      questStep: 9, coins: value, vhazraelRewardClaimed: false });
    assert.equal(restored.coins, Number.MAX_SAFE_INTEGER);
    assert.equal(afterVhazraelVictory(restored).coinsGained, 0);
    assert.deepEqual(migrateProgress(restored), restored);
  }
});

test('A5: normal coins and first victory reward are unchanged', () => {
  const restored = migrateProgress({ version: ACT1.version, act1Rev: ACT1.rev,
    questStep: 7, coins: 125.8 });
  assert.equal(restored.coins, 125);
  assert.equal(afterVhazraelVictory(restored).coinsGained, ACT1.vhazraelReward);
  assert.equal(migrateProgress({ ...restored, coins: -100 }).coins, 0);
});
