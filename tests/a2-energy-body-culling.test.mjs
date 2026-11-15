import test from 'node:test';
import assert from 'node:assert/strict';
import { energyBody } from '../vfx-flow3d.js';

class Geometry {
  setAttribute() {}
  setIndex() {}
  computeVertexNormals() {}
  computeBoundingSphere() { this.boundingSphere = { radius: 3 }; }
  dispose() {}
}
class Vector {
  constructor(x=0,y=0,z=0) { this.x=x;this.y=y;this.z=z; }
  set(x,y,z) { this.x=x;this.y=y;this.z=z;return this; }
  lengthSq() { return this.x*this.x+this.y*this.y+this.z*this.z; }
  normalize() { return this; }
}
const T = {
  BufferGeometry: Geometry,
  Float32BufferAttribute: class { constructor(values,size) { this.values=values;this.size=size; } },
  Color: class { constructor(...rgb) { this.rgb=rgb; } },
  ShaderMaterial: class { constructor(options) { Object.assign(this,options); } dispose() {} },
  Mesh: class {
    constructor(geometry,material) {
      this.geometry=geometry;this.material=material;
      this.position={set() {}};this.scale={set() {}};
      this.quaternion={setFromUnitVectors() {}};
    }
  },
  Vector3: Vector, DoubleSide:2, FrontSide:0
};
test('energy body culls outside frustum with conservative warp margin and keeps updates', () => {
  const children=[];
  const parent={add(mesh) {children.push(mesh);},remove(mesh) {children.splice(children.indexOf(mesh),1);}};
  const fx=energyBody(T,parent,'celestial',{warp:.4});
  assert.equal(fx.mesh.frustumCulled,true);
  assert.ok(fx.mesh.geometry.boundingSphere.radius >= 3+.4*.85-1e-9);
  fx.material.uniforms.warp.value=.8;
  fx.update(.5,{alpha:1});
  assert.ok(Math.abs(fx.mesh.geometry.boundingSphere.radius-(3+.8*.85))<1e-9);
  fx.material.uniforms.warp.value=0;
  fx.update(.75,{alpha:1});
  assert.equal(fx.mesh.geometry.boundingSphere.radius,3);
  fx.material.uniforms.warp.value=NaN;
  fx.update(.9,{alpha:1});
  assert.equal(fx.mesh.frustumCulled,false);
  fx.material.uniforms.warp.value=.2;
  fx.update(.95,{alpha:1});
  assert.equal(fx.mesh.frustumCulled,true);
  assert.ok(Math.abs(fx.mesh.geometry.boundingSphere.radius-(3+.2*.85))<1e-9);
  fx.update(1,{alpha:0,quality:0});
  assert.equal(fx.mesh.visible,false);
  assert.equal(fx.material.uniforms.detail.value,.65);
  fx.update(2,{alpha:1,quality:1});
  assert.equal(fx.mesh.visible,true);
  fx.update(2.01,{alpha:.0149,dissolve:0});
  assert.equal(fx.mesh.visible,false,'shader discards every fragment below .015 alpha');
  fx.update(2.02,{alpha:.015,dissolve:0});
  assert.equal(fx.mesh.visible,true,'boundary alpha remains renderable');
  fx.update(2.03,{alpha:NaN,dissolve:0});
  assert.equal(fx.mesh.visible,false,'non-finite alpha must not draw');
  fx.update(2.04,{alpha:1,dissolve:0});
  assert.equal(fx.mesh.visible,true,'effect recovers after low or invalid alpha');
  fx.update(2.1,{alpha:1,dissolve:1});
  assert.equal(fx.mesh.visible,false,'fully dissolved body should not consume a draw call');
  fx.update(2.2,{alpha:1,dissolve:.99});
  assert.equal(fx.mesh.visible,true,'body should reappear if dissolution reverses');
  for (const invalid of [NaN,Infinity,-Infinity]) {
    fx.update(2.3,{alpha:1,dissolve:invalid});
    assert.equal(fx.mesh.visible,false,'invalid dissolve must not submit shader draw');
  }
  fx.update(2.4,{alpha:1,dissolve:.5});
  assert.equal(fx.mesh.visible,true,'effect recovers after invalid dissolve');
  fx.dispose();
  assert.equal(children.length,0);
});

// Non-positive or non-finite energy scales should not submit a draw call.
// Negative scale mirrors triangle winding, making FrontSide energy shells vanish unpredictably.
// Reusing the same pooled body with valid dimensions must restore visibility.
test('energy body skips degenerate transforms and recovers without changing geometry', () => {
  const fx=energyBody(T,{add() {},remove() {}},'celestial');
  for (const dimensions of [{radius:0,length:1},{radius:1,length:0},{radius:-1,length:1},{radius:1,length:-1},{radius:-.001,length:-.001},{radius:NaN,length:1},{radius:1,length:Infinity}]) {
    fx.update(1,{alpha:1,dissolve:0,...dimensions});
    assert.equal(fx.mesh.visible,false,'invalid or collapsed energy body should not render');
  }
  fx.update(2,{alpha:1,dissolve:0,radius:1,length:1});
  assert.equal(fx.mesh.visible,true,'valid scale must restore the pooled effect');
  fx.dispose();
});

// Regression: the initial fail-open decision must not be overwritten after setup.
test('energy body keeps culling disabled for invalid initial warp and recovers', () => {
  for (const warp of [NaN, Infinity, -Infinity]) {
    const children=[];
    const parent={add(mesh) { children.push(mesh); },remove(mesh) { children.splice(children.indexOf(mesh),1); }};
    const fx=energyBody(T,parent,'celestial',{warp});
    assert.equal(fx.mesh.frustumCulled,false,'invalid initial warp must fail open');
    assert.equal(children.length,1);
    fx.update(0,{alpha:1});
    assert.equal(fx.mesh.frustumCulled,false);
    fx.material.uniforms.warp.value=.25;
    fx.update(.1,{alpha:1});
    assert.equal(fx.mesh.frustumCulled,true,'finite warp restores culling');
    assert.ok(Math.abs(fx.mesh.geometry.boundingSphere.radius-(3+.25*.85))<1e-9);
    fx.dispose();
    assert.equal(children.length,0);
  }
});

