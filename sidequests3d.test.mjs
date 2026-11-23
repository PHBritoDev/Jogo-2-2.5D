import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
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

test('contagem atual do mapa é a fonte de verdade das pedras registradas', () => {
  const s = createSideState();
  refreshSide(s, { questStep: 2 });
  acceptSide(s, 'abrigos');
  refreshSide(s, { questStep: 2, waystones: 2 });
  refreshSide(s, { questStep: 2 });
  assert.equal(s.abrigos.progress, 2, 'sem snapshot do mapa, preserva o progresso salvo');
  refreshSide(s, { questStep: 2, waystones: 1 });
  assert.equal(s.abrigos.progress, 1, 'snapshot atual do mapa reconcilia o progresso');
  refreshSide(s, { questStep: 2, waystones: 3 });
  assert.equal(s.abrigos.state, 'ready');
});

test('save ready adulterado não entrega recompensa sem três abrigos no mapa', () => {
  const ready = createSideState({ abrigos: { state: 'ready', progress: 3 } });
  refreshSide(ready, { questStep: 2, waystones: 2 });
  assert.equal(ready.abrigos.progress, 2);
  assert.equal(ready.abrigos.state, 'active');
  assert.equal(turnInSide(ready, 'abrigos'), null, 'mapa com dois registros não pode pagar missão pronta');

  const active = createSideState({ abrigos: { state: 'active', progress: 3 } });
  refreshSide(active, { questStep: 2, waystones: 2 });
  assert.equal(active.abrigos.progress, 2);
  assert.equal(active.abrigos.state, 'active');

  refreshSide(ready, { questStep: 2, waystones: 3 });
  assert.equal(ready.abrigos.progress, 3);
  assert.equal(ready.abrigos.state, 'ready');
  assert.deepEqual(turnInSide(ready, 'abrigos'), SIDE_QUESTS[2].reward);
  assert.equal(turnInSide(ready, 'abrigos'), null);
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
  assert.equal(s.abrigos.progress, 0, 'progresso salvo acima da meta é corrupção, não conclusão');
  assert.equal(s.abrigos.state, 'active');
  refreshSide(s, { questStep: 2, waystones: 2 });
  assert.equal(s.abrigos.progress, 2, 'a contagem real dos abrigos é a fonte de verdade');
  assert.equal(s.abrigos.state, 'active');
  refreshSide(s, { questStep: 2, waystones: 3 });
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


test('save available recupera o desbloqueio pelo checkpoint da campanha', () => {
  const s = createSideState({
    ervas: { state: 'available', progress: 0 },
    pingente: { state: 'available', progress: 0 },
    abrigos: { state: 'available', progress: 0 }
  });
  // O checkpoint da campanha é a fonte de verdade para o desbloqueio.
  refreshSide(s, { questStep: 1, waystones: 0 });
  assert.equal(s.ervas.state, 'available');
  assert.equal(s.abrigos.state, 'available');
  assert.equal(s.pingente.state, 'locked');
  refreshSide(s, { questStep: 2, waystones: 0 });
  assert.equal(s.pingente.state, 'available');
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
  s.pingente.progress = 2;
  assert.equal(turnInSide(s, 'pingente'), null, 'não pagar com progresso acima da meta');
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
  assert.equal(turnInSide(s, 'pingente'), null, 'contador adulterado não paga recompensa');
  collectSide(s, 'pingente');
  assert.equal(s.pingente.state, 'ready');
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
  s.ervas.progress = 999;
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · 0/4'], 'o diário não pode anunciar entrega com contador acima da meta');
  assert.equal(turnInSide(s, 'ervas'), null);
  s.ervas.progress = 4;
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · volte a Bento']);
});


test('fluxo real de conversa entrega as três missões e persiste sem duplicar recompensa', () => {
  const runtime = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  const start = runtime.indexOf('function trySideQuestTalk(vendor){');
  const end = runtime.indexOf('\nsideReady=true;', start);
  assert.ok(start >= 0 && end > start, 'extrair o roteador de conversa usado pelo jogo');
  const talkSource = runtime.slice(start, end).trim();
  const storeKey = runtime.match(/const SIDE_STORE='([^']+)';/)?.[1];
  const saveStart = runtime.indexOf('function saveSide(){');
  const saveEnd = runtime.indexOf('\n', saveStart);
  const loadStart = runtime.indexOf('const sideState=(()=>{');
  const loadEnd = runtime.indexOf('})();', loadStart) + 4;
  assert.ok(storeKey && saveStart >= 0 && saveEnd > saveStart && loadEnd > loadStart, 'extrair persistência real das missões');
  const saveSource = runtime.slice(saveStart, saveEnd);
  const loadSource = runtime.slice(loadStart, loadEnd);

  function makeStore() {
    const values = new Map();
    return {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); }
    };
  }
  function saveSideFunction(state, storage) {
    const context = vm.createContext({ SIDE_STORE: storeKey, sideState: state, localStorage: storage });
    return vm.runInContext('(' + saveSource + ')', context, { timeout: 1000 });
  }
  function loadSideFromStorage(storage) {
    const context = vm.createContext({ SIDE_STORE: storeKey, localStorage: storage, createSideState });
    vm.runInContext(loadSource, context, { timeout: 1000 });
    return vm.runInContext('sideState', context, { timeout: 1000 });
  }

  function harness(state, ctx, storage = makeStore()) {
    const events = { dialogues: [], refreshes: 0, hudUpdates: 0, progressSaves: 0 };
    const persistSide = saveSideFunction(state, storage);
    const toast = {
      textContent: '',
      classList: {
        remove(name) { events.toastRemoved = name; },
        add(name) { events.toastAdded = name; }
      }
    };
    const sandbox = {
      sideState: state,
      coins: 0,
      xp: 0,
      refreshSideQuests() { refreshSide(state, ctx); events.refreshes++; },
      questForGiver,
      acceptSide,
      turnInSide,
      showDialogue(lines, onDone) {
        events.dialogues.push(lines);
        events.complete = typeof onDone === 'function' ? onDone : null;
      },
      saveSide() { persistSide(); events.savedSide = JSON.parse(storage.getItem(storeKey)); },
      save3DProgress() {
        events.progressSaves++;
        events.savedProgress = { coins: sandbox.coins, xp: sandbox.xp };
      },
      gainXp(amount) { sandbox.xp += amount; },
      showRewardPop(message) { events.reward = message; },
      updateQuestHud() { events.hudUpdates++; },
      document: { getElementById(id) { assert.equal(id, 'quest-toast'); return toast; } },
      setTimeout(callback, delay) { events.toastDelay = delay; callback(); }
    };
    const talk = vm.runInNewContext('(' + talkSource + ')', sandbox, { timeout: 1000 });
    return { talk, events, sandbox, storage };
  }

  // Bento: oferta, coleta de quatro flores, entrega e restauração sem pagamento repetido.
  const bentoState = createSideState();
  const bentoCtx = { questStep: 1, waystones: 0 };
  const bento = harness(bentoState, bentoCtx);
  const bentoVendor = { shortName: 'ALIMENTOS', name: 'Bento · Alimentos' };
  assert.equal(bento.talk(bentoVendor), true);
  assert.equal(bento.events.dialogues[0], SIDE_QUESTS.find(q => q.id === 'ervas').offer);
  bento.events.complete();
  assert.equal(bentoState.ervas.state, 'active');
  assert.equal(bento.events.savedSide.ervas.state, 'active');
  for (let i = 0; i < 4; i++) collectSide(bentoState, 'flor');
  assert.equal(bento.talk(bentoVendor), true);
  assert.equal(bento.events.dialogues[1], SIDE_QUESTS.find(q => q.id === 'ervas').turnIn);
  bento.events.complete();
  bento.events.complete();
  assert.equal(bentoState.ervas.state, 'done');
  assert.equal(bento.sandbox.coins, 10);
  assert.equal(bento.sandbox.xp, 30);
  assert.equal(bento.events.progressSaves, 1, 'callback repetido não deve pagar duas vezes');
  const bentoReload = loadSideFromStorage(bento.storage);
  assert.equal(bentoReload.ervas.state, 'done');
  assert.equal(harness(bentoReload, bentoCtx, bento.storage).talk(bentoVendor), false);

  // Téo: a contagem externa real de waystones dirige 2/3, prontidão e recompensa.
  const teoState = createSideState();
  const teoCtx = { questStep: 1, waystones: 0 };
  const teo = harness(teoState, teoCtx);
  const teoVendor = { shortName: 'PROVISÕES', name: 'Téo · Provisões' };
  assert.equal(teo.talk(teoVendor), true);
  assert.equal(teo.events.dialogues[0], SIDE_QUESTS.find(q => q.id === 'abrigos').offer);
  teo.events.complete();
  teoCtx.waystones = 2;
  assert.equal(teo.talk(teoVendor), true);
  assert.equal(teo.events.dialogues[1][0].text, 'Registre as três pedras de abrigo. (2/3)');
  teoCtx.waystones = 3;
  assert.equal(teo.talk(teoVendor), true);
  assert.equal(teo.events.dialogues[2], SIDE_QUESTS.find(q => q.id === 'abrigos').turnIn);
  teo.events.complete();
  assert.equal(teoState.abrigos.state, 'done');
  assert.equal(teo.sandbox.coins, 12);
  assert.equal(teo.sandbox.xp, 40);
  assert.equal(teo.events.savedProgress.coins, 12);
  const teoReload = loadSideFromStorage(teo.storage);
  assert.equal(teoReload.abrigos.state, 'done');
  assert.equal(harness(teoReload, teoCtx, teo.storage).talk(teoVendor), false);

  // Lia: permanece bloqueada até a etapa 2, depois entrega o pingente uma única vez.
  const liaState = createSideState();
  const liaCtx = { questStep: 1, waystones: 0 };
  const lia = harness(liaState, liaCtx);
  const liaVendor = { shortName: 'FRUTAS', name: 'Lia · Frutas' };
  assert.equal(lia.talk(liaVendor), false);
  liaCtx.questStep = 2;
  assert.equal(lia.talk(liaVendor), true);
  assert.equal(lia.events.dialogues[0], SIDE_QUESTS.find(q => q.id === 'pingente').offer);
  lia.events.complete();
  collectSide(liaState, 'pingente');
  assert.equal(lia.talk(liaVendor), true);
  assert.equal(lia.events.dialogues[1], SIDE_QUESTS.find(q => q.id === 'pingente').turnIn);
  lia.events.complete();
  assert.equal(liaState.pingente.state, 'done');
  assert.equal(lia.sandbox.coins, 14);
  assert.equal(lia.sandbox.xp, 35);
  const liaReload = loadSideFromStorage(lia.storage);
  assert.equal(liaReload.pingente.state, 'done');
  assert.equal(harness(liaReload, liaCtx, lia.storage).talk(liaVendor), false);
});


