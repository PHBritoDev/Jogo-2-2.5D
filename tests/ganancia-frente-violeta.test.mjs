import assert from 'node:assert/strict';
import test from 'node:test';
import {createUsuraBlast} from '../greed-ultimate-blast3d.js';

const three = process.env.COMBAT_THREE_DIR;
let T;
try { T = await import(three ? three+'/build/three.module.js' : 'three'); } catch {}
test('onda chega à borda deslocada; o pilar permanece no disparo e o refúgio mantém sua máscara', {skip:!T && 'three ausente'},()=>{
 const cast=new T.Group(),normal={value:new T.Vector2(-1,0)};
 cast.position.set(14,0,-8);
 const vfx=createUsuraBlast(T,cast,{normal},'low');
 const core=cast.getObjectByName('Usura/Pilar'),front=cast.getObjectByName('Usura/Frente'),tint=cast.getObjectByName('Usura/Luz ambiente');
 const arena={radius:30,reach:46};
 vfx.update({phase:'detonate',progress:.9,front:41.4},arena);
 assert.equal(front.scale.x,41.4);assert.ok(core.scale.x<arena.radius);
 assert.equal(core.material.uniforms.normal,front.material.uniforms.normal);
 assert.equal(front.material.uniforms.hot.value,0);assert.ok(tint.visible);
 vfx.update({phase:'aftermath',progress:.1},arena);
 assert.equal(front.visible,false);assert.ok(core.visible);assert.ok(core.material.uniforms.strength.value>.9);
 assert.equal(core.getWorldPosition(new T.Vector3()).x,14);
 vfx.update({phase:'aftermath',progress:1},arena);
 assert.equal(core.material.uniforms.strength.value,0);
 vfx.update({phase:'idle',progress:0},arena);
 assert.ok(cast.children.every(o=>!o.visible));
 let released=0;core.geometry.addEventListener('dispose',()=>released++);
 vfx.dispose();assert.equal(released,1);assert.equal(cast.children.length,0);
});
