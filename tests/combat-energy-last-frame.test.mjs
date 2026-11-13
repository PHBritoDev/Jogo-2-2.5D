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
  });
}

test('onda bloqueada por parede antes do limite não atravessa obstáculo', () => {
  const result = sideTargetNearEnd({ wall: true });
  assert.deepEqual(result.hits, [], 'parede deve impedir o dano lateral');
});
