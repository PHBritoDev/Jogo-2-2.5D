import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACT1,
  sanitizePlayerName,
  migrateProgress,
  questPresentation,
  afterEnemyDefeated,
  informantLines,
  guideAfterNameLines
} from './act1-flow.js';

test('aceita nomes próprios e recusa lixo', () => {
  assert.equal(sanitizePlayerName('  João  ').name, 'João');
  assert.equal(sanitizePlayerName("D'Ávila").ok, true);
  assert.equal(sanitizePlayerName('Ana-Maria').ok, true);
  assert.equal(sanitizePlayerName('A').ok, false);
  assert.equal(sanitizePlayerName('Nome Com Número 1').ok, false);
  assert.equal(sanitizePlayerName('porra').ok, false);
});

test('progresso antigo conserva ouro e recomeça o Ato I', () => {
  const next = migrateProgress({ version: 4, questStep: 4, coins: 17, journeyEnemyIndex: 3 });
  assert.equal(next.version, ACT1.version);
  assert.equal(next.questStep, 0);
  assert.equal(next.coins, 17);
  assert.equal(next.journeyEnemyIndex, 0);
});

test('progresso novo preserva o resgate no meio do caminho', () => {
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
  assert.equal(next.questStep, 3);
  assert.equal(next.playerName, 'Lia');
  assert.equal(next.captorsTaunted, true);
  assert.equal(next.childrenFreed, false);
});

test('cada etapa do Ato I tem objetivo e a vitória final não abre a dimensão', () => {
  for (const step of [0, 1, 2, 3, 4, 5]) {
    const page = questPresentation(step);
    assert.ok(page.title.length > 8);
    assert.ok(page.objective.length > 8);
  }
  assert.match(questPresentation(5).objective, /dimensão de Valério permanece intacta/);
  assert.match(questPresentation(4).objective, /Ainda não entre/);
});

test('três captores levam à chave, não ao portal', () => {
  assert.equal(afterEnemyDefeated(0).questStep, 2);
  assert.equal(afterEnemyDefeated(1).journeyEnemyIndex, 2);
  const done = afterEnemyDefeated(2);
  assert.equal(done.questStep, 3);
  assert.match(done.status, /gaiolas/);
});

test('falas citam Valério e o nome escolhido, sem abrir o portal', () => {
  const paid = informantLines('Elias').map((line) => line.text).join(' ');
  assert.match(paid, /Valério/);
  assert.match(paid, /Elias/);
  const guide = guideAfterNameLines('Elias').map((line) => line.text).join(' ');
  assert.match(guide, /Valério/);
  assert.match(guide, /ainda não o enfrentes/i);
});
