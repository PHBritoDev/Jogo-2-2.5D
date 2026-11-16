import test from 'node:test';
import assert from 'node:assert/strict';
import { SIDE_QUESTS, createSideState, refreshSide, acceptSide, collectSide, turnInSide, questForGiver, activeSideLines } from './sidequests3d.js';

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
  assert.deepEqual(activeSideLines(s), ['Flores de Vigília · volte a Mara']);
});
