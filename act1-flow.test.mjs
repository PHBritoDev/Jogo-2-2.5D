import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACT1,
  sanitizePlayerName,
  migrateProgress,
  questPresentation,
  combatStep,
  afterEnemyDefeated,
  afterMountainDefeat,
  afterWardenDefeat,
  valerioHandoffPlan,
  informantLines,
  guideAfterNameLines,
  portalLines
} from './act1-flow.js';

test('aceita nomes próprios e recusa lixo', () => {
  assert.equal(sanitizePlayerName('  João  ').name, 'João');
  assert.equal(sanitizePlayerName("D'Ávila").ok, true);
  assert.equal(sanitizePlayerName('Ana-Maria').ok, true);
  assert.equal(sanitizePlayerName('A').ok, false);
  assert.equal(sanitizePlayerName('Nome Com Número 1').ok, false);
  assert.equal(sanitizePlayerName('porra').ok, false);
});

test('progresso anterior à V5 conserva ouro e recomeça o Ato I', () => {
  const next = migrateProgress({ version: 4, questStep: 4, coins: 17, journeyEnemyIndex: 3 });
  assert.equal(next.version, ACT1.version);
  assert.equal(next.questStep, 0);
  assert.equal(next.coins, 17);
  assert.equal(next.journeyEnemyIndex, 0);
  assert.equal(next.mountainIndex, 0);
});

test('progresso V5 no meio do resgate não volta ao início', () => {
  const next = migrateProgress({
    version: 5,
    questStep: 3,
    coins: 3,
    journeyEnemyIndex: 3,
    playerName: 'Lia',
    captorsTaunted: true,
    childrenFreed: false,
    awakeningSeen: true,
    actCardSeen: true
  });
  assert.equal(next.version, 6);
  assert.equal(next.questStep, 3);
  assert.equal(next.playerName, 'Lia');
  assert.equal(next.captorsTaunted, true);
  assert.equal(next.childrenFreed, false);
  assert.equal(next.portalRewardClaimed, false);
});

test('o fim antigo do portal fechado vira a subida, sem pagar o portal de novo', () => {
  const next = migrateProgress({ version: 5, questStep: 5, coins: 40, playerName: 'Elias' });
  assert.equal(next.questStep, 4);
  assert.equal(next.coins, 40);
  assert.equal(next.portalRewardClaimed, true);
  assert.equal(next.wardenDefeated, false);
});

test('progresso da subida é preservado', () => {
  const next = migrateProgress({
    version: 6,
    questStep: 5,
    coins: 22,
    mountainIndex: 2,
    playerName: 'Lia',
    wardenTaunted: true,
    childrenFreed: true,
    awakeningSeen: true,
    actCardSeen: true
  });
  assert.equal(next.questStep, 5);
  assert.equal(next.mountainIndex, 2);
  assert.equal(next.wardenTaunted, true);
});

test('cada etapa tem objetivo e a luta só existe nos passos certos', () => {
  for (const step of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const page = questPresentation(step);
    assert.ok(page.title.length > 8);
    assert.ok(page.objective.length > 8);
  }
  assert.equal(combatStep(2), true);
  assert.equal(combatStep(3), false);
  assert.equal(combatStep(4), true);
  assert.equal(combatStep(5), true);
  assert.equal(combatStep(6), false);
  assert.match(questPresentation(4).objective, /uma de cada vez/);
  assert.match(questPresentation(6).objective, /não substituída/);
});

test('três captores levam à chave, não ao portal', () => {
  assert.equal(afterEnemyDefeated(0).questStep, 2);
  assert.equal(afterEnemyDefeated(1).journeyEnemyIndex, 2);
  const done = afterEnemyDefeated(2);
  assert.equal(done.questStep, 3);
  assert.match(done.status, /gaiolas/);
});

test('sentinelas espaçadas levam ao guarda, e o guarda abre o portal existente', () => {
  assert.equal(afterMountainDefeat(0).questStep, 4);
  assert.equal(afterMountainDefeat(0).mountainIndex, 1);
  const climbed = afterMountainDefeat(1);
  assert.equal(climbed.questStep, 5);
  const warden = afterWardenDefeat();
  assert.equal(warden.questStep, 6);
  assert.equal(warden.wardenDefeated, true);
  const plan = valerioHandoffPlan();
  assert.equal(plan.replaceDimension, false);
  assert.equal(plan.mode, 'existing-dimension');
  assert.match(plan.entry, /valerioTest=1/);
});

test('falas citam Valério e não trocam a dimensão por outra arena', () => {
  const paid = informantLines('Elias').map((line) => line.text).join(' ');
  assert.match(paid, /Valério/);
  assert.match(paid, /Elias/);
  const guide = guideAfterNameLines('Elias').map((line) => line.text).join(' ');
  assert.match(guide, /Valério/);
  assert.match(guide, /ainda não o enfrentes/i);
  const entry = portalLines('Elias').map((line) => line.text).join(' ');
  assert.match(entry, /já está de pé/);
  assert.doesNotMatch(entry, /permanece fechado/);
});
