import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirector } from './cutscenes3d.js';
import { SNOW_CITY } from './snow3d.js';

const scene = [
  { type: 'say', who: 'a', text: '1' },
  { type: 'shot', id: 's', dur: 1, args: {}, with: [{ type: 'do', id: 'pagar', args: {} }] },
  { type: 'do', id: 'sair' },
  { type: 'say', who: 'b', text: '2' }
];

test('MOD 217: pular aplica uma vez as ações que faltavam e termina a cena uma vez só', () => {
  const done = [], ran = [], flushed = [];
  const d = createDirector({ do: id => ran.push(id), flush: list => flushed.push(...list.map(x => x.id)) });
  d.play('bandidos', scene, s => done.push(s));
  assert.equal(d.skip(), true);
  assert.equal(d.skip(), false);
  assert.deepEqual(flushed, ['pagar', 'sair']);
  assert.deepEqual(ran, []);
  assert.deepEqual(done, [true]);
});

test('MOD 217: ações que já rodaram não são repetidas ao pular', () => {
  const ran = [], flushed = [];
  const d = createDirector({ do: id => ran.push(id), flush: list => flushed.push(...list.map(x => x.id)) });
  d.play('bandidos', scene);
  d.tap();
  d.update(1.01);
  assert.deepEqual(ran, ['pagar', 'sair']);
  d.skip();
  assert.deepEqual(flushed, []);
});

test('MOD 217: cena obrigatória (purificação) não pode ser pulada', () => {
  const d = createDirector({});
  d.play('laboratorio', scene, null, { skippable: false });
  assert.equal(d.skippable, false);
  assert.equal(d.skip(), false);
  assert.equal(d.running, true);
});

test('MOD 217: o caminho do Anjo termina a menos de 5 m da caverna (gatilho ENTRAR)', () => {
  const end = SNOW_CITY.anjoPath.at(-1);
  assert.ok(Math.hypot(end[0] - SNOW_CITY.cave.x, end[1] - SNOW_CITY.cave.z) < 5);
  assert.ok(SNOW_CITY.caveApproach.hx > 0);
});
