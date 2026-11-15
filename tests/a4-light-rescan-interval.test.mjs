import test from 'node:test';
import assert from 'node:assert/strict';
import { createLightBudget } from '../light-budget3d.js';

class Vector3 {
  constructor(x=0,y=0,z=0) { this.x=x; this.y=y; this.z=z; }
  setFromMatrixPosition(m) { this.x=m.x; this.y=m.y; this.z=m.z; return this; }
  distanceTo(v) { return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z); }
}
class Object3D {
  constructor() { this.children=[]; this.parent=null; this.visible=true; this.isObject3D=true; this.matrixWorld={x:0,y:0,z:0}; }
  add(...objects) { for(const o of objects) { o.parent=this; this.children.push(o); } return this; }
  traverse(fn) { fn(this); for(const o of this.children) o.traverse(fn); }
}
class PointLight extends Object3D {
  constructor(color=0xffffff,intensity=0,distance=10,decay=2) {
    super(); this.isPointLight=true; this.intensity=intensity; this.distance=distance; this.decay=decay;
    this.castShadow=false; this.userData={}; this.layers={set(){}};
    this.position=new Vector3(); this.color={r:1,g:1,b:1,copy(c){this.r=c.r;this.g=c.g;this.b=c.b;}};
  }
}
const T={Vector3,Object3D,PointLight};
const camera={getWorldPosition(v){v.x=0;v.y=0;v.z=0;}};

for (const interval of [0, -1, NaN, Infinity, 1.5]) {
  test(`A4: invalid rescanEvery ${String(interval)} still discovers pre-existing lights`, () => {
    const scene=new Object3D();
    const source=new PointLight(0xffffff,4,15);
    source.name='existing-torch';
    scene.add(source);
    const budget=createLightBudget(T,scene,{slots:1,rescanEvery:interval});
    for(let i=0;i<30;i++) budget.update(camera,1/60);
    assert.deepEqual(budget.stats().active,['existing-torch']);
    assert.equal(budget.stats().sources,1);
  });
}
