import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {measureRefuge,createGreedUltimate} from '../greed-ultimate-atomic3d.js';

const world=readFileSync(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
const bridge=readFileSync(new URL('../greed-ultimate-campaign3d.js',import.meta.url),'utf8');
const corona=readFileSync(new URL('../greed-ultimate-corona3d.js',import.meta.url),'utf8');

test('ultimate Codex e combate Claude integrados apenas na Ganância III',()=>{
 assert.match(world,/import \{createGreedCampaignUltimate\} from '\.\/greed-ultimate-campaign3d\.js'/);
 assert.match(world,/function greedAtomicTick\(dt,paused=false\)/);
 assert.match(world,/dimBattle\?\.active\|\|dimBattle\.key!=='greed'/);
 assert.match(world,/a\.gk\?\.phase!==3/);
 assert.match(world,/const enemyDt=admFreezeNearby\?0:dt;/);
 assert.match(world,/squadRT\.update\(enemyDt,\{targets,foreign,camera,quality:.*greedAtomic\?\.active/);
 assert.match(world,/greedAtomicTick\(enemyDt,paused\|\|squadQAPause\|\|admFreezeNearby\)/);
 assert.match(world,/function greedAtomicEnd\(\)\{if\(greedAtomic\)\{greedAtomic\.dispose\(\);greedAtomic=null;\}\}/);
 assert.match(bridge,/createGreedAtomicEncounter\(ultimate\)/);
 assert.match(bridge,/b\.gk\.roots\.D/);
 assert.match(bridge,/actor\.anim=\{role:'gk_rslash'/);
 assert.match(bridge,/damage\(\{token,blocked,actor\}\)/);
 assert.match(world,/damagePlayerFromEnemyAttack\(60,\{kind:'atomic'/);
});
test('shader da arena deslocada preserva area, cortina e zona segura',()=>{
 assert.match(corona,/origin=\{x:0,y:0,z:0\}/);
 assert.match(corona,/root\.position\.set\(origin\.x/);
 assert.match(corona,/arenaCenter:\{value:new T\.Vector2/);
 assert.match(corona,/vec2 wp=w\.xz-arenaCenter/);
 const r=30;const arena=measureRefuge(r,(x,z)=>x*x+z*z<=r*r);
 assert.ok(Math.abs(arena.fraction-.8)<.025,'perigo ~80% da area');
 assert.equal(arena.safe(0,r-.3),true);
 assert.equal(arena.safe(0,0),false);
});
test('ultimate libera camera antes da fuga e recupera espada depois do impacto',()=>{
 const arena=measureRefuge(30,(x,z)=>x*x+z*z<=900);
 const log=[],damage=[];
 const u=createGreedUltimate({arena,speed:2.8,camera:{focus:()=>log.push('focus'),release:()=>log.push('release')},
  weapon:{release:()=>log.push('throw'),restore:()=>log.push('restore')},
  damage:x=>damage.push(x),beat:p=>log.push(p)});
 assert.equal(u.start({phase:3,grounded:true,busy:false}),true);
 const hero={x:0,z:0,blocking:false,evading:false};
 for(let i=0;i<60*35&&u.getState().phase!=='idle';i++)u.update(1/60,hero);
 assert.ok(log.indexOf('focus')<log.indexOf('throw'));
 assert.ok(log.indexOf('throw')<log.indexOf('release'));
 assert.ok(log.indexOf('release')<log.indexOf('detonate'));
 assert.ok(log.includes('restore'));
 assert.equal(u.getState().phase,'idle');
 assert.equal(damage.length,1,'um unico evento de dano');
});
