import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { SIDE_QUESTS, SIDE_QUEST_WAYSTONES, createSideState, refreshSide, acceptSide, collectSide, turnInSide, settleSideReward, questForGiver, activeSideLines } from './sidequests3d.js';
import { WAYSTONES, createMapState, serializeMapState } from './map3d.js';

const eldoriaWaystones = (count) => new Set(SIDE_QUEST_WAYSTONES.slice(0, count));
const pendingFor = (id, beforeCoins = 100, beforeXp = 50) => {
  const q = SIDE_QUESTS.find(item => item.id === id);
  return {
    claimId: 'side:' + id + ':v2', questId: id,
    coins: q.reward.coins, xp: q.reward.xp,
    beforeCoins, afterCoins: beforeCoins + q.reward.coins,
    beforeXp, afterXp: beforeXp + q.reward.xp
  };
};

test('desbloqueio e aceite nunca herdam progresso anterior', () => {
  const unlocked = createSideState();
  unlocked.ervas.progress = 3; // simula estado residual/corrompido enquanto ainda bloqueada
  refreshSide(unlocked, { questStep: 1 });
  assert.equal(unlocked.ervas.state, 'available');
  assert.equal(unlocked.ervas.progress, 0, 'desbloqueio zera qualquer progresso anterior');

  const accepted = createSideState();
  accepted.ervas.state = 'available';
  accepted.ervas.progress = 3; // defesa também na fronteira de aceite em memória
  assert.equal(acceptSide(accepted, 'ervas'), true);
  assert.equal(accepted.ervas.state, 'active');
  assert.equal(accepted.ervas.progress, 0, 'aceite começa sempre em zero');
  collectSide(accepted, 'flor');
  assert.equal(accepted.ervas.progress, 1, 'só a coleta após o aceite conta');
  assert.equal(accepted.ervas.state, 'active');
});

test('recompensa pendente sobrevive reload e recupera crash antes do save da campanha', () => {
  const state = createSideState();
  refreshSide(state, { questStep: 1 });
  assert.equal(acceptSide(state, 'ervas'), true);
  for (let i = 0; i < 4; i++) collectSide(state, 'flor');
  assert.deepEqual(turnInSide(state, 'ervas'), SIDE_QUESTS[0].reward);
  state.pendingReward = pendingFor('ervas');
  const restored = createSideState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.ervas.state, 'done');
  assert.deepEqual(restored.pendingReward, state.pendingReward);
  let applied = 0;
  assert.equal(settleSideReward(restored, null, pending => {
    applied++;
    return { coins: pending.afterCoins, xp: pending.afterXp, sideRewardClaims: [pending.claimId] };
  }), 'applied');
  assert.equal(applied, 1);
  assert.equal(restored.pendingReward, null);
  assert.equal(turnInSide(restored, 'ervas'), null);
});

test('claim persistido limpa pendência mesmo depois de gastar moedas e XP', () => {
  const pending = pendingFor('ervas');
  const state = createSideState({
    ervas: { state: 'done', progress: 4 },
    pendingReward: pending
  });
  let applied = 0;
  assert.equal(settleSideReward(state, {
    coins: 2, xp: 3, sideRewardClaims: [pending.claimId]
  }, () => { applied++; return null; }), 'already-applied');
  assert.equal(applied, 0);
  assert.equal(state.pendingReward, null);
});

test('XP alto de outras fontes não comprova que a recompensa da missão foi paga', () => {
  const pending = pendingFor('ervas');
  const state = createSideState({
    ervas: { state: 'done', progress: 4 },
    pendingReward: pending
  });
  const persisted = { coins: pending.beforeCoins, xp: pending.afterXp + 25, sideRewardClaims: [] };
  let applied = 0, committed;
  const result = settleSideReward(state, persisted, receipt => {
    applied++;
    committed = {
      coins: persisted.coins + receipt.coins,
      xp: persisted.xp + receipt.xp,
      sideRewardClaims: [receipt.claimId]
    };
    return committed;
  });
  assert.equal(result, 'applied');
  assert.equal(applied, 1);
  assert.equal(committed.coins, pending.afterCoins);
  assert.equal(committed.xp, persisted.xp + pending.xp);
  assert.equal(state.pendingReward, null);
});

