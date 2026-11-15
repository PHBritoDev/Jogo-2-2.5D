import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT1, migrateProgress, afterVhazraelVictory, afterEnemyDefeated, nextAct1Sub, questPresentation } from '../act1-flow.js';

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

test('A5: quest objective after portal crossing points to the actual boss', () => {
  assert.match(questPresentation(6).objective, /Entre no portal/);
  assert.match(questPresentation(7).objective, /Encontre VHAZRAEL/);
  assert.match(questPresentation(7).objective, /derrote o Primeiro Bispo/);
  assert.doesNotMatch(questPresentation(7).objective, /Atravesse o portal/);
});

test('A5: corrupt XP, time, combat stats and narrative checkpoint counters cannot survive reload', () => {
  const raw = { version: ACT1.version, act1Rev: ACT1.rev, questStep: 7,
    coins: 18, xp: Infinity, playSeconds: 'Infinity',
    stats: { kills: Infinity, rescues: 'NaN', bishops: -Infinity },
    lateFoundStep: Infinity, lateFightIndex: Infinity, gauntletIndex: Infinity };
  const restored = migrateProgress(raw);
  assert.equal(restored.questStep, 7);
  assert.equal(restored.coins, 18);
  for (const value of [restored.xp, restored.playSeconds, restored.stats.kills,
    restored.stats.rescues, restored.stats.bishops, restored.lateFoundStep,
    restored.lateFightIndex, restored.gauntletIndex]) {
    assert.ok(Number.isFinite(value));
    assert.equal(value, 0);
  }
  assert.deepEqual(migrateProgress(restored), restored);
});

test('A5: legitimate XP and checkpoint progress survive save reload', () => {
  const raw = { version: ACT1.version, act1Rev: ACT1.rev, questStep: 7,
    xp: 245.9, playSeconds: 420.8, stats: { kills: 11, rescues: 2 },
    lateFoundStep: 4, lateFightIndex: 3, gauntletIndex: 2 };
  const restored = migrateProgress(raw);
  assert.equal(restored.xp, 245);
  assert.equal(restored.playSeconds, 420);
  assert.equal(restored.stats.kills, 11);
  assert.equal(restored.stats.rescues, 2);
  assert.equal(restored.lateFoundStep, 4);
  assert.equal(restored.lateFightIndex, 3);
  assert.equal(restored.gauntletIndex, 2);
  assert.deepEqual(migrateProgress(restored), restored);
});

test('A5: follower encounters advance once and never exceed the three-enemy checkpoint', () => {
  const expected = [1, 2, 3];
  for (let i = 0; i < expected.length; i++) {
    const result = afterEnemyDefeated(i);
    assert.equal(result.journeyEnemyIndex, expected[i]);
    assert.equal(result.questStep, i === 2 ? 3 : 2);
    const saved = migrateProgress({ version: ACT1.version, act1Rev: ACT1.rev,
      questStep: result.questStep, journeyEnemyIndex: result.journeyEnemyIndex });
    assert.equal(migrateProgress(saved).journeyEnemyIndex, expected[i]);
  }
  for (const bad of [Infinity, -Infinity, NaN, 'Infinity', -9, 9999]) {
    const result = afterEnemyDefeated(bad);
    assert.ok(Number.isFinite(result.journeyEnemyIndex));
    assert.ok(result.journeyEnemyIndex >= 1 && result.journeyEnemyIndex <= ACT1.enemyTotal);
    assert.equal(migrateProgress({ version: ACT1.version, act1Rev: ACT1.rev,
      ...result }).journeyEnemyIndex, result.journeyEnemyIndex);
  }
  assert.equal(afterEnemyDefeated(ACT1.enemyTotal).journeyEnemyIndex, ACT1.enemyTotal);
});

test('A5: corrupted sewer objective substeps never crash HUD rendering', () => {
  for (const bad of [-Infinity, Infinity, NaN, -1, 'NaN', 'Infinity', null, undefined]) {
    const objective = questPresentation(4, bad);
    assert.equal(typeof objective.title, 'string');
    assert.equal(typeof objective.objective, 'string');
    assert.ok(objective.objective.length > 0);
  }
  assert.match(questPresentation(4, 0).objective, /trilha/);
  assert.match(questPresentation(4, 3).objective, /buraco/);
});

test('A5: invalid Act I substep cannot poison checkpoint transitions', () => {
  for (const step of [1, 3, 4]) {
    for (const bad of [Infinity, -Infinity, NaN, 'NaN', -9]) {
      const transition = nextAct1Sub(step, bad);
      assert.equal(transition.questStep, step);
      assert.equal(transition.act1Sub, 1);
      const saved = migrateProgress({ version: ACT1.version, act1Rev: ACT1.rev,
        ...transition, coins: 14, portalRewardClaimed: true });
      const reloaded = migrateProgress(saved);
      assert.equal(reloaded.act1Sub, 1);
      assert.equal(reloaded.coins, 14);
      assert.equal(reloaded.portalRewardClaimed, true);
    }
  }
  assert.deepEqual(nextAct1Sub(4, 3), { questStep: 5, act1Sub: 0 });
  assert.deepEqual(nextAct1Sub(3, 1.9), { questStep: 3, act1Sub: 2 });
});
