import test from 'node:test';
import assert from 'node:assert/strict';
import { createFauna, FAUNA_LOAD_RETRY } from '../fauna3d.js';

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
  return { traverse(fn) { fn(mesh); } };
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
function create(loader) {
  return createFauna({ T, scene: scene(), GLTFLoader: loader, skClone: x => x, base: './', ground, ctx });
}
const tick = (fauna, dt) => fauna.update(dt, { px: 0, pz: 0, hour: 22, camera: null });

test('fauna: retry limitado recupera GLB após falha transitória e respeita o backoff', async () => {
  assert.deepEqual(FAUNA_LOAD_RETRY, {
    attemptsPerCycle: 3, backoffSeconds: [.75, 2, 5], cycleCooldownSeconds: 30, maxCycles: 2
  });
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
  assert.equal(fauna.stats.permanentFailures, 1);
  fauna.dispose();
});
