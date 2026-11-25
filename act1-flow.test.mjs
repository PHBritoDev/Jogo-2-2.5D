import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from './act1-flow.js';
import { chooseStoryTwoShotSide, chooseStoryTwoShotFrame } from './story-camera-layout.js';

const { ACT1, sanitizePlayerName, migrateProgress, questPresentation, combatStep, afterEnemyDefeated, afterWardenDefeat, vhazraelHandoffPlan, nextAct1Sub, personalizeLine, SPEAKERS } = A;
const SCENES = ['villageArrivalScene', 'vendorRefusalScene', 'vendorScene', 'forestFirstScene', 'forestSecondScene', 'keyFoundScene', 'cageScene', 'faintScene', 'massacreScene', 'clueScene', 'feedingScene', 'holeScene', 'wardenIntroScene', 'wardenDefeatScene', 'vhazraelIntroScene', 'vhazraelDefeatScene', 'afterVhazraelScene'];
const all = () => SCENES.flatMap(n => A[n]());
const text = () => all().filter(s => s.type === 'say').map(s => s.text).join(' \n ');

test('aceita nomes próprios e recusa lixo', () => {
  assert.equal(sanitizePlayerName('  João  ').name, 'João');
  assert.equal(sanitizePlayerName("D'Ávila").ok, true);
  assert.equal(sanitizePlayerName('Ana-Maria').ok, true);
  assert.equal(sanitizePlayerName('A').ok, false);
  assert.equal(sanitizePlayerName('Al').ok, false);
  assert.equal(sanitizePlayerName('NomeMuitoLongo').ok, false);
  assert.equal(sanitizePlayerName('Ana\nMaria').ok, false);
  assert.equal(sanitizePlayerName('Ana\rMaria').ok, false);
  assert.equal(sanitizePlayerName('Ana\u2028Maria').ok, false);
  assert.equal(sanitizePlayerName('Ana\tMaria').ok, false);
  assert.equal(sanitizePlayerName('Ana\u0000Maria').ok, false);
  assert.equal(sanitizePlayerName('Ana\u007fMaria').ok, false);
  assert.equal(sanitizePlayerName('Ana\u0085Maria').ok, false);
  assert.equal(sanitizePlayerName('Ana\u2029Maria').ok, false);
  assert.equal(sanitizePlayerName('Ana Maria').ok, true);
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
  const done = migrateProgress({ version: 6, questStep: 12, coins: 9, bishopsDefeated: 1, vhazraelRewardClaimed: true });
  assert.equal(done.questStep, 12);
  assert.equal(done.vhazraelRewardClaimed, true);
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

test('objetivos acompanham os eventos jogáveis do resgate até os esgotos', () => {
  // No runtime, childrenCleared() avança para (3,2) e playFaint() é disparado em seguida.
  // Depois do desmaio, (4,0) marca MASSACRE_SPOT e dispara massacreScene(),
  // não a entrada do esgoto; a entrada só é liberada após massacreCleared().
  assert.match(questPresentation(3, 0).objective, /gaiola/i);
  assert.match(questPresentation(3, 1).objective, /Derrote/i);
  assert.match(questPresentation(3, 2).objective, /Anjo-Guia/i);
  assert.doesNotMatch(questPresentation(3, 2).objective, /Derrote/i);
  assert.match(questPresentation(4, 0).objective, /moradores/i);
  assert.doesNotMatch(questPresentation(4, 0).objective, /esgoto/i);
  assert.match(questPresentation(4, 1).objective, /caverna/i);
  assert.match(questPresentation(4, 2).objective, /esgoto/i);
});

test('ao terminar o desmaio, o status imediato aponta para os moradores e não antecipa o esgoto', async () => {
  // Confere o call-site real: a mensagem de status não pode divergir do objetivo do HUD.
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  const scene = source.match(/function playFaint\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(scene, 'gatilho do desmaio presente no runtime');
  assert.match(scene[1], /act1Advance\(4,0\)/);
  assert.match(scene[1], /status\.textContent=questPresentation\(4,0\)\.objective/);
  assert.match(questPresentation(4, 0).objective, /moradores/i);
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
  assert.equal(vhazraelHandoffPlan().replaceDimension, false);
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
  const first = A.afterVhazraelVictory({ vhazraelRewardClaimed: false });
  assert.equal(first.questStep, 8);
  assert.equal(first.bishopsDefeated, 1);
  assert.equal(first.coinsGained, ACT1.vhazraelReward);
  assert.equal(A.afterVhazraelVictory({ vhazraelRewardClaimed: true, bishopsDefeated: 1 }).coinsGained, 0);
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

test('Mod 247: save anterior ao nome VHAZRAEL migra a recompensa e o bestiário do Bispo 1 sem perder progresso', async () => {
  const { migrateProgress, migrateBishopOneName } = await import('./act1-flow.js');
  // chave e id legados simulados pela FORMA (o nome antigo não existe mais no código)
  const legacy = { version: 99, questStep: 9, coins: 55, bishopsDefeated: 1, legacyBossRewardClaimed: true, bestiary: ['captor', 'vlegacy'], bestiaryRewarded: ['vlegacy'] };
  const m = migrateBishopOneName(legacy);
  assert.equal(m.vhazraelRewardClaimed, true); assert.equal(m.legacyBossRewardClaimed, undefined);
  assert.deepEqual(m.bestiary, ['captor', 'vhazrael']); assert.deepEqual(m.bestiaryRewarded, ['vhazrael']);
  const p = migrateProgress(legacy); assert.equal(p.vhazraelRewardClaimed, true); assert.equal(p.coins, 55);
  const fresh = migrateBishopOneName({ vorgazhekRewardClaimed: true, bestiary: ['veraxion'] }); assert.equal(fresh.vhazraelRewardClaimed, undefined); assert.deepEqual(fresh.bestiary, ['veraxion']);
});


test('save dos atos finais restaura cada pista uma vez, descartando ids inválidos', () => {
  const input = { version: ACT1.version, act1Rev: ACT1.rev, questStep: 22, lateFound: [0, 2, 2, 7, 0, -1, 8, 1.5, '3', null, NaN] };
  const restored = migrateProgress(input);
  assert.deepEqual(restored.lateFound, [0, 2, 7]);
  assert.deepEqual(migrateProgress(restored).lateFound, [0, 2, 7]);
  assert.deepEqual(migrateProgress({ ...input, lateFound: null }).lateFound, []);
  assert.deepEqual(input.lateFound.slice(0, 5), [0, 2, 2, 7, 0]);
});

test('restauração de bestiário mantém IDs únicos sem alterar o save nem recompensar novamente', () => {
  const saved = { version: ACT1.version, act1Rev: ACT1.rev, questStep: 8,
    bestiary: ['captor', 'captor', 'warden', 'warden', 'vhazrael'],
    bestiaryRewarded: ['captor', 'captor', 'warden'],
    achievementsClaimed: ['first_win', 'first_win'] };
  const restored = migrateProgress(saved);
  assert.deepEqual(restored.bestiary, ['captor', 'warden', 'vhazrael']);
  assert.deepEqual(restored.bestiaryRewarded, ['captor', 'warden']);
  assert.deepEqual(restored.achievementsClaimed, ['first_win']);
  assert.equal(saved.bestiary.length, 5);
  assert.deepEqual(migrateProgress(restored).bestiaryRewarded, ['captor', 'warden']);
});


test('save não converte arrays, booleanos ou objetos em moedas gratuitas', () => {
  for (const coins of [[40], [], true, false, { value: 40 }, null, '', '   ', Infinity, NaN]) {
    for (const version of [4, 5, ACT1.version]) {
      assert.equal(migrateProgress({ version, questStep: 0, coins }).coins, 0);
    }
  }
  for (const coins of [40, '40', '40.9']) {
    assert.equal(migrateProgress({ version: ACT1.version, coins }).coins, 40);
  }
  const original = { version: ACT1.version, coins: [40] };
  assert.equal(migrateProgress(original).coins, 0);
  assert.deepEqual(original.coins, [40]);
});


test('HUD não avança etapas por subetapa inválida restaurada de save', () => {
  const base1 = questPresentation(1, 0);
  const base3 = questPresentation(3, 0);
  for (const bad of [NaN, Infinity, -Infinity, undefined, 'inválido', {}, null]) {
    assert.deepEqual(questPresentation(1, bad), base1);
    assert.deepEqual(questPresentation(3, bad), base3);
  }
  assert.equal(questPresentation(1, 1).objective, 'Pergunte a Téo sobre o Pecado da Ganância');
  assert.equal(SPEAKERS.vendor, 'Téo · Provisões');
  assert.doesNotMatch(questPresentation(1, 1).objective, /vendedor de frutas|· Provisões/i);
  assert.match(questPresentation(3, 2).objective, /luta terminou/);
});

test('descanso, recibos e progresso da campanha sobrevivem juntos ao reload e à migração', () => {
  const receipt = 'side:ervas:v2';
  const progress = {version: 6, act1Rev: 2, questStep: 15, act1Sub: 1, sakuraRest: 23,
    sideRewardClaims: [receipt, receipt, 123, 'broken'], coins: 98, xp: 40, playerName: 'Lia'};
  const loaded = migrateProgress(JSON.parse(JSON.stringify(progress)));
  assert.deepEqual(loaded.sideRewardClaims, [receipt]);
  assert.deepEqual([loaded.sakuraRest, loaded.questStep, loaded.act1Sub, loaded.coins, loaded.xp, loaded.playerName],
    [23, 15, 1, 98, 40, 'Lia']);
  assert.deepEqual(migrateProgress(JSON.parse(JSON.stringify(loaded))), loaded);
  const legacy = migrateProgress({version: 5, questStep: 2, coins: 12});
  assert.deepEqual([legacy.sakuraRest, legacy.sideRewardClaims, legacy.coins], [-1, [], 12]);
  assert.deepEqual(migrateProgress({...progress, sakuraRest: 100}).sideRewardClaims, [receipt]);
});

test('objetivo e primeira troca da cena principal identificam o mesmo vendedor', () => {
  const scene = A.vendorScene();
  const refusal = A.vendorRefusalScene();
  for (const [label, steps] of [['cena principal', scene], ['recusa', refusal]]) {
    const opening = steps[0];
    assert.equal(opening?.type, 'shot', label + ': enquadramento de dois atores deve vir antes da primeira fala');
    assert.equal(opening?.id, 'teo-primeira-troca');
    assert.equal(opening.dur, 0.65);
    assert.deepEqual(opening.args, { cam: 'two', a: 'hero', b: 'vendor', side: -1, dist: 4.8 });
  }
  const paymentShot = scene.find(s => s.type === 'shot' && s.id === 'saco-de-ouro');
  assert.deepEqual(paymentShot?.args, { cam: 'two', a: 'hero', b: 'vendor', side: -1, dist: 4.8 });
  const heroLine = scene.find(s => s.type === 'say' && s.who === SPEAKERS.hero);
  const vendorLine = scene.find(s => s.type === 'say' && s.who === SPEAKERS.vendor);
  assert.equal(questPresentation(1, 1).objective, 'Pergunte a Téo sobre o Pecado da Ganância');
  assert.equal(SPEAKERS.vendor, 'Téo · Provisões');
  assert.equal(heroLine?.text, 'Com licença. O senhor já ouviu algum rumor sobre o Pecado da Ganância?');
  assert.equal(vendorLine?.text, 'Rumor não enche barriga, forasteiro. Se não vai comprar nada, vaza.');
  assert.ok(scene.indexOf(vendorLine) > scene.indexOf(heroLine), 'Téo deve responder depois da pergunta do protagonista');
  const actionIds = scene.flatMap(s => [s.id, ...(s.with || []).map(w => w.id)]).filter(Boolean);
  assert.equal(actionIds.filter(id => id === 'entregar-ouro').length, 1,
    'a transação original de cinco moedas deve permanecer uma única vez na cena');
  assert.ok(actionIds.indexOf('entregar-ouro') < actionIds.indexOf('anoitecer'),
    'a transação deve ocorrer antes da transição para a noite');
});


test('two-shot narrativo mantém o lado preferido livre e troca quando há barraca no eixo', () => {
  const a = { x: 0, z: 0 }, b = { x: 0, z: 2 };
  const open = chooseStoryTwoShotSide({ a, b, preferredSide: -1, distance: 4, blockedAt: () => false });
  assert.equal(open.side, -1, 'sem obstáculo, preservar a direção autoral');
  assert.equal(open.clearSamples, 13);
  const alternate = chooseStoryTwoShotSide({ a, b, preferredSide: -1, distance: 4, blockedAt: x => x < -1 });
  assert.equal(alternate.side, 1, 'trocar para o lado livre quando a barraca bloqueia o preferido');
  assert.equal(alternate.blockedSample, null);
  const best = chooseStoryTwoShotSide({ a, b, preferredSide: -1, distance: 4, blockedAt: x => x < -1 || x > 2.5 });
  assert.equal(best.side, 1, 'quando ambos os lados bloqueiam, escolher o maior corredor livre');
  assert.ok(best.clearSamples > 0);
  const visibleAlternative = chooseStoryTwoShotSide({
    a, b, preferredSide: -1, distance: 4,
    // A barraca bloqueia somente a linha entre a câmera preferida e o segundo ator.
    blockedAt: (x, z) => x < -0.5 && z > 1.6
  });
  assert.equal(visibleAlternative.side, 1,
    'trocar de lado quando a barraca encobre o vendedor, mesmo com o corredor central livre');
  assert.deepEqual(visibleAlternative.visibleActors, [true, true],
    'o lado alternativo precisa manter os dois atores visíveis');
});


test('two-shot verifica oclusão 3D da cobertura, não apenas a pegada no chão', () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 2 };
  const framing = chooseStoryTwoShotSide({
    a, b, preferredSide: -1, distance: 4, cameraHeight: 3.5, targetHeight: 1.45,
    blockedAt: () => false,
    // Simula a cobertura que avança sobre o vendedor no lado preferido.
    visibleAt: camera => camera.x > 0
  });
  assert.equal(framing.side, 1, 'trocar de lado quando a geometria 3D encobre os atores');
  assert.deepEqual(framing.visibleActors, [true, true]);
  assert.equal(framing.camera.y, 3.5);
  assert.equal(framing.target.y, 1.45);
});

 
test('two-shot rejeita enquadramento que mostra apenas parte do corpo atrás da cobertura', () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 2 };
  const mostlyHidden = chooseStoryTwoShotSide({
    a, b, preferredSide: -1, distance: 4, blockedAt: () => false,
    // No lado preferido, apenas os dois pontos baixos passam; o lado alternativo libera o corpo inteiro.
    visibleAt: (camera, actor) => camera.x > 0 || actor.y < 1.0
  });
  assert.equal(mostlyHidden.side, 1);
  assert.deepEqual(mostlyHidden.visibleActors, [true, true]);
  assert.deepEqual(mostlyHidden.actorVisibilitySamples, [4, 4]);

  const minorOcclusion = chooseStoryTwoShotSide({
    a, b, preferredSide: -1, distance: 4, blockedAt: () => false,
    visibleAt: (_camera, actor) => actor.y < 1.7
  });
  assert.equal(minorOcclusion.side, -1, 'sem alternativa melhor, preservar o lado autoral');
  assert.deepEqual(minorOcclusion.actorVisibilitySamples, [3, 3]);
  assert.deepEqual(minorOcclusion.visibleActors, [false, false],
    '3/4 pontos não bastam: toldo ainda pode esconder cabeça ou ombros');
});

 
test('two-shot rejeita 3/4 pontos sob toldo e sobe a câmera até 4/4', () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 2 };
  const framing = chooseStoryTwoShotFrame({
    a, b, preferredSide: -1, distance: 4, blockedAt: () => false,
    cameraHeights: [3.5, 4.5],
    visibleAt: (camera, actor) => camera.y >= 4.5 || actor.y < 1.7
  });
  assert.equal(framing.cameraHeight, 4.5);
  assert.deepEqual(framing.visibleActors, [true, true]);
  assert.deepEqual(framing.actorVisibilitySamples, [4, 4]);
});