test('moedas altas de outras fontes não comprovam que a recompensa da missão foi paga', () => {
  const pending = pendingFor('ervas');
  const state = createSideState({
    ervas: { state: 'done', progress: 4 },
    pendingReward: pending
  });
  const persisted = { coins: pending.afterCoins + 25, xp: pending.beforeXp, sideRewardClaims: [] };
  let applied = 0, committed;
  const result = settleSideReward(state, persisted, receipt => {
    applied++;
    committed = {
      coins: persisted.coins + receipt.coins,
      xp: persisted.xp + receipt.xp,
      sideRewardClaims: [receipt.claimId]
    };
    return committed;
  });
  assert.equal(result, 'applied');
  assert.equal(applied, 1);
  assert.equal(committed.coins, persisted.coins + pending.coins);
  assert.equal(committed.xp, pending.afterXp);
  assert.equal(state.pendingReward, null);
});

test('falha temporária do save mantém transação pendente e permite retry', () => {
  const state = createSideState({
    ervas: { state: 'done', progress: 4 },
    pendingReward: pendingFor('ervas')
  });
  assert.equal(settleSideReward(state, { coins: 100, xp: 50, sideRewardClaims: [] },
    () => ({ coins: 100, xp: 50, sideRewardClaims: [] })), 'pending');
  assert.ok(state.pendingReward);
  assert.equal(settleSideReward(state, { coins: 100, xp: 50, sideRewardClaims: [] },
    pending => ({ coins: pending.afterCoins, xp: pending.afterXp, sideRewardClaims: [pending.claimId] })), 'applied');
  assert.equal(state.pendingReward, null);
});

test('pendência não sobrevive a save done sem progresso completo', () => {
  const state = createSideState({
    ervas: { state: 'done', progress: 0 },
    pendingReward: pendingFor('ervas')
  });
  assert.equal(state.ervas.state, 'done');
  assert.equal(state.pendingReward, null, 'estado done sem objetivo completo não comprova direito à recompensa');
});

test('pending reward inválido ou sem missão done é descartado', () => {
  const valid = pendingFor('ervas');
  const invalid = [
    { ...valid, claimId: 'side:ervas:v1' },
    { ...valid, afterXp: valid.afterXp - 1 },
    { ...valid, coins: valid.coins + 1 },
    { ...valid, afterCoins: valid.afterCoins + 1 }
  ];
  for (const pendingReward of invalid) {
    const state = createSideState({ ervas: { state: 'done', progress: 4 }, pendingReward });
    assert.equal(state.pendingReward, null);
  }
  const active = createSideState({ ervas: { state: 'active', progress: 4 }, pendingReward: valid });
  assert.equal(active.pendingReward, null);
});

test('contadores de missão rejeitam frações e coerções numéricas não decimais', () => {
  for (const invalid of ['0x4', '0X4', '4e0', '4.0', '4.5', 4.5, Number.MAX_SAFE_INTEGER + 1, -1]) {
    const state = createSideState({ ervas: { state: 'ready', progress: invalid } });
    assert.equal(state.ervas.progress, 0, 'contador inválido não pode ser arredondado: ' + String(invalid));
    assert.equal(state.ervas.state, 'active', 'contador inválido não mantém missão pronta');
    assert.equal(turnInSide(state, 'ervas'), null, 'contador inválido não pode pagar Flores de Vigília');
  }
  for (const invalid of ['0x3', '3e0', '3.0', '3.5', 3.5]) {
    const state = createSideState({ abrigos: { state: 'ready', progress: invalid } });
    assert.equal(state.abrigos.progress, 0, 'contador inválido não pode completar Pedras que Lembram: ' + String(invalid));
    assert.equal(state.abrigos.state, 'active');
    assert.equal(turnInSide(state, 'abrigos'), null);
  }
  const legacy = createSideState({ abrigos: { state: 'ready', progress: ' 03 ' } });
  assert.equal(legacy.abrigos.progress, 3, 'inteiro decimal legado com espaços continua válido');
  assert.equal(legacy.abrigos.state, 'ready');
  assert.deepEqual(turnInSide(legacy, 'abrigos'), SIDE_QUESTS.find(q => q.id === 'abrigos').reward);
});

