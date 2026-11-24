import test from 'node:test';
import assert from 'node:assert/strict';
import { createFauna, FAUNA_LOAD_RETRY, FAUNA_MAX_CONCURRENT_LOADS, FAUNA_LOAD_TIMEOUT_MS, cellCandidate } from '../fauna3d.js';

class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
}
class Object3D {
  constructor() {
    this.children = [];
    this.position = new Vec3();
    this.rotation = { set() {} };
    this.scale = { set() {}, setScalar() {} };
    this.matrix = {};
    this.visible = true;
  }
  add(child) { this.children.push(child); child.parent = this; }
  remove(child) { this.children = this.children.filter(x => x !== child); child.parent = null; }
  updateMatrix() {}
  dispose() {}
}
class InstancedMesh extends Object3D {
  constructor(geometry, material, count) {
    super(); this.geometry = geometry; this.material = material;
    this.instanceMatrix = { count, needsUpdate: false }; this.count = count;
  }
  setMatrixAt() {}
}
class Box3 {
  setFromBufferAttribute(a) {
    const xs = Array.from({ length: a.count }, (_, i) => a.getX(i));
    const ys = Array.from({ length: a.count }, (_, i) => a.getY(i));
    const zs = Array.from({ length: a.count }, (_, i) => a.getZ(i));
    this.min = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
    this.max = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
    return this;
  }
  getSize(out) { return out.set(this.max[0] - this.min[0], this.max[1] - this.min[1], this.max[2] - this.min[2]); }
}
class Material {
  constructor({ map = null, color = 0xffffff } = {}) { this.map = map; this.color = color; }
  dispose() {}
}
class Matrix4 { premultiply() { return this; } }
class Raycaster {
  constructor() { this.ray = { origin: new Vec3(), direction: new Vec3() }; }
  intersectObject() { return []; }
}
class Quaternion {}
const T = {
  Group: Object3D, Object3D, Vector3: Vec3, Box3, MeshLambertMaterial: Material,
  InstancedMesh, Matrix4, Raycaster, Quaternion, PropertyBinding: { sanitizeNodeName: x => x },
  SRGBColorSpace: 'srgb'
};
const scene = () => new Object3D();
const ctx = {
  biome: () => 'cidade', water: () => -1, road: () => false,
  lava: () => 0, blocked: () => false
};
const ground = () => 0;
function fakeScene() {
  const values = [-1, 0, 1];
  const geometry = {
    attributes: { position: { count: 3, getX: i => values[i], getY: i => values[i], getZ: i => values[i] } },
    dispose() {}
  };
  const material = { map: null, color: 0xffffff, dispose() {} };
  const mesh = { isMesh: true, geometry, material };
  return { traverse(fn) { fn(mesh); }, updateMatrixWorld() {} };
}
function loaderFor(results) {
  let calls = 0;
  class Loader {
    register() {}
    loadAsync() {
      const result = results[Math.min(calls, results.length - 1)];
      calls++;
      return result instanceof Error ? Promise.reject(result) : Promise.resolve({ scene: fakeScene() });
    }
  }
  return { Loader, calls: () => calls };
}
function create(loader, habitat = ctx, options = {}) {
  return createFauna({ T, scene: scene(), GLTFLoader: loader, skClone: x => x, base: './', ground, ctx: habitat, ...options });
}
const tick = (fauna, dt) => fauna.update(dt, { px: 0, pz: 0, hour: 22, camera: null });

test('fauna: retry limitado recupera GLB após falha transitória e respeita o backoff', async () => {
  assert.deepEqual(FAUNA_LOAD_RETRY, {
    attemptsPerCycle: 3, backoffSeconds: [.75, 2], cycleCooldownSeconds: 30, maxCycles: 2
  });
  assert.equal(FAUNA_LOAD_RETRY.backoffSeconds.length, FAUNA_LOAD_RETRY.attemptsPerCycle - 1,
    'um ciclo de três tentativas precisa de exatamente dois intervalos entre tentativas');
  const mock = loaderFor([new Error('network connection reset'), 'ok']);
  const fauna = create(mock.Loader);
  const first = await fauna.load('grilo');
  assert.match(first.failed, /network connection reset/);
  assert.equal(fauna.stats.loadFailures, 1);
  assert.equal(mock.calls(), 1);

  await fauna.load('grilo');
  assert.equal(mock.calls(), 1, 'não repete antes de 0,75 s');
  tick(fauna, .5);
  await fauna.load('grilo');
  assert.equal(mock.calls(), 1, 'ainda respeita o backoff');
  tick(fauna, .3);
  await fauna.load('grilo');

  assert.equal(mock.calls(), 2);
  assert.deepEqual(fauna.stats.loaded, ['grilo']);
  assert.equal(fauna.stats.loadRetries, 1);
  assert.equal(fauna.stats.loadFailures, 1);
  assert.deepEqual(
    { kind: fauna.stats.lastLoadRecovery?.kind, attempt: fauna.stats.lastLoadRecovery?.attempt, cycle: fauna.stats.lastLoadRecovery?.cycle },
    { kind: 'grilo', attempt: 2, cycle: 1 }
  );
  assert.ok(fauna.stats.lastLoadRecovery.loadMs >= 0);
  fauna.dispose();
});