test('two-shot usa fallback alto quando a cobertura bloqueia os ângulos até 6,5 m', () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 2 };
  const framing = chooseStoryTwoShotFrame({
    a, b, preferredSide: -1, distance: 4, blockedAt: () => false,
    cameraHeights: [3.5, 4.5, 5.5, 6.5],
    visibleAt: camera => camera.y >= 7.5
  });
  assert.equal(framing.cameraHeight, 7.5);
  assert.deepEqual(framing.visibleActors, [true, true]);
  assert.deepEqual(framing.actorVisibilitySamples, [4, 4]);
});

test('two-shot eleva a câmera somente até liberar o corpo dos dois atores', () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 2 };
  const framing = chooseStoryTwoShotFrame({
    a, b, preferredSide: -1, distance: 4, blockedAt: () => false,
    cameraHeights: [3.5, 4.5, 5.5, 6.5],
    // A cobertura bloqueia tronco/cabeça nas alturas baixas; a vista fica livre acima dela.
    visibleAt: (camera, actor) => camera.y >= 5.5 || actor.y < 1.0
  });
  assert.equal(framing.cameraHeight, 5.5);
  assert.deepEqual(framing.visibleActors, [true, true]);
  assert.deepEqual(framing.actorVisibilitySamples, [4, 4]);
});

