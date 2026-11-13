import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapState, serializeMapState, FOG_CELLS } from '../map3d.js';

test('mapa ignora listas inválidas sem perder os campos válidos', () => {
  const a = createMapState({ pois: { inicio: true }, waystones: ['abrigo-sope'] });
  assert.deepEqual([...a.pois], []);
  assert.deepEqual([...a.waystones], ['abrigo-mata']);
  const b = createMapState({ pois: ['inicio'], waystones: { id: 'abrigo-vila' } });
  assert.deepEqual([...b.pois], ['inicio']);
  assert.deepEqual([...b.waystones], []);
});

test('mapa não aceita texto como lista e preserva ida e volta de saves válidos', () => {
  const invalid = createMapState({ pois: 'inicio', waystones: 'abrigo-vila' });
  assert.equal(invalid.pois.size, 0);
  assert.equal(invalid.waystones.size, 0);
  const valid = createMapState({ pois: ['inicio'], waystones: ['abrigo-vila'] });
  const restored = createMapState(serializeMapState(valid));
  assert.deepEqual([...restored.pois], ['inicio']);
  assert.deepEqual([...restored.waystones], ['abrigo-vila']);
  assert.equal(restored.cells.length, FOG_CELLS * FOG_CELLS);
});
