import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { SwordRites, segmentBlocked, swordSideHitContext } from '../sword-rites3d.js';
import { Enemy1Squad } from '../enemy1-squad3d.js';
import { makeEnergy } from '../combat-energy3d.js';

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
test('physical blade sweep cannot skip a 1cm wall between coarse samples',()=>{
 const target=enemy(1,.12,0),hits=[],impacts=[];
 const blocked=p=>p.x>.031&&p.x<.041;
 const rites=new SwordRites({
  blocked,
  pose:()=>({base:{x:0,y:1,z:0},tip:{x:.12,y:1,z:0}}),
  hit:(damage,id,kind)=>hits.push({damage,id,kind}),
  event:(type,data)=>{if(type==='impact')impacts.push(data);}
 });
 assert.equal(rites.attack('prota',{target}),true);
 const ctx={from:{x:0,y:1,z:0},target,others:[],sword:'prota',grounded:true};
 for(let i=0;i<120;i++)rites.update(1/120,ctx);
 assert.equal(hits.length,0,'a 1cm wall between the old 6cm samples must stop the blade');
 assert.equal(impacts.length,0,'a blocked blade must not emit an impact');
});

test('moving blade sweep stops at a thin wall between clear endpoint poses at 20/30/60/120 FPS',()=>{
 for(const fps of [20,30,60,120]){
  const focus=enemy(99,10,10),side=enemy(2,1.2,.2),hits=[],impacts=[];
  const blocked=p=>p.x>.331&&p.x<.339&&p.z>.45&&p.z<.55;
  const rites=new SwordRites({
   moveset:()=>({id:'thin-wall',duration:.6,open:.01,close:.5,buffer:.1,multiplier:1,hit:'blade',count:1}),
   blocked,
   pose:a=>{const x=a.t<.025?0:1.2;return{base:{x,y:1,z:0},tip:{x,y:1,z:1}};},
   hit:(damage,id,kind)=>hits.push({damage,id,kind}),
   event:(type,data)=>{if(type==='impact')impacts.push(data);}
  });
  assert.equal(rites.attack('prota',{target:focus}),true);
  const ctx={from:{x:0,y:1,z:0},target:focus,others:[side],sword:'prota',grounded:true};
  for(let i=0;i<fps;i++)rites.update(1/fps,ctx);
  assert.equal(hits.length,0,'FPS '+fps+': a moving blade must stop before the 1cm wall even when endpoint poses are clear');
  assert.equal(impacts.length,0,'FPS '+fps+': the secondary target behind the wall must not receive a ghost impact');
 }
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
 assert.deepEqual(swordSideHitContext({kind:'spell',by:'judgment'},target,fallback),
  {x:90,z:-40,kind:'spell'});
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
 assert.match(bridge,/return dealt>0/);
 const hitStart=source.indexOf("hit:(damage,id,kind,x)=>{"),hitEnd=source.indexOf("event:(type,e)=>",hitStart);
 assert.ok(hitStart>=0&&hitEnd>hitStart);
 assert.match(source.slice(hitStart,hitEnd),/return protaSideHit\(damage,id,x\)/);
});

test('degenerate wave direction and sector-center hits keep deterministic knockback',()=>{
 const target={x:10,z:20},fallback={x:90,z:-40};
 assert.deepEqual(swordSideHitContext({wave:{direction:{x:0,z:0},yaw:Math.PI/2}},target,fallback),
  {x:9,z:20,kind:'spell'});
 assert.deepEqual(swordSideHitContext({energy:{kind:'sector',x:10,z:20,yaw:0}},target,fallback),
  {x:10,z:19,kind:'spell'});
 const squad=new Enemy1Squad({seed:12}),[actor]=squad.spawn([{x:10,z:20}]);
 const source=swordSideHitContext({energy:{kind:'sector',x:10,z:20,yaw:0}},actor,fallback);
 squad.damageActor(actor,10,{...source,by:'hero',knock:.3});
 assert.ok(actor.kz>0,'sector centered on an overlapping actor should push along its authored yaw');
});
test('real Eclipse wave metadata drives secondary squad knockback along travel',()=>{
 const primary=enemy(1,0,3),squad=new Enemy1Squad({seed:11}),[actor]=squad.spawn([{x:.7,z:3}]);
 const side={id:actor.id,x:actor.x,y:actor.y+(actor.T.height||1.7)*.5,z:actor.z,
  radius:actor.T.radius,height:actor.T.height,alive:true};
 let result=null;
 const rites=new SwordRites({
  pose:()=>null,
  hit:(damage,id,kind,meta)=>{
   if(kind!=='energy-side'||id!==actor.id)return;
   const source=swordSideHitContext(meta,actor,{x:90,z:-40});
   const dealt=squad.damageActor(actor,damage,{...source,by:'hero',knock:.3});
   result={dealt,source,direction:meta?.wave?.direction};
  }
 });
 assert.deepEqual(rites.cast('aurora',{mana:100,from:{x:0,y:0,z:0},target:primary,yaw:0,damage:25}),{ok:true,cost:38});
 const ctx={from:{x:0,y:0,z:0},target:primary,others:[side],sword:'aurora'};
 for(let i=0;i<120&&!result;i++)rites.update(1/120,ctx);
 assert.ok(result?.dealt>0,'the real Eclipse wave must hit the secondary squad actor');
 assert.deepEqual(result.direction,{x:0,y:0,z:1});
 assert.ok(actor.kz>0,'the actor must be pushed forward along the wave');
 assert.ok(Math.abs(actor.kx)<1e-9,'the moved hero must not inject a sideways knockback');
});

