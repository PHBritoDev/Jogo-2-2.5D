import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Load the production module without its WebGL-only shader dependency.
const source = await readFile(new URL('../vfx-trail3d.js', import.meta.url), 'utf8');
const moduleSource = source.replace(/^import .*?;\s*$/m, 'const energyMaterial = () => ({ uniforms: { time: { value: 0 }, detail: { value: 1 } }, dispose() {} });');
const { trailSampleValid, volumeTrail } = await import('data:text/javascript,' + encodeURIComponent(moduleSource));

test('trail sample rejects non-finite time and coordinates', () => {
  assert.equal(trailSampleValid(1, { x: 1, y: 2, z: 3 }), true);
  for (const point of [null, undefined, 2, {x: NaN,y: 1,z: 1}, {x: 1,y: Infinity,z: 1}, {x: 1,y: 1,z: undefined}]) {
    assert.equal(trailSampleValid(1, point), false);
  }
  assert.equal(trailSampleValid(Infinity, {x: 1,y: 2,z: 3}), false);
});

test('trail runtime gates buffer writes and clears invalid time', () => {
  // Keep regression tied to the actual update path, not just the exported predicate.
  assert.match(volumeTrail.toString(), /if\(!trailSampleValid\(time,point\)\)/);
  assert.match(volumeTrail.toString(), /!Number\.isFinite\(time\)/);
});

test('invalid emitted sample breaks trail instead of joining two distant valid points', () => {
  class Vector3 {
    constructor(x=0,y=0,z=0){this.set(x,y,z);}
    set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
    subVectors(a,b){return this.set(a.x-b.x,a.y-b.y,a.z-b.z);}
    lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z;}
    normalize(){const l=Math.sqrt(this.lengthSq());if(l)this.set(this.x/l,this.y/l,this.z/l);return this;}
    crossVectors(a,b){return this.set(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);}
  }
  class BufferAttribute {constructor(array){this.array=array;}setUsage(){return this;}}
  class BufferGeometry {
    constructor(){this.attributes={};}
    setAttribute(name,value){this.attributes[name]=value;}
    setIndex(){}
    setDrawRange(){}
    dispose(){}
  }
  class Mesh {constructor(geometry,material){this.geometry=geometry;this.material=material;this.visible=false;}}
  const T={Vector3,BufferAttribute,BufferGeometry,Mesh,DynamicDrawUsage:1};
  const parent={add(){},remove(){}};
  const trail=volumeTrail(T,parent,{}, {capacity:5,sides:3});
  trail.update(1,{x:0,y:0,z:0});
  trail.update(1.1,{x:1,y:0,z:0});
  assert.equal(trail.mesh.visible,true);
  trail.update(1.2,{x:NaN,y:0,z:0});
  assert.equal(trail.mesh.visible,false);
  trail.update(1.3,{x:1000,y:0,z:0});
  assert.equal(trail.mesh.visible,false, 'new stroke must start with a single sample');
  trail.update(1.4,{x:1001,y:0,z:0});
  assert.equal(trail.mesh.visible,true);
  trail.dispose();
});
