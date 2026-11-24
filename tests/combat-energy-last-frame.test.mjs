import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { SwordRites } from '../sword-rites3d.js';
import { makeEnergy } from '../combat-energy3d.js';
import { swordImpactCue } from '../sword-rites-vfx3d.js';

const worldSource = await readFile(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const combatWorkflow = await readFile(new URL('../.github/workflows/combat315.yml', import.meta.url), 'utf8');
const terminalWorkflow = await readFile(new URL('../.github/workflows/combat-energy-last-frame.yml', import.meta.url), 'utf8');

test('impacto secundário do Eclipse tem assinatura VFX mais legível sem alterar o primário', () => {
  assert.deepEqual(swordImpactCue({ secondary: true }), { burst: 24, scale: .82, life: .28, secondScale: .48, secondLife: .22 });
  assert.deepEqual(swordImpactCue({ final: false }), { burst: 15, scale: .52, life: .19 });
  assert.deepEqual(swordImpactCue({ final: true }), { burst: 32, scale: .9, life: .19 });
});

test('auditoria WebGL traduz o foco da esquadra e identifica impactos secundários', () => {
  assert.ok(worldSource.includes('const rawTargetId=e.target?.id??null;'));
  assert.ok(worldSource.includes('rawTargetId===siegeEpoch?squadFocus.id:rawTargetId'));
  assert.ok(worldSource.includes('secondary:!!e.secondary'));
});

test('energia e lâmina laterais delegam o contato sem duplicar áudio/VFX do adaptador', () => {
  const start = worldSource.indexOf('function protaSideHit(');
  const end = worldSource.indexOf('\nfunction riteReady()', start);
  assert.ok(start >= 0 && end > start, 'adaptador de dano lateral precisa existir');
  const adapter = worldSource.slice(start, end).replace(
    'function protaSideHit',
    'globalThis.protaSideHit = function protaSideHit'
  );
  assert.ok(worldSource.includes("else if(type==='impact'||type==='judgment'){") &&
    worldSource.includes('worldAudio.hit();enemyHitFlash=.07;'),
    'o evento impact precisa continuar emitindo o áudio de contato');
  const calls = { damage: 0, audio: 0, slash: 0, flash: 0 };
  const actor = { id: 'e1', alive: true };
  const sandbox = {
    squadSq: () => ({ actor: () => actor, damageActor: () => { calls.damage++; return 12; } }),
    player: { position: { x: 0, z: 0 } },
    playerYaw: 0,
    slashVFX: { impact: () => { calls.slash++; } },
    squadRT: { flash: () => { calls.flash++; } },
    worldAudio: { hit: () => { calls.audio++; } },
  };
  runInNewContext(adapter, sandbox);
  sandbox.protaSideHit(20, 'e1', { target: { x: 1, y: 1, z: 2 }, wave: {} });
  assert.deepEqual(calls, { damage: 1, audio: 0, slash: 0, flash: 1 },
    'ondas de energia delegam VFX/áudio ao evento impact');
  sandbox.protaSideHit(20, 'e1', { target: { x: 1, y: 1, z: 2 }, by: 'blade' });
  assert.deepEqual(calls, { damage: 2, audio: 0, slash: 0, flash: 2 },
    'a lâmina secundária também delega VFX/áudio ao evento impact');
  sandbox.protaSideHit(20, 'e1', { target: { x: 1, y: 1, z: 2 } });
  assert.deepEqual(calls, { damage: 3, audio: 1, slash: 1, flash: 3 },
    'contatos legados sem evento próprio preservam o fallback');
});

test('golpe físico acerta alvo secundário uma vez e marca o evento como lâmina', () => {
  const hits = [], impacts = [];
  const focus = { id: 'focus', x: 8, y: 1, z: -8, radius: .45, height: 1.8, alive: true };
  const side = { id: 'side', x: 0, y: 1, z: 0, radius: .45, height: 1.8, alive: true };
  const blade = { base: { x: -1, y: 1, z: 0 }, tip: { x: 1, y: 1, z: 0 } };
  const rites = new SwordRites({
    pose: () => blade,
    hit: (amount, id, kind, meta) => hits.push({ amount, id, kind, meta }),
    event: (name, data) => { if (name === 'impact') impacts.push(data); },
  });
  assert.equal(rites.attack('aurora', { damage: 20, yaw: 0, target: focus, mode: 'ground' }), true);
  const ctx = { from: { x: 0, y: 0, z: 1 }, target: focus, others: [side], sword: 'aurora', grounded: true };
  rites.update(.35, ctx);
  rites.update(1 / 60, ctx);
  assert.equal(hits.length, 1, 'o mesmo inimigo não pode receber dano repetido no mesmo golpe');
  assert.equal(hits[0].id, 'side');
  assert.equal(hits[0].kind, 'energy-side');
  assert.equal(hits[0].meta.by, 'blade');
  assert.equal(impacts.length, 1, 'o contato físico secundário deve emitir um único evento');
  assert.equal(impacts[0].target.id, 'side');
  assert.equal(impacts[0].secondary, true);
  assert.equal(impacts[0].by, 'blade');
});

function sideTargetNearEnd({ wall = false, fps = 120 } = {}) {
  const hits = [], events = [];
  const r = new SwordRites({
    hit: (amount, id, kind) => hits.push({ amount, id, kind }),
    event: (name, data) => events.push({ name, data }),
    blocked: p => wall && p.z > 2.95 && p.z < 2.99,
  });
  const e = makeEnergy({
    kind: 'wave', speed: 12, range: 3, radius: 1.2, life: 10, roll: 0, band: .7,
  }, { x: 0, y: 1, z: 0 }, 0, 0);
  e.travel = 2.9;
  e.owner = { damage: 24, def: { multiplier: 1 }, targetId: 'primary' };
  r.energies.push(e);
  r.update(1/fps, {
    from: { x: 0, y: 0, z: 0 }, target: null,
    others: [{ id: 'side', x: 0, y: 1, z: 3, radius: .45, height: 1.8, alive: true }],
  });
  return { hits, events, waveEnded: e.done, remaining: r.energies.length };
}

for (const fps of [20, 30, 60, 120]) {
  test(`onda acerta inimigo secundário no último quadro do alcance a ${fps} FPS`, () => {
    const result = sideTargetNearEnd({ fps });
    assert.equal(result.waveEnded, true, 'onda deve terminar ao chegar no alcance máximo');
    assert.equal(result.remaining, 0, 'energia é removida após o último contato');
    assert.deepEqual(result.hits.map(h => h.id), ['side'],
      'inimigo na ponta da onda não pode ficar imune no quadro terminal');
    assert.equal(result.hits[0].kind, 'energy-side');
    const impacts = result.events.filter(e => e.name === 'impact');
    assert.equal(impacts.length, 1, 'contato lateral precisa emitir impacto visual uma única vez');
    assert.equal(impacts[0].data.target.id, 'side');
    assert.equal(impacts[0].data.by, 'energy');
    assert.equal(impacts[0].data.secondary, true, 'impacto lateral precisa ser marcado para o VFX');
    assert.equal(impacts[0].data.hitstop, 0, 'contatos laterais não acumulam hitstop');
  });
}

test('onda bloqueada por parede antes do limite não atravessa obstáculo', () => {
  const result = sideTargetNearEnd({ wall: true });
  assert.deepEqual(result.hits, [], 'parede deve impedir o dano lateral');
});

for (const fps of [20, 30, 60, 120]) {
  test(`onda produz dano e impacto independentes em dois secundários a ${fps} FPS`, () => {
    const hits = [], impacts = [];
    const rites = new SwordRites({
      hit: (amount, id, kind) => hits.push({ amount, id, kind }),
      event: (name, data) => { if (name === 'impact') impacts.push(data); },
    });
    const wave = makeEnergy({
      kind: 'wave', speed: 12, range: 3, radius: 1.2, life: 10, roll: 0, band: .7,
    }, { x: 0, y: 1, z: 0 }, 0, 0);
    wave.travel = 2.9;
    wave.owner = { damage: 24, def: { multiplier: 1 }, targetId: 'primary' };
    rites.energies.push(wave);
    const others = [
      { id: 'left', x: -.2, y: 1, z: 3, radius: .45, height: 1.8, alive: true },
      { id: 'right', x: .2, y: 1, z: 3, radius: .45, height: 1.8, alive: true },
    ];
    rites.update(1 / fps, { from: { x: 0, y: 0, z: 0 }, target: null, others });
    assert.deepEqual(hits.map(h => h.id).sort(), ['left', 'right']);
    assert.ok(hits.every(h => h.amount > 0 && h.kind === 'energy-side'));
    assert.deepEqual(impacts.map(i => i.target.id).sort(), ['left', 'right']);
    assert.ok(impacts.every(i => i.by === 'energy' && i.hitstop === 0 && i.shake === 0));
    assert.ok(impacts.every(i => i.secondary === true));
    rites.update(1 / fps, { from: { x: 0, y: 0, z: 0 }, target: null, others });
    assert.equal(hits.length, 2, 'nenhum alvo pode sofrer dano duplicado');
    assert.equal(impacts.length, 2, 'nenhum impacto pode ser duplicado');
  });
}

test('QA multialvo: HP e posição do impacto da onda são independentes por inimigo', () => {
  const hp = new Map([['left', 198], ['right', 173]]);
  const impacts = [];
  const rites = new SwordRites({
    hit: (amount, id, kind) => {
      assert.equal(kind, 'energy-side');
      assert.ok(hp.has(id), 'ID do inimigo deve existir no cenário');
      hp.set(id, hp.get(id) - amount);
    },
    event: (name, data) => { if (name === 'impact') impacts.push(data); },
  });
  const wave = makeEnergy({
    kind: 'wave', speed: 12, range: 3, radius: 1.2, life: 10, roll: 0, band: .7,
  }, { x: 0, y: 1, z: 0 }, 0, 0);
  wave.travel = 2.9;
  wave.owner = { damage: 24, def: { multiplier: 1 }, targetId: 'primary' };
  rites.energies.push(wave);
  const others = [
    { id: 'left', x: -.2, y: 1, z: 3, radius: .45, height: 1.8, alive: true },
    { id: 'right', x: .2, y: 1, z: 3, radius: .45, height: 1.8, alive: true },
  ];
  rites.update(1 / 30, { from: { x: 0, y: 0, z: 0 }, target: null, others });
  assert.ok(hp.get('left') < 198 && hp.get('right') < 173, 'ambos os HP devem cair');
  assert.equal(impacts.length, 2);
  for (const impact of impacts) {
    const enemy = others.find(o => o.id === impact.target.id);
    assert.ok(enemy, 'evento de impacto deve identificar o inimigo correto');
    assert.ok(Math.abs(impact.p.x - enemy.x) < .001);
    assert.ok(Math.abs(impact.p.z - (enemy.z - enemy.radius)) < .001,
      'efeito deve nascer na superfície frontal do inimigo, não na origem da onda');
  }
  const after = [...hp];
  rites.update(1 / 30, { from: { x: 0, y: 0, z: 0 }, target: null, others });
  assert.deepEqual([...hp], after, 'não pode duplicar dano no quadro seguinte');
  assert.equal(impacts.length, 2);
});

function auroraWaveScenario({ fps = 60, wall = false } = {}) {
  const hp = new Map([['primary', 1000], ['left', 1000], ['right', 1000], ['control', 1000]]);
  const hits = [], impacts = [];
  const targets = [
    { id: 'primary', x: 0, y: 1.1, z: 3, radius: .45, height: 1.8, alive: true },
    { id: 'left', x: -1.3, y: 1.1, z: 3, radius: .45, height: 1.8, alive: true },
    { id: 'right', x: 1.3, y: 1.1, z: 3, radius: .45, height: 1.8, alive: true },
    { id: 'control', x: -5, y: 1.1, z: 3, radius: .45, height: 1.8, alive: true },
  ];
  const from = { x: 0, y: 0, z: 0 };
  const rites = new SwordRites({
    hit: (amount, id, kind, meta) => {
      hits.push({ amount, id, kind, serial: meta?.wave?.serial });
      if (hp.has(id)) hp.set(id, hp.get(id) - amount);
    },
    event: (name, data) => { if (name === 'impact') impacts.push(data); },
    blocked: p => wall && p.z > 1.5,
  });
  const cast = rites.cast('aurora', { mana: 100, owned: true, damage: 40, yaw: 0, from, target: targets[0] });
  const ctx = { from, target: targets[0], others: targets.slice(1), sword: 'aurora', grounded: true };
  for (let i = 0; i < Math.ceil(2.5 * fps); i++) rites.update(1 / fps, ctx);
  return { cast, hp: [...hp], hits, impacts, remainingWaves: rites.waves.length };
}

for (const fps of [20, 30, 60, 120]) {
  test(`Eclipse das Lâminas acerta dois secundários com impacto individual a ${fps} FPS`, () => {
    const result = auroraWaveScenario({ fps });
    assert.equal(result.cast.ok, true, 'o rito aurora precisa iniciar');
    const hp = new Map(result.hp);
    assert.ok(hp.get('primary') < 1000);
    assert.equal(result.impacts.filter(e => e.target?.id === 'primary').length, 4);
    assert.ok(result.impacts.filter(e => e.target?.id === 'primary').every(e => e.secondary !== true));
    assert.ok(Math.abs(result.impacts.find(e => e.target?.id === 'left').target.x - result.impacts.find(e => e.target?.id === 'right').target.x) >= 2.5);
    for (const id of ['left', 'right']) {
      assert.ok(hp.get(id) < 1000, `${id} precisa receber dano real da onda`);
      const hits = result.hits.filter(h => h.id === id);
      const impacts = result.impacts.filter(e => e.target?.id === id);
      assert.equal(hits.length, 4, 'cada onda deve acertar o alvo lateral uma vez');
      assert.ok(hits.every(h => h.kind === 'energy-side' && h.amount > 0));
      assert.equal(impacts.length, 4, 'cada acerto lateral precisa de um evento impact');
      assert.equal(new Set(impacts.map(e => e.energy?.serial)).size, 4,
        'um mesmo alvo não pode receber dano duplicado pela mesma onda');
      assert.ok(impacts.every(e => e.by === 'energy' && e.hitstop === 0 && e.shake === 0));
      assert.ok(impacts.every(e => e.secondary === true));
      const target = result.impacts.find(e => e.target?.id === id).target;
      for (const impact of impacts) {
        assert.ok(Math.abs(impact.p.x - target.x) < .001);
        assert.ok(Math.abs(impact.p.z - (target.z - target.radius)) < .001,
          'impacto deve nascer na superfície frontal do inimigo');
      }
    }
    assert.equal(hp.get('control'), 1000, 'alvo fora da largura da onda não pode receber dano');
    assert.equal(result.impacts.filter(e => e.target?.id === 'control').length, 0);
  });
}

test('Eclipse das Lâminas não causa dano nem impacto lateral através de parede', () => {
  const result = auroraWaveScenario({ fps: 60, wall: true });
  assert.deepEqual(result.hits, []);
  assert.deepEqual(result.impacts, []);
});
function physicalBladeSideScenario({ fps = 60, wall = false } = {}) {
  const hits = [], impacts = [];
  const focus = { id: 'focus', x: 8, y: 1, z: -8, radius: .45, height: 1.8, alive: true };
  const others = [
    { id: 'left', x: -.55, y: 1, z: 0, radius: .45, height: 1.8, alive: true },
    { id: 'right', x: .55, y: 1, z: 0, radius: .45, height: 1.8, alive: true },
  ];
  const blade = { base: { x: -1, y: 1, z: 0 }, tip: { x: 1, y: 1, z: 0 } };
  const rites = new SwordRites({
    pose: () => blade,
    hit: (amount, id, kind, meta) => hits.push({ amount, id, kind, meta }),
    event: (name, data) => { if (name === 'impact') impacts.push(data); },
    // A wall blocks only the right actor's line from the player; the blade itself is clear.
    blocked: p => wall && p.x > .05 && p.z > .4,
  });
  assert.equal(rites.attack('aurora', { damage: 20, yaw: 0, target: focus, mode: 'ground' }), true);
  const ctx = { from: { x: 0, y: 0, z: 1 }, target: focus, others, sword: 'aurora', grounded: true };
  for (let i = 0; i < Math.ceil(.65 * fps); i++) rites.update(1 / fps, ctx);
  return { hits, impacts };
}

for (const fps of [20, 30, 60, 120]) {
  test('golpe físico multialvo mantém um impacto por alvo a ' + fps + ' FPS', () => {
    const result = physicalBladeSideScenario({ fps });
    assert.deepEqual(result.hits.map(h => h.id).sort(), ['left', 'right']);
    assert.ok(result.hits.every(h => h.amount > 0 && h.kind === 'energy-side' && h.meta?.by === 'blade'));
    assert.deepEqual(result.impacts.map(e => e.target.id).sort(), ['left', 'right']);
    assert.ok(result.impacts.every(e => e.by === 'blade' && e.secondary === true));
    assert.ok(result.impacts.every(e => e.hitstop === 0 && e.shake === 0));
    for (const impact of result.impacts) {
      const surfaceDistance = Math.hypot(
        impact.p.x - impact.target.x,
        impact.p.y - impact.target.y,
        impact.p.z - impact.target.z
      );
      assert.ok(Math.abs(surfaceDistance - impact.target.radius) < .02,
        `VFX de ${impact.target.id} precisa ficar na superfície da cápsula, não dentro do corpo`);
      assert.ok(impact.p.z > impact.target.z,
        `VFX de ${impact.target.id} precisa ficar na face voltada ao protagonista`);
      assert.ok(Math.abs(impact.p.y - impact.target.y) < .02,
        `VFX de ${impact.target.id} não pode cair para os pés quando a lâmina cruza o eixo`);
    }
    const impactXs = result.impacts.map(e => e.p.x).sort((a, b) => a - b);
    assert.ok(impactXs[1] - impactXs[0] >= .65,
      'os dois impactos precisam ficar visualmente separados nos corpos dos dois alvos');
    assert.equal(new Set(result.impacts.map(e => Math.round(e.p.x * 100))).size, 2,
      'dois inimigos em pontos diferentes da lâmina não podem compartilhar a mesma origem de VFX');
    assert.equal(new Set(result.hits.map(h => h.id)).size, 2, 'cada inimigo recebe no máximo um golpe por swing');
    assert.equal(result.impacts.length, 2, 'cada contato físico gera exatamente um impacto');
  });
}

test('golpe físico secundário respeita parede e não emite dano nem VFX atrás dela', () => {
  const result = physicalBladeSideScenario({ fps: 60, wall: true });
  assert.deepEqual(result.hits.map(h => h.id), ['left']);
  assert.deepEqual(result.impacts.map(e => e.target.id), ['left']);});

function sweptWallSideScenario({ targetX = 1.2, wall = true, fps = 60 } = {}) {
  const hits = [], impacts = [];
  const focus = { id: 'focus', x: 8, y: 1, z: -8, radius: .45, height: 1.8, alive: true };
  const side = { id: 'side', x: targetX, y: 1, z: -.5, radius: .45, height: 1.8, alive: true };
  const start = { base: { x: 0, y: 1, z: 0 }, tip: { x: 0, y: 1, z: -1 } };
  const end = { base: { x: 1.2, y: 1, z: 0 }, tip: { x: 1.2, y: 1, z: -1 } };
  const rites = new SwordRites({
    pose: a => a.t < .24 ? start : end,
    hit: (amount, id, kind, meta) => hits.push({ amount, id, kind, meta }),
    event: (name, data) => { if (name === 'impact') impacts.push(data); },
    blocked: p => wall && p.x > .45 && p.x < .55 && p.z > -.65 && p.z < -.35,
  });
  assert.equal(rites.attack('aurora', { damage: 20, yaw: 0, target: focus, mode: 'ground' }), true);
  const ctx = { from: { x: 0, y: 0, z: 1 }, target: focus, others: [side], sword: 'aurora', grounded: true };
  for (let i = 0; i < Math.ceil(.65 * fps); i++) rites.update(1 / fps, ctx);
  return { hits, impacts };
}

for (const fps of [20, 30, 60, 120]) {
  test('golpe físico secundário para na primeira parede antes do alvo a ' + fps + ' FPS', () => {
    const result = sweptWallSideScenario({ fps, targetX: 1.2, wall: true });
    assert.deepEqual(result.hits, [], 'alvo inteiramente atrás da parede não recebe dano');
    assert.deepEqual(result.impacts, [], 'alvo atrás da parede não recebe VFX');
  });
  test('golpe físico secundário ainda acerta antes da parede a ' + fps + ' FPS', () => {
    const result = sweptWallSideScenario({ fps, targetX: .3, wall: true });
    assert.deepEqual(result.hits.map(h => h.id), ['side']);
    assert.deepEqual(result.impacts.map(e => e.target.id), ['side']);
  });
}
test('golpe físico secundário atravessa a faixa livre quando não há parede', () => {
  const result = sweptWallSideScenario({ fps: 60, targetX: 1.2, wall: false });
  assert.deepEqual(result.hits.map(h => h.id), ['side']);
  assert.deepEqual(result.impacts.map(e => e.target.id), ['side']);
});

function primaryBladeWallScenario({ targetX = 1.2, wall = true, fps = 60 } = {}) {
  const hits = [], impacts = [];
  const focus = { id: 'focus', x: targetX, y: 1, z: -.5, radius: .45, height: 1.8, alive: true };
  const start = { base: { x: 0, y: 1, z: 0 }, tip: { x: 0, y: 1, z: -1 } };
  const end = { base: { x: 1.2, y: 1, z: 0 }, tip: { x: 1.2, y: 1, z: -1 } };
  const rites = new SwordRites({
    pose: a => a.t < .24 ? start : end,
    hit: (amount, id, kind) => hits.push({ amount, id, kind }),
    event: (name, data) => { if (name === 'impact') impacts.push(data); },
    // A parede cruza a lâmina durante a varredura, mas não a linha direta jogador-alvo.
    blocked: p => wall && p.x > .45 && p.x < .55 && p.z > -.65 && p.z < -.35,
  });
  assert.equal(rites.attack('aurora', { damage: 20, yaw: 0, target: focus, mode: 'ground' }), true);
  const ctx = { from: { x: 0, y: 0, z: 1 }, target: focus, others: [], sword: 'aurora', grounded: true };
  for (let i = 0; i < Math.ceil(.65 * fps); i++) rites.update(1 / fps, ctx);
  return { hits, impacts };
}

for (const fps of [20, 30, 60, 120]) {
  test('golpe físico primário não atravessa parede cruzada pela varredura a ' + fps + ' FPS', () => {
    const result = primaryBladeWallScenario({ fps, targetX: 1.2, wall: true });
    assert.deepEqual(result.hits, [], 'alvo primário atrás da parede não recebe dano');
    assert.deepEqual(result.impacts, [], 'alvo primário atrás da parede não recebe VFX');
  });
}

test('golpe físico primário ainda acerta antes da parede e posiciona o impacto no contato', () => {
  const result = primaryBladeWallScenario({ fps: 60, targetX: .3, wall: true });
  assert.deepEqual(result.hits.map(h => h.id), ['focus']);
  assert.deepEqual(result.impacts.map(e => e.target.id), ['focus']);
  const p = result.impacts[0].p;
  assert.ok(Math.abs(Math.hypot(p.x - .3, p.y - 1, p.z + .5) - .45) < .02,
    'VFX primário precisa nascer na superfície do alvo');
  assert.ok(p.x < .45, 'impacto do alvo antes da parede não pode aparecer depois dela');
});

function primaryBladeSpawnWallScenario({ fps = 60 } = {}) {
  const hits = [], impacts = [];
  const focus = { id: 'focus', x: 1.2, y: 1, z: -.5, radius: .45, height: 1.8, alive: true };
  const start = { base: { x: 0, y: 1, z: 0 }, tip: { x: 0, y: 1, z: -1 } };
  const end = { base: { x: 1.2, y: 1, z: 0 }, tip: { x: 1.2, y: 1, z: -1 } };
  const rites = new SwordRites({
    pose: a => a.t < .24 ? start : end,
    hit: (amount, id, kind) => hits.push({ amount, id, kind }),
    event: (name, data) => { if (name === 'impact') impacts.push(data); },
    // Parede fina de 1 cm: só o ponto inicial do punho fica dentro dela.
    blocked: p => Math.abs(p.x) < .02 && Math.abs(p.z) < .01 && p.y > .9 && p.y < 1.1,
  });
  assert.equal(rites.attack('aurora', { damage: 20, yaw: 0, target: focus, mode: 'ground' }), true);
  const ctx = { from: { x: 0, y: 0, z: 1 }, target: focus, others: [], sword: 'aurora', grounded: true };
  for (let i = 0; i < Math.ceil(.65 * fps); i++) rites.update(1 / fps, ctx);
  return { hits, impacts };
}

for (const fps of [20, 30, 60, 120]) {
  test('golpe físico primário não escapa de parede fina já ocupada pelo punho a ' + fps + ' FPS', () => {
    const result = primaryBladeSpawnWallScenario({ fps });
    assert.deepEqual(result.hits, [], 'alvo além da parede fina não recebe dano');
    assert.deepEqual(result.impacts, [], 'alvo além da parede fina não recebe VFX');
  });
}

test('golpe físico primário acerta no corredor sem obstrução e usa a superfície do alvo', () => {
  const result = primaryBladeWallScenario({ fps: 60, targetX: 1.2, wall: false });
  assert.deepEqual(result.hits.map(h => h.id), ['focus']);
  assert.deepEqual(result.impacts.map(e => e.target.id), ['focus']);
  const p = result.impacts[0].p;
  assert.ok(Math.abs(Math.hypot(p.x - 1.2, p.y - 1, p.z + .5) - .45) < .02,
    'VFX primário precisa nascer na superfície do alvo');
  assert.ok(p.x < 1.2, 'impacto deve ficar na face voltada à lâmina');
});

test('terminal-wave captura e testes usam o HEAD exato da PR', () => {
  const ref = 'ref: ${{ github.event.pull_request.head.sha || github.sha }}';
  assert.equal(terminalWorkflow.split(ref).length - 1, 2);
  assert.equal(terminalWorkflow.split('Verify exact PR head').length - 1, 1);
  assert.ok(terminalWorkflow.includes('run: test "$(git rev-parse HEAD)" = "$PR_HEAD_SHA"'));
  assert.ok(terminalWorkflow.includes('persist-credentials: false'));
});

test('golpe físico para de consultar paredes após o foco já receber seu único hit', () => {
  const hits = [];
  let blockedCalls = 0;
  const focus = { id: 'focus', x: 0, y: 1, z: -.5, radius: .45, height: 1.8, alive: true };
  const blade = { base: { x: 0, y: 1, z: 0 }, tip: { x: 0, y: 1, z: -1 } };
  const rites = new SwordRites({
    pose: () => blade,
    hit: (amount, id, kind) => hits.push({ amount, id, kind }),
    blocked: () => { blockedCalls++; return false; },
  });
  assert.equal(rites.attack('aurora', { damage: 20, yaw: 0, target: focus, mode: 'ground' }), true);
  const ctx = { from: { x: 0, y: 0, z: 1 }, target: focus, others: [], sword: 'aurora', grounded: true };
  for (let i = 0; i < 60 && !hits.length; i++) rites.update(1 / 120, ctx);
  assert.equal(hits.length, 1, 'o foco deve receber exatamente um hit');
  const callsAfterHit = blockedCalls;
  for (let i = 0; i < 24; i++) rites.update(1 / 120, ctx);
  assert.equal(blockedCalls, callsAfterHit,
    'sem alvos restantes, o swing não deve continuar amostrando colisão em cada substep');
});

test('Combat315 captura e testes usam o HEAD exato da PR', () => {
  const ref = 'ref: ${{ github.event.pull_request.head.sha || github.sha }}';
  assert.equal(combatWorkflow.split(ref).length - 1, 2);
  assert.equal(combatWorkflow.split('Verify exact PR head').length - 1, 2);
  assert.ok(combatWorkflow.includes('run: test "$(git rev-parse HEAD)" = "$PR_HEAD_SHA"'));
  assert.ok(combatWorkflow.includes('name: combat315-${{ github.event.pull_request.head.sha || github.sha }}'));
});
