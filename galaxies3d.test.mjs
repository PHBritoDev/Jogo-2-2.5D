import test from 'node:test';
import assert from 'node:assert/strict';
import { GALAXIES, galaxyProgress, unlockedGalaxies } from './galaxies3d.js';

test('sete galáxias; só a primeira começa liberada', () => {
  assert.equal(GALAXIES.length, 7);
  assert.deepEqual(unlockedGalaxies({}), [1]);
  assert.deepEqual(unlockedGalaxies({ unlocked: 2 }), [1, 2]);
  assert.deepEqual(unlockedGalaxies({ unlocked: 99 }).length, 7);
  for (const g of GALAXIES.slice(1)) assert.equal(g.name, 'Selada', 'nomes futuros não são revelados');
});

test('progresso da Galáxia 1 cresce com o Ato I e não passa de 100%', () => {
  assert.equal(galaxyProgress(1, { questStep: 0 }), 0);
  assert.ok(galaxyProgress(1, { questStep: 8, bishopsDefeated: 1 }) > galaxyProgress(1, { questStep: 4 }));
  assert.ok(galaxyProgress(1, { questStep: 8, bishopsDefeated: 9 }) <= 1);
  assert.equal(galaxyProgress(2, { questStep: 8 }), 0);
});
