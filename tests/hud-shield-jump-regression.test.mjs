import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROTA_JUMP } from '../prota-combat3d.js';
import { DEMON1_LEAP } from '../demon1-combat3d.js';
const html=readFileSync(new URL('../mundo-3d-prototype.html',import.meta.url),'utf8');
const world=readFileSync(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
test('HUD usa só um escudo na posição da defesa antiga',()=>{
 assert.equal((html.match(/id="shield"/g)||[]).length,1);
 assert.equal((html.match(/id="defend"/g)||[]).length,0);
 assert.ok(html.indexOf('id="shield"')<html.indexOf('id="jump"'));
 assert.match(world,/getElementById\('shield'\)/);
 assert.doesNotMatch(world,/e\.code==='KeyK'/);
});
test('protagonista pula mais alto, sem exigir mudança da gravidade do mundo',()=>{
 const apex=PROTA_JUMP.impulse**2/(2*PROTA_JUMP.gravity);
 assert.ok(apex>=1.1&&apex<=1.3,`ápice: ${apex}`);
});
test('Demônio 1 salta entre 2 e 3 vezes mais alto que antes',()=>{
 const oldApex=7.2**2/(2*18),newApex=DEMON1_LEAP.v1**2/(2*DEMON1_LEAP.gravity);
 assert.ok(newApex/oldApex>=2&&newApex/oldApex<=3);
 assert.doesNotMatch(world,/distance>1\.9&&distance<=3\.5&&enemyActions\.block/);
});