test('missões abrem conforme a campanha e só contam itens quando ativas', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 0 });
  assert.equal(s.ervas.state, 'locked');
  refreshSide(s, { questStep: 1 });
  assert.equal(s.ervas.state, 'available');
  assert.equal(collectSide(s, 'flor'), null, 'flor antes de aceitar não conta');
  assert.ok(acceptSide(s, 'ervas'));
  for (let i = 0; i < 4; i++) collectSide(s, 'flor');
  assert.equal(s.ervas.state, 'ready');
  assert.deepEqual(turnInSide(s, 'ervas'), SIDE_QUESTS[0].reward);
  assert.equal(turnInSide(s, 'ervas'), null, 'recompensa uma vez só');
});

test('atualizações incompletas e snapshot ausente preserva progresso e o atual reconcilia o mapa', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  acceptSide(s, 'abrigos');
  refreshSide(s, { questStep: 2, waystones: eldoriaWaystones(2) });
  refreshSide(s, { questStep: 2 });
  assert.equal(s.abrigos.progress, 2, 'sem contagem não deve zerar progresso');
  refreshSide(s, { questStep: 2, waystones: eldoriaWaystones(1) });
  assert.equal(s.abrigos.progress, 1, 'snapshot atual do mapa reconcilia progresso salvo divergente');
  refreshSide(s, { questStep: 2, waystones: eldoriaWaystones(3) });
  assert.equal(s.abrigos.state, 'ready');
});

test('abrigos acompanham as pedras registradas; diário mostra progresso', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  acceptSide(s, 'abrigos');
  refreshSide(s, { questStep: 2, waystones: eldoriaWaystones(2) });
  assert.deepEqual(activeSideLines(s), ['Pedras que Lembram · 2/3']);
  refreshSide(s, { questStep: 2, waystones: eldoriaWaystones(3) });
  assert.equal(s.abrigos.state, 'ready');
  assert.equal(questForGiver(s, 'ARTESANATO').id, 'abrigos');
  const back = createSideState(JSON.parse(JSON.stringify(s)));
  assert.equal(back.abrigos.state, 'ready');
});

test('reload da vila limita contadores inválidos sem concluir missões indevidamente', () => {
  const saved = {
    ervas: { state: 'active', progress: Infinity },
    pingente: { state: 'active', progress: NaN },
    abrigos: { state: 'active', progress: 999999 }
  };
  const s = createSideState(saved);
  assert.equal(s.ervas.progress, 0);
  assert.equal(s.pingente.progress, 0);
  assert.equal(s.abrigos.progress, 0, 'save acima da meta é inválido');
  assert.equal(s.abrigos.state, 'active');
  refreshSide(s, { questStep: 2, waystones: eldoriaWaystones(2) });
  assert.equal(s.abrigos.state, 'active');
  refreshSide(s, { questStep: 2, waystones: eldoriaWaystones(3) });
  assert.equal(s.abrigos.state, 'ready');
  assert.equal(s.ervas.state, 'active');
  assert.equal(turnInSide(s, 'ervas'), null);
  for (let i = 0; i < 4; i++) collectSide(s, 'flor');
  assert.equal(s.ervas.state, 'ready');
  assert.deepEqual(turnInSide(s, 'ervas'), SIDE_QUESTS[0].reward);
  assert.equal(turnInSide(s, 'ervas'), null);
  const reloaded = createSideState(JSON.parse(JSON.stringify(s)));
  assert.equal(reloaded.ervas.state, 'done');
  assert.equal(turnInSide(reloaded, 'ervas'), null);
});

test('save da vila não libera missões por etapa inválida e preserva contagens legítimas', () => {
  const s = createSideState({
    ervas: { state: 'active', progress: '3' },
    pingente: { state: 'locked', progress: 999 }
  });
  assert.equal(s.ervas.progress, 3);
  assert.equal(s.pingente.progress, 0);
  refreshSide(s, { questStep: Infinity });
  assert.equal(s.pingente.state, 'locked');
  refreshSide(s, { questStep: 2, waystones: Infinity });
  assert.equal(s.pingente.state, 'available');
  collectSide(s, 'flor');
  assert.equal(s.ervas.state, 'ready');
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · volte a Mara']);
});


