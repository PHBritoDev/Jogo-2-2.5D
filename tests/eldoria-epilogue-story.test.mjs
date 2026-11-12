import test from 'node:test';
import assert from 'node:assert/strict';
import { afterVhazraelScene } from '../act1-flow.js';

test('Epílogo de Eldória liga Vhazrael ao caminho vulcânico sem antecipar destinos', () => {
  const steps = afterVhazraelScene();
  const talks = steps.filter(s => s.type === 'say');
  assert.equal(steps[0].type, 'shot');
  assert.equal(steps.at(-2).type, 'do');
  assert.equal(steps.at(-2).id, 'escuro');
  assert.equal(steps.at(-1).type, 'wait');
  assert.ok(talks.some(s => /cargas enviadas para as montanhas/i.test(s.text)));
  assert.ok(talks.some(s => /região vulcânica/i.test(s.text)));
  assert.ok(talks.some(s => /sobreviveram/i.test(s.text)));
  assert.ok(talks.every(s => !/Ilyan|crianças morreram|crianças foram salvas/i.test(s.text)));
});
