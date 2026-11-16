import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../vfx-flow3d.js',import.meta.url),'utf8');

test('energy body rejects malformed positions before drawing',()=>{
 assert.match(source,/const validPosition=!position\|\|\(Number\.isFinite\(position\.x\)&&Number\.isFinite\(position\.y\)&&Number\.isFinite\(position\.z\)\)/);
 assert.match(source,/mesh\.visible=validPosition&&Number\.isFinite\(alpha\)/);
 assert.match(source,/if\(position&&validPosition\)mesh\.position\.set\(position\.x,position\.y,position\.z\)/);
});

test('valid position still updates mesh and missing position retains previous placement',()=>{
 const validate=position=>!position||(Number.isFinite(position.x)&&Number.isFinite(position.y)&&Number.isFinite(position.z));
 assert.equal(validate({x:1,y:2,z:3}),true);
 assert.equal(validate(undefined),true);
 for(const position of [{x:NaN,y:2,z:3},{x:1,y:Infinity,z:3},{x:1,y:2,z:undefined},{x:1,y:2,z:-Infinity}])assert.equal(validate(position),false);
});
