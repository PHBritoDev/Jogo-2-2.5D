import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { SwordRites, segmentBlocked, passagePath, swordSideHitContext, JUDGMENT_TIMES } from '../sword-rites3d.js';
import { PROTA_DASH } from '../prota-combat3d.js';
import { Enemy1Squad } from '../enemy1-squad3d.js';
import { makeEnergy } from '../combat-energy3d.js';
import { swordImpactYaw, swordJudgmentCue, JUDGMENT_SLASH_PROFILE, JUDGMENT_SLASH_TIMING, swordJudgmentSlashPoint, SWORD_TRAIL_PROFILES, swordTrailProfile } from '../sword-rites-vfx3d.js';

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
function focusHandoffSweep(fps){
 const outgoing=enemy('outgoing-focus',20,3),incoming=enemy('incoming-focus',30,30);
 const proxy=actor=>({id:'siege-epoch',squadActorId:actor.id,x:actor.x,y:actor.y,z:actor.z,radius:actor.radius,height:actor.height,alive:actor.alive});
 const hits=[],impacts=[],rites=new SwordRites({
  moveset:()=>({id:'focus-handoff',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  pose:()=>({base:{x:0,y:.2,z:3},tip:{x:0,y:1.8,z:3}}),
  hit:(damage,id,kind)=>{hits.push({id,kind});return true;},
  event:(type,data)=>{if(type==='impact')impacts.push(data);}
 });
 assert.equal(rites.attack('prota',{target:proxy(outgoing)}),true);
 const dt=1/fps,travel=PROTA_DASH.distance/PROTA_DASH.travel*dt,fraction=fps===20?.5:.58;
 outgoing.x=-travel*fraction;
 // Production shape: target.id is siegeEpoch, squadActorId is the actor; the focused actor is absent from others.
 rites.update(dt,{from:{x:0,y:0,z:0},target:proxy(outgoing),others:[incoming],sword:'prota',grounded:true});
 const hitsBeforeHandoff=hits.length,previousFocus=rites.previousOthers.get(outgoing.id);
 const previousFocusX=previousFocus?.x,activeKind=rites.active?.kind;
 outgoing.x=travel*fraction;
 rites.update(dt,{from:{x:0,y:0,z:0},target:proxy(incoming),others:[outgoing],sword:'prota',grounded:true});
 return{hits,impacts,hitsBeforeHandoff,previousFocusX,expectedPreviousX:-travel*fraction,activeKind};
}
function focusHandoffAfterPrimaryHit(){
 const outgoing=enemy('outgoing-primary',0,3),incoming=enemy('incoming-focus',30,30);
 let focused=outgoing;
 const proxy=actor=>({id:'siege-epoch',squadActorId:actor.id,x:actor.x,y:actor.y,z:actor.z,radius:actor.radius,height:actor.height,alive:actor.alive});
 const hits=[],impacts=[],rites=new SwordRites({
  moveset:()=>({id:'focus-handoff-primary',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  pose:()=>({base:{x:0,y:.2,z:3},tip:{x:0,y:1.8,z:3}}),
  hit:(damage,id,kind)=>{hits.push({id,kind,actorId:kind==='basic'?focused.id:id});return true;},
  event:(type,data)=>{if(type==='impact')impacts.push(data);}
 });
 assert.equal(rites.attack('prota',{target:proxy(outgoing)}),true);
 const dt=1/60,from={x:0,y:0,z:0};
 rites.update(dt,{from,target:proxy(outgoing),others:[incoming],sword:'prota',grounded:true});
 const hitsAfterPrimary=hits.length;
 focused=incoming;
 rites.update(dt,{from,target:proxy(incoming),others:[outgoing],sword:'prota',grounded:true});
 return{hits,hitsAfterPrimary,impacts};
}
function movingSecondarySweep(fps,{blocked=()=>false,fromX=null,toX=null}={}){
 const focus=enemy('focus',20,20),side=enemy('side',-1,3);side.radius=.35;
 const hits=[],impacts=[],rites=new SwordRites({
  moveset:()=>({id:'moving-secondary',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  blocked,pose:()=>({base:{x:0,y:.2,z:3},tip:{x:0,y:1.8,z:3}}),
  hit:(damage,id,kind)=>{hits.push({id,kind});return true;},
  event:(type,data)=>{if(type==='impact')impacts.push(data);}
 });
 assert.equal(rites.attack('prota',{target:focus}),true);
 const ctx={from:{x:0,y:0,z:0},target:focus,others:[side],sword:'prota',grounded:true};
 const dt=1/fps,travel=PROTA_DASH.distance/PROTA_DASH.travel*dt;
 side.x=fromX??-travel*.5;rites.update(dt,ctx);const hitsAfterStart=hits.length;
 side.x=toX??travel*.5;rites.update(dt,ctx);
 return{hits,impacts,hitsAfterStart};
}
test('one physical swing damages primary and secondary capsule once, never distant enemy',()=>{
 const e=encounter();assert(e.rites.attack('prota',{target:e.primary}));
 for(let i=0;i<90;i++)e.rites.update(1/120,e.ctx);
 assert.deepEqual(e.hits.map(h=>h.id).sort(),[1,2]);
 assert.equal(e.impacts.filter(id=>id===2).length,1);
 assert(e.hits.every(h=>h.damage>0));
 assert.deepEqual(e.hits.map(h=>[h.id,h.kind]),[[1,'basic'],[2,'energy-side']]);
});
test('squad actor history reuses snapshot records between frames and removes stale IDs',()=>{
 const e=encounter(),history=e.rites.previousOthers;
 e.rites.update(1/60,e.ctx);
 const sideSnapshot=history.get(e.side.id),focusSnapshot=history.get(e.primary.id);
 assert.ok(sideSnapshot&&focusSnapshot);
 e.side.x+=.1;e.primary.z+=.1;
 e.rites.update(1/60,e.ctx);
 assert.equal(e.rites.previousOthers,history,'the Map must be reused');
 assert.equal(history.get(e.side.id),sideSnapshot,'the side actor record must be reused');
 assert.equal(history.get(e.primary.id),focusSnapshot,'the focus record must be reused');
 assert.equal(sideSnapshot.x,e.side.x);
 assert.equal(focusSnapshot.z,e.primary.z);
 e.ctx.paused=true;e.side.x+=.1;e.rites.update(1/60,e.ctx);
 assert.equal(history.get(e.side.id),sideSnapshot,'paused snapshots must also reuse the record');
 assert.equal(sideSnapshot.x,e.side.x);
 e.ctx.paused=false;e.ctx.others=[e.hidden];e.rites.update(1/60,e.ctx);
 assert.equal(history.has(e.side.id),false,'actors removed from the squad must be pruned');
 assert.equal(history.has(e.primary.id),true,'the current focus remains tracked');
 assert.equal(history.has(e.hidden.id),true);
});
test('world focus proxy keeps squad actor identity separate from siege epoch',async()=>{
 const source=await readFile(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
 const start=source.indexOf('function riteTarget()');
 const end=source.indexOf('function riteBlocked(',start);
 assert.ok(start>=0&&end>start,'production riteTarget adapter must exist');
 assert.ok(source.slice(start,end).includes('t.squadActorId=a.id;'),'focus proxy must preserve the real squad actor id');
 const othersStart=source.indexOf('function protaOthers()');
 const othersEnd=source.indexOf('function protaSideHit(',othersStart);
 assert.ok(othersStart>=0&&othersEnd>othersStart,'production secondary actor provider must exist');
 const othersBridge=source.slice(othersStart,othersEnd);
 assert.ok(othersBridge.includes('for(const a of squadAlive())')&&othersBridge.includes('if(a===squadFocus)continue'),'secondary actor provider must exclude the current focus');
 assert.ok(source.includes('others:protaOthers()'),'SwordRites.update must receive the live secondary actors');
});

test('focus handoff after a primary contact cannot hit the outgoing actor twice',()=>{
 const result=focusHandoffAfterPrimaryHit();
 assert.equal(result.hitsAfterPrimary,1,'the first contact must resolve against the original focus');
 assert.deepEqual(result.hits.map(hit=>hit.actorId),['outgoing-primary'],
  'after handoff the already-hit primary actor must not be reprocessed as a secondary');
 assert.equal(result.impacts.length,1,'the same actor must emit only one impact in the swing');
});
function focusHandoffAfterEnergyPrimaryHit(kind){
 const outgoing=enemy('outgoing-energy',0,kind==='generic'?3:1),incoming=enemy('incoming-focus',30,30);
 let focused=outgoing;
 const proxy=actor=>({id:'siege-epoch',squadActorId:actor.id,x:actor.x,y:actor.y,z:actor.z,radius:actor.radius,height:actor.height,alive:actor.alive});
 const hits=[],impacts=[],rites=new SwordRites({
  hit:(damage,id,hitKind)=>{hits.push({actorId:hitKind==='energy-side'?id:focused.id,kind:hitKind});return true;},
  event:(type,data)=>{if(type==='impact')impacts.push(data.target?.squadActorId??data.target?.id);}
 });
 if(kind==='generic'){
  const energy=makeEnergy({kind:'wave',speed:12,range:4,radius:1.2,life:10,roll:0,band:.7},{x:0,y:1,z:0},0,0);
  energy.travel=2.9;
  energy.owner={damage:24,def:{multiplier:1},targetId:'siege-epoch',hit:false};
  rites.energies.push(energy);
 }else{
  rites.waves.push({p:{x:0,y:1,z:.9},origin:{x:0,y:1,z:0},direction:{x:0,y:0,z:1},previous:{x:0,y:1,z:.9},
   yaw:0,roll:0,maxRadius:1.55,radius:1.55,travel:.9,speed:12,range:4,damage:20,hits:new Set(),n:0,age:0,serial:1});
 }
 const dt=1/120,from={x:0,y:0,z:0};
 rites.update(dt,{from,target:proxy(outgoing),others:[incoming],sword:'prota',grounded:true});
 const hitsAfterPrimary=hits.length;
 focused=incoming;
 rites.update(dt,{from,target:proxy(incoming),others:[outgoing],sword:'prota',grounded:true});
 return{hits,hitsAfterPrimary,impacts};
}
test('generic energy and Eclipse waves reserve the real primary actor after focus handoff',()=>{
 for(const kind of ['generic','eclipse']){
  const result=focusHandoffAfterEnergyPrimaryHit(kind);
  assert.equal(result.hitsAfterPrimary,1,kind+': first contact must resolve against the outgoing focus');
  assert.deepEqual(result.hits.map(hit=>hit.actorId),['outgoing-energy'],kind+': handoff must not damage the same actor again as secondary');
  assert.deepEqual(result.impacts,['outgoing-energy'],kind+': the same actor must emit only one impact');
 }
});
test('focus handoff keeps the outgoing target in actor history for a swept side hit at 20/30 FPS',()=>{
 for(const fps of [20,30]){
  const result=focusHandoffSweep(fps);
  assert.equal(result.hitsBeforeHandoff,0,'FPS '+fps+': the outgoing focus starts outside the blade before the handoff');
  assert.equal(result.activeKind,'basic','FPS '+fps+': the physical swing must remain active across the handoff');
  assert.equal(result.previousFocusX,result.expectedPreviousX,'FPS '+fps+': the outgoing focus position must be retained before it becomes secondary');
  assert.deepEqual(result.hits.map(h=>h.id),['outgoing-focus'],'FPS '+fps+': the old focus must still be swept after it becomes secondary');
  assert.equal(result.impacts.length,1,'FPS '+fps+': focus handoff must produce one real impact');
 }
});

test('secondary blade sweep accepts an authored 3.12m squad dash after a 250ms frame hitch',()=>{
 const focus=enemy('focus',20,20),side=enemy('side-dash',-1.56,3);side.radius=.35;
 const hits=[],impacts=[],rites=new SwordRites({
  moveset:()=>({id:'long-squad-dash',duration:.8,open:.01,close:.7,buffer:.1,multiplier:1,hit:'blade',count:1}),
  pose:()=>({base:{x:0,y:.2,z:3},tip:{x:0,y:1.8,z:3}}),
  hit:(damage,id,kind)=>{hits.push({id,kind});return true;},
  event:(type,data)=>{if(type==='impact')impacts.push(data);}
 });
 const ctx={from:{x:0,y:0,z:0},target:focus,others:[side],sword:'prota',grounded:true};
 rites.update(1/120,ctx); // snapshot the actor before its authored VZ_DASH (13 m/s × .24 s = 3.12 m)
 assert.equal(rites.attack('prota',{target:focus}),true);
 side.x=1.56;
 rites.update(.25,ctx);
 assert.deepEqual(hits.map(hit=>hit.id),['side-dash'],'a real 3.12m dash crossing the blade during a 250ms hitch must not be mistaken for a teleport');
 assert.equal(impacts.length,1,'the accepted dash must emit one impact');
});

test('physical blade sweep follows a moving secondary capsule between frames at 20/30/60/120 FPS',()=>{
 for(const fps of [20,30,60,120]){
  const result=movingSecondarySweep(fps);
  assert.deepEqual(result.hits.map(h=>h.id),['side'],'FPS '+fps+': a secondary actor crossing the blade must be hit once');
  assert.equal(result.impacts.length,1,'FPS '+fps+': exactly one visible impact');
  if(fps<=30)assert.equal(result.hitsAfterStart,0,'FPS '+fps+': both frame endpoints begin outside the capsule radius');
 }
});

test('secondary blade sweep does not hit through a wall or across a teleport',()=>{
 const wall=movingSecondarySweep(20,{blocked:p=>p.z>1.4&&p.z<1.6});
 assert.deepEqual(wall.hits,[],'a moving secondary capsule behind a wall must remain protected');
 assert.deepEqual(wall.impacts,[],'an occluded moving target must not emit a false impact');
 const teleport=movingSecondarySweep(20,{fromX:-3,toX:3});
 assert.deepEqual(teleport.hits,[],'a discontinuous relocation larger than the sweep budget is not a hit path');
 assert.deepEqual(teleport.impacts,[],'teleporting through the blade must not create a false impact');
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

 
test('impact cut follows the connected blade or energy heading, not the global clock',()=>{
 const near=(actual,expected)=>assert.ok(Math.abs(Math.atan2(Math.sin(actual-expected),Math.cos(actual-expected)))<1e-9,'angle mismatch: '+actual+' vs '+expected);
 near(swordImpactYaw({yaw:Math.PI/2}),Math.PI/2);
 near(swordImpactYaw({energy:{kind:'wave',yaw:-Math.PI/3}}),-Math.PI/3);
 near(swordImpactYaw({energy:{kind:'sector',x:2,z:3,yaw:0},target:{x:4,z:3}}),Math.PI/2);
 near(swordImpactYaw({energy:{direction:{x:0,z:1}}}),0);
 near(swordImpactYaw({wave:{direction:{x:-1,z:0}}}),-Math.PI/2);
 near(swordImpactYaw({energy:{kind:'sector',x:2,z:3,yaw:.4},target:{x:2,z:3}}),.4);
 near(swordImpactYaw({energy:{direction:{x:NaN,z:0},yaw:Infinity}}),0);
});

test('Passagem places each cut on the attacker-facing capsule surface',()=>{
 const squad=new Enemy1Squad({ground:()=>0}),actor=squad.spawn([{x:0,z:5}])[0];
 const target={...actor,radius:actor.T.radius,height:actor.T.height}; // Real production actor: y is its ground/base height.
 assert.equal(target.y,0);
 const front=swordJudgmentCue({target,from:{x:0,y:0,z:0},n:5});
 assert.ok(front);
 assert.ok(front.p.y>0&&front.p.y<target.height,'surface mark is placed above the ground-origin actor pivot');
 const frontRadius=Math.hypot(front.p.x-target.x,front.p.z-target.z);
 assert.ok(frontRadius>target.radius+.08&&frontRadius<target.radius+.12);
 assert.ok(front.p.z<target.z&&front.p.x>0,'the cue must occupy the front-right surface seen by the attacker');
 assert.ok(Math.abs(front.yaw+.36)<1e-9,'the stroke plane follows the local capsule surface');
 const right=swordJudgmentCue({target,from:{x:5,y:0,z:5},n:6});
 const rightRadius=Math.hypot(right.p.x-target.x,right.p.z-target.z);
 assert.ok(rightRadius>target.radius+.08&&rightRadius<target.radius+.12,'side approach remains just outside the right-facing capsule surface');
 assert.ok(right.p.x>target.x,'side approach stays on the right-facing half of the capsule');
 assert.ok(Math.abs(right.yaw-(-Math.PI/2+.36))<1e-9,'side approach rotates the local cut plane with the surface');
});

test('Passagem distributes 16 short cuts in a separated 4×4 body pattern',async()=>{
 const target={x:0,y:0,z:5,radius:.5,height:1.8},from={x:0,y:0,z:0};
 const cues=Array.from({length:16},(_,n)=>swordJudgmentCue({target,from,n}));
 const positions=new Set(cues.map(c=>[c.p.x,c.p.y,c.p.z].map(v=>v.toFixed(3)).join(',')));
 assert.equal(positions.size,16,'all 16 cuts must occupy distinct points');
 const heights=cues.map(c=>c.p.y),yaws=cues.map(c=>c.yaw),rolls=cues.map(c=>c.roll);
 assert.ok(Math.min(...heights)>.1,'no cut is placed below the enemy ground plane');
 assert.ok(Math.max(...heights)<target.height,'all cuts remain within the enemy body height');
 assert.ok(Math.max(...heights)-Math.min(...heights)>1.2,'cuts span most of the enemy body');
 assert.ok(Math.max(...yaws)-Math.min(...yaws)>2.0,'four columns wrap around the visible front hemisphere');
 assert.ok(new Set(rolls.map(v=>v.toFixed(3))).size>=12,'cuts use varied slash angles rather than one parallel slab');
 for(const cue of cues){
  const radius=Math.hypot(cue.p.x-target.x,cue.p.z-target.z);
  assert.ok(radius>target.radius+.08&&radius<target.radius+.12,'each cut stays just outside the capsule without visibly floating');
 }
 let minSpacing=Infinity;
 for(let i=0;i<cues.length;i++)for(let j=i+1;j<cues.length;j++){
  const a=cues[i].p,b=cues[j].p;
  minSpacing=Math.min(minSpacing,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));
 }
 assert.ok(minSpacing>.34,'short marks keep visible gaps instead of merging into a single sheet');
 const source=await readFile(new URL('../sword-rites-vfx3d.js',import.meta.url),'utf8');
 assert.ok(source.includes('m.material.depthTest=true'),'surface cuts render above the enemy mesh without moving far off the capsule');
 assert.ok(source.includes("cut(p,'prota',e.final?1.18:1.08,roll,yaw,e.final?JUDGMENT_SLASH_TIMING.finalLife:JUDGMENT_SLASH_TIMING.life,judgmentSlash)"));
 assert.ok(!source.includes("if(e.final)cut(p,'prota',.82"),'finalizer must not add a crossed second slab');
});

test('Passagem uses a compact tapered ribbon instead of the shared broad crescent',async()=>{
 const profile=JUDGMENT_SLASH_PROFILE;
 assert.ok(profile.length>.42&&profile.length<.5,'individual cuts remain compact but long enough to read as blade strokes');
 assert.ok(profile.maxWidth>.05&&profile.maxWidth<.06,'individual cuts have enough width to remain legible at mobile distance');
 const endWidth=Math.abs(swordJudgmentSlashPoint(0,1).y-swordJudgmentSlashPoint(0,0).y);
 const middleWidth=Math.abs(swordJudgmentSlashPoint(.5,1).y-swordJudgmentSlashPoint(.5,0).y);
 assert.ok(middleWidth>endWidth*4,'the ribbon tapers sharply at both ends');
 assert.ok(Math.abs(swordJudgmentSlashPoint(.5,0).z)>0,'the stroke has a slight 3D bow');
 const vfx=await readFile(new URL('../sword-rites-vfx3d.js',import.meta.url),'utf8');
 assert.ok(vfx.includes("geometry=crescent"),'ordinary impacts retain the original crescent geometry by default');
 assert.ok(vfx.includes("m.geometry=geometry"),'the pooled cut meshes accept a dedicated judgment geometry');
 assert.ok(vfx.includes("m.material.depthTest=true"),'judgment strokes respect scene depth instead of overlaying the hero');
 assert.ok(vfx.includes("glowMesh.scale.set(1.14,1.3,1.12)"),'judgment strokes receive a restrained, dedicated glow edge');
 assert.ok(vfx.includes("judgmentSlash.dispose()"),'the dedicated geometry is disposed with the VFX pool');
});

test('Passagem keeps all 16 surface cuts alive together through the final impact',()=>{
 const sequenceSpan=JUDGMENT_TIMES.at(-1)-JUDGMENT_TIMES[0];
 assert.ok(JUDGMENT_SLASH_TIMING.life>sequenceSpan+.8,'the first cut remains visible with a fade margin at the sixteenth hit');
 assert.ok(JUDGMENT_SLASH_TIMING.finalLife>JUDGMENT_SLASH_TIMING.life,'the final cut gets a slightly longer finish');
});

test('Passagem blade trail is a short, soft accent capped at 30 Hz without changing other sword trails',async()=>{
 const passage=swordTrailProfile('prota'),standard=swordTrailProfile('basic');
 assert.ok(passage.tip-passage.base<(standard.tip-standard.base)*.35,'Passagem trail is only a short accent of the real blade');
 assert.equal(passage,SWORD_TRAIL_PROFILES.prota);
 assert.equal(standard,SWORD_TRAIL_PROFILES.standard);
 assert.equal(passage.life,.09);
 assert.equal(passage.opacity,.38);
 assert.equal(passage.interval,1/30);
 assert.equal(standard.life,.24,'ordinary sword trails keep their original lifetime');
 assert.equal(standard.opacity,1,'ordinary sword trails keep their original opacity');
 assert.equal(standard.interval,0,'ordinary sword trails keep full sampling');
 const source=await readFile(new URL('../sword-rites-vfx3d.js',import.meta.url),'utf8');
 assert.ok(source.includes('profile=swordTrailProfile(a.kind)'),'production trail sampling uses the immutable per-rite profile');
 assert.ok(source.includes('dx*profile.base')&&source.includes('dx*profile.tip'),'production trail geometry uses the profile endpoints without per-frame point objects');
});

test('Passagem judgment events carry a stable attacker origin for VFX placement',()=>{
 const from={x:0,y:0,z:0},focus=enemy('judgment-origin-focus',0,5),events=[];
 const rites=new SwordRites({
  blocked:()=>false,move:p=>Object.assign(from,p),hit:()=>true,
  event:(type,data)=>{if(type==='judgment')events.push({origin:data.from,at:{...from}});}
 });
 assert.deepEqual(rites.cast('prota',{mana:100,from,target:focus}),{ok:true,cost:28});
 const ctx={from,target:focus,sword:'prota',grounded:true};
 for(const dt of [.25,.25,.2])rites.update(dt,ctx);
 assert.ok(events.length>0,'at least one judgment cut must be emitted');
 assert.deepEqual(events[0].origin,events[0].at,'event must snapshot the hero position at the hit');
 assert.notEqual(events[0].origin,from,'event origin must not alias the live movement object');
});

test('production blade impacts forward their yaw and both impact cuts use the resolved heading',async()=>{
 const source=await readFile(new URL('../sword-rites3d.js',import.meta.url),'utf8');
 const vfx=await readFile(new URL('../sword-rites-vfx3d.js',import.meta.url),'utf8');
 assert.match(source,/by:'blade',p:contact,yaw:a\.yaw,hitstop:/);
 assert.match(source,/by:'blade',secondary:true,p:contact,yaw:a\.yaw,hitstop:0/);
 const start=vfx.indexOf("else if(type==='impact')"),end=vfx.indexOf("\n  else if(type==='start')",start);
 assert.ok(start>=0&&end>start,'production impact handler must be present');
 const branch=vfx.slice(start,end);
 assert.match(branch,/const cue=swordImpactCue\(e\),yaw=swordImpactYaw\(e\)/);
 assert.match(branch,/cut\(p,e\.sword,cue\.scale,Math\.PI\*\.5,yaw,cue\.life\)/);
 assert.match(branch,/cut\(p,e\.sword,cue\.secondScale,-Math\.PI\*\.5,yaw\+Math\.PI\/2,cue\.secondLife\)/);
 assert.doesNotMatch(branch,/time\*3/,'impact orientation must not depend on global elapsed time');
});


test('Passagem do Julgamento rejeita paredes de 1 cm entre os waypoints de 6 cm',()=>{
 const from={x:0,y:0,z:0},focus=enemy('thin-wall-focus',0,5);
 let probes=0;
 const blocked=p=>{
  probes++;
  return p.z>1&&p.z<1.01&&Math.abs(Math.abs(p.x)-.30)<.018;
 };
 assert.equal(passagePath(from,focus,blocked),null,'os dois corredores laterais têm uma parede fina no primeiro segmento');
 assert.ok(probes<5000,'a verificação fina continua limitada a uma única construção de rota');
});

test('Passagem do Julgamento cancela em posição segura se uma parede fina surgir entre waypoints',()=>{
 const from={x:0,y:0,z:0},focus=enemy('dynamic-wall-focus',0,5);
 let wall=null;const moves=[];
 const blocked=p=>!!wall&&Math.hypot(p.x-wall.x,p.y-wall.y,p.z-wall.z)<.006;
 const rites=new SwordRites({blocked,move:p=>{Object.assign(from,p);moves.push({...p});}});
 assert.deepEqual(rites.cast('prota',{mana:100,from,target:focus}),{ok:true,cost:28});
 const path=rites.active.path;
 assert.ok(path.length>8,'o trajeto deve conter waypoints de movimento');
 const a=path[4],b=path[5];
 wall={x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2};
 const ctx={from,target:focus,sword:'prota',grounded:true};
 rites.update(.25,ctx);
 rites.update(.06,ctx);
 assert.equal(rites.busy,false,'a passagem deve cancelar antes de cruzar o obstáculo novo');
 assert.deepEqual(from,path[4],'o herói permanece no último waypoint livre');
 assert.equal(moves.length,4,'nenhum waypoint depois da parede pode ser aplicado');
});


test('Combat315 captures Passagem from the gameplay camera and restores it after the lateral diagnostic',async()=>{
 const harness=await readFile(new URL('../tools/visual-lab/combat315-qa.cjs',import.meta.url),'utf8');
 const start=harness.indexOf('const riteShot='),end=harness.indexOf("\n  await E(()=>{for(const id",start);
 assert.ok(start>=0&&end>start,'Passagem screenshot helper must exist');
 const shot=harness.slice(start,end);
 assert.ok(shot.indexOf('D.viewQA(false)')<shot.indexOf("n+'.png'"),'the first image must use the gameplay third-person camera');
 assert.ok(shot.includes("n+'-lateral.png'"),'the lateral diagnostic must be a separate image');
 assert.ok(shot.includes('D.fly(null);D.viewQA(false)'),'the diagnostic camera must be restored before the next gameplay step');
});
