import test from 'node:test';
import assert from 'node:assert/strict';
import { createLightBudget } from './light-budget3d.js';

class Vec {
  constructor(x = 0) { this.x = x; this.y = 0; this.z = 0; }
  setFromMatrixPosition(m) { this.x = m.x; return this; }
  distanceTo(v) { return Math.abs(this.x - v.x); }
}
class Obj {
  constructor(x = 0) { this.children = []; this.parent = null; this.visible = true; this.isObject3D = true; this.matrixWorld = { x }; }
  add(...objects) { for (const o of objects) { if (o.parent) o.parent.remove(o); this.children.push(o); o.parent = this; } return this; }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } return this; }
  traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
}
class Light extends Obj {
  constructor() {
    super(); this.isPointLight = true; this.userData = {}; this.castShadow = false;
    this.layers = { mask: 1, set(i) { this.mask = 2 ** i; } };
    this.position = new Vec(); this.color = { r: 1, g: 1, b: 1, copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; } };
    this.intensity = 1; this.distance = 20; this.decay = 2;
  }
}
const T = { Object3D: Obj, PointLight: Light, Vector3: Vec };
test('near-tied torches keep their active slot; a meaningful camera move switches it', () => {
  const scene = new Obj(), budget = createLightBudget(T, scene, { slots: 1, rescanEvery: 1 });
  const a = new Light(), b = new Light();
  a.name = 'a'; b.name = 'b'; a.matrixWorld.x = -1; b.matrixWorld.x = 1;
  scene.add(a, b);
  let cameraX = -0.1;
  const camera = { getWorldPosition(v) { v.x = cameraX; v.y = 0; v.z = 0; } };
  const tick = (n = 1) => { for (let i = 0; i < n; i++) budget.update(camera, 1 / 60); };
  tick(50);
  assert.deepEqual(budget.stats().active, ['a']);
  // Sem histerese, a troca de 20 cm na câmera inverteria o slot a cada quadro.
  for (let i = 0; i < 60; i++) {
    cameraX = i % 2 ? -0.1 : 0.1;
    tick();
    assert.deepEqual(budget.stats().active, ['a']);
  }
  cameraX = 4;
  tick(70);
  assert.deepEqual(budget.stats().active, ['b'], 'nova tocha deve assumir quando claramente mais próxima');
});
