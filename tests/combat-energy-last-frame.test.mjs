import test from 'node:test';
import assert from 'node:assert/strict';
import { SwordRites } from '../sword-rites3d.js';
import { makeEnergy } from '../combat-energy3d.js';

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
