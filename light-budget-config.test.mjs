import test from 'node:test';
import assert from 'node:assert/strict';
import { createLightBudget } from './light-budget3d.js';

class Object3D {
  constructor() { this.children = []; this.parent = null; this.isObject3D = true; this.visible = true; }
  add(...objects) { for (const o of objects) { this.children.push(o); o.parent = this; } return this; }
  traverse(fn) { fn(this); for (const child of this.children) child.traverse(fn); }
}
class PointLight extends Object3D {
  constructor() {
    super();
    this.isPointLight = true;
    this.userData = {};
    this.castShadow = false;
    this.layers = { value: 0, set(value) { this.value = value; } };
    this.position = { setFromMatrixPosition() {} };
    this.color = { r: 1, g: 1, b: 1, copy(other) { this.r = other.r; this.g = other.g; this.b = other.b; } };
    this.intensity = 0;
  }
}
class Vector3 {
  constructor() { this.x = this.y = this.z = 0; }
  setFromMatrixPosition() { return this; }
  distanceTo() { return 0; }
}
const THREE = { Object3D, PointLight, Vector3 };

test('invalid slot counts fall back to four bounded shader lights', () => {
  for (const slots of [0, -1, 1.5, NaN, Infinity, -Infinity, 1000000, Number.MAX_SAFE_INTEGER + 1, '4', null]) {
    const scene = new Object3D();
    const budget = createLightBudget(THREE, scene, { slots });
    assert.equal(budget.stats().slots, 4, String(slots));
    assert.equal(scene.children.length, 4, String(slots));
  }
});

test('valid slot count is preserved', () => {
  const scene = new Object3D();
  const budget = createLightBudget(THREE, scene, { slots: 2 });
  assert.equal(budget.stats().slots, 2);
  assert.equal(scene.children.length, 2);
});


test('invalid slot configuration remains bounded during repeated updates', () => {
  const scene = new Object3D();
  const budget = createLightBudget(THREE, scene, { slots: Infinity, rescanEvery: 1 });
  const camera = { getWorldPosition(out) { out.x = 0; out.y = 0; out.z = 0; } };
  for (let i = 0; i < 120; i++) budget.update(camera, 1 / 60);
  assert.equal(budget.stats().slots, 4);
  assert.equal(scene.children.length, 4);
  assert.equal(budget.stats().active.length, 0);
});


test('invalid hidden layer never leaves a source on the default camera layer', () => {
  for (const hiddenLayer of [0, -1, 32, 1.5, NaN, Infinity, '31', null]) {
    const scene = new Object3D();
    const budget = createLightBudget(THREE, scene, { hiddenLayer });
    const source = new PointLight();
    source.userData.budgetSlot = false;
    scene.add(source);
    budget.scan();
    assert.equal(source.layers.value, 31, String(hiddenLayer));
  }
});

test('valid nondefault hidden layer remains configurable', () => {
  const scene = new Object3D();
  const budget = createLightBudget(THREE, scene, { hiddenLayer: 30 });
  const source = new PointLight();
  scene.add(source);
  budget.scan();
  assert.equal(source.layers.value, 30);
});

test('extreme finite source intensity stays within mobile shader budget', () => {
  const scene = new Object3D();
  const source = new PointLight();
  source.name = 'extreme';
  source.intensity = 1e308;
  source.distance = 0;
  source.decay = 2;
  source.visible = true;
  source.color = { r: 1, g: 1, b: 1 };
  source.matrixWorld = {};
  scene.add(source);
  const budget = createLightBudget(THREE, scene, { slots: 1 });
  const camera = { getWorldPosition(out) { out.x = 0; out.y = 0; out.z = 0; } };
  for (let i = 0; i < 120; i++) budget.update(camera, 1 / 60);
  const slot = scene.children.find(child => child.userData.budgetSlot);
  assert.ok(Number.isFinite(slot.intensity));
  assert.ok(slot.intensity > 0 && slot.intensity <= 64);
  assert.deepEqual(budget.stats().active, ['extreme']);
});


test('extreme HDR colors are clamped only on budget slots, not on original sources', () => {
  const scene = new Object3D();
  const source = new PointLight();
  source.name = 'hdr-torch';
  source.intensity = 5;
  source.distance = 0;
  source.decay = 2;
  source.visible = true;
  source.color = { r: 1e308, g: 0.5, b: 1e100 };
  source.matrixWorld = {};
  scene.add(source);
  const budget = createLightBudget(THREE, scene, { slots: 1 });
  const camera = { getWorldPosition(out) { out.x = 0; out.y = 0; out.z = 0; } };
  for (let i = 0; i < 120; i++) budget.update(camera, 1 / 60);
  const slot = scene.children.find(child => child.userData.budgetSlot);
  assert.deepEqual([slot.color.r, slot.color.g, slot.color.b], [16, 0.5, 16]);
  assert.deepEqual([source.color.r, source.color.g, source.color.b], [1e308, 0.5, 1e100]);
});


test('detached light restores its original layer mask for reuse in another scene', () => {
  const scene = new Object3D();
  const otherScene = new Object3D();
  const source = new PointLight();
  source.layers.mask = 5;
  scene.add(source);
  const budget = createLightBudget(THREE, scene, { slots: 1 });
  budget.scan();
  assert.equal(source.layers.value, 31);
  // Simulate Three.js remove/reparent: a removed source is no longer under the budget scene.
  scene.children.splice(scene.children.indexOf(source), 1);
  source.parent = null;
  otherScene.add(source);
  budget.scan();
  assert.equal(source.layers.mask, 5);
  assert.equal(budget.stats().sources, 0);
});
