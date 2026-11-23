import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SIDE_QUESTS, createSideState, refreshSide, acceptSide, collectSide, turnInSide, questForGiver, activeSideLines } from './sidequests3d.js';

test('cada missão opcional está ligada a um vendedor real e usa sua identidade nas falas', () => {
  const runtime = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  const block = runtime.match(/const villageVendors=\[([\s\S]*?)\n\];/);
  assert.ok(block, 'lista real de vendedores da vila');
  const vendors = [...block[1].matchAll(/\{name:'([^']+)',shortName:'([^']+)'/g)]
    .map(([, name, shortName]) => ({ name, shortName }));
  assert.match(runtime, /if\(trySideQuestTalk\(vendor\)\)return;/, 'a conversa da vila precisa chamar o roteador das missões');
  const state = createSideState();
  refreshSide(state, { questStep: 2 });
  for (const quest of SIDE_QUESTS) {
    const vendor = vendors.find(v => v.shortName === quest.giver);
    assert.ok(vendor, quest.id + ' precisa de um vendedor existente');
    assert.equal(questForGiver(state, vendor.shortName)?.id, quest.id, vendor.shortName + ' deve oferecer ' + quest.id);
    assert.ok(quest.offer.length > 0 && quest.offer.every(line => line.who === vendor.name));
    assert.ok(quest.turnIn.length > 0 && quest.turnIn.every(line => line.who === vendor.name));
  }
  assert.equal(questForGiver(state, 'ERVAS'), null, 'giver antigo não deve permanecer órfão');
  assert.equal(questForGiver(state, 'ARTESANATO'), null, 'giver antigo não deve permanecer órfão');
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

test('atualizações incompletas e contagens antigas não apagam pedras já registradas', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  acceptSide(s, 'abrigos');
  refreshSide(s, { questStep: 2, waystones: 2 });
  refreshSide(s, { questStep: 2 });
  assert.equal(s.abrigos.progress, 2, 'sem contagem não deve zerar progresso');
  refreshSide(s, { questStep: 2, waystones: 1 });
  assert.equal(s.abrigos.progress, 2, 'contagem desatualizada não retrocede progresso');
  refreshSide(s, { questStep: 2, waystones: 3 });
  assert.equal(s.abrigos.state, 'ready');
});

test('abrigos acompanham as pedras registradas; diário mostra progresso', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  acceptSide(s, 'abrigos');
  refreshSide(s, { questStep: 2, waystones: 2 });
  assert.deepEqual(activeSideLines(s), ['Pedras que Lembram · 2/3']);
  refreshSide(s, { questStep: 2, waystones: 3 });
  assert.equal(s.abrigos.state, 'ready');
  assert.equal(questForGiver(s, 'PROVISÕES')?.id, 'abrigos');
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
  assert.equal(s.abrigos.progress, 3);
  assert.equal(s.abrigos.state, 'active');
  refreshSide(s, { questStep: 2, waystones: 2 });
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
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · volte a Bento']);
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
  assert.equal(s.pingente.progress, 1);
  assert.deepEqual(turnInSide(s, 'pingente'), SIDE_QUESTS[1].reward);
});


test('checkpoints não escalares não liberam missões após restauração', () => {
  for (const invalid of [true, false, null, [], [2], {}, { valueOf: () => 2 }, ' ']) {
    const state = createSideState();
    refreshSide(state, { questStep: invalid });
    assert.equal(state.pingente.state, 'locked');
    assert.equal(state.ervas.state, 'locked');
  }
  const restored = createSideState();
  refreshSide(restored, { questStep: '2' });
  assert.equal(restored.pingente.state, 'available', 'save legado com etapa numérica continua válido');
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
  for (const invalid of [[3], true, { valueOf: () => 3 }, '3']) {
    refreshSide(state, { questStep: 2, waystones: invalid });
    assert.equal(state.abrigos.progress, 0);
    assert.equal(state.abrigos.state, 'active');
  }
  refreshSide(state, { questStep: 2, waystones: 3 });
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
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · volte a Bento']);
});
