import test from 'node:test';
import assert from 'node:assert/strict';
import { DIMENSIONS, BISHOP_KEYS, dimensionForProfile, arenaSpec, vsCard, arenaSpots, DIM_FLOOR_Y } from './dimensions3d.js';

test('os quatro Bispos mantêm os nomes do roteiro e VHAZRAEL é o primeiro', () => {
  assert.deepEqual(BISHOP_KEYS.map(k => DIMENSIONS[k].name), ['VHAZRAEL', 'VORGAZHEK', "ZAR'KHAEL", 'VÉRAXION']);
  for (const k of Object.keys(DIMENSIONS)) assert.ok(!/KHRAVAZOTH/i.test(JSON.stringify(DIMENSIONS[k])));
});

test('cada dimensão tem arena própria, afastada das outras e abaixo do mundo', () => {
  const centers = new Set(Object.keys(DIMENSIONS).map(k => DIMENSIONS[k].center.x + ',' + DIMENSIONS[k].center.z));
  assert.equal(centers.size, Object.keys(DIMENSIONS).length);
  for (const k of Object.keys(DIMENSIONS)) assert.equal(arenaSpec(k).y, DIM_FLOOR_Y);
});

test('a dimensão 5 é a do Pecado, não um quinto Bispo', () => {
  assert.equal(BISHOP_KEYS.includes('greed'), false);
  assert.equal(DIMENSIONS.greed.order, 5);
});

test('perfil de luta resolve a dimensão e o cartão VS traz foto, nome e fala', () => {
  assert.equal(dimensionForProfile('vhazrael').key, 'bishop1');
  assert.equal(dimensionForProfile('vorgazhek').key, 'bishop2');
  assert.equal(dimensionForProfile('captor'), null);
  const c = vsCard('bishop3', 'Davi');
  assert.equal(c.playerName, 'DAVI');
  assert.equal(c.bishopName, "ZAR'KHAEL");
  assert.match(c.bishopImage, /Bispo3/);
  assert.ok(c.line.length > 20);
  assert.equal(vsCard('nada'), null);
});

test('o jogador nasce na frente do chefe, dentro do raio caminhável', () => {
  for (const k of Object.keys(DIMENSIONS)) {
    const s = arenaSpots(k), sp = arenaSpec(k);
    assert.ok(Math.hypot(s.player.x - sp.x, s.player.z - sp.z) < sp.radius);
    assert.ok(Math.hypot(s.boss.x - sp.x, s.boss.z - sp.z) < sp.radius);
    assert.ok(s.player.z > s.boss.z);
  }
});