test('fauna: scanner de produção tenta novamente após o backoff no habitat ativo', async () => {
  const candidate = cellCandidate('grilo', -1, -1);
  const habitat = {
    biome: (x, z) => Math.abs(x - candidate.x) < 1e-6 && Math.abs(z - candidate.z) < 1e-6 ? 'vale' : 'cidade',
    water: () => -1, road: () => false, lava: () => 0, blocked: () => false
  };
  const mock = loaderFor([new Error('network connection reset'), 'ok']);
  const fauna = create(mock.Loader, habitat);
  const update = dt => fauna.update(dt, { px: candidate.x, pz: candidate.z, hour: 22, camera: null });

  update(0);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(mock.calls(), 1);
  assert.equal(fauna.stats.loadFailures, 1);

  update(.8);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(mock.calls(), 2, 'o scanner real agenda a nova tentativa quando o backoff termina');
  assert.deepEqual(fauna.stats.loaded, ['grilo']);
  fauna.dispose();
});

test('fauna: uma requisição lenta não bloqueia outras espécies e respeita o limite de concorrência', async () => {
  assert.equal(FAUNA_MAX_CONCURRENT_LOADS, 2);
  const coelho = cellCandidate('coelho', 29, -15);
  const montanha = cellCandidate('montanha', 29, -15);
  const lava = cellCandidate('lava', 29, -15);
  assert.ok(coelho && montanha && lava, 'a célula de regressão precisa conter os três candidatos');

  const habitat = {
    biome: (x, z) => {
      for (const [candidate, biome] of [[coelho, 'vale'], [montanha, 'serra'], [lava, 'cinzas']]) {
        if (Math.hypot(x - candidate.x, z - candidate.z) < 1e-6) return biome;
      }
      return 'cidade';
    },
    water: () => -1, road: () => false, lava: () => 0, blocked: () => false
  };
  const requests = [];
  class Loader {
    register() {}
    loadAsync(url) {
      requests.push(url);
      if (url.endsWith('Coelhinho.glb')) return new Promise(() => {});
      return Promise.resolve({ scene: fakeScene() });
    }
  }

  const fauna = create(Loader, habitat);
  const update = dt => fauna.update(dt, { px: coelho.x, pz: coelho.z, hour: 12, camera: null });
  update(0);
  await new Promise(resolve => setImmediate(resolve));

  assert.ok(requests.some(url => url.endsWith('Coelhinho.glb')), 'a primeira espécie inicia e permanece pendente');
  assert.ok(requests.some(url => url.endsWith('PassaroMontanha.glb')), 'a segunda espécie carrega apesar da primeira estar lenta');
  assert.ok(!requests.some(url => url.endsWith('PassaroLava.glb')), 'a terceira aguarda o limite de duas cargas');
  assert.deepEqual(fauna.stats.loaded, ['montanha']);
  assert.equal(fauna.stats.activeLoads, 1);
  assert.equal(fauna.stats.peakActiveLoads, 2);

  update(.6);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(requests.some(url => url.endsWith('PassaroLava.glb')), 'uma vaga liberada permite iniciar a terceira espécie');
  assert.equal(fauna.stats.activeLoads, 2);
  assert.equal(fauna.stats.peakActiveLoads, FAUNA_MAX_CONCURRENT_LOADS);
  fauna.dispose();
});

test('fauna: recupera no segundo ciclo depois do cooldown de 30 s', async () => {
  const mock = loaderFor([
    new Error('network reset 1'),
    new Error('network reset 2'),
    new Error('network reset 3'),
    'ok'
  ]);
  const fauna = create(mock.Loader);

  await fauna.load('grilo');
  tick(fauna, .8); await fauna.load('grilo');
  tick(fauna, 2.1); await fauna.load('grilo');
  assert.equal(mock.calls(), 3);

  tick(fauna, 29.9); await fauna.load('grilo');
  assert.equal(mock.calls(), 3, 'o segundo ciclo não começa antes dos 30 s');

  tick(fauna, .2); await fauna.load('grilo');
  assert.equal(mock.calls(), 4);
  assert.deepEqual(fauna.stats.loaded, ['grilo']);
  assert.deepEqual(
    { kind: fauna.stats.lastLoadRecovery?.kind, attempt: fauna.stats.lastLoadRecovery?.attempt, cycle: fauna.stats.lastLoadRecovery?.cycle },
    { kind: 'grilo', attempt: 1, cycle: 2 }
  );
  fauna.dispose();
});

