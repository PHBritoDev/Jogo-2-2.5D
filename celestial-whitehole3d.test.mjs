import test from'node:test';import assert from'node:assert/strict';import{CelestialWhiteHole,CinematicLease,WHITE_PHASES,whiteFlash,impactVictims,throwPosition}from'./celestial-whitehole3d.js';import{SKILLS,canCast,unlockedSkills}from'./skills3d.js';import{readFileSync}from'node:fs';
const source={x:0,y:0,z:0},target=()=>({id:1,x:0,y:0,z:8,alive:true});
test('ordered eight phases and one damage event at every frame rate',()=>{for(const dt of [1/120,1/60,1/30,.1,3]){let hits=0;const phases=[],s=new CelestialWhiteHole({hit:d=>{assert.equal(d,160);hits++;},event:p=>phases.push(p)});s.start(source,target());for(let t=0;t<20;t+=dt)s.update(dt,target());assert.equal(hits,1);assert.deepEqual(phases,[...WHITE_PHASES.map(p=>p[0]),'finish']);assert(!s.active);}});
test('invalid target, range, repeated cast and premature hits rejected',()=>{let n=0;const s=new CelestialWhiteHole({hit:()=>n++});assert(!s.start(source,null));assert(!s.start(source,{...target(),z:25}));assert(s.start(source,target()));assert(!s.start(source,target()));s.update(12.99,target());assert.equal(n,0);s.update(.02,target());assert.equal(n,1);});
test('pause freezes timeline; death/context change/reused identity cancel without phantom hits',()=>{for(const kind of ['death','context','id']){let n=0;const s=new CelestialWhiteHole({hit:()=>n++}),t=target();s.start(source,t);s.update(20,t,{paused:true});assert.equal(s.time,0);if(kind==='death')t.alive=false;if(kind==='id')t.id++;s.update(20,t,{valid:kind!=='context'});assert(!s.active);assert.equal(n,0);}});
test('own lethal hit can finish presentation without a second damage',()=>{const t=target();let hits=0;const s=new CelestialWhiteHole({hit:()=>{t.alive=false;hits++;}});s.start(source,t);s.update(13,t);s.update(4,t);assert(!s.active);assert.equal(hits,1);});
test('warm contact pulse stays brief and bounded',()=>{assert.equal(whiteFlash(12),0);assert(whiteFlash(13.08)<=.12);assert.equal(whiteFlash(13.5),0);});
test('volume, falloff, hostile registry, occlusion and stable actor identities',()=>{
 const center=target(), actor=(id,x,extra={})=>({...center,id,x,hostile:true,...extra});
 const crowd=[actor('focus',0),actor('edge',7),actor('edge',6),actor('high',0,{y:8}),actor('outside',7.01),
  actor('shield',1,{invulnerable:true}),actor('ally',1,{hostile:false}),actor('npc',0,{hostile:undefined}),actor('dead',0,{alive:false}),actor('wall',3)];
 assert.deepEqual(impactVictims(center,crowd,160,(_,e)=>e.id!=='wall'),[[160,'focus'],[72,'edge']]);
 assert.deepEqual(impactVictims(center,[],160,()=>true),[]);
});
test('launch locks location; survivors in range can be hit after original target flees',()=>{
 const hits=[],focus=target(),near={...focus,id:'side',x:2,hostile:true};
 const s=new CelestialWhiteHole({actors:()=>[{...focus,hostile:true},near],hit:(d,id)=>hits.push(id)});
 s.start(source,focus);s.update(11,focus);focus.x=20;s.update(2,focus);s.update(4,focus);assert.deepEqual(hits,['side']);
 s.start(source,focus);s.cancel();s.update(17,focus);assert.deepEqual(hits,['side']);
});
test('lease rollback even when enter or frame throws; idempotent cleanup',()=>{for(const fail of ['enter','frame']){let restored=0;const lease=new CinematicLease({capture:()=>({camera:7}),enter:()=>{if(fail==='enter')throw Error('enter');},restore:s=>{assert.equal(s.camera,7);restored++;}});assert.throws(()=>{lease.begin();lease.run(()=>{throw Error('frame');});});assert(!lease.locked);lease.release();assert.equal(restored,1);}});
test('purchase, mana and cooldown remain required outside ephemeral debug unlock',()=>{assert(!unlockedSkills().has('ultimate'));assert(unlockedSkills({testAll:true}).has('ultimate'));const u=unlockedSkills({owned:['ultimate']});assert(!canCast('ultimate',{unlocked:u,mana:79}).ok);assert(canCast('ultimate',{unlocked:u,mana:80}).ok);assert(!canCast('ultimate',{unlocked:u,mana:80,cooldownUntil:{ultimate:30000},now:100}).ok);assert.equal(SKILLS.ultimate.cooldown,30000);});
test('physical position never set by cinematic integration; public test flag forwarded',()=>{const text=readFileSync('mundo-3d-prototype.js','utf8'),a=text.indexOf('// Protagonist Ultimate owns'),b=text.indexOf('function castHolyMagic',a),part=text.slice(a,b);assert(!/player\.position\.(?:set|copy)/.test(part));assert(part.includes('webglcontextlost'));assert(part.includes('stopImmediatePropagation'));assert(readFileSync('index.html','utf8').includes("params.has('todasHabilidades')"));});

test('obstructed release cancels even when a dropped frame crosses launch and impact',()=>{
 const hits=[],phases=[],s=new CelestialWhiteHole({flightClear:()=>false,hit:d=>hits.push(d),event:p=>phases.push(p)});
 s.start(source,target());s.update(16,target());assert(!s.active);assert.deepEqual(hits,[]);assert.equal(phases.at(-1),'obstructed');
});
test('contact is on the telegraphed terrain point at the impact tick',()=>{
 const out={},g=target();throwPosition(out,source,g,10,0);assert(out.y>10);
 const heights=[0,.25,.5,.75,1].map(u=>throwPosition(out,source,g,10,u).y);
 assert(heights.every((y,i)=>!i||y<=heights[i-1]));assert.equal(out.x,g.x);assert.equal(out.z,g.z);assert(Math.abs(out.y-g.y-.32)<1e-8);
});
