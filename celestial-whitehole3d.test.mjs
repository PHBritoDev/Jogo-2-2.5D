import test from'node:test';import assert from'node:assert/strict';import{CelestialWhiteHole,CinematicLease,whiteHitOptions}from'./celestial-whitehole3d.js';import{SKILLS,canCast,unlockedSkills}from'./skills3d.js';import{readFileSync}from'node:fs';
const source={x:0,y:0,z:0},target=()=>({id:1,x:0,y:0,z:8,alive:true});
test('sweep e onda independem da frequência do renderer',()=>{
 for(const dt of [1/120,1/60,1/30,.1,3,17]){
  const t=target(),actors=[{...t,hostile:true},{...t,id:2,x:3,hostile:true},{...t,id:3,x:12,hostile:true},{...t,id:4,hostile:false}];
  const hits=[],s=new CelestialWhiteHole({actors:()=>actors,hit:(...e)=>hits.push(e)});
  assert(s.start(source,t));while(s.active)s.update(dt,t);
  assert.deepEqual(hits.map(h=>h.slice(1)),[[1,'contact'],[1,'wave'],[2,'wave']]);
  assert.equal(hits[0][0]+hits[1][0],160);assert(hits[2][0]<96);
 }
});
test('a mão define a origem e uma esquiva deixa o impacto no solo',()=>{
 const t=target(),origin={x:.7,y:4,z:1},hits=[];
 const s=new CelestialWhiteHole({palm:()=>origin,hit:(...a)=>hits.push(a)});
 s.start(source,t);s.update(11.02,t);assert.deepEqual(s.release,origin);t.x=18;s.update(5,t);
 assert(!s.contact.actor);assert(s.contact.y<=.161);assert.deepEqual(hits,[]);
});
test('muro intercepta primeiro e LOS bloqueia a onda',()=>{
 const t=target(),hits=[],s=new CelestialWhiteHole({solid:p=>p.z>=4,clear:()=>false,hit:(...a)=>hits.push(a)});
 s.start(source,t);s.update(16,t);assert(Math.abs(s.contact.z-4)<.002);assert.deepEqual(hits,[]);
});
test('pausa, alvo inválido, cancelamento e invulnerabilidade',()=>{
 const t=target(),hits=[],s=new CelestialWhiteHole({actors:()=>[{...t,hostile:true,invulnerable:true}],hit:(...a)=>hits.push(a)});
 assert(!s.start(source,{...t,z:25}));s.start(source,t);s.update(7,t,{paused:true});assert.equal(s.time,0);s.update(5,{...t,alive:false});assert(!s.active);
 s.start(source,t);s.update(13,t);s.cancel();assert.deepEqual(hits,[]);
});
test('lease rollback even when enter or frame throws; idempotent cleanup',()=>{for(const fail of ['enter','frame']){let restored=0;const lease=new CinematicLease({capture:()=>({camera:7}),enter:()=>{if(fail==='enter')throw Error('enter');},restore:s=>{assert.equal(s.camera,7);restored++;}});assert.throws(()=>{lease.begin();lease.run(()=>{throw Error('frame');});});assert(!lease.locked);lease.release();assert.equal(restored,1);}});
test('purchase, mana and cooldown remain required outside ephemeral debug unlock',()=>{assert(!unlockedSkills().has('ultimate'));assert(unlockedSkills({testAll:true}).has('ultimate'));const u=unlockedSkills({owned:['ultimate']});assert(!canCast('ultimate',{unlocked:u,mana:79}).ok);assert(canCast('ultimate',{unlocked:u,mana:80}).ok);assert(!canCast('ultimate',{unlocked:u,mana:80,cooldownUntil:{ultimate:30000},now:100}).ok);assert.equal(SKILLS.ultimate.cooldown,30000);});
test('physical position never set by cinematic integration; public test flag forwarded',()=>{const text=readFileSync('mundo-3d-prototype.js','utf8'),a=text.indexOf('// Protagonist Ultimate owns'),b=text.indexOf('function castHolyMagic',a),part=text.slice(a,b);assert(!/player\.position\.(?:set|copy)/.test(part));assert(part.includes('webglcontextlost'));assert(part.includes('stopImmediatePropagation'));assert(readFileSync('index.html','utf8').includes("params.has('todasHabilidades')"));});


test('morte antes da soltura cancela; após a soltura a trajetória continua até o chão',()=>{
 const t=target(),s=new CelestialWhiteHole(),hits=[];
 s.hit=(...e)=>hits.push(e);s.start(source,t);s.update(10.9,t);t.alive=false;s.update(.2,t);assert(!s.active);
 t.alive=true;s.start(source,t);s.update(11.1,t);t.alive=false;s.update(4,t);
 assert(s.contact&&!s.contact.actor);assert.deepEqual(hits,[]);
});
test('pausa na compressão conserva as duas janelas de dano separadas',()=>{
 const t=target(),hits=[],s=new CelestialWhiteHole({hit:(d,id,kind)=>hits.push(kind)});
 s.start(source,t);while(!s.contact)s.update(1/120,t);
 assert.deepEqual(hits,['contact']);s.update(7,t,{paused:true});assert.deepEqual(hits,['contact']);
 s.update(.22,t);assert.deepEqual(hits,['contact','wave']);s.cancel();s.update(17,t);assert.equal(hits.length,2);
});

test('nova conjuração não herda a posição de soltura do ataque anterior',()=>{
 const t=target(),s=new CelestialWhiteHole({palm:()=>({x:1,y:3,z:2})});
 s.start(source,t);s.update(17,t);assert(s.release);
 s.start({x:4,y:0,z:2},t);s.update(5,t);
 assert.equal(s.release,null);assert.equal(s.shot,null);
});

test('o contato vem da palma para a guarda frontal; a onda segue a regra do escudo',async()=>{
 const {Enemy1Squad}=await import('./enemy1-squad3d.js');
 const {EnergyShield,SHIELD_SPECS}=await import('./combat-defense3d.js');
 const squad=new Enemy1Squad(),[actor]=squad.spawn([{x:0,z:8,yaw:Math.PI,hp:500}]);
 actor.guard=true;
 const cast={release:{x:0,z:0},contact:{x:0,z:8}};
 const direct=squad.damageActor(actor.id,64,whiteHitOptions(cast,'contact'));
 assert(direct>0 && direct<64);
 actor.shield=new EnergyShield(SHIELD_SPECS.demon1);actor.shield.activate(squad.time);
 const wave=squad.damageActor(actor.id,96,whiteHitOptions(cast,'wave'));
 assert(wave<96 && actor.shield.hp<SHIELD_SPECS.demon1.durability);
});
