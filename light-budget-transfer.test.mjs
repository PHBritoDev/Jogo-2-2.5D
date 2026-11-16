import test from 'node:test';
import assert from 'node:assert/strict';
import { createLightBudget } from './light-budget3d.js';

class Object3D {
  constructor() { this.children = []; this.parent = null; this.isObject3D = true; this.visible = true; }
  add(...objects) {
    for (const o of objects) {
      if (o.parent) o.parent.children.splice(o.parent.children.indexOf(o), 1);
      this.children.push(o); o.parent = this;
    }
    return this;
  }
  remove(...objects) {
    for (const o of objects) {
      const i = this.children.indexOf(o);
      if (i >= 0) { this.children.splice(i, 1); o.parent = null; }
    }
    return this;
  }
  traverse(fn) { fn(this); for (const child of this.children) child.traverse(fn); }
}
class PointLight extends Object3D {
  constructor() {
    super();
    this.isPointLight = true; this.userData = {}; this.castShadow = false;
    this.layers = { mask: 5, set(layer) { this.mask = 1 << layer; } };
    this.position = { setFromMatrixPosition() {} };
    this.color = { r: 1, g: 1, b: 1, copy() {} };
    this.intensity = 1;
  }
}
class Vector3 { setFromMatrixPosition() { return this; } distanceTo() { return 0; } }
const T = { Object3D, PointLight, Vector3 };

test('a point light moved to an auxiliary scene regains its layer immediately, without scan', () => {
  const world = new Object3D(), preview = new Object3D();
  const budget = createLightBudget(T, world, { slots: 1, rescanEvery: 45 });
  const light = new PointLight();
  world.add(light);
  assert.equal(light.layers.mask, 1 << 31);
  preview.add(light);
  assert.equal(light.layers.mask, 5);
  assert.equal(budget.stats().sources, 0);
  world.add(light);
  assert.equal(light.layers.mask, 1 << 31);
  assert.equal(budget.stats().sources, 1);
});

test('moving a group restores nested lights immediately', () => {
  const world = new Object3D(), preview = new Object3D();
  const budget = createLightBudget(T, world, { slots: 1 });
  const group = new Object3D(), light = new PointLight();
  group.add(light); world.add(group);
  assert.equal(light.layers.mask, 1 << 31);
  preview.add(group);
  assert.equal(light.layers.mask, 5);
  assert.equal(budget.stats().sources, 0);
});

test('transferring a light between two budgeted scenes adopts it in the destination', () => {
  const world = new Object3D(), otherWorld = new Object3D();
  const a = createLightBudget(T, world, { slots: 1 });
  const b = createLightBudget(T, otherWorld, { slots: 1, hiddenLayer: 30 });
  const light = new PointLight();
  world.add(light);
  otherWorld.add(light);
  assert.equal(a.stats().sources, 0);
  assert.equal(b.stats().sources, 1);
  assert.equal(light.layers.mask, 1 << 30);
});

test('removing a point light directly restores original layers without waiting for scan', () => {
  const world = new Object3D(), budget = createLightBudget(T, world, { slots: 1, rescanEvery: 45 });
  const light = new PointLight();
  world.add(light);
  assert.equal(light.layers.mask, 1 << 31);
  world.remove(light);
  assert.equal(light.layers.mask, 5);
  assert.equal(budget.stats().sources, 0);
});

test('removing a group releases nested lights immediately', () => {
  const world = new Object3D(), budget = createLightBudget(T, world, { slots: 1 });
  const group = new Object3D(), light = new PointLight();
  group.add(light); world.add(group);
  assert.equal(light.layers.mask, 1 << 31);
  world.remove(group);
  assert.equal(light.layers.mask, 5);
  assert.equal(budget.stats().sources, 0);
});

test('removing a nested light still attached to the budget scene does not release it', () => {
  const world = new Object3D(), budget = createLightBudget(T, world, { slots: 1 });
  const a = new Object3D(), b = new Object3D(), light = new PointLight();
  world.add(a, b); a.add(light);
  b.add(light);
  assert.equal(light.layers.mask, 1 << 31);
  assert.equal(budget.stats().sources, 1);
});


test('enabling shadows on a budgeted light restores its layer in the next update', () => {
  const world = new Object3D(), budget = createLightBudget(T, world, { slots: 1, rescanEvery: 45 });
  const light = new PointLight();
  world.add(light);
  assert.equal(light.layers.mask, 1 << 31);
  light.castShadow = true;
  const camera = { getWorldPosition(out) { out.x = 0; out.y = 0; out.z = 0; } };
  budget.update(camera);
  assert.equal(light.layers.mask, 5);
  assert.equal(budget.stats().sources, 0);
  // When shadows are disabled, the normal periodic scan can adopt it again.
  light.castShadow = false;
  budget.scan();
  assert.equal(light.layers.mask, 1 << 31);
  assert.equal(budget.stats().sources, 1);
});


test('explicit scan releases a source that enabled shadows without waiting for update', () => {
  const world = new Object3D(), budget = createLightBudget(T, world, { slots: 1, rescanEvery: 45 });
  const light = new PointLight();
  world.add(light);
  assert.equal(budget.stats().sources, 1);
  light.castShadow = true;
  budget.scan();
  assert.equal(light.layers.mask, 5);
  assert.equal(budget.stats().sources, 0);
  light.castShadow = false;
  budget.scan();
  assert.equal(light.layers.mask, 1 << 31);
  assert.equal(budget.stats().sources, 1);
});