test('save inconsistente não permite entregar missão sem progresso comprovado', () => {
  const s = createSideState({
    ervas: { state: 'ready', progress: 1 },
    pingente: { state: 'ready', progress: Infinity },
    abrigos: { state: 'ready', progress: 3 }
  });
  assert.equal(s.ervas.state, 'active');
  assert.equal(s.pingente.state, 'active');
  assert.equal(turnInSide(s, 'ervas'), null);
  assert.equal(turnInSide(s, 'pingente'), null);
  refreshSide(s, { questStep: 2, waystones: eldoriaWaystones(2) });
  assert.equal(s.abrigos.state, 'active');
  assert.equal(turnInSide(s, 'abrigos'), null, 'save ready não paga sem os três abrigos locais');
  refreshSide(s, { questStep: 2, waystones: eldoriaWaystones(3) });
  assert.equal(s.abrigos.state, 'ready');
  assert.deepEqual(turnInSide(s, 'abrigos'), SIDE_QUESTS[2].reward);
  assert.equal(turnInSide(s, 'abrigos'), null);
  for (let i = 0; i < 3; i++) collectSide(s, 'flor');
  assert.equal(s.ervas.state, 'ready');
  assert.deepEqual(turnInSide(s, 'ervas'), SIDE_QUESTS[0].reward);
  const done = createSideState({ ervas: { state: 'done', progress: 0 } });
  assert.equal(done.ervas.state, 'done', 'save legado concluído não deve pagar novamente');
  assert.equal(turnInSide(done, 'ervas'), null);
});

test('entrega exige progresso completo mesmo se estado ready for adulterado após reload', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  assert.equal(acceptSide(s, 'pingente'), true);
  collectSide(s, 'pingente');
  assert.equal(s.pingente.state, 'ready');
  s.pingente.progress = 0;
  assert.equal(turnInSide(s, 'pingente'), null, 'não pagar missão sem o item');
  assert.equal(s.pingente.state, 'ready', 'não converter em done sem recompensa');
  s.pingente.progress = Infinity;
  assert.equal(turnInSide(s, 'pingente'), null, 'não aceitar progresso não finito');
  s.pingente.progress = 1;
  assert.deepEqual(turnInSide(s, 'pingente'), SIDE_QUESTS[1].reward);
  assert.equal(turnInSide(s, 'pingente'), null, 'não pagar duas vezes');
});


test('missão ready invalidada durante a sessão volta a mostrar objetivo alcançável', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  assert.equal(acceptSide(s, 'ervas'), true);
  for (let i = 0; i < 4; i++) collectSide(s, 'flor');
  assert.equal(s.ervas.state, 'ready');
  s.ervas.progress = Infinity;
  refreshSide(s, { questStep: 2 });
  assert.equal(s.ervas.state, 'active');
  assert.equal(s.ervas.progress, 0);
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · 0/4']);
  assert.equal(turnInSide(s, 'ervas'), null);
  for (let i = 0; i < 4; i++) collectSide(s, 'flor');
  assert.equal(s.ervas.state, 'ready');
  assert.deepEqual(turnInSide(s, 'ervas'), SIDE_QUESTS[0].reward);
  assert.equal(turnInSide(s, 'ervas'), null);
});

test('contadores corrompidos em memória não bloqueiam coleta nem o diário', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  assert.equal(acceptSide(s, 'ervas'), true);
  s.ervas.progress = NaN;
  assert.equal(collectSide(s, 'flor')?.id, 'ervas');
  assert.equal(s.ervas.progress, 1);
  s.ervas.progress = Infinity;
  refreshSide(s, { questStep: 2 });
  assert.equal(s.ervas.progress, 0);
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · 0/4']);
  for (let i = 0; i < 4; i++) collectSide(s, 'flor');
  assert.equal(s.ervas.state, 'ready');
  assert.deepEqual(turnInSide(s, 'ervas'), SIDE_QUESTS[0].reward);
  assert.equal(turnInSide(s, 'ervas'), null);
});

test('progresso negativo ou acima da meta durante a sessão é normalizado', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  acceptSide(s, 'pingente');
  s.pingente.progress = -100;
  refreshSide(s, { questStep: 2 });
  assert.equal(s.pingente.progress, 0);
  collectSide(s, 'pingente');
  assert.equal(s.pingente.state, 'ready');
  s.pingente.progress = 999;
  refreshSide(s, { questStep: 2 });
  assert.equal(s.pingente.progress, 0, 'progresso acima da meta deve ser invalidado');
  assert.equal(s.pingente.state, 'active');
  assert.equal(turnInSide(s, 'pingente'), null);
  collectSide(s, 'pingente');
  assert.equal(s.pingente.state, 'ready');
  assert.deepEqual(turnInSide(s, 'pingente'), SIDE_QUESTS[1].reward);
});


