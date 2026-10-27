import test from 'node:test';
import assert from 'node:assert/strict';
import {CelestialStarfall} from './celestial-starfall3d.js';
import {canCast,unlockedSkills,SKILLS} from './skills3d.js';
import {SHOP_ITEMS,buyItem} from './progression3d.js';
const target=()=>({id:1,alive:true,x:0,y:1.15,z:0});
const source={x:0,y:1.7,z:0};
function setup(opts={}){const hits=[],events=[],s=new CelestialStarfall({...opts,hit:(...v)=>hits.push(v),event:(type,b)=>events.push({type,time:s.time,i:b?.i})});s.start(source,target());return {s,hits,events};}
test('launch ascends before opening; rain is staggered and damages only on impact',()=>{
 const {s,hits,events}=setup();s.update(.69,target());assert.equal(s.phase,'cast');assert.equal(hits.length,0);
 s.update(.5,target());assert.equal(s.phase,'ascent');assert.ok(s.launch.y>source.y&&s.launch.y<s.center.y);assert.ok(!events.some(e=>e.type==='open'));
 s.update(.6,target());assert.equal(s.phase,'rain');assert.ok(s.stars.some(s=>s.phase==='flight'));assert.equal(hits.length,0);
 s.update(3.5,target());assert.equal(s.active,false);assert.equal(hits.length,12);assert.equal(new Set(events.filter(e=>e.type==='impact').map(e=>e.i)).size,18);
 assert.deepEqual(events.filter(e=>['cast','launch','open','finish'].includes(e.type)).map(e=>e.type),['cast','launch','open','finish']);
 s.update(5,target());assert.equal(hits.length,12);
});
test('damage is frame-rate independent and paused time does not advance',()=>{
 for(const dt of [1/144,1/30,.2,5.1]){const {s,hits}=setup();s.update(2,target(),{paused:true});assert.equal(s.time,0);for(let t=0;t<5.1;t+=dt)s.update(dt,target());assert.equal(hits.length,12);}
});
test('walls stop swept projectiles before damage',()=>{const {s,hits,events}=setup({blocked:p=>p.y<4});s.update(5.1,target());assert.equal(hits.length,0);assert.equal(events.filter(e=>e.type==='blocked').length,18);});
test('target loss, replacement and scene changes cancel without stale hits',()=>{
 for(const [t,opts] of [[{...target(),alive:false},{}],[{...target(),id:2},{}],[target(),{valid:false}]]){const {s,hits}=setup();s.update(1.8,target());s.update(.3,t,opts);assert.equal(s.active,false);s.update(5,target());assert.equal(hits.length,0);}
});
test('no target finishes coherently; already launched stars do not chase a moving target',()=>{
 const hits=[];const s=new CelestialStarfall({hit:()=>hits.push(1)});s.start(source,null);s.update(5.1,null);assert.equal(s.active,false);assert.equal(hits.length,0);
 s.start(source,target());s.update(1.9,target());const aim={...s.stars[0].aim};s.update(.2,{...target(),x:10});assert.deepEqual(s.stars[0].aim,aim);assert.ok(s.center.x>0&&s.center.x<10);
});
test('recasts reuse slots, reject overlap and cleanly reset',()=>{const {s}=setup();const slots=[...s.stars];assert.equal(s.start(source,target()),false);for(let i=0;i<30;i++){s.update(5.1,target());assert.equal(s.start(source,target()),true);assert.equal(s.stars[0],slots[0]);assert.equal(s.time,0);assert.ok(s.stars.every(s=>s.phase==='waiting'));}});
test('retired skills stay disabled even with old saves or debug unlocks',()=>{
 const unlocked=new Set(['magic','magic2','magic3','ultimate']);for(const id of ['magic3','ultimate'])assert.equal(canCast(id,{unlocked,mana:999}).reason,'Em desenvolvimento.');
 assert.deepEqual([...unlockedSkills({owned:unlocked,testAll:true})],['magic','magic2']);
 for(const id of ['magic3','ultimate','magic3_plus'])assert.equal(buyItem(SHOP_ITEMS.find(i=>i.id===id),{owned:new Set(),questStep:99,level:99,coins:999}).ok,false);
 assert.equal(SKILLS.magic.mana,18);assert.equal(SKILLS.magic.cooldown,1800);
});