test('fauna: 404 é permanente na sessão e não gera requisições repetidas', async () => {
  const mock = loaderFor([new Error('fetch for Grilo.glb responded with 404: Not Found'), 'ok']);
  const fauna = create(mock.Loader);
  const failure = await fauna.load('grilo');
  assert.equal(failure.permanent, true);
  assert.equal(fauna.stats.lastLoadError.status, 404);
  tick(fauna, 60);
  await fauna.load('grilo');
  assert.equal(mock.calls(), 1, 'asset ausente não entra em loop de rede');
  assert.equal(fauna.stats.permanentFailures, 1);
  assert.equal(fauna.stats.retryExhausted, 0);
  fauna.dispose();
});

test('fauna: 429 é transitório e continua elegível para retry', async () => {
  const mock = loaderFor([new Error('fetch for Grilo.glb responded with 429: Too Many Requests'), 'ok']);
  const fauna = create(mock.Loader);
  const failure = await fauna.load('grilo');
  assert.equal(failure.permanent, false);
  assert.equal(fauna.stats.permanentFailures, 0);
  tick(fauna, .8);
  await fauna.load('grilo');
  assert.equal(mock.calls(), 2);
  assert.deepEqual(fauna.stats.loaded, ['grilo']);
  fauna.dispose();
});

test('fauna: falhas transitórias têm teto de seis tentativas por espécie', async () => {
  const mock = loaderFor(Array.from({ length: 6 }, (_, i) => new Error('network reset ' + i)));
  const fauna = create(mock.Loader);
  await fauna.load('grilo');                         // tentativa 1
  tick(fauna, .8); await fauna.load('grilo');        // tentativa 2
  tick(fauna, 2.1); await fauna.load('grilo');       // tentativa 3 + pausa longa
  tick(fauna, 30.1); await fauna.load('grilo');      // ciclo 2, tentativa 1
  tick(fauna, .8); await fauna.load('grilo');        // tentativa 2
  tick(fauna, 2.1); await fauna.load('grilo');       // tentativa 3; encerra
  tick(fauna, 60); await fauna.load('grilo');
  assert.equal(mock.calls(), 6);
  assert.equal(fauna.stats.loadFailures, 6);
  assert.equal(fauna.stats.permanentFailures, 0, 'falha transitória esgotada não é erro HTTP permanente');
  assert.equal(fauna.stats.retryExhausted, 1);
  tick(fauna, 60);
  await fauna.load('grilo');
  assert.equal(mock.calls(), 6, 'o teto continua bloqueando novas tentativas após esgotar');
  fauna.dispose();
});


test('fauna: GLBs pendurados são abortados e liberam as duas vagas para retry', async () => {
  assert.equal(FAUNA_LOAD_TIMEOUT_MS, 20000);
  const coelho = cellCandidate('coelho', 29, -15);
  const montanha = cellCandidate('montanha', 29, -15);
  const lava = cellCandidate('lava', 29, -15);
  assert.ok(coelho && montanha && lava);

  const habitat = {
    biome: (x, z) => {
      for (const [candidate, biome] of [[coelho, 'vale'], [montanha, 'serra'], [lava, 'cinzas']]) {
        if (Math.hypot(x - candidate.x, z - candidate.z) < 1e-6) return biome;
      }
      return 'cidade';
    },
    water: () => -1, road: () => false, lava: () => 0, blocked: () => false
  };
  const attempts = new Map();
  const aborted = [];
  const fetchImpl = (url, { signal }) => {
    const file = url.split('/').pop();
    const attempt = (attempts.get(file) || 0) + 1;
    attempts.set(file, attempt);
    if (attempt === 1) {
      return new Promise((resolve, reject) => {
        const abort = () => {
          aborted.push(file);
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        };
        if (signal.aborted) abort();
        else signal.addEventListener('abort', abort, { once: true });
      });
    }
    return Promise.resolve({
      ok: true, status: 200, statusText: 'OK',
      arrayBuffer: async () => new ArrayBuffer(8)
    });
  };
  class Loader {
    register() {}
    parseAsync() { return Promise.resolve({ scene: fakeScene() }); }
  }

  const fauna = create(Loader, habitat, { fetchImpl, loadTimeoutMs: 20 });
  const update = dt => fauna.update(dt, { px: coelho.x, pz: coelho.z, hour: 12, camera: null });
  update(0);
  await new Promise(resolve => setTimeout(resolve, 60));

  assert.equal(attempts.get('Coelhinho.glb'), 1);
  assert.equal(attempts.get('PassaroMontanha.glb'), 1);
  assert.equal(attempts.get('PassaroLava.glb'), undefined, 'a terceira espécie espera enquanto as duas vagas estão ocupadas');
  assert.deepEqual(new Set(aborted), new Set(['Coelhinho.glb', 'PassaroMontanha.glb']));
  assert.equal(fauna.stats.loadTimeouts, 2);
  assert.equal(fauna.stats.activeLoads, 0, 'timeouts precisam liberar as duas vagas');
  assert.equal(fauna.stats.loadFailures, 2);
  assert.equal(fauna.stats.lastLoadError.timeout, true);

  update(.8);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(fauna.stats.loaded.includes('coelho'));
  assert.ok(fauna.stats.loaded.includes('montanha'));
  assert.equal(attempts.get('Coelhinho.glb'), 2);
  assert.equal(attempts.get('PassaroMontanha.glb'), 2);
  assert.equal(fauna.stats.loadRetries, 2);
  assert.equal(fauna.stats.activeLoads, 0);
  fauna.dispose();
});


