import test from 'node:test';
import assert from 'node:assert/strict';
import { createLightBudget } from './light-budget3d.js';

class Object3D {
  constructor() { this.children = []; this.parent = null; this.isObject3D = true; }
  add(...objects) { for (const o of objects) { this.children.push(o); o.parent = this; } return this; }
  traverse(fn) { fn(this); for (const child of this.children) child.traverse(fn); }
}
class PointLight extends Object3D {
  constructor() {
    super();
    this.isPointLight = true;
    this.userData = {};
    this.castShadow = false;
    this.layers = { set() {} };
    this.position = { setFromMatrixPosition() {} };
    this.color = { copy() {} };
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
  for (const slots of [0, -1, 1.5, NaN, Infinity, 1000000, '4']) {
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
