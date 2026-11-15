import test from 'node:test';
import assert from 'node:assert/strict';
import { createLightBudget } from '../light-budget3d.js';

class Object3D {
  constructor() { this.children=[]; this.parent=null; this.visible=true; this.isObject3D=true; this.matrixWorld={ position:{x:0,y:0,z:0} }; }
  add(...objects) { for(const o of objects){ if(o.parent) o.parent.remove(o); o.parent=this; this.children.push(o); } return this; }
  remove(o) { this.children=this.children.filter(c=>c!==o); o.parent=null; return this; }
  traverse(fn) { fn(this); for(const c of this.children) c.traverse(fn); }
}
class Vector3 {
  setFromMatrixPosition(m) { Object.assign(this,m.position); return this; }
  getWorldPosition(out) { return out.setFromMatrixPosition(this.matrixWorld); }
  distanceTo(v) { return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z); }
}
class PointLight extends Object3D {
  constructor(color,intensity,distance,decay){ super(); this.isPointLight=true; this.intensity=intensity; this.distance=distance; this.decay=decay; this.castShadow=false; this.userData={}; this.color={copy(){}}; this.layers={set(){}}; this.position={setFromMatrixPosition(){}}; }
}
const T={Object3D,PointLight,Vector3};
test('A4: grupo destacado não ocupa slots nem permanece registrado após scan',()=>{
  const scene=new Object3D(), camera=new Object3D(), group=new Object3D();
  const budget=createLightBudget(T,scene,{slots:1,rescanEvery:1});
  const source=new PointLight(0xffffff,3,30,2); source.name='tocha-destacada';
  group.add(source); scene.add(group);
  budget.update(camera,1);
  assert.deepEqual(budget.stats().active,['tocha-destacada']);
  scene.remove(group);
  budget.update(camera,1);
  assert.equal(budget.stats().sources,0);
  for(let i=0;i<15;i++) budget.update(camera,1);
  assert.deepEqual(budget.stats().active,[]);
});
test('A4: fonte anexada diretamente continua elegível',()=>{
  const scene=new Object3D(),camera=new Object3D();
  const budget=createLightBudget(T,scene,{slots:1,rescanEvery:1});
  const source=new PointLight(0xffffff,2,30,2);source.name='tocha-ativa';
  scene.add(source);budget.update(camera,1);
  assert.deepEqual(budget.stats().active,['tocha-ativa']);
});

test('A4: seleção reutilizada troca fonte distante por próxima sem duplicar slots',()=> {
  const scene=new Object3D(), camera=new Object3D();
  const budget=createLightBudget(T,scene,{slots:1,rescanEvery:1});
  const distant=new PointLight(0xffffff,2,30,2); distant.name='distante';
  distant.matrixWorld.position.x=20;
  const near=new PointLight(0xffffff,2,30,2); near.name='proxima';
  near.matrixWorld.position.x=1;
  scene.add(distant);
  budget.update(camera,1);
  assert.deepEqual(budget.stats().active,['distante']);
  scene.add(near);
  for(let i=0;i<5;i++) budget.update(camera,1);
  assert.deepEqual(budget.stats().active,['proxima']);
  scene.remove(near);
  for(let i=0;i<5;i++) budget.update(camera,1);
  assert.deepEqual(budget.stats().active,['distante']);
  assert.equal(budget.stats().sources,1);
});

test('A4: grupo reanexado volta a iluminar após scan sem duplicar cadastro',()=> {
  const scene=new Object3D(), camera=new Object3D(), group=new Object3D();
  const budget=createLightBudget(T,scene,{slots:2,rescanEvery:2});
  const source=new PointLight(0xffffff,2,30,2); source.name='tocha-reanexada';
  group.add(source);scene.add(group);
  budget.update(camera,1);
  assert.equal(budget.stats().sources,1);
  scene.remove(group);
  budget.update(camera,1);
  budget.update(camera,1);
  assert.equal(budget.stats().sources,0);
  scene.add(group);
  budget.update(camera,1);
  assert.equal(budget.stats().sources,1);
  for(let i=0;i<6;i++)budget.update(camera,1);
  assert.deepEqual(budget.stats().active,['tocha-reanexada']);
  assert.equal(budget.stats().sources,1);
});

test('A4: intensidade não finita não contamina o slot e fonte válida assume iluminação',()=> {
  const scene=new Object3D(),camera=new Object3D();
  const budget=createLightBudget(T,scene,{slots:1,rescanEvery:1});
  const bad=new PointLight(0xffffff,NaN,30,2);bad.name='invalida';
  const good=new PointLight(0xffffff,3,30,2);good.name='valida';
  scene.add(bad,good);
  for(let i=0;i<5;i++)budget.update(camera,1);
  assert.deepEqual(budget.stats().active,['valida']);
  assert.ok(Number.isFinite(scene.children[0].intensity));
  good.intensity=Infinity;
  for(let i=0;i<5;i++)budget.update(camera,1);
  assert.deepEqual(budget.stats().active,[]);
  assert.ok(Number.isFinite(scene.children[0].intensity));
  good.intensity=2;
  for(let i=0;i<5;i++)budget.update(camera,1);
  assert.deepEqual(budget.stats().active,['valida']);
});
test('A4: posição inválida não supera fonte de posição finita',()=> {
  const scene=new Object3D(),camera=new Object3D();
  const budget=createLightBudget(T,scene,{slots:1,rescanEvery:1});
  const bad=new PointLight(0xffffff,5,30,2);bad.name='posicao-invalida';
  bad.matrixWorld.position.x=NaN;
  const good=new PointLight(0xffffff,2,30,2);good.name='posicao-valida';
  scene.add(bad,good);
  budget.update(camera,1);
  assert.deepEqual(budget.stats().active,['posicao-valida']);
});

test('A4: fade real aproxima intensidade do slot ao alvo sem salto',()=> {
  const scene=new Object3D(),camera=new Object3D();
  const budget=createLightBudget(T,scene,{slots:1,rescanEvery:1});
  const source=new PointLight(0xffffff,3,30,2);source.name='fade';
  scene.add(source);
  const slot=scene.children[0];
  assert.equal(slot.intensity,0);
  budget.update(camera,1/60);
  assert.ok(slot.intensity>0 && slot.intensity<3,'fade de entrada deve interpolar intensidade');
  for(let i=0;i<120;i++)budget.update(camera,1/60);
  assert.ok(Math.abs(slot.intensity-3)<0.001,'fade deve alcançar o alvo');
  source.intensity=0;
  budget.update(camera,1/60);
  assert.ok(slot.intensity>0 && slot.intensity<3,'fade de saída não deve apagar instantaneamente');
  for(let i=0;i<120;i++)budget.update(camera,1/60);
  assert.ok(slot.intensity<0.001,'fade de saída deve terminar');
});