test('checkpoints não escalares não liberam missões após restauração', () => {
  for (const invalid of [true, false, null, [], [2], {}, { valueOf: () => 2 }, ' ', 1.5, 2.5, '1.5', '2.5', Number.MAX_SAFE_INTEGER + 1, String(Number.MAX_SAFE_INTEGER + 1)]) {
    const state = createSideState();
    refreshSide(state, { questStep: invalid });
    assert.equal(state.pingente.state, 'locked');
    assert.equal(state.ervas.state, 'locked');
  }
  const restored = createSideState();
  refreshSide(restored, { questStep: '2' });
  assert.equal(restored.pingente.state, 'available', 'save legado com etapa numérica continua válido');
});

test('checkpoint textual aceita apenas inteiro decimal, sem coerção hexadecimal ou exponencial', () => {
  const state = createSideState({
    ervas: { state: 'available', progress: 0 },
    pingente: { state: 'locked', progress: 0 }
  });
  for (const invalid of ['0x10', '0X10', '1e2', '2e0', '+2', '2.0', '0b10', '0o2']) {
    refreshSide(state, { questStep: invalid });
    assert.equal(state.ervas.state, 'available', 'checkpoint textual inválido não pode relockar missão');
    assert.equal(state.pingente.state, 'locked', 'checkpoint textual inválido não pode desbloquear missão');
  }
  refreshSide(state, { questStep: '2' });
  assert.equal(state.pingente.state, 'available', 'inteiro decimal legado continua compatível');
});

test('save com contadores não escalares não fabrica entregas nem recompensas', () => {
  for (const invalid of [[4], [1], true, false, {}, { valueOf: () => 4 }, null, ' ']) {
    const state = createSideState({ ervas: { state: 'ready', progress: invalid } });
    assert.equal(state.ervas.progress, 0);
    assert.equal(state.ervas.state, 'active');
    assert.equal(turnInSide(state, 'ervas'), null);
  }
  const valid = createSideState({ ervas: { state: 'ready', progress: '4' } });
  assert.equal(valid.ervas.state, 'ready', 'contador legado em string numérica permanece válido');
  assert.deepEqual(turnInSide(valid, 'ervas'), SIDE_QUESTS[0].reward);
  assert.equal(turnInSide(valid, 'ervas'), null);
});

test('pedras de abrigo ignoram arrays e objetos de contagem durante a sessão', () => {
  const state = createSideState();
  refreshSide(state, { questStep: 2 });
  assert.equal(acceptSide(state, 'abrigos'), true);
  for (const invalid of [3, [3], true, { valueOf: () => 3 }, '3']) {
    refreshSide(state, { questStep: 2, waystones: invalid });
    assert.equal(state.abrigos.progress, 0);
    assert.equal(state.abrigos.state, 'active');
  }
  refreshSide(state, { questStep: 2, waystones: eldoriaWaystones(3) });
  assert.equal(state.abrigos.state, 'ready');
});


test('diário permanece legível antes do próximo refresh de estado corrompido', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  acceptSide(s, 'ervas');
  s.ervas.progress = NaN;
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · 0/4']);
  s.ervas.progress = [4];
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · 0/4']);
  s.ervas.state = 'ready';
  s.ervas.progress = Infinity;
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · 0/4']);
  assert.equal(turnInSide(s, 'ervas'), null);
  s.ervas.progress = 4;
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · volte a Mara']);
});