test('coleta no mundo usa o updater real e restaura contagem do save após recarregar', () => {
  const runtime = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  const storeKey = runtime.match(/const SIDE_STORE='([^']+)';/)?.[1];
  const saveStart = runtime.indexOf('function saveSide(){');
  const saveEnd = runtime.indexOf('\n', saveStart);
  const loadStart = runtime.indexOf('const sideState=(()=>{');
  const loadEnd = runtime.indexOf('})();', loadStart) + 4;
  const restoreStart = runtime.indexOf('// Itens já entregues/coletados não reaparecem.');
  const restoreEnd = runtime.indexOf('\nfunction syncSideItems', restoreStart);
  const syncStart = runtime.indexOf('function syncSideItems(){');
  const syncEnd = runtime.indexOf('\nfunction refreshSideQuests', syncStart);
  const updateStart = runtime.indexOf('function updateSideItems(dt,now){');
  const updateEnd = runtime.indexOf('\n}\n/** Conversa nas bancas', updateStart) + 2;
  assert.ok(storeKey && saveEnd > saveStart && loadEnd > loadStart && restoreEnd > restoreStart && syncEnd > syncStart && updateEnd > updateStart, 'extrair persistência e coleta reais do runtime');
  const saveSource = runtime.slice(saveStart, saveEnd);
  const loadSource = runtime.slice(loadStart, loadEnd);
  const restoreSource = runtime.slice(restoreStart, restoreEnd);
  const syncSource = runtime.slice(syncStart, syncEnd).trim();
  const updateSource = runtime.slice(updateStart, updateEnd).trim();

  function makeStore() {
    const values = new Map();
    return {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); }
    };
  }
  function saveSideFunction(state, storage) {
    const context = vm.createContext({ SIDE_STORE: storeKey, sideState: state, localStorage: storage });
    return vm.runInContext('(' + saveSource + ')', context, { timeout: 1000 });
  }
  function loadSideFromStorage(storage) {
    const context = vm.createContext({ SIDE_STORE: storeKey, localStorage: storage, createSideState });
    vm.runInContext(loadSource, context, { timeout: 1000 });
    return vm.runInContext('sideState', context, { timeout: 1000 });
  }
  function makeItems() {
    return Array.from({ length: 6 }, (_, i) => ({
      item: 'flor',
      group: { position: { x: i * 10, z: 0 }, visible: false },
      glow: { material: { opacity: 0 } },
      taken: false
    }));
  }
  function worldHarness(state, storage, items) {
    const events = { reveals: 0, rewards: [] };
    const context = vm.createContext({
      SIDE_ITEMS: items,
      SIDE_QUESTS,
      sideState: state,
      player: { position: { x: 0, z: 0 } },
      collectSide,
      saveSide: saveSideFunction(state, storage),
      worldAudio: { reveal() { events.reveals++; } },
      showRewardPop(message) { events.rewards.push(message); }
    });
    const sync = vm.runInContext('(' + syncSource + ')', context, { timeout: 1000 });
    context.refreshSideQuests = () => {
      refreshSide(state, { questStep: 1, waystones: 0 });
      sync();
    };
    const restore = () => vm.runInContext(restoreSource, context, { timeout: 1000 });
    const update = vm.runInContext('(' + updateSource + ')', context, { timeout: 1000 });
    return { context, events, restore, sync, update };
  }

  const storage = makeStore();
  const state = createSideState();
  refreshSide(state, { questStep: 1, waystones: 0 });
  assert.equal(acceptSide(state, 'ervas'), true);
  const firstItems = makeItems();
  const first = worldHarness(state, storage, firstItems);
  first.sync();
  first.update(1, 1000);
  assert.equal(state.ervas.progress, 1);
  assert.equal(firstItems[0].taken, true);
  assert.equal(firstItems[0].group.visible, false);
  assert.equal(first.events.reveals, 1);
  assert.equal(JSON.parse(storage.getItem(storeKey)).ervas.progress, 1);

  // O reload executa a mesma leitura do SIDE_STORE e a mesma restauração dos itens do mundo.
  const restoredState = loadSideFromStorage(storage);
  assert.equal(restoredState.ervas.state, 'active');
  assert.equal(restoredState.ervas.progress, 1);
  const resumedItems = makeItems();
  const resumed = worldHarness(restoredState, storage, resumedItems);
  resumed.restore();
  resumed.sync();
  assert.equal(resumedItems[0].taken, true);
  assert.equal(resumedItems[0].group.visible, false);
  assert.equal(resumedItems[1].group.visible, true);

  for (const i of [1, 2, 3]) {
    resumed.context.player.position.x = i * 10;
    resumed.update(1, 1000 + i);
  }
  assert.equal(restoredState.ervas.progress, 4);
  assert.equal(restoredState.ervas.state, 'ready');
  assert.equal(resumedItems[4].group.visible, false, 'itens restantes somem quando a missão fica pronta');
  const finalReload = loadSideFromStorage(storage);
  assert.equal(finalReload.ervas.progress, 4);
  assert.equal(finalReload.ervas.state, 'ready');
  assert.deepEqual(turnInSide(finalReload, 'ervas'), SIDE_QUESTS[0].reward);
  assert.equal(turnInSide(finalReload, 'ervas'), null);
});


test('Pedras que Lembram não atribui parentesco não aprovado a Téo', () => {
  const quest = SIDE_QUESTS.find(q => q.id === 'abrigos');
  assert.ok(quest, 'missão de pedras existe');
  const dialogue = [...quest.offer, ...quest.turnIn].map(line => line.text).join(' ');
  assert.match(dialogue, /As pedras de abrigo da mata são antigas/);
  assert.match(dialogue, /Leve isto como agradecimento/);
  assert.doesNotMatch(dialogue, /meu avô|foi ele quem fez/i);
});