test('rejected physical secondary contact does not emit a false impact',()=>{
 const squad=new Enemy1Squad({seed:13}),[actor]=squad.spawn([{x:0,z:3}]);
 actor.act={iframes:true};
 const side={id:actor.id,x:actor.x,y:actor.y+(actor.T.height||1.7)*.5,z:actor.z,
  radius:actor.T.radius,height:actor.T.height,alive:true};
 const focus=enemy(99,10,10),impacts=[];
 const rites=new SwordRites({
  pose:()=>({base:{x:-1,y:1,z:3},tip:{x:1,y:1,z:3}}),
  hit:(damage,id,kind,meta)=>{
   if(kind!=='energy-side')return undefined;
   const source=swordSideHitContext(meta,actor,{x:0,z:1});
   return squad.damageActor(id,damage,{...source,by:'hero',knock:.3})>0;
  },
  event:(type,data)=>{if(type==='impact')impacts.push(data);}
 });
 assert.equal(rites.attack('aurora',{target:focus,yaw:0}),true);
 const ctx={from:{x:0,y:0,z:1},target:focus,others:[side],sword:'aurora',grounded:true};
 for(let i=0;i<24;i++)rites.update(1/60,ctx);
 assert.equal(actor.hp,actor.maxHp,'iframe precisa rejeitar o dano físico lateral');
 assert.equal(impacts.filter(e=>e.secondary&&e.target?.id===actor.id).length,0,
  'sem dano aplicado, não deve aparecer um impacto de espada falso');
});
test('rejected generic energy secondary contact does not emit a false impact',()=>{
 const impacts=[],rites=new SwordRites({hit:()=>0,event:(type,data)=>{if(type==='impact')impacts.push(data);}});
 const e=makeEnergy({kind:'wave',speed:12,range:3,radius:1.2,life:10,roll:0,band:.7},{x:0,y:1,z:0},0,0);
 e.travel=2.9;e.owner={damage:24,def:{multiplier:1},targetId:'primary'};
 rites.energies.push(e);
 rites.update(1/60,{from:{x:0,y:0,z:0},target:null,others:[enemy('side',0,3)]});
 assert.equal(impacts.length,0,'energia rejeitada pelo receptor não deve gerar impacto visual');
});
test('rejected Eclipse wave secondary contact does not emit a false impact',()=>{
 const impacts=[],rites=new SwordRites({hit:()=>0,event:(type,data)=>{if(type==='impact')impacts.push(data);}});
 rites.waves.push({p:{x:0,y:1,z:2.9},origin:{x:0,y:1,z:0},direction:{x:0,y:0,z:1},
  previous:{x:0,y:1,z:2.9},yaw:0,roll:0,maxRadius:1.55,radius:1.55,travel:2.9,
  speed:12,range:3.2,damage:20,hits:new Set(),n:0,age:0,serial:1});
 rites.update(1/60,{from:{x:0,y:0,z:0},target:null,others:[enemy('side',0,3)]});
 assert.equal(impacts.length,0,'Eclipse rejeitado pelo receptor não deve gerar impacto visual');
});

