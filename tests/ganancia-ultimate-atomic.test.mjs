import test from 'node:test';
import assert from 'node:assert/strict';
import {measureRefuge,createGreedUltimate} from '../greed-ultimate-atomic3d.js';
for(const r of [12,30])for(const width of [.7,1])test('área '+r+' × '+width,()=>{
 const walk=(x,z)=>Math.hypot(x/width,z)<=r, a=measureRefuge(r,walk);
 assert.ok(Math.abs(a.fraction-.8)<.01);assert.ok(a.safe(0,r-.1));assert.ok(!a.safe(0,r+1));
});
for(const fps of [30,60,120])for(const mode of ['exposto','abrigo','dash','guarda'])test(mode+' '+fps,()=>{
 const a=measureRefuge(30,(x,z)=>Math.hypot(x,z)<=30), hits=[];
 let attached=true,focused=false;
 const u=createGreedUltimate({arena:a,speed:6,weapon:{release(){attached=false},restore(){attached=true}},
 camera:{focus(){focused=true},release(){focused=false}},damage:h=>hits.push(h)});
 for(let cycle=0;cycle<2;cycle++){
 assert.ok(u.start({phase:3,grounded:true}));
 for(let i=0;i<fps*22;i++){u.update(1/fps,{x:0,z:mode==='abrigo'?28:-5,evading:mode==='dash',blocking:mode==='guarda'});if(u.getState().phase==='escape')assert.equal(focused,false);}
 assert.equal(u.getState().phase,'idle');assert.ok(attached);}
 assert.equal(hits.length,['exposto','guarda'].includes(mode)?2:0);
 assert.ok(hits.every(hit=>hit.blocked===(mode==='guarda')));
 if(hits.length)assert.notEqual(hits[0].token,hits[1].token);
});
test('interrupção em cada fase libera câmera e devolve a mesma arma uma vez',()=>{
 const arena=measureRefuge(30,(x,z)=>Math.hypot(x,z)<=30);
 for(const phase of ['announce','bladeCombo','throw','charge','escape','collapse','detonate','aftermath','recover']){
 let loose=false,focus=false;
 const u=createGreedUltimate({arena,speed:6,damage(){},camera:{focus(){focus=true},release(){focus=false}},
 weapon:{release(){assert.equal(loose,false);loose=true},restore(){assert.equal(loose,true);loose=false}}});
 assert.equal(u.start({phase:2,grounded:true}),false);assert.equal(u.start({phase:3,grounded:true,busy:true}),false);
 u.start({phase:3,grounded:true});while(u.getState().phase!==phase)u.update(.01);
 u.cancel();u.dispose();assert.equal(focus,false);assert.equal(loose,false);assert.equal(u.start({phase:3,grounded:true}),false);
 }
});
test('o diretor aguarda a recuperação, interrompe no teleporte e só rearma em outro encontro', async()=>{
 const {createGreedAtomicEncounter}=await import('../greed-ultimate-atomic3d.js');
 let casts=0,active=false;
 const driver=createGreedAtomicEncounter({cancel(){active=false},start(e){if(e.busy)return false;active=true;casts++;return true},update(){}});
 const encounter={id:1,alive:true,phase:2,hpRatio:.4,busy:true,grounded:true};
 driver.tick(.1,encounter,{});encounter.phase=3;driver.tick(.1,encounter,{});assert.equal(casts,0);
 encounter.busy=false;driver.tick(.1,encounter,{});assert.equal(casts,1);
 driver.tick(.1,{...encounter,teleported:true},{});assert.equal(active,false);
 driver.tick(.1,encounter,{});assert.equal(casts,1);encounter.id++;driver.tick(.1,encounter,{});assert.equal(casts,2);
});
test('a janela começa ao devolver a câmera e cobre a caminhada desde o extremo oposto',()=>{
 const r=30,a=measureRefuge(r,(x,z)=>Math.hypot(x,z)<=r);let releases=0;
 const u=createGreedUltimate({arena:a,speed:2.8,damage(){throw Error('atingiu refúgio')},camera:{focus(){},release(){releases++}},weapon:{release(){},restore(){}}});
 const hero={x:0,z:-29.9};u.start({phase:3,grounded:true});while(u.getState().phase!=='escape')u.update(1/60,hero);
 assert.equal(u.getState().phase,'escape');assert.equal(releases,1);
 const window=u.getState().escape;assert.ok(window>(a.edge-hero.z)/2.8);
 for(let t=0;t<window+6;t+=1/60){if(hero.z<a.edge+1)hero.z+=2.8/60;u.update(1/60,hero);}
 assert.equal(releases,1);assert.equal(u.getState().phase,'idle');
});

test('travessia rápida entre dois pontos exteriores cruza a frente em movimento',()=>{
 const arena=measureRefuge(30,(x,z)=>Math.hypot(x,z)<=30), hits=[];
 const ritual=createGreedUltimate({arena,speed:2.8,damage:h=>hits.push(h),weapon:{release(){},restore(){}},camera:{focus(){},release(){}}});
 const hero={x:-12,z:0};
 ritual.start({phase:3,grounded:true});
 while(ritual.getState().phase!=='detonate')ritual.update(.01,hero);
 ritual.update(.12,hero);
 hero.x=12;ritual.update(.1,hero);
 assert.equal(hits.length,1);
});
for(const [x,z] of [[0,0],[28,0],[-28,0],[0,28],[0,-28],[14,-8],[-11,16]]){
 test('máscara e frente congeladas no disparo em '+[x,z],()=>{
  const arena=measureRefuge(30,(x,z)=>Math.hypot(x,z)<=30,192,{x,z});
  assert.ok(Math.abs(arena.fraction-.8)<.03);
  const hero={x,z};let count=0;
  const r=createGreedUltimate({arena,speed:2.8,camera:{focus(){},release(){}},weapon:{release(){},restore(){}},damage(){count++}});
  for(let i=0;i<5;i++){
   r.start({phase:3,grounded:true});while(r.getState().phase!=='detonate')r.update(.01,hero);
   assert.equal(count,i+1,'o primeiro contato ocorre na origem real');
   r.update(6,hero);assert.equal(r.getState().phase,'idle');
  }
  const safe={x:arena.normal.x*25,z:arena.normal.z*25};
  assert.ok(arena.safe(safe.x,safe.z));assert.equal(arena.escapeDistance(safe.x,safe.z),0);
  r.start({phase:3,grounded:true});r.update(50,safe);assert.equal(count,5);
 });
}
