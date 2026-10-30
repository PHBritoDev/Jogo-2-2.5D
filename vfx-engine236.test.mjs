import test from 'node:test';
import assert from 'node:assert/strict';
import {TwinPortals} from './skill-twin-portals3d.js';
import {JudgmentDragon} from './skill-judgment-dragon3d.js';
import {XRupture} from './skill-x-rupture3d.js';
const source={x:0,y:1.45,z:0};
const target=(id=1)=>({id,x:0,y:0,z:12,height:1.9,radius:.6,alive:true});
function advance(s,t,seconds,dt=1/60){for(let n=0;n<Math.ceil(seconds/dt);n++)s.update(dt,t);}
test('portal pressure cannot damage a target that left contact or died in the same long frame',()=>{
 for(const dead of [false,true]){const t=target(),hits=[],s=new TwinPortals({hit:(d,id,kind)=>{hits.push(kind);if(dead)t.alive=false;}});s.start(source,t);
 if(dead){s.update(10,t);assert.deepEqual(hits,['contact']);}
 else{while(s.phase!=='pressure')s.update(1/120,t);t.x=8;advance(s,t,6);assert.deepEqual(hits,['contact','contact']);}
 assert(!s.active);
 }
});
test('two portal flows account independently for overlapping targets; each budget is 58',()=>{
 const ts=[target(1),target(2)],damage=new Map(),events=[];ts[1].x=.05;
 const s=new TwinPortals({hit:(d,id)=>damage.set(id,(damage.get(id)||0)+d),event:k=>events.push(k)});s.start(source,ts);advance(s,ts,9);
 assert.equal(damage.get(1),58);assert.equal(damage.get(2),58);assert.equal(events.filter(k=>k==='launch').length,2);assert.equal(events.filter(k=>k==='pressure-pulse').length,3);
});
test('portal cancellation and immediate reuse discard pressure, collisions and paid budgets',()=>{
 const t=target(),hits=[],s=new TwinPortals({hit:d=>hits.push(d)});s.start(source,t);advance(s,t,2.5);s.cancel();const before=hits.length;advance(s,t,10);assert.equal(hits.length,before);assert(s.flows.every(f=>f.contacts.size===0));s.start(source,t);advance(s,t,9);assert.equal(hits.slice(before).reduce((a,b)=>a+b,0),58);
});
test('dragon fireball launches at the current mouth, moves on one 3D ray, then dives and bites',()=>{
 const t=target(),events=[],hits=[];let spawn;const s=new JudgmentDragon({hit:(d,id,k)=>hits.push([k,d]),event:(k)=>{events.push(k);if(k==='fire')spawn={p:{...s.ball.p},head:{...s.head}};}});s.start(source,t);while(s.phase!=='fire')s.update(1/120,t);
 assert(Math.abs(Math.hypot(spawn.p.x-spawn.head.x,spawn.p.y-spawn.head.y,spawn.p.z-spawn.head.z)-s.scale*.68)<1e-8);
 const dir={...s.ball.direction},old={...s.ball.p};s.update(.1,t);const delta={x:s.ball.p.x-old.x,y:s.ball.p.y-old.y,z:s.ball.p.z-old.z};assert(Math.abs(delta.x*dir.z-delta.z*dir.x)<1e-8);assert(delta.y<0);
 advance(s,t,9);assert.deepEqual(hits,[['ball',16],['bite',22],['blast',28]]);assert.deepEqual(events.filter(k=>['channel','form','soar','fire','advance','engulf','compress','explode','finish'].includes(k)),['channel','form','soar','fire','advance','engulf','compress','explode','finish']);
});
test('dragon projectile cannot turn toward a target moved after launch; ground collision remains finite',()=>{
 const t=target(),hits=[],s=new JudgmentDragon({hit:(d,id,k)=>hits.push(k)});s.start(source,t);while(s.phase!=='fire')s.update(1/120,t);const dir={...s.ball.direction};t.x=9;advance(s,t,1.3);assert.deepEqual(s.ball.direction,dir);assert(!hits.includes('ball'));assert(s.ball.impactTime>0);assert(s.ball.at.y<1.4);advance(s,t,12);assert(!s.active);
});
test('lethal fireball cancels subsequent dragon damage even with a large dt; boss is never displaced',()=>{
 const t=target(),hits=[],s=new JudgmentDragon({hit:(d,id,k)=>{hits.push(k);t.alive=false;}});t.resist=true;const position=[t.x,t.y,t.z];s.start(source,t);s.update(20,t);assert.deepEqual(hits,['ball']);assert(!s.active);assert.deepEqual([t.x,t.y,t.z],position);
});
test('dragon, portals and X obey pause and explicit context cancellation without new damage',()=>{
 for(const C of [JudgmentDragon,TwinPortals,XRupture]){let hits=0;const s=new C({hit:()=>hits++}),t=target();s.start(source,t);s.update(20,t,{paused:true});assert.equal(s.time,0);s.update(.1,t,{valid:false});assert(!s.active);advance(s,t,20);assert.equal(hits,0);}
});


test('scenery respects roof, trunk and rock height; a low wall may be overflown',async()=>{
 const {sceneryPoint}=await import('./skill-scenery3d.js');
 const world={ground:()=>2,structures:[{x:0,z:5,shape:'box',halfX:2,halfZ:.3,height:9}],trees:[{x:8,z:5,radius:1,height:12}],rocks:[{x:-8,z:5,radius:2,height:3,base:1}]};
 assert(sceneryPoint({x:0,y:10,z:5},world));assert(!sceneryPoint({x:0,y:12,z:5},world));assert(sceneryPoint({x:8,y:13,z:5},world));assert(!sceneryPoint({x:8,y:15,z:5},world));assert(sceneryPoint({x:-8,y:3.9,z:5},world));assert(!sceneryPoint({x:-8,y:4.1,z:5},world));
 const t=target(),hits=[],s=new JudgmentDragon({blocked:p=>p.y<60&&p.z>9&&p.z<9.3,hit:(d,id,k)=>hits.push(k)});s.start(source,t);advance(s,t,16);assert(!hits.includes('ball'));assert(!hits.includes('bite'));assert(!s.active);
});

test('duplicate target proxies cannot multiply the portal damage budget',()=>{
 const t=target(),ts=[t,{...t}],hits=[],s=new TwinPortals({hit:d=>hits.push(d)});s.start(source,ts);s.update(15,ts);assert.equal(hits.reduce((a,b)=>a+b,0),58);assert.equal(hits.length,9);
});
