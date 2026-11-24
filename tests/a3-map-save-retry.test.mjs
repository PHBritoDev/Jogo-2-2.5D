import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
  MAP_POIS,
  MAP_STORE_KEY,
  createMapState,
  discoverPois,
  isRevealed,
  revealAround,
  serializeMapState
} from '../map3d.js';

const worldSource = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const saveFunction = worldSource.match(/function saveMapState\(force\)\{[^\n]*\}/);
assert.ok(saveFunction, 'a função de produção saveMapState(force) precisa continuar localizável');

function harness({ mapState, storage, dirty = true, serializer = serializeMapState }) {
  const context = {
    MAP_STORE: MAP_STORE_KEY,
    mapDirty: dirty,
    mapState,
    localStorage: storage,
    serializeMapState: serializer
  };
  runInNewContext(saveFunction[0] + ';globalThis.__saveMapState=saveMapState;', context);
  return context;
}

function quotaError() {
  return Object.assign(new Error('storage quota exceeded'), { name: 'QuotaExceededError' });
}

test('map save: falha de quota preserva dirty e a tentativa periódica seguinte grava POIs, waystones e névoa', () => {
  const state = createMapState();
  const vila = MAP_POIS.find(p => p.id === 'vila');
  assert.ok(vila);
  revealAround(state, vila.x, vila.z);
  discoverPois(state, vila.x, vila.z);
  state.waystones.add('abrigo-vila');

  let writes = 0;
  let persisted = null;
  const keys = [];
  const storage = {
    setItem(key, value) {
      writes++;
      keys.push(key);
      if (writes === 1) throw quotaError();
      persisted = value;
    }
  };
  const ctx = harness({ mapState: state, storage });

  assert.equal(ctx.__saveMapState(false), false, 'a primeira escrita deve falhar');
  assert.equal(ctx.mapDirty, true, 'a falha não pode limpar o dirty');
  assert.equal(writes, 1);
  assert.equal(ctx.__saveMapState(false), true, 'a chamada periódica seguinte deve tentar novamente');
  assert.equal(ctx.mapDirty, false, 'somente o sucesso limpa o dirty');
  assert.equal(writes, 2);
  assert.deepEqual(keys, [MAP_STORE_KEY, MAP_STORE_KEY]);

  const restored = createMapState(JSON.parse(persisted));
  assert.ok(restored.pois.has('vila'), 'POI descoberto precisa sobreviver ao reload');
  assert.ok(restored.waystones.has('abrigo-vila'), 'abrigo registrado precisa sobreviver ao reload');
  assert.equal(isRevealed(restored, vila.x, vila.z), true, 'células reveladas precisam sobreviver ao reload');
});

test('map save: falha de escrita forçada também mantém dirty para uma nova tentativa', () => {
  let writes = 0;
  const storage = {
    setItem() {
      writes++;
      if (writes === 1) throw quotaError();
    }
  };
  const ctx = harness({ mapState: createMapState(), storage, dirty: false });

  assert.equal(ctx.__saveMapState(true), false, 'force deve tentar mesmo sem alterações');
  assert.equal(ctx.mapDirty, true, 'uma falha forçada deve deixar o mapa elegível para retry');
  assert.equal(ctx.__saveMapState(false), true);
  assert.equal(ctx.mapDirty, false);
  assert.equal(writes, 2);
});

test('map save: sem dirty e sem force continua sem escrever', () => {
  let writes = 0;
  const ctx = harness({
    mapState: createMapState(),
    storage: { setItem() { writes++; } },
    dirty: false
  });
  assert.equal(ctx.__saveMapState(false), true);
  assert.equal(writes, 0);
});
