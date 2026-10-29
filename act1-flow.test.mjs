import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from './act1-flow.js';

const { ACT1, sanitizePlayerName, migrateProgress, questPresentation, combatStep, afterEnemyDefeated, afterWardenDefeat, valerioHandoffPlan, nextAct1Sub, personalizeLine, SPEAKERS } = A;
const SCENES = ['villageArrivalScene', 'vendorRefusalScene', 'vendorScene', 'forestFirstScene', 'forestSecondScene', 'keyFoundScene', 'cageScene', 'faintScene', 'massacreScene', 'clueScene', 'feedingScene', 'holeScene', 'wardenIntroScene', 'wardenDefeatScene', 'valerioIntroScene', 'valerioDefeatScene', 'afterValerioScene'];
const all = () => SCENES.flatMap(n => A[n]());
const text = () => all().filter(s => s.type === 'say').map(s => s.text).join(' \n ');

test('aceita nomes próprios e recusa lixo', () => {
  assert.equal(sanitizePlayerName('  João  ').name, 'João');
  assert.equal(sanitizePlayerName("D'Ávila").ok, true);
  assert.equal(sanitizePlayerName('Ana-Maria').ok, true);
  assert.equal(sanitizePlayerName('A').ok, false);
  assert.equal(sanitizePlayerName('Al').ok, false);
  assert.equal(sanitizePlayerName('NomeMuitoLongo').ok, false);
  assert.equal(sanitizePlayerName('Ana\nMaria').ok, true);
  assert.equal(sanitizePlayerName('Nome Com Número 1').ok, false);
  assert.equal(sanitizePlayerName('porra').ok, false);
});

test('progresso anterior à V5 conserva ouro e recomeça o Ato I', () => {
  const next = migrateProgress({ version: 4, questStep: 4, coins: 17, journeyEnemyIndex: 3 });
  assert.equal(next.version, ACT1.version);
  assert.equal(next.questStep, 0);
  assert.equal(next.coins, 17);
});

test('save do Ato I antigo no meio do ato recomeça a etapa no formato novo, sem perder ouro e nome', () => {
  const next = migrateProgress({ version: 6, questStep: 3, coins: 22, journeyEnemyIndex: 3, childrenFreed: true, playerName: 'Lia', wardenTaunted: true });
  assert.equal(next.questStep, 3);
  assert.equal(next.act1Sub, 0);
  assert.equal(next.childrenFreed, false);
  assert.equal(next.wardenTaunted, false);
  assert.equal(next.coins, 22);
  assert.equal(next.playerName, 'Lia');
  // Save já no formato novo é mantido como está.
  const kept = migrateProgress({ version: 6, act1Rev: ACT1.rev, questStep: 4, act1Sub: 2, coins: 3 });
  assert.equal(kept.act1Sub, 2);
  // Depois de VHAZRAEL nada muda.
  const done = migrateProgress({ version: 6, questStep: 12, coins: 9, bishopsDefeated: 1, valerioRewardClaimed: true });
  assert.equal(done.questStep, 12);
  assert.equal(done.valerioRewardClaimed, true);
});

test('cada etapa e sub-etapa tem objetivo; há luta nas etapas 2 a 5', () => {
  for (const [step, sub] of [[0, 0], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [4, 2], [4, 3], [5, 0], [6, 0], [7, 0], [8, 0]]) {
    const page = questPresentation(step, sub);
    assert.ok(page.title.length > 8 && page.objective.length > 8, step + '/' + sub);
  }
  assert.match(questPresentation(1, 0).objective, /vila/);
  assert.match(questPresentation(2).objective, /floresta/);
  assert.match(questPresentation(4, 2).objective, /esgoto/);
  for (const s of [2, 3, 4, 5]) assert.equal(combatStep(s), true);
  for (const s of [0, 1, 6, 7, 8]) assert.equal(combatStep(s), false);
});

test('floresta: 1 Seguidor, depois mais 2 (3 no total), e a chave', () => {
  assert.equal(afterEnemyDefeated(0).questStep, 2);
  assert.equal(afterEnemyDefeated(1).journeyEnemyIndex, 2);
  const done = afterEnemyDefeated(2);
  assert.equal(done.questStep, 3);
  assert.match(done.status, /chave/);
  assert.equal(ACT1.enemyTotal, 3);
});

test('contagem de inimigos do roteiro é preservada', () => {
  assert.equal(ACT1.childEnemies, 2);
  assert.equal(ACT1.massacreEnemies, 3);
  assert.equal(ACT1.feedingEnemies, 5);
  assert.ok(ACT1.cellEnemies >= 10);
  assert.ok(ACT1.pathEnemies > 10);
});

