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
 if(hits.length)assert.notEqual(hits[0].token,hits[1].token);
});
test('interrupção em cada fase libera câmera e devolve a mesma arma uma vez',()=>{
 const arena=measureRefuge(30,(x,z)=>Math.hypot(x,z)<=30);
 for(const phase of ['announce','throw','charge','escape','detonate','aftermath','recover']){
 let loose=false,focus=false;
 const u=createGreedUltimate({arena,speed:6,damage(){},camera:{focus(){focus=true},release(){focus=false}},
 weapon:{release(){assert.equal(loose,false);loose=true},restore(){assert.equal(loose,true);loose=false}}});
 assert.equal(u.start({phase:2,grounded:true}),false);assert.equal(u.start({phase:3,grounded:true,busy:true}),false);
 u.start({phase:3,grounded:true});while(u.getState().phase!==phase)u.update(.01);
 u.cancel();u.dispose();assert.equal(focus,false);assert.equal(loose,false);assert.equal(u.start({phase:3,grounded:true}),false);
 }
});