test('Pedras que Lembram conta somente os três IDs de Eldória', () => {
  const mapIds = new Set(WAYSTONES.map((stone) => stone.id));
  assert.deepEqual(SIDE_QUEST_WAYSTONES, ['abrigo-vila', 'abrigo-mata', 'abrigo-caverna']);
  for (const id of SIDE_QUEST_WAYSTONES) assert.ok(mapIds.has(id), id + ' precisa existir no mapa');
  const laterActIds = WAYSTONES.filter((stone) => !SIDE_QUEST_WAYSTONES.includes(stone.id)).map((stone) => stone.id);
  assert.ok(laterActIds.length >= 3, 'o mapa deve conter marcos posteriores sem fazê-los contar para Eldória');

  const state = createSideState();
  refreshSide(state, { questStep: 2 });
  assert.equal(acceptSide(state, 'abrigos'), true);
  refreshSide(state, { questStep: 2, waystones: new Set(laterActIds) });
  assert.equal(state.abrigos.progress, 0, 'abrigos de outros atos não concluem a missão de Eldória');
  refreshSide(state, { questStep: 2, waystones: new Set([SIDE_QUEST_WAYSTONES[0], ...laterActIds]) });
  assert.equal(state.abrigos.progress, 1, 'somente o abrigo local conta');
  refreshSide(state, { questStep: 2, waystones: new Set(SIDE_QUEST_WAYSTONES) });
  assert.equal(state.abrigos.progress, 3);
  assert.equal(state.abrigos.state, 'ready');
  refreshSide(state, { questStep: 2, waystones: [...SIDE_QUEST_WAYSTONES] });
  assert.equal(state.abrigos.state, 'ready', 'arrays com IDs canônicos também são aceitos');
});

test('recuperação de recompensa usa moedas e XP do mesmo snapshot V6', () => {
  const runtime = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(runtime.includes('function savedCampaignProgress(){'));
  assert.ok(runtime.includes("saved&&typeof saved==='object'&&!Array.isArray(saved)"));
  assert.ok(!runtime.includes('Number.isFinite(saved.coins)&&Number.isFinite(saved.xp)'));
  assert.ok(runtime.includes('Array.isArray(saved.sideRewardClaims)'));
  assert.ok(runtime.includes('sideRewardClaims:[...sideRewardClaims]'));
  assert.ok(runtime.includes('coins+=pending.coins;'));
  assert.ok(runtime.includes('settleSideReward(sideState,savedCampaignProgress(),pending=>{'));
  assert.ok(runtime.includes('save3DProgress();return savedCampaignProgress();'));
  assert.ok(!runtime.includes('function savedCampaignXp(){'));
});

test('recompensa soma ao saldo atual e claim atômico evita perda, retry duplo e pagamento após reload', () => {
  const runtime = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  const begin = runtime.indexOf('function savedCampaignProgress(){');
  const end = runtime.indexOf('\nconst sideRewardRecovery', begin);
  assert.ok(begin >= 0 && end > begin, 'bloco de recuperação transacional não foi localizado');
  const recovery = runtime.slice(begin, end);
  const pending = pendingFor('ervas', 100, 100);
  // Três vitórias de captor salvaram 112 moedas / 160 XP, sem o claim da missão.
  const storage = new Map([['sevenSins3DCampaignV6', JSON.stringify({ coins: 112, xp: 160, sideRewardClaims: [] })]]);
  const state = createSideState({
    ervas: { state: 'done', progress: 4 },
    pendingReward: pending
  });
  const context = {
    PROGRESS_KEY: 'sevenSins3DCampaignV6',
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); }
    },
    settleSideReward,
    sideState: state,
    sideRewardClaims: [],
    coins: 112,
    playerXp: 160,
    allowSave: false,
    saveCount: 0,
    sideSaveCount: 0
  };
  context.gainXp = amount => { context.playerXp += amount; };
  context.save3DProgress = () => {
    context.saveCount++;
    if (context.allowSave) storage.set(context.PROGRESS_KEY, JSON.stringify({
      coins: context.coins, xp: context.playerXp, sideRewardClaims: [...context.sideRewardClaims]
    }));
  };
  context.saveSide = () => { context.sideSaveCount++; return true; };
  runInNewContext(recovery + '\nthis.__settle = settlePendingSideReward;', context);

  assert.equal(context.__settle(), 'pending', 'falha do primeiro save mantém o recibo');
  assert.equal(context.coins, 122, 'recompensa soma +10 ao saldo aumentado por combate');
  assert.equal(context.playerXp, 190, 'recompensa soma +30 ao XP aumentado por combate');
  assert.ok(context.sideRewardClaims.includes(pending.claimId));
  assert.ok(state.pendingReward);

  context.allowSave = true;
  assert.equal(context.__settle(), 'applied', 'retry persiste o mesmo saldo e o claim');
  assert.equal(context.coins, 122, 'retry não duplica moedas');
  assert.equal(context.playerXp, 190, 'retry não duplica XP');
  assert.equal(context.saveCount, 2);
  assert.equal(context.sideSaveCount, 1);
  assert.equal(state.pendingReward, null);
  const committed = JSON.parse(storage.get(context.PROGRESS_KEY));
  assert.deepEqual(committed.sideRewardClaims, [pending.claimId]);
  assert.equal(committed.coins, 122);
  assert.equal(committed.xp, 190);

  // Crash depois do snapshot V6 e antes de limpar o recibo do save da vila.
  const reloaded = createSideState({
    ervas: { state: 'done', progress: 4 },
    pendingReward: pending
  });
  const recoveryAfterCrash = {
    ...context, sideState: reloaded, allowSave: false, saveCount: 0, sideSaveCount: 0,
    coins: committed.coins, playerXp: committed.xp,
    sideRewardClaims: [...committed.sideRewardClaims]
  };
  delete recoveryAfterCrash.__settle;
  runInNewContext(recovery + '\nthis.__settle = settlePendingSideReward;', recoveryAfterCrash);
  assert.equal(recoveryAfterCrash.__settle(), 'already-applied');
  assert.equal(reloaded.pendingReward, null);
  assert.equal(recoveryAfterCrash.coins, 122);
  assert.equal(recoveryAfterCrash.playerXp, 190);
  assert.equal(recoveryAfterCrash.saveCount, 0, 'crash recovery não grava/credita novamente a campanha');
});

