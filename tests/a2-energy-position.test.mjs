import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../vfx-flow3d.js',import.meta.url),'utf8');

test('energy body rejects malformed positions before drawing',()=>{
 assert.match(source,/const validPosition=position===undefined\|\|\(position!==null&&typeof position==='object'&&Number\.isFinite\(position\.x\)&&Number\.isFinite\(position\.y\)&&Number\.isFinite\(position\.z\)\)/);
 assert.match(source,/mesh\.visible=validPosition&&Number\.isFinite\(alpha\)/);
 assert.match(source,/if\(position&&validPosition\)mesh\.position\.set\(position\.x,position\.y,position\.z\)/);
});

test('valid position still updates mesh and missing position retains previous placement',()=>{
 const validate=position=>position===undefined||(position!==null&&typeof position==='object'&&Number.isFinite(position.x)&&Number.isFinite(position.y)&&Number.isFinite(position.z));
 assert.equal(validate({x:1,y:2,z:3}),true);
 assert.equal(validate(undefined),true);
 for(const position of [null,0,false,'',1,{x:NaN,y:2,z:3},{x:1,y:Infinity,z:3},{x:1,y:2,z:undefined},{x:1,y:2,z:-Infinity}])assert.equal(validate(position),false);
});

test('invalid frames preserve pooled mesh scale and shader uniforms',()=>{
 assert.match(source,/if\(Number\.isFinite\(radius\)&&radius>0&&Number\.isFinite\(length\)&&length>0\)mesh\.scale\.set\(radius,radius,length\)/);
 assert.match(source,/if\(Number\.isFinite\(time\)\)material\.uniforms\.time\.value=time/);
 assert.match(source,/if\(Number\.isFinite\(alpha\)\)material\.uniforms\.alpha\.value=alpha/);
 assert.match(source,/if\(Number\.isFinite\(dissolve\)\)material\.uniforms\.dissolve\.value=dissolve/);
});

 
// Exercise the exported runtime factory rather than only matching its source text.
test('energyBody hides invalid frames and recovers without corrupting pooled transforms',async()=>{
 const {energyBody}=await import('../vfx-flow3d.js');
 class Vector3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z;}
  normalize(){const n=Math.sqrt(this.lengthSq());this.x/=n;this.y/=n;this.z/=n;return this;}
 }
 class Geometry{
  setAttribute(){return this;}setIndex(){return this;}computeVertexNormals(){}
  computeBoundingSphere(){this.boundingSphere={radius:4};}
  dispose(){}
 }
 class Material{constructor(o){Object.assign(this,o);}dispose(){}}
 class Mesh{
  constructor(geometry,material){
   this.geometry=geometry;this.material=material;this.position=new Vector3();
   this.scale=new Vector3(1,1,1);
   this.quaternion={setFromUnitVectors(){}};
   this.visible=true;
  }
 }
 const T={Vector3,BufferGeometry:Geometry,Float32BufferAttribute:class{},
  ShaderMaterial:Material,Mesh,Color:class{},DoubleSide:2,FrontSide:1};
 const parent={add(){},remove(){}};
 const effect=energyBody(T,parent,'celestial',{rings:3,sides:3});
 const good={position:{x:3,y:4,z:5},radius:2,length:3,alpha:.8};
 effect.update(1,good);
 assert.equal(effect.mesh.visible,true);
 assert.deepEqual([effect.mesh.position.x,effect.mesh.position.y,effect.mesh.position.z],[3,4,5]);
 assert.deepEqual([effect.mesh.scale.x,effect.mesh.scale.y,effect.mesh.scale.z],[2,2,3]);
 effect.update(2,{position:null,radius:Infinity,length:3,alpha:NaN});
 assert.equal(effect.mesh.visible,false);
 assert.deepEqual([effect.mesh.position.x,effect.mesh.position.y,effect.mesh.position.z],[3,4,5]);
 assert.deepEqual([effect.mesh.scale.x,effect.mesh.scale.y,effect.mesh.scale.z],[2,2,3]);
 assert.equal(effect.material.uniforms.alpha.value,.8);
 effect.update(3,{position:{x:7,y:8,z:9},radius:1,length:1,alpha:.5});
 assert.equal(effect.mesh.visible,true);
 assert.deepEqual([effect.mesh.position.x,effect.mesh.position.y,effect.mesh.position.z],[7,8,9]);
 effect.dispose();
});