test('production primary squad bridge returns actual damage and keeps the proxy synchronized',async()=>{
 const source=await readFile(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
 const start=source.indexOf('function protaPrimaryRiteHit('),end=source.indexOf('\nfunction riteReady',start);
 assert.ok(start>=0&&end>start,'primary bridge must exist in the world controller');
 const bridge=source.slice(start,end);
 assert.match(bridge,/swordSideHitContext\(hitMeta,a,player\.position\)/);
 assert.match(bridge,/sq\.damageActor\(a,amount,\{\.\.\.source,by:'hero'\}\)/);
 assert.match(bridge,/squadProxy\.hp=a\.hp/);
 assert.match(bridge,/return dealt>0/);
 const hitStart=source.indexOf("hit:(damage,id,kind,x)=>{"),hitEnd=source.indexOf("event:(type,e)=>",hitStart);
 assert.ok(hitStart>=0&&hitEnd>hitStart);
 assert.match(source.slice(hitStart,hitEnd),/const applied=protaPrimaryRiteHit\(damage,id,kind,x\)/);
 assert.match(source.slice(hitStart,hitEnd),/return applied/);
 assert.match(source.slice(hitStart,hitEnd),/if\(applied&&kind==='basic'\)/);
 const squad=new Enemy1Squad({seed:21}),[actor]=squad.spawn([{x:0,z:3}]),flashes=[];
 const sandbox={squadOn:true,squadFocus:actor,squadSq:()=>squad,player:{position:{x:0,z:0}},
  swordSideHitContext,VZ_HERO_DMG:1,enemyHP:actor.hp,squadProxy:{hp:actor.hp},enemyAlive:true,siegeEpoch:99,
  squadRT:{flash:id=>flashes.push(id)},squadAreaRadius:()=>0,squadAlive:()=>[actor],squadHitFx:()=>{},
  damageNumber:()=>{},THREE:{Vector3:class{constructor(x,y,z){Object.assign(this,{x,y,z});}}}};
 const executable=source.slice(start,end).replace('function protaPrimaryRiteHit','globalThis.protaPrimaryRiteHit=function protaPrimaryRiteHit');
 runInNewContext(executable,sandbox);
 actor.act={iframes:true};
 assert.equal(sandbox.protaPrimaryRiteHit(20,99,'basic',{by:'blade'}),false);
 assert.equal(flashes.length,0,'rejected primary hit must not flash as if damage landed');
 assert.equal(actor.hp,actor.maxHp,'i-frames must reject the primary hit');
 assert.equal(sandbox.enemyHP,actor.hp);
 actor.act=null;
 let received=null;const realDamageActor=squad.damageActor.bind(squad);
 squad.damageActor=(...args)=>{received=args[2];return realDamageActor(...args);};
 assert.equal(sandbox.protaPrimaryRiteHit(20,99,'basic',{energy:{kind:'wave',x:0,z:0,yaw:0},by:'energy'}),true);
 assert.equal(received.kind,'spell','primary energy must keep its spell damage class');
 assert.equal(received.x,0);assert.equal(received.z,actor.z-1);
 assert.equal(sandbox.enemyHP,actor.hp);
 assert.equal(sandbox.squadProxy.hp,actor.hp,'proxy HP must match actor HP to prevent a second delta hit');
 assert.equal(flashes.length,1,'only the accepted primary hit may flash');
});

test('squadHitFx shows a dodge label without a false hit flash',async()=>{
 const source=await readFile(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
 const start=source.indexOf('function squadHitFx('),end=source.indexOf('\n/* 21/11',start);
 assert.ok(start>=0&&end>start,'squad hit feedback helper must exist');
 const helper=source.slice(start,end).replace('function squadHitFx','globalThis.squadHitFx=function squadHitFx');
 const calls={flashes:[],numbers:[],sparks:0,audio:0};
 const sandbox={
  squadRT:{flash:id=>calls.flashes.push(id)},
  THREE:{Vector3:class{constructor(x,y,z){Object.assign(this,{x,y,z});}}},
  damageNumber:(p,label,style)=>calls.numbers.push({x:p.x,y:p.y,z:p.z,label,style}),
  burstSparks:()=>calls.sparks++,
  worldAudio:{hit:()=>calls.audio++}
 };
 runInNewContext(helper,sandbox);
 sandbox.squadHitFx({id:'dodged',x:1,y:0,z:2},0);
 assert.deepEqual(calls.flashes,[],'zero damage must not trigger the red/purple hit flash');
 assert.equal(calls.numbers[0].label,'ESQUIVOU','the dodge feedback must remain visible');
 assert.equal(calls.sparks,0);
 assert.equal(calls.audio,0);
 assert.match(source,/if\(n>0\)squadRT\.flash\(f\.id\)/,'legacy proxy bridge must not flash when damageActor rejects the hit');
 sandbox.squadHitFx({id:'hit',x:2,y:0,z:3},12);
 assert.deepEqual(calls.flashes,['hit']);
 assert.equal(calls.numbers[1].label,'12');
 assert.equal(calls.sparks,1);
 assert.equal(calls.audio,1);
});

test('primary physical, judgment, generic-energy and Eclipse impacts require accepted damage',()=>{
 const target=enemy('primary',0,3),from={x:0,y:0,z:0};
 let physicalCalls=0;const physicalImpacts=[];
 const physical=new SwordRites({pose:()=>({base:{x:-1,y:1,z:2.6},tip:{x:1,y:1,z:3.4}}),
  hit:()=>{physicalCalls++;return 0;},event:(type,data)=>{if(type==='impact')physicalImpacts.push(data);}});
 assert.equal(physical.attack('prota',{target}),true);
 for(let i=0;i<90;i++)physical.update(1/120,{from,target,sword:'prota'});
 assert.equal(physicalCalls,1);assert.equal(physicalImpacts.length,0);

 let judgmentCalls=0;const judgmentEvents=[];
 const judgment=new SwordRites({hit:()=>{judgmentCalls++;return 0;},event:(type,data)=>{if(type==='judgment')judgmentEvents.push(data);}});
 assert.equal(judgment.cast('prota',{mana:100,from,target}).ok,true);
 for(let i=0;i<240;i++)judgment.update(1/120,{from,target,sword:'prota'});
 assert.equal(judgmentCalls,16);assert.equal(judgmentEvents.length,0);

 let genericEnergyCalls=0;const genericEnergyImpacts=[];
 const genericEnergy=new SwordRites({hit:()=>{genericEnergyCalls++;return 0;},event:(type,data)=>{if(type==='impact')genericEnergyImpacts.push(data);}});
 const e=makeEnergy({kind:'wave',speed:12,range:3,radius:1.2,life:10,roll:0,band:.7},{x:0,y:1,z:0},0,0);
 e.travel=2.9;e.owner={damage:24,def:{multiplier:1},targetId:target.id};
 genericEnergy.energies.push(e);
 genericEnergy.update(1/60,{from,target,others:[],sword:'prota'});
 assert.equal(genericEnergyCalls,1);assert.equal(genericEnergyImpacts.length,0);

 let eclipseCalls=0;const eclipseImpacts=[];
 const eclipse=new SwordRites({hit:()=>{eclipseCalls++;return 0;},event:(type,data)=>{if(type==='impact')eclipseImpacts.push(data);}});
 eclipse.waves.push({p:{x:0,y:1,z:2.9},origin:{x:0,y:1,z:0},direction:{x:0,y:0,z:1},
  previous:{x:0,y:1,z:2.9},yaw:0,roll:0,maxRadius:1.55,radius:1.55,travel:2.9,
  speed:12,range:3.2,damage:20,hits:new Set(),n:0,age:0,serial:1});
 eclipse.update(1/60,{from,target,others:[],sword:'aurora'});
 assert.equal(eclipseCalls,1);assert.equal(eclipseImpacts.length,0);
});

test('legacy primary hit callbacks returning undefined remain accepted',()=>{
 const target=enemy('legacy',0,3),impacts=[];
 const rites=new SwordRites({pose:()=>({base:{x:-1,y:1,z:2.6},tip:{x:1,y:1,z:3.4}}),
  hit:()=>undefined,event:(type,data)=>{if(type==='impact')impacts.push(data);}});
 assert.equal(rites.attack('prota',{target}),true);
 for(let i=0;i<90;i++)rites.update(1/120,{from:{x:0,y:0,z:0},target,sword:'prota'});
 assert.equal(impacts.length,1,'legacy adapters without a return value must preserve their impact cue');
});

test('physical sweep skips obstacle sampling when every living target is outside swept blade bounds',()=>{
 const focus=enemy('far-focus',40,40),side=enemy('far-side',-40,40);let blockedCalls=0,hitCalls=0;
 const rites=new SwordRites({
  blocked:()=>{blockedCalls++;return false;},
  pose:()=>({base:{x:-.5,y:1,z:0},tip:{x:.5,y:1,z:0}}),
  hit:()=>{hitCalls++;}
 });
 assert.equal(rites.attack('prota',{target:focus}),true);
 const ctx={from:{x:0,y:0,z:0},target:focus,others:[side],sword:'prota',grounded:true};
 for(let i=0;i<90;i++)rites.update(1/120,ctx);
 assert.equal(hitCalls,0,'actors outside the swept blade volume must not be hit');
 assert.equal(blockedCalls,0,'distant living actors must not trigger the expensive 8 mm/five-rail wall sweep');
});

test('occluded side target reuses the exact-endpoint LOS result for less than one 60Hz frame',()=>{
 const focus=enemy('far-focus',40,40),side=enemy('occluded',0,3),hits=[],impacts=[];
 let blockedCalls=0,losCalls=0;
 const blocked=p=>{
  blockedCalls++;
  if(p.z>1.4&&p.z<1.6&&Math.abs(p.x)<.02){losCalls++;return true;}
  return false;
 };
 const rites=new SwordRites({
  moveset:()=>({id:'occlusion-cache',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  blocked,pose:()=>({base:{x:-1,y:1,z:3},tip:{x:1,y:1,z:3}}),
  hit:(damage,id,kind)=>hits.push({id,kind}),
  event:(type,data)=>{if(type==='impact')impacts.push(data);}
 });
 assert.equal(rites.attack('prota',{target:focus}),true);
 const ctx={from:{x:0,y:0,z:0},target:focus,others:[side],sword:'prota',grounded:true};
 for(let i=0;i<48;i++)rites.update(1/120,ctx);
 assert.deepEqual(hits,[],'a target behind the wall must never receive damage');
 assert.deepEqual(impacts,[],'a target behind the wall must never receive impact VFX');
 assert.ok(losCalls<=24,'unchanged blocked endpoints should be ray-tested at most once per 60Hz frame');
 assert.ok(blockedCalls<6000,'the short blocked-ray cache and duplicate-pose elimination must remove repeated 8mm scans');
});

test('occlusion cache invalidates immediately when the hero moves around the wall',()=>{
 const focus=enemy('far-focus',40,40),side=enemy('side',0,3),hits=[];
 let losCalls=0;
 const blocked=p=>{
  if(p.z>1.4&&p.z<1.6&&p.x<.1){losCalls++;return true;}
  return false;
 };
 const rites=new SwordRites({
  moveset:()=>({id:'occlusion-move',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  blocked,pose:()=>({base:{x:-1,y:1,z:3},tip:{x:1,y:1,z:3}}),
  hit:(damage,id,kind)=>hits.push(id)
 });
 assert.equal(rites.attack('prota',{target:focus}),true);
 const ctx={from:{x:0,y:0,z:0},target:focus,others:[side],sword:'prota',grounded:true};
 for(let i=0;i<4;i++)rites.update(1/120,ctx);
 assert.deepEqual(hits,[]);
 assert.ok(losCalls>=1,'the initial wall must be detected before caching');
 const beforeMoveLos=losCalls;
 ctx.from.x=1;
 rites.update(1/120,ctx);
 assert.deepEqual(hits,['side'],'moving to the clear side of the wall must invalidate the cached obstruction');
 assert.equal(losCalls,beforeMoveLos,'the clear ray must not reuse the old blocked result');
});
 
test('occlusion cache notices a wall opening within one 60Hz frame while the cached result is still live',()=>{
 const focus=enemy('far-focus',40,40),side=enemy('side',0,3),hits=[];
 let wall=true,losCalls=0;
 const blocked=p=>{
  if(wall&&p.z>1.4&&p.z<1.6&&Math.abs(p.x)<.02){losCalls++;return true;}
  return false;
 };
 const rites=new SwordRites({
  moveset:()=>({id:'occlusion-expiry',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  blocked,pose:()=>({base:{x:-1,y:1,z:3},tip:{x:1,y:1,z:3}}),
  hit:(damage,id)=>hits.push(id)
 });
 assert.equal(rites.attack('prota',{target:focus}),true);
 const ctx={from:{x:0,y:0,z:0},target:focus,others:[side],sword:'prota',grounded:true};
 rites.update(1/120,ctx);
 rites.update(1/120,ctx);
 assert.equal(losCalls,1,'the first live pose must detect and cache the wall');
 wall=false;
 rites.update(1/120,ctx);
 assert.deepEqual(hits,[],'the still-live blocked result may be reused for its remaining sub-frame TTL');
 assert.equal(losCalls,1,'the cached result must avoid another LOS ray before expiry');
 rites.update(1/120,ctx);
 assert.deepEqual(hits,['side'],'the opened wall must be observed on the first tick after the 15.7ms TTL');
});

test('stationary visible blade sweep probes its hilt once because segmentBlocked checks the start point',()=>{
 const focus=enemy('focus',0,3),hits=[];
 const base={x:-1,y:1,z:2.6},tip={x:1,y:1,z:3.4};
 let baseProbes=0;
 const blocked=p=>{
  if(p.x===base.x&&p.y===base.y&&p.z===base.z)baseProbes++;
  return false;
 };
 const rites=new SwordRites({
  moveset:()=>({id:'stationary-base-probe',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  blocked,pose:()=>({base:{...base},tip:{...tip}}),
  hit:(damage,id)=>{hits.push(id);return true;}
 });
 assert.equal(rites.attack('prota',{target:focus}),true);
 const ctx={from:{x:0,y:0,z:0},target:focus,others:[],sword:'prota',grounded:true};
 rites.update(1/120,ctx);
 rites.update(1/120,ctx);
 assert.deepEqual(hits,['focus'],'removing the redundant probe must preserve the physical hit');
 assert.equal(baseProbes,1,'the start point must be checked exactly once per stationary pose');
});

test('boss hit bridge rejects zero damage but still finalizes a pending death',async()=>{
 const source=await readFile(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
 const start=source.indexOf('function hurtEnemy('),end=source.indexOf('\n/** Executa um poder',start);
 assert.ok(start>=0&&end>start,'production boss damage bridge must exist');
 const fn=source.slice(start,end).replace('function hurtEnemy','globalThis.hurtEnemy=function hurtEnemy');
 const calls={damage:0,animations:[],timers:[],advance:0};
 const sandbox={
  combatStepNow:()=>true,enemy:{visible:true,position:{clone:()=>({y:0})}},enemyAlive:true,enemyHP:100,enemyHasDeathClip:true,
  document:{getElementById:()=>({style:{}})},
  damageNumber:()=>{},hitStop:()=>{},cameraShake:()=>{},onEnemyDamaged:()=>calls.damage++,
  playEnemyAnimation:(kind)=>{calls.animations.push(kind);return true;},
  setTimeout:(fn,ms)=>calls.timers.push(ms),advanceAfterEnemyDefeat:()=>calls.advance++,
  zarkSword:null,zarkUlt:null,vxSwords:null,cySkill:null
 };
 runInNewContext(fn,sandbox);
 assert.equal(sandbox.hurtEnemy(0,false,false,false),false,'zero damage must not be reported as a successful hit');
 assert.equal(sandbox.enemyHP,100);
 assert.equal(calls.damage,0,'zero damage must not trigger hit feedback');
 assert.deepEqual(calls.animations,[]);
 assert.equal(sandbox.hurtEnemy(15,false,false,true),true,'positive accepted damage must still be reported');
 assert.equal(sandbox.enemyHP,85);
 sandbox.enemyHP=0;sandbox.enemyAlive=true;
 assert.equal(sandbox.hurtEnemy(0,false,true,true),false,'death finalization is not a new damaging hit');
 assert.equal(sandbox.enemyAlive,false,'the zero-damage pending-death finalizer must remain functional');
 assert.deepEqual(calls.animations,['death']);
 assert.deepEqual(calls.timers,[850]);
});

function thinWallGenericEnergyScenario(kind,wall=true){
 const focus=enemy('focus',0,3),side=enemy('side',1.2,3),hits=[],impacts=[];
 const rites=new SwordRites({
  blocked:p=>wall&&p.z>1.005&&p.z<1.015,
  hit:(damage,id)=>{hits.push(id);return true;},
  event:(type,data)=>{if(type==='impact')impacts.push(data.target.id);}
 });
 const spec=kind==='wave'
  ?{kind:'wave',speed:12,range:3,radius:1.2,life:10,roll:0,band:.7}
  :{kind:'sector',r0:.9,r1:3,speed:6,span:Math.PI*2,roll:0,half:1,band:1,life:10};
 const energy=makeEnergy(spec,{x:0,y:1,z:0},0,0);
 if(kind==='wave')energy.travel=2.9;else energy.radius=2.9;
 energy.owner={damage:24,def:{multiplier:1},targetId:'focus'};
 rites.energies.push(energy);
 rites.update(1/60,{from:{x:0,y:0,z:0},target:focus,others:[side],sword:'prota'});
 return{hits,impacts};
}
test('ondas e setores genéricos rejeitam foco e secundário atrás de parede de 1 cm',()=>{
 for(const kind of ['wave','sector']){
  const blocked=thinWallGenericEnergyScenario(kind,true);
  assert.deepEqual(blocked.hits,[],kind+': nenhum alvo pode receber dano atrás da parede');
  assert.deepEqual(blocked.impacts,[],kind+': nenhum VFX pode aparecer atrás da parede');
  const clear=thinWallGenericEnergyScenario(kind,false);
  assert.deepEqual(clear.hits.sort(),['focus','side'],kind+': corredor livre continua atingindo ambos');
  assert.deepEqual(clear.impacts.sort(),['focus','side'],kind+': corredor livre mantém impactos');
 }
});
function thinWallEclipseScenario(wall=true){
 const focus=enemy('focus',0,1.1),side=enemy('side',1.3,1.1),hits=[],impacts=[];
 const rites=new SwordRites({
  blocked:p=>wall&&p.z>1.005&&p.z<1.015,
  hit:(damage,id)=>{hits.push(id);return true;},
  event:(type,data)=>{if(type==='impact')impacts.push(data.target.id);}
 });
 rites.waves.push({p:{x:0,y:1,z:.9},origin:{x:0,y:1,z:0},direction:{x:0,y:0,z:1},
  previous:{x:0,y:1,z:.9},yaw:0,roll:0,maxRadius:1.55,radius:1.55,travel:.9,
  speed:12,range:3,damage:20,hits:new Set(),n:0,age:0,serial:1});
 rites.update(1/60,{from:{x:0,y:0,z:0},target:focus,others:[side]});
 return{hits,impacts};
}
test('Eclipse bloqueia foco e secundário atrás de parede de 1 cm sem perder corredor livre',()=>{
 const blocked=thinWallEclipseScenario(true);
 assert.deepEqual(blocked.hits,[],'nenhum alvo deve receber dano através da parede');
 assert.deepEqual(blocked.impacts,[],'nenhum impacto deve surgir através da parede');
 const clear=thinWallEclipseScenario(false);
 assert.deepEqual(clear.hits.sort(),['focus','side'],'foco e secundário continuam recebendo dano sem obstáculo');
 assert.deepEqual(clear.impacts.sort(),['focus','side'],'os dois impactos permanecem no corredor livre');
});
function thinWallReleaseScenario(wall=true){
 const events=[],rites=new SwordRites({
  moveset:()=>({id:'thin-spawn',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'energy',count:1,
   energy:{kind:'wave',at:.01,roll:0,radius:1.2,speed:12,range:4,band:.7,life:1}}),
  blocked:p=>wall&&p.z>.301&&p.z<.311,
  pose:()=>({base:{x:0,y:1,z:0},tip:{x:0,y:1,z:1}}),
  event:type=>events.push(type)
 });
 const target=enemy('focus',0,4);
 rites.attack('prota',{target,yaw:0});
 const ctx={from:{x:0,y:0,z:0},target,sword:'prota',ground:0,grounded:true};
 for(let i=0;i<5;i++)rites.update(1/120,ctx);
 return{energies:rites.energies.length,events};
}
test('release de crescente não nasce depois de uma parede de 1 cm',()=>{
 const blocked=thinWallReleaseScenario(true);
 assert.equal(blocked.energies,0,'a energia não deve ser criada além da parede');
 assert.ok(blocked.events.includes('obstructed'),'a obstrução precisa ser registrada');
 const clear=thinWallReleaseScenario(false);
 assert.equal(clear.energies,1,'o crescente continua sendo criado em corredor livre');
 assert.ok(clear.events.includes('energy'));
});

function thinWallTravelingProjectileScenario(kind,wall=true){
 const events=[],blocked=p=>wall&&p.z>1.005&&p.z<1.015;
 const rites=new SwordRites({blocked,event:(type,data)=>events.push({type,data})});
 let projectile;
 if(kind==='generic'){
  projectile=makeEnergy({kind:'wave',speed:12,range:3,radius:1.2,life:10,roll:0,band:.7},{x:0,y:1,z:0},0,0);
  projectile.travel=1;
  projectile.owner={damage:20,def:{multiplier:1},targetId:'focus'};
  rites.energies.push(projectile);
 }else{
  projectile={p:{x:0,y:1,z:1},origin:{x:0,y:1,z:0},direction:{x:0,y:0,z:1},previous:{x:0,y:1,z:1},
   yaw:0,roll:0,maxRadius:1.55,radius:.95,travel:1,speed:12,range:3.2,damage:20,
   hits:new Set(),n:0,age:0,serial:1};
  rites.waves.push(projectile);
 }
 rites.update(1/120,{from:{x:0,y:0,z:0},target:null,others:[]});
 return{active:kind==='generic'?rites.energies.length:rites.waves.length,projectile,events};
}
test('ondas viajantes interrompem a trajetória visual ao cruzar parede de 1 cm',()=>{
 for(const kind of ['generic','eclipse']){
  const blocked=thinWallTravelingProjectileScenario(kind,true);
  assert.equal(blocked.active,0,kind+': projétil deve ser removido ao encontrar a parede');
  const end=blocked.events.find(e=>e.type===(kind==='generic'?'energyEnd':'waveEnd'));
  assert.ok(end,kind+': término por obstrução deve ser registrado');
  const stop=kind==='generic'?end.data.blockedAt:end.data.p.z;
  assert.ok(stop>=1.005&&stop<=1.015,kind+': ponto de parada precisa ficar dentro da parede, recebeu '+stop);
  const clear=thinWallTravelingProjectileScenario(kind,false);
  assert.equal(clear.active,1,kind+': corredor livre mantém a onda ativa');
  assert.ok(clear.projectile.travel>1.09,kind+': corredor livre permite deslocamento');
 }
});


test('segmentBlocked rejeita origem já dentro de um obstáculo, mesmo quando a primeira amostra sai dele',()=>{
 const start={x:0,y:1,z:0},end={x:.6,y:1,z:0};
 const blocked=p=>p.x>=0&&p.x<.005;
 assert.equal(blocked(start),true,'o ponto de emissão começa dentro da parede fina');
 assert.equal(blocked({x:.008,y:1,z:0}),false,'a primeira amostra de 8 mm já estaria fora da parede');
 assert.equal(segmentBlocked(start,end,blocked,.008),true,'a linha precisa rejeitar a origem obstruída antes de avançar');
});
function thinWallStartReleaseScenario(){
 const events=[],rites=new SwordRites({
  moveset:()=>({id:'thin-start-wall',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,count:1,
   energy:{kind:'wave',at:.01,roll:0,radius:1.2,speed:12,range:4,band:.7,life:1}}),
  blocked:p=>p.z>=0&&p.z<.005,
  pose:()=>({base:{x:0,y:1,z:0},tip:{x:0,y:1,z:1}}),
  event:type=>events.push(type)
 });
 const target=enemy('focus',0,4);
 rites.attack('prota',{target,yaw:0});
 const ctx={from:{x:0,y:0,z:0},target,sword:'prota',ground:0,grounded:true};
 for(let i=0;i<5;i++)rites.update(1/120,ctx);
 return{energies:rites.energies.length,events};
}
test('release não cria crescente quando a origem do herói já está dentro de uma parede sub-8mm',()=>{
 const result=thinWallStartReleaseScenario();
 assert.equal(result.energies,0,'a energia não pode nascer do outro lado de uma parede que contém a origem');
 assert.ok(result.events.includes('obstructed'),'a obstrução inicial precisa ser registrada');
});

test('pose estacionária evita varredura repetida quando todos os contatos já estão obstruídos',()=>{
 const focus=enemy('focus',.3,3),hits=[];let blockedCalls=0;
 const blocked=p=>{blockedCalls++;return p.x> -4.95&&p.x< -4.94;};
 const rites=new SwordRites({
  moveset:()=>({id:'stationary-pose',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  blocked,pose:()=>({base:{x:0,y:1,z:2},tip:{x:0,y:1,z:3.5}}),
  hit:(damage,id)=>{hits.push(id);return true;}
 });
 rites.attack('prota',{target:focus,yaw:0});
 const ctx={from:{x:-5,y:0,z:0},target:focus,others:[],sword:'prota',grounded:true};
 for(let i=0;i<48;i++)rites.update(1/120,ctx);
 assert.deepEqual(hits,[],'a linha de visão obstruída continua impedindo dano');
 assert(blockedCalls<2500,'a pose fixa deve reduzir os 9.002 probes do baseline; recebeu '+blockedCalls);
});

test('parede nova na lâmina é detectada imediatamente sem cachear uma pose livre',()=>{
 const focus=enemy('focus',0,3),hits=[],impacts=[];let blockedCalls=0,bladeWall=false;
 const blocked=p=>{
  blockedCalls++;
  return bladeWall&&Math.abs(p.x)<.005&&p.z>2.4&&p.z<2.5;
 };
 const rites=new SwordRites({
  moveset:()=>({id:'stationary-wall-change',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  blocked,pose:()=>({base:{x:0,y:1,z:2},tip:{x:0,y:1,z:3.5}}),
  hit:(damage,id)=>{hits.push(id);return true;},
  event:(type,data)=>{if(type==='impact')impacts.push(data);}
 });
 rites.attack('prota',{target:focus,yaw:0});
 const ctx={from:{x:-5,y:0,z:0},target:focus,others:[],sword:'prota',grounded:true};
 rites.update(1/120,ctx);
 bladeWall=true;
 rites.update(1/120,ctx);
 assert.equal(rites.active?.bladeBlocked,true,'a parede que surgiu no corpo da lâmina deve bloquear no primeiro tick ativo');
 assert.deepEqual(hits,[],'a pose livre anterior não pode permitir dano após a parede aparecer');
 assert.deepEqual(impacts,[],'a parede nova não pode produzir falso impacto');
 assert(blockedCalls>0,'a parede nova precisa ser consultada');
});

test('cache de linha de visão invalida quando a origem viva do herói se desloca',()=>{
 const focus=enemy('focus',.3,3),hits=[];let blockedCalls=0,originX=-5,newOriginProbe=false;
 const from={x:-5,y:0,z:0};
 const blocked=p=>{
  blockedCalls++;
  if(originX===-4.5&&p.x>originX+.02&&p.x<originX+.05)newOriginProbe=true;
  return p.x>originX+.02&&p.x<originX+.05;
 };
 const rites=new SwordRites({
  moveset:()=>({id:'moving-origin',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  blocked,pose:()=>({base:{x:0,y:1,z:2},tip:{x:0,y:1,z:3.5}}),
  hit:(damage,id)=>{hits.push(id);return true;}
 });
 rites.attack('prota',{target:focus,yaw:0});
 const ctx={from,target:focus,others:[],sword:'prota',grounded:true};
 for(let i=0;i<3;i++)rites.update(1/120,ctx);
 const before=blockedCalls;
 originX=-4.5;from.x=originX;
 rites.update(1/120,ctx);
 assert(blockedCalls>before,'mudar a origem deve invalidar a LOS cacheada e reconsultar a parede');
 assert.equal(newOriginProbe,true,'a nova origem precisa produzir uma consulta de colisão');
 assert.deepEqual(hits,[],'a linha de visão continua obstruída na nova origem');
});