test('runtime fornece o Set de IDs registrados, não a contagem global', () => {
  const runtime = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(runtime.includes("function refreshSideQuests(){refreshSide(sideState,{questStep,waystones:mapState.waystones})"));
  assert.ok(!runtime.includes("function refreshSideQuests(){refreshSide(sideState,{questStep,waystones:mapState.waystones.size})"));
});


test('save available preserva missão desbloqueada sem contar antes do aceite', () => {
  const state = createSideState({ ervas: { state: 'available', progress: 2 } });
  assert.equal(state.ervas.state, 'available');
  assert.equal(state.ervas.progress, 0, 'missão disponível ainda não começou');
  assert.equal(acceptSide(state, 'ervas'), true);
  collectSide(state, 'flor');
  assert.equal(state.ervas.progress, 1);
});


test('save available nao antecipa o desbloqueio quando a campanha volta de etapa', () => {
  const state = createSideState({
    ervas: { state: 'available', progress: 2 },
    pingente: { state: 'available', progress: 1 }
  });
  refreshSide(state, { questStep: 1.5 });
  assert.equal(state.ervas.state, 'available', 'checkpoint fracionário é inválido e não altera o desbloqueio');
  assert.equal(state.pingente.state, 'available', 'checkpoint fracionário não deve relockar nem liberar missões');

  refreshSide(state, { questStep: 0 });
  assert.equal(state.ervas.state, 'locked');
  assert.equal(state.pingente.state, 'locked');
  assert.equal(state.ervas.progress, 0);
  assert.equal(state.pingente.progress, 0);
  assert.equal(acceptSide(state, 'ervas'), false);
  assert.equal(acceptSide(state, 'pingente'), false);
  assert.equal(questForGiver(state, 'ALIMENTOS'), null);

  refreshSide(state, { questStep: 1 });
  assert.equal(state.ervas.state, 'available');
  assert.equal(state.pingente.state, 'locked');
  assert.equal(acceptSide(state, 'ervas'), true);
  assert.equal(acceptSide(state, 'pingente'), false);

  refreshSide(state, { questStep: 2 });
  assert.equal(state.pingente.state, 'available');
  assert.equal(acceptSide(state, 'pingente'), true);
});

test('save available permanece intacto quando nao ha snapshot de campanha', () => {
  const state = createSideState({ ervas: { state: 'available', progress: 0 } });
  refreshSide(state, {});
  assert.equal(state.ervas.state, 'available');
  assert.equal(acceptSide(state, 'ervas'), true);
});




