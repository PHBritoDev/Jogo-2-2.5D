import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../sword-rites-vfx3d.js',import.meta.url),'utf8');
const {swordImpactPoint} = await import('data:text/javascript,'+encodeURIComponent(source));

test('sword impact uses the real blade contact point instead of target centre',()=>{
 const target={x:4,y:1,z:8},contact={x:3.7,y:1.6,z:7.8};
 assert.equal(swordImpactPoint({target,p:contact}),contact);
 assert.equal(swordImpactPoint({target}),target,'scripted impacts without contact remain supported');
 assert.equal(swordImpactPoint({target,p:{x:NaN,y:0,z:0}}),target);
 assert.equal(swordImpactPoint({target,p:{x:0,y:Infinity,z:0}}),target);
 assert.equal(swordImpactPoint({target,p:{x:0,y:0,z:undefined}}),target);
 assert.equal(swordImpactPoint({}),undefined);
});

test('runtime impact particles and slash share the chosen contact point',()=>{
 assert.match(source,/else if\(type==='impact'\)\{const p=swordImpactPoint\(e\);if\(!p\)return;burst\(p,e\.sword/);
 assert.match(source,/burst\(p,e\.sword,e\.final\?32:15\);cut\(p,e\.sword/);
});
