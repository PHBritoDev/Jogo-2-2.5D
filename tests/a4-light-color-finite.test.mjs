import test from 'node:test';
import assert from 'node:assert/strict';
import { createLightBudget } from '../light-budget3d.js';

class Vec {
  constructor(x=0,y=0,z=0) { this.x=x; this.y=y; this.z=z; }
  setFromMatrixPosition(m) { this.x=m.x; this.y=m.y; this.z=m.z; return this; }
  distanceTo(v) { return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z); }
}
class Obj {
  constructor() { this.children=[]; this.parent=null; this.visible=true; this.isObject3D=true; this.matrixWorld={x:0,y:0,z:0}; }
  add(...objs) { for(const o of objs) { if(o.parent) o.parent.children=o.parent.children.filter(x=>x!==o); o.parent=this; this.children.push(o); } return this; }
  traverse(fn) { fn(this); for(const o of this.children) o.traverse(fn); }
}
class Point extends Obj {
  constructor(color=0xffffff,intensity=0,distance=10,decay=2) {
    super(); this.isPointLight=true; this.intensity=intensity; this.distance=distance; this.decay=decay;
    this.castShadow=false; this.userData={}; this.layers={set(){}};
    this.position=new Vec(); this.color={r:1,g:1,b:1,copy(c){this.r=c.r;this.g=c.g;this.b=c.b;}};
  }
}
test('A4: non-finite RGB never reaches a shader slot and valid light recovers', () => {
  const scene=new Obj(), source=new Point(0xffffff,4,15), camera={getWorldPosition(v){v.x=0;v.y=0;v.z=0;}};
  source.name='torch'; scene.add(source);
  const budget=createLightBudget({PointLight:Point,Object3D:Obj,Vector3:Vec},scene,{slots:1,rescanEvery:1});
  for(let i=0;i<30;i++) budget.update(camera,1/60);
  assert.deepEqual(budget.stats().active,['torch']);
  const slot=scene.children.find(o=>o.userData.budgetSlot);
  assert.ok(slot.intensity>0);
  source.color.r=NaN;
  for(let i=0;i<50;i++) budget.update(camera,1/60);
  assert.equal(slot.intensity<0.02,true);
  assert.ok(Number.isFinite(slot.color.r));
  // Negative linear RGB is also invalid for lighting and can darken surfaces.
  source.color.r=-0.5;
  for(let i=0;i<50;i++) budget.update(camera,1/60);
  assert.ok(slot.intensity<0.02);
  assert.ok(slot.color.r>=0);
  source.color.r=0.7;
  for(let i=0;i<30;i++) budget.update(camera,1/60);
  assert.ok(slot.intensity>0);
  assert.equal(slot.color.r,0.7);
});
