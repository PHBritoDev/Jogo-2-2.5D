import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { SwordRites } from '../sword-rites3d.js';
import { makeEnergy } from '../combat-energy3d.js';

const worldSource = await readFile(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

test('energia lateral usa o evento de impacto uma vez, sem duplicar áudio/VFX do adaptador', () => {
  const start = worldSource.indexOf('function protaSideHit(');
  const end = worldSource.indexOf('\nfunction riteReady()', start);
  assert.ok(start >= 0 && end > start, 'adaptador de dano lateral precisa existir');
  const adapter = worldSource.slice(start, end).replace(
    'function protaSideHit',
    'globalThis.protaSideHit = function protaSideHit'
  );
  const calls = { damage: 0, audio: 0, slash: 0, flash: 0 };
  const actor = { id: 'e1', alive: true };
  const sandbox = {
    squadSq: () => ({ actor: () => actor, damageActor: () => { calls.damage++; return 12; } }),
    player: { position: { x: 0, z: 0 } },
    slashVFX: { impact: () => { calls.slash++; } },
    squadRT: { flash: () => { calls.flash++; } },
    worldAudio: { hit: () => { calls.audio++; } },
  };
  runInNewContext(adapter, sandbox);
  sandbox.protaSideHit(20, 'e1', { target: { x: 1, y: 1, z: 2 }, wave: {} });
  assert.deepEqual(calls, { damage: 1, audio: 0, slash: 0, flash: 1 },
    'wave/energy já emitem VFX e áudio pelo evento impact');
  sandbox.protaSideHit(20, 'e1', { target: { x: 1, y: 1, z: 2 } });
  assert.deepEqual(calls, { damage: 2, audio: 1, slash: 1, flash: 2 },
    'contatos sem evento de energia preservam o fallback');
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
    { id: 'left', x: -.25, y: 1.1, z: 3, radius: .45, height: 1.8, alive: true },
    { id: 'right', x: .25, y: 1.1, z: 3, radius: .45, height: 1.8, alive: true },
    { id: 'control', x: 6, y: 1.1, z: 3, radius: .45, height: 1.8, alive: true },
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
      const target = result.impacts.find(e => e.target?.id === id).target;
      for (const impact of impacts) {
        assert.ok(Math.abs(impact.p.x - target.x) < .001);
        assert.ok(Math.abs(impact.p.z - (target.z - target.radius)) < .001,
          'impacto deve nascer na superfície frontal do inimigo');
      }
    }
    assert.equal(hp.get('control'), 1000, 'alvo fora da largura da onda não pode receber dano');
  });
}

test('Eclipse das Lâminas não causa dano nem impacto lateral através de parede', () => {
  const result = auroraWaveScenario({ fps: 60, wall: true });
  assert.deepEqual(result.hits, []);
  assert.deepEqual(result.impacts, []);
});
