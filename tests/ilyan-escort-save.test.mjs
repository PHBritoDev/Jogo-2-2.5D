import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrateProgress, ACT1 } from '../act1-flow.js';

const progress = (extra={}) => ({version:ACT1.version,act1Rev:ACT1.rev,questStep:5,...extra});
test('Ilyan escort checkpoint survives save/reload migration',()=>{
 const pos={x:40,z:-48,yaw:1.2};
 assert.deepEqual(migrateProgress(progress({ilyanEscortPosition:pos})).ilyanEscortPosition,pos);
 assert.deepEqual(migrateProgress(JSON.parse(JSON.stringify(progress({ilyanEscortPosition:pos})))).ilyanEscortPosition,pos);
});
test('corrupt and legacy escort coordinates cannot be restored',()=>{
 for(const value of [null,{}, {x:'40',z:-48,yaw:1}, {x:Infinity,z:-48,yaw:1},{x:40,z:NaN,yaw:1}])
  assert.equal(migrateProgress(progress({ilyanEscortPosition:value})).ilyanEscortPosition,null);
 assert.equal(migrateProgress(progress()).ilyanEscortPosition,null);
});
test('3D runtime saves and validates restored Ilyan coordinates on walkable sewer floor',()=>{
 const source=readFileSync(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
 assert.match(source,/ilyanEscortPosition:questStep===5&&ilyanNpc/);
 assert.match(source,/sewerWalkable\(saved\.x-DIMENSIONS\.esgoto\.center\.x,saved\.z-DIMENSIONS\.esgoto\.center\.z/);
 assert.match(source,/ilyanEscortPosition=\{x:h\.position\.x,z:h\.position\.z,yaw:h\.rotation\.y\}/);
});

test('Ilyan checkpoint is cleared when the player has left the escort stage',()=>{
 const pos={x:40,z:-48,yaw:1.2};
 for(const questStep of [0,4,6,8]) {
  assert.equal(migrateProgress(progress({questStep,ilyanEscortPosition:pos})).ilyanEscortPosition,null);
 }
 assert.equal(migrateProgress({...progress({ilyanEscortPosition:pos}),version:5}).ilyanEscortPosition,null);
});
