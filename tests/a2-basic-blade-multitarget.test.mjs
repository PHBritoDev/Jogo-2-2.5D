import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SwordRites, swordSideHitContext } from '../sword-rites3d.js';
import { Enemy1Squad } from '../enemy1-squad3d.js';

const enemy = (id,x=0,z=3) => ({ id,x,y:1,z,radius:.48,height:1.7,alive:true });
function encounter(blocked=()=>false) {
 const primary=enemy(1),side=enemy(2,.3),hidden=enemy(3,4);
 const hits=[],impacts=[];
 const rites=new SwordRites({
  blocked,hit:(damage,id,kind)=>hits.push({damage,id,kind}),
  event:(type,data)=>{if(type==='impact')impacts.push(data.target.id);},
  pose:()=>({base:{x:0,y:1,z:2},tip:{x:0,y:1,z:3.5}})
 });
 const ctx={from:{x:0,y:0,z:0},target:primary,others:[side,hidden],sword:'prota'};
 return {primary,side,hidden,hits,impacts,rites,ctx};
}
test('one physical swing damages primary and secondary capsule once, never distant enemy',()=>{
 const e=encounter();assert(e.rites.attack('prota',{target:e.primary}));
 for(let i=0;i<90;i++)e.rites.update(1/120,e.ctx);
 assert.deepEqual(e.hits.map(h=>h.id).sort(),[1,2]);
 assert.equal(e.impacts.filter(id=>id===2).length,1);
 assert(e.hits.every(h=>h.damage>0));
 assert.deepEqual(e.hits.map(h=>[h.id,h.kind]),[[1,'basic'],[2,'energy-side']]);
});
test('secondary physical contact respects obstruction',()=>{
 const e=encounter((p)=>p.x>.15);assert(e.rites.attack('prota',{target:e.primary}));
 for(let i=0;i<90;i++)e.rites.update(1/120,e.ctx);
 assert.equal(e.hits.some(h=>h.id===2),false);
});

test('hybrid blade and travelling wave never double-hit the same secondary enemy',()=>{
 const e=encounter();
 const hybrid={clip:'Rite_Crescent',duration:.72,open:.235,close:.41,buffer:.28,multiplier:1,
  hit:'hybrid',count:1,energy:{kind:'wave',at:.27,roll:.85,radius:1.7,speed:17,range:6.5,band:.8,life:.5,falloff:true}};
 e.rites.api.moveset=()=>hybrid;
 assert(e.rites.attack('prota',{target:e.primary}));
 for(let i=0;i<180;i++)e.rites.update(1/120,e.ctx);
 assert.deepEqual(e.hits.filter(h=>h.id===2).map(h=>h.kind),['energy-side']);
 assert.equal(e.impacts.filter(id=>id===2).length,1);
 assert.equal(e.hits.filter(h=>h.id===1).length,1);
});

// The actual world callback only damages the primary siegeEpoch on 'basic';
// secondary actors are handled through the pre-existing 'energy-side' route.
test('secondary physical strike reaches the production-style squad damage bridge',()=>{
 const e=encounter(),applied=[];
 e.rites.api.hit=(damage,id,kind)=>{
  if(kind==='energy-side' || (kind==='basic'&&id===e.primary.id))applied.push({id,damage});
 };
 assert(e.rites.attack('prota',{target:e.primary}));
 for(let i=0;i<90;i++)e.rites.update(1/120,e.ctx);
 assert.deepEqual(applied.map(h=>h.id),[1,2]);
 assert(applied.every(h=>h.damage>0));
});

test('squad bridge applies HP loss and impact reaction to two nearby living actors',()=>{
 const e=encounter(),second=enemy(4,-.3),hp=new Map([[1,120],[2,120],[4,120],[3,120]]),reactions=new Map();
 e.ctx.others=[e.side,second,e.hidden];
 e.rites.api.hit=(damage,id,kind)=>{
  if(kind!=='energy-side'&&!(kind==='basic'&&id===e.primary.id))return;
  hp.set(id,hp.get(id)-damage);
 };
 e.rites.api.event=(type,data)=>{
  if(type==='impact')reactions.set(data.target.id,(reactions.get(data.target.id)||0)+1);
 };
 assert(e.rites.attack('prota',{target:e.primary}));
 for(let i=0;i<90;i++)e.rites.update(1/120,e.ctx);
 for(const id of [1,2,4]){assert(hp.get(id)<120,`actor ${id} must lose HP`);assert.equal(reactions.get(id),1,`actor ${id} must react once`);}
 assert.equal(hp.get(3),120);
 assert.equal(reactions.has(3),false);
});

test('secondary energy knockback follows the wave after the hero has moved',()=>{
 const target={x:10,z:20},fallback={x:90,z:-40};
 assert.deepEqual(swordSideHitContext({wave:{direction:{x:1,y:0,z:0}}},target,fallback),
  {x:9,z:20,kind:'spell'});
 assert.deepEqual(swordSideHitContext({energy:{kind:'wave',yaw:0,x:-2,z:-3}},target,fallback),
  {x:10,z:19,kind:'spell'});
});
test('secondary sector knockback radiates from its origin; blade remains melee',()=>{
 const target={x:10,z:20},fallback={x:90,z:-40};
 assert.deepEqual(swordSideHitContext({energy:{kind:'sector',x:2,z:3}},target,fallback),
  {x:2,z:3,kind:'spell'});
 assert.deepEqual(swordSideHitContext({by:'blade',target},target,fallback),
  {x:90,z:-40,kind:'melee'});
});

test('real squad knockback follows a travelling wave instead of the moved hero',()=>{
 const squad=new Enemy1Squad({seed:7}),[actor]=squad.spawn([{x:10,z:20}]);
 const source=swordSideHitContext({wave:{direction:{x:1,y:0,z:0}}},actor,{x:90,z:-40});
 squad.damageActor(actor,10,{...source,by:'hero',knock:.3});
 assert.ok(actor.kx>0,'wave travelling +X must push the enemy +X');
 assert.ok(Math.abs(actor.kz)<1e-9,'wave travelling +X must not inherit the moved hero Z');
});
test('real squad knockback uses sector origin and keeps blade source as melee',()=>{
 const sectorSquad=new Enemy1Squad({seed:8}),[sectorActor]=sectorSquad.spawn([{x:10,z:20}]);
 const sector=swordSideHitContext({energy:{kind:'sector',x:2,z:3}},sectorActor,{x:90,z:-40});
 sectorSquad.damageActor(sectorActor,10,{...sector,by:'hero',knock:.3});
 assert.ok(sectorActor.kx>0&&sectorActor.kz>0,'sector pushes away from its own origin');
 const bladeSquad=new Enemy1Squad({seed:9}),[bladeActor]=bladeSquad.spawn([{x:10,z:20}]);
 const blade=swordSideHitContext({by:'blade'},bladeActor,{x:90,z:-40});
 bladeSquad.damageActor(bladeActor,10,{...blade,by:'hero',knock:.3});
 assert.ok(bladeActor.kx<0&&bladeActor.kz>0,'physical blade still pushes away from the hero');
 assert.equal(blade.kind,'melee');
});
test('production squad bridge consumes the projectile-aware side-hit context',async()=>{
 const source=await readFile(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
 const start=source.indexOf('function protaSideHit('),end=source.indexOf('\nfunction riteReady',start);
 assert.ok(start>=0&&end>start);
 const bridge=source.slice(start,end);
 assert.match(bridge,/swordSideHitContext\(x,a,player\.position\)/);
 assert.match(bridge,/sq\.damageActor\(a,damage,\{\.\.\.source,by:'hero',knock:\.3\}\)/);
});
