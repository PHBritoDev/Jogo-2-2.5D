import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILY, KITS, kitFor, tierOf, powerStats, pickMove } from './powers3d.js';

test('toda família tem Habilidade 1, 2 e 3, golpe de espada e ultimate, com nome', () => {
  for (const [f, k] of Object.entries(KITS)) {
    assert.equal(k.skills.length, 3, f);
    assert.deepEqual(k.skills.map(s => s.id), ['s1', 's2', 's3']);
    for (const m of [...k.skills, k.sword, k.ult]) { assert.ok(m.name && m.type, f + ' ' + m.id); assert.ok(m.dmg > 0); }
  }
  for (const p of ['captor', 'demon2', 'demon3', 'demon4', 'valerio', 'vorgazhek', 'zarkhael', 'veraxion', 'greed1', 'greed2', 'greed3', 'miniboss2', 'elite4'])
    assert.ok(kitFor(p), p);
  assert.equal(KITS.veraxion.ult.type, 'void'); assert.equal(KITS.greed3.ult.type, 'nova');
  for (const f of ['valerio', 'vorgazhek', 'zarkhael', 'veraxion', 'greed1', 'greed2', 'greed3']) assert.ok(KITS[f].book, f + ' invoca com grimório');
});

test('nível ajusta dano e recarga; comuns são mais fracos que chefes', () => {
  assert.equal(tierOf('valerio'), 'boss'); assert.equal(tierOf('miniboss3'), 'elite'); assert.equal(tierOf('captor'), 'common'); assert.equal(tierOf('rival'), null);
  const c = powerStats('captor', KITS.seguidor.skills[0]), e = powerStats('elite1', KITS.seguidor.skills[0]);
  assert.ok(c.dmg < e.dmg && c.cd > e.cd);
  assert.equal(Object.keys(FAMILY).length, 29);
});

test('escolha do poder: espada de perto, habilidades à distância, em rodízio', () => {
  assert.equal(pickMove('valerio', {}, 3).id, 'sw');
  assert.equal(pickMove('valerio', { sw: 2 }, 3.5).id, 's1');
  assert.equal(pickMove('valerio', { sw: 2 }, 8, 's1').id, 's2');
  assert.equal(pickMove('valerio', { s1: 1, s2: 1, s3: 1, sw: 1 }, 8), null);
  assert.equal(pickMove('valerio', {}, 30), null);
  assert.equal(pickMove('rival', {}, 5), null);
});
