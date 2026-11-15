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