// Regression: a finite warp can still overflow the conservative sphere bound
// if geometry bounds are unusually large. Never cull against Infinity.
test('energy body fails open when expanded bounding radius overflows', () => {
  class HugeGeometry extends Geometry {
    computeBoundingSphere() { this.boundingSphere={radius:Number.MAX_VALUE}; }
  }
  const hugeT={...T,BufferGeometry:HugeGeometry};
  const parent={add() {},remove() {}};
  const fx=energyBody(hugeT,parent,'celestial',{warp:Number.MAX_VALUE});
  assert.equal(fx.mesh.frustumCulled,false);
  fx.material.uniforms.warp.value=0;
  fx.update(1,{alpha:1});
  assert.equal(fx.mesh.frustumCulled,true);
  assert.equal(fx.mesh.geometry.boundingSphere.radius,Number.MAX_VALUE);
  fx.dispose();
});

// A controller can change warp after its last update and before the renderer's
// frustum test. Bounds must update on assignment, not one frame later.
test('energy body refreshes culling immediately when warp uniform is assigned', () => {
  const fx=energyBody(T,{add() {},remove() {}},'celestial',{warp:.1});
  const warp=fx.material.uniforms.warp;
  warp.value=2;
  assert.equal(fx.mesh.frustumCulled,true);
  assert.ok(Math.abs(fx.mesh.geometry.boundingSphere.radius-4.7)<1e-9);
  warp.value=Infinity;
  assert.equal(fx.mesh.frustumCulled,false);
  warp.value=-.5;
  assert.equal(fx.mesh.frustumCulled,true);
  assert.ok(Math.abs(fx.mesh.geometry.boundingSphere.radius-3.425)<1e-9);
  fx.dispose();
});


// The dissolve mask is independent of the later body/vein noises.
// Early fragment rejection saves their cost without changing the mask or palette.
test('energy shader rejects dissolved pixels before expensive secondary noises', () => {
  const fx=energyBody(T,{add() {},remove() {}},'celestial');
  const shader=fx.material.fragmentShader;
  const mask='float cells=flowNoise(vec2(vUv.x*22.*frequency,vUv.y*15.+seed),time*.7,detail);';
  const rejection='if(cells<dissolve)discard;';
  const body='float n=flowNoise(vec2(vUv.x*11.*frequency,vUv.y*7.+seed),time,detail);';
  const veins='float n2=flowNoise(vec2(vUv.x*23.*frequency-time*1.2,vUv.y*13.+seed*1.7),time*.85,detail);';
  assert.equal(shader.split(mask).length,2,'dissolve noise must be evaluated exactly once');
  assert.equal(shader.split(rejection).length,2,'dissolve discard must occur exactly once');
  assert.ok(shader.indexOf(mask)<shader.indexOf(rejection));
  assert.ok(shader.indexOf(rejection)<shader.indexOf(body));
  assert.ok(shader.indexOf(rejection)<shader.indexOf(veins));
  assert.ok(shader.includes('float edgeCut=smoothstep(dissolve,dissolve+.11,cells);'),'preserve dissolve edge falloff');
  fx.dispose();
});

test('low-quality energy body skips fully dissolved masks and recovers at threshold', () => {
  const fx=energyBody(T,{add() {},remove() {}},'celestial');
  // FLOW_NOISE maximum is .72 + .28*detail, with detail=.65 at quality 0.
  const ceiling=.72+.28*.65;
  fx.update(0,{alpha:1,quality:0,dissolve:ceiling});
  assert.equal(fx.mesh.visible,false,'all low-detail pixels are discarded at mask ceiling');
  fx.update(.1,{alpha:1,quality:0,dissolve:ceiling-.0001});
  assert.equal(fx.mesh.visible,true,'just below the ceiling the body remains eligible');
  fx.update(.2,{alpha:1,quality:1,dissolve:ceiling});
  assert.equal(fx.mesh.visible,true,'full detail has a higher mask ceiling');
  fx.update(.3,{alpha:1,quality:0,dissolve:1});
  assert.equal(fx.mesh.visible,false);
  fx.update(.4,{alpha:1,quality:0,dissolve:0});
  assert.equal(fx.mesh.visible,true,'pooled effect reappears after dissolving');
  fx.dispose();
});

test('energy body ignores non-finite aim vectors and recovers on the next valid direction', () => {
  const fx=energyBody(T,{add() {},remove() {}},'celestial');
  let rotations=0;
  fx.mesh.quaternion.setFromUnitVectors=(_axis,vector) => {
    assert.ok([vector.x,vector.y,vector.z].every(Number.isFinite),'quaternion must receive a finite vector');
    rotations++;
  };
  for(const dir of [{x:NaN,y:0,z:1},{x:1,y:Infinity,z:0},{x:1,y:0,z:NaN},{x:1,y:-Infinity,z:2}]) {
    fx.update(1,{dir,alpha:1});
    assert.equal(rotations,0,'invalid aim must preserve the last valid orientation');
    assert.equal(fx.mesh.visible,true,'invalid aim alone must not hide the energy effect');
  }
  fx.update(2,{dir:{x:1,y:0,z:0},alpha:1});
  assert.equal(rotations,1,'valid aim restores orientation updates');
  fx.dispose();
});