test('two-shot amplia o arco lateral quando a cobertura bloqueia os dois lados próximos', () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 2 };
  const framing = chooseStoryTwoShotFrame({
    a, b, preferredSide: -1, distance: 4, cameraHeights: [3.5, 4.5],
    blockedAt: () => false,
    // Só um ponto de câmera além da borda lateral da barraca revela os dois corpos.
    visibleAt: camera => Math.abs(camera.x) >= 5.5
  });
  assert.equal(framing.side, -1.5, 'deve preservar o lado preferido e afastar a câmera até sair da cobertura');
  assert.deepEqual(framing.visibleActors, [true, true]);
  assert.deepEqual(framing.actorVisibilitySamples, [4, 4]);
});


test('two-shot procura um deslocamento longitudinal quando os dois lados laterais continuam sob o toldo', () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 2 };
  const framing = chooseStoryTwoShotFrame({
    a, b, preferredSide: -1, distance: 4, blockedAt: () => false,
    cameraHeights: [3.5],
    alongOffsets: [0.6, -2.4, 2.4, -4.8, 4.8],
    // A cobertura só libera a linha de visão quando a câmera sai do eixo lateral,
    // avançando para além do lado do vendedor.
    visibleAt: camera => camera.z >= 5
  });
  assert.equal(framing.complete, true);
  assert.equal(framing.cameraHeight, 3.5);
  assert.equal(framing.alongOffset, 4.8);
  assert.deepEqual(framing.visibleActors, [true, true]);
  assert.deepEqual(framing.actorVisibilitySamples, [4, 4]);
  assert.ok(framing.attempts.length > 1, 'a busca deve registrar as alternativas testadas');
});


test('two-shot aceita mira baixa para manter os atores acima do painel cinematográfico', () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 2 };
  const framing = chooseStoryTwoShotFrame({
    a, b, preferredSide: -1, distance: 4, targetHeight: 0.3,
    blockedAt: () => false
  });
  assert.equal(framing.targetHeight, 0.3);
  assert.equal(framing.target.y, 0.3);
  assert.equal(framing.complete, true);
});