test('fauna: HTTP 404 no caminho fetch/parseAsync cancela o corpo e fica permanente', async () => {
  let requests = 0, parses = 0, signalAborted = false;
  class Loader {
    register() {}
    parseAsync() { parses++; return Promise.resolve({ scene: fakeScene() }); }
  }
  const fetchImpl = async (_url, { signal }) => {
    requests++;
    return { ok: false, status: 404, statusText: 'Not Found', arrayBuffer: async () => new ArrayBuffer(0),
      get body() { return null; }, signal };
  };
  const originalFetch = fetchImpl;
  const wrappedFetch = async (url, options) => {
    const response = await originalFetch(url, options);
    options.signal.addEventListener('abort', () => { signalAborted = true; }, { once: true });
    return response;
  };
  const fauna = create(Loader, ctx, { fetchImpl: wrappedFetch });
  const failure = await fauna.load('grilo');
  assert.equal(failure.permanent, true);
  assert.equal(fauna.stats.lastLoadError.status, 404);
  assert.equal(fauna.stats.permanentFailures, 1);
  assert.equal(signalAborted, true, 'a resposta não utilizável deve cancelar seu corpo');
  tick(fauna, 60);
  await fauna.load('grilo');
  assert.equal(requests, 1, '404 não pode repetir na mesma sessão');
  assert.equal(parses, 0, 'GLTFLoader não deve receber uma resposta HTTP inválida');
  fauna.dispose();
});

test('fauna: HTTP 429 no caminho fetch/parseAsync é transitório e entrega bytes/base', async () => {
  let requests = 0;
  const bytes = new ArrayBuffer(16), parsed = [];
  class Loader {
    register() {}
    parseAsync(data, path) {
      parsed.push({ data, path });
      return Promise.resolve({ scene: fakeScene() });
    }
  }
  const fetchImpl = async () => {
    requests++;
    if (requests === 1) return { ok: false, status: 429, statusText: 'Too Many Requests' };
    return { ok: true, status: 200, statusText: 'OK', arrayBuffer: async () => bytes };
  };
  const base = 'https://assets.example/game/';
  const fauna = create(Loader, ctx, { fetchImpl, base });
  const failure = await fauna.load('grilo');
  assert.equal(failure.permanent, false);
  assert.equal(fauna.stats.lastLoadError.status, 429);
  tick(fauna, .8);
  await fauna.load('grilo');
  assert.equal(requests, 2);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].data, bytes);
  assert.equal(parsed[0].path, base);
  assert.deepEqual(fauna.stats.loaded, ['grilo']);
  assert.equal(fauna.stats.loadRetries, 1);
  fauna.dispose();
});

test('fauna: timeout durante a leitura do corpo GLB também aborta e libera a vaga', async () => {
  let aborted = 0, parses = 0;
  class Loader {
    register() {}
    parseAsync() { parses++; return Promise.resolve({ scene: fakeScene() }); }
  }
  const fetchImpl = async (_url, { signal }) => ({
    ok: true, status: 200, statusText: 'OK',
    arrayBuffer: () => new Promise((resolve, reject) => {
      const onAbort = () => {
        aborted++;
        reject(Object.assign(new Error('body aborted'), { name: 'AbortError' }));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    })
  });
  const fauna = create(Loader, ctx, { fetchImpl, loadTimeoutMs: 20 });
  const failure = await fauna.load('grilo');
  assert.match(failure.failed, /timed out after 20 ms/);
  assert.equal(aborted, 1);
  assert.equal(fauna.stats.loadTimeouts, 1);
  assert.equal(fauna.stats.activeLoads, 0);
  assert.equal(parses, 0);
  fauna.dispose();
});