test('sub-etapas avançam na ordem e fecham a etapa', () => {
  assert.deepEqual(nextAct1Sub(1, 0), { questStep: 1, act1Sub: 1 });
  assert.deepEqual(nextAct1Sub(1, 1), { questStep: 2, act1Sub: 0 });
  assert.deepEqual(nextAct1Sub(4, 2), { questStep: 4, act1Sub: 3 });
  assert.deepEqual(nextAct1Sub(4, 3), { questStep: 5, act1Sub: 0 });
  assert.deepEqual(nextAct1Sub(3, 2), { questStep: 4, act1Sub: 0 });
  assert.equal(afterWardenDefeat().questStep, 6);
  assert.equal(valerioHandoffPlan().replaceDimension, false);
});

test('falas essenciais do roteiro estão presentes', () => {
  const t = text();
  for (const re of [/Se não vai comprar nada, vaza/, /Ele se considera um deus/, /controla todo o dinheiro do mundo/, /choro de crianças/, /vendidas pelos próprios pais/, /Ele se chama VHAZRAEL/,
    /se tem amor à vida, jamais se envolva com eles/i, /chegou mais um sacrifício/, /A paz deste mundo acabou/, /destruir o Pecado da Ganância/, /nem contra VHAZRAEL/,
    /Achei a chave/, /Vocês estão bem\?/, /como receptáculo/, /meio tonto/, /já é de manhã/, /esgotos/, /eu mesmo te mato/, /Já estou indo/,
    /se recusaram a nos dar todo o dinheiro/, /A existência de vocês acaba aqui/, /nossa sobremesa/, /Não seja imprudente/, /Nunca mais seja imprudente/,
    /arcanjos mais fortes de Deus/, /Você não dará mais nenhum passo/, /seguindo ordens/, /dimensão isolada/, /Demônios não merecem misericórdia/,
    /primeiro passo para salvar este mundo/, /matar uma divindade/, /só vi uma: no Céu/, /um dos quatro Bispos da Ganância/, /realmente um humano/,
    /voltou vivo/, /todo o esgoto sumiu/, /longa jornada/])
    assert.match(t, re);
  assert.doesNotMatch(JSON.stringify(all()), /Paulo/);
});

test('o nome digitado entra nas falas (inclusive o chamado em maiúsculas)', () => {
  const call = A.faintScene().find(s => s.type === 'say' && /\{nome\}/.test(s.text));
  const line = personalizeLine(call, 'Davi');
  assert.equal(line.text, 'Davi… Davi! DAVI!');
  const hero = personalizeLine(A.vendorScene().find(s => s.who === SPEAKERS.hero), 'Davi');
  assert.equal(hero.who, 'Davi');
});

test('cenas têm a ordem do roteiro', () => {
  const ids = s => s.flatMap(x => [x.id, ...(x.with || []).map(w => w.id)]).filter(Boolean);
  const v = ids(A.vendorScene());
  assert.ok(v.indexOf('entregar-ouro') > -1 && v.indexOf('entregar-ouro') < v.indexOf('anoitecer'));
  const h = ids(A.holeScene());
  for (const [a, b] of [['pular', 'piscar'], ['piscar', 'acordar-cercado'], ['acordar-cercado', 'desmaiar-de-novo'], ['desmaiar-de-novo', 'acordar-na-jaula'], ['anjo-abre-jaula', 'horda-chega']])
    assert.ok(h.indexOf(a) < h.indexOf(b), a + ' antes de ' + b);
  const f = ids(A.faintScene());
  assert.ok(f.indexOf('desmaiar') < f.indexOf('amanhecer') && f.indexOf('amanhecer') < f.indexOf('levantar'));
});

test('vitória sobre VHAZRAEL fecha o Ato I uma vez só', () => {
  const first = A.afterValerioVictory({ valerioRewardClaimed: false });
  assert.equal(first.questStep, 8);
  assert.equal(first.bishopsDefeated, 1);
  assert.equal(first.coinsGained, ACT1.valerioReward);
  assert.equal(A.afterValerioVictory({ valerioRewardClaimed: true, bishopsDefeated: 1 }).coinsGained, 0);
  assert.match(questPresentation(8).title, /CONCLUÍDO/);
});

test('progresso antigo mantém Palavras já liberadas; novo começa sem elas', () => {
  const old = migrateProgress({ version: ACT1.version, questStep: 6, coins: 10 });
  assert.deepEqual(old.owned.sort(), ['magic', 'magic2']);
  const fresh = migrateProgress(null);
  assert.deepEqual(fresh.owned, []);
  const bought = migrateProgress({ version: ACT1.version, questStep: 6, owned: ['magic', 'aurora', 'hack'], sword: 'aurora', stats: { kills: 3 } });
  assert.deepEqual(bought.owned, ['magic', 'aurora']);
  assert.equal(bought.sword, 'aurora');
  assert.equal(bought.stats.kills, 3);
});