test('Set real de waystones restaurado pelo mapa mantém apenas abrigos de Eldória', () => {
  const map = createMapState({
    waystones: ['abrigo-vila', 'abrigo-vale', 'abrigo-serra', 'abrigo-cinzaria']
  });
  const state = createSideState();
  refreshSide(state, { questStep: 2 });
  assert.equal(acceptSide(state, 'abrigos'), true);

  refreshSide(state, { questStep: 2, waystones: map.waystones });
  assert.equal(state.abrigos.progress, 1, 'somente abrigo-vila conta antes do reload');

  const savedMap = serializeMapState(map);
  const restoredMap = createMapState(savedMap);
  const restoredSide = createSideState(JSON.parse(JSON.stringify(state)));
  assert.ok(restoredMap.waystones instanceof Set);
  refreshSide(restoredSide, { questStep: 2, waystones: restoredMap.waystones });
  assert.equal(restoredSide.abrigos.progress, 1, 'o Set reconstruído do save preserva apenas o progresso local');

  restoredMap.waystones.add('abrigo-mata');
  refreshSide(restoredSide, { questStep: 2, waystones: restoredMap.waystones });
  assert.equal(restoredSide.abrigos.progress, 2);
  restoredMap.waystones.add('abrigo-caverna');
  refreshSide(restoredSide, { questStep: 2, waystones: restoredMap.waystones });
  assert.equal(restoredSide.abrigos.progress, 3);
  assert.equal(restoredSide.abrigos.state, 'ready');
});


test('checkpoint negativo nao relocka nem desbloqueia missoes', () => {
  const state = createSideState({
    ervas: { state: 'available', progress: 0 },
    pingente: { state: 'locked', progress: 0 }
  });
  for (const invalid of [-1, '-1']) {
    refreshSide(state, { questStep: invalid });
    assert.equal(state.ervas.state, 'available', 'etapa negativa nao pode relockar missao disponivel');
    assert.equal(state.pingente.state, 'locked', 'etapa negativa nao pode desbloquear missao bloqueada');
  }
  refreshSide(state, { questStep: 0 });
  assert.equal(state.ervas.state, 'locked', 'etapa zero valida pode relockar a missao de etapa 1');
  refreshSide(state, { questStep: 1 });
  assert.equal(state.ervas.state, 'available');
  assert.equal(state.pingente.state, 'locked');
  refreshSide(state, { questStep: 2 });
  assert.equal(state.pingente.state, 'available');
});


test('claim V6 continua reconhecido mesmo quando moedas ou XP do snapshot estao corrompidos', () => {
  const runtime = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  const begin = runtime.indexOf('function savedCampaignProgress(){');
  const end = runtime.indexOf('\nconst sideRewardRecovery', begin);
  assert.ok(begin >= 0 && end > begin);
  const recovery = runtime.slice(begin, end);
  const pending = pendingFor('ervas', 100, 50);
  const storage = new Map([['sevenSins3DCampaignV6', JSON.stringify({
    coins: null, xp: null, sideRewardClaims: [pending.claimId]
  })]]);
  const state = createSideState({
    ervas: { state: 'done', progress: 4 },
    pendingReward: pending
  });
  const context = {
    PROGRESS_KEY: 'sevenSins3DCampaignV6',
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); }
    },
    settleSideReward,
    sideState: state,
    sideRewardClaims: [],
    coins: 0,
    playerXp: 0,
    save3DProgress() { throw new Error('nao deve gravar novamente uma recompensa ja reclamada'); },
    saveSide() { return true; }
  };
  context.gainXp = amount => { context.playerXp += amount; };
  runInNewContext(recovery + '\nthis.__settle = settlePendingSideReward;', context);
  assert.equal(context.__settle(), 'already-applied');
  assert.equal(context.coins, 0, 'claim existente impede duplicar moedas mesmo com saldo invalido');
  assert.equal(context.playerXp, 0, 'claim existente impede duplicar XP mesmo com saldo invalido');
  assert.equal(state.pendingReward, null);
});


test('progresso fracionario em memoria nao deixa missao pronta sem quantidade inteira', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  assert.equal(acceptSide(s, 'abrigos'), true);

  s.abrigos.state = 'ready';
  s.abrigos.progress = 2.5;
  refreshSide(s, { questStep: 2 });
  assert.equal(s.abrigos.progress, 0, 'fracao em memoria deve ser invalidada');
  assert.equal(s.abrigos.state, 'active', 'missao pronta sem contagem inteira volta a ativa');
  assert.equal(turnInSide(s, 'abrigos'), null, 'fracao nao pode liberar recompensa');
  assert.deepEqual(activeSideLines(s), ['Pedras que Lembram · 0/3']);

  s.abrigos.progress = 1.5;
  refreshSide(s, { questStep: 2 });
  assert.equal(s.abrigos.progress, 0, 'fracao durante coleta tambem deve ser normalizada');
  assert.equal(s.abrigos.state, 'active');
});
