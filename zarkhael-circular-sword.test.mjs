import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ZS,createZarkhaelCircularSword,ZARK_SWORD_BUILD} from './zarkhael-circular-sword3d.js';
import {KITS,powerStats} from './powers3d.js';
import {chooseZarkhaelMove,rangeScore} from './zarkhael-brain3d.js';

function run(distance=12,opts={}){
 const s=createZarkhaelCircularSword({damage:22,...opts}).start({x:0,y:0,z:0});
 const e=[],frames=[],hero={x:distance,y:0,z:0,iframes:false};
 for(let i=0;i<1200&&!s.done;i++){
  if(opts.hero)opts.hero(hero,s.st.t);
  for(const x of s.step(opts.dt||1/60,hero))e.push({...x,time:s.st.t});
  frames.push({...s.st});
 }
 return {s,e,frames};
}
test('Mod 278: fases obrigatórias: selo rubro antes de carregar; giro completo antes da emissão',()=>{
 const {s,e,frames}=run(12);
 const t=k=>e.find(x=>x.type===k)?.time;
 assert.ok(t('charge')>=ZS.aura && t('spin')>t('charge') && t('release')>t('spin'));
 assert.ok(frames.some(f=>f.phase==='aura') && frames.some(f=>f.phase==='charge') && frames.some(f=>f.phase==='spin'));
 assert.ok(Math.abs(Math.max(...frames.map(f=>f.spin))-2*Math.PI)<1e-6);
 assert.ok(t('release')>=ZS.aura+ZS.charge+ZS.spin);
 assert.equal(s.done,true);
});
test('Mod 278: onda sai 360° do centro; choque no primeiro contato e sem atravessar',()=>{
 for(const [x,z] of [[12,0],[-12,0],[0,12],[0,-12],[8.485,8.485]]){
  const s=createZarkhaelCircularSword({damage:17}).start({x:0,y:0,z:0});
  const e=[];for(let i=0;i<900&&!s.done;i++)e.push(...s.step(1/60,{x,y:0,z,iframes:false}));
  assert.equal(e.filter(x=>x.type==='hit').length,1);
  assert.equal(e.find(x=>x.type==='hit').damage,17);
  assert.equal(s.st.impact.kind,'hero');
  assert.ok(s.st.impact.r<ZS.range);
 }
});
test('Mod 278: três explosões consecutivas mesmo quando não acerta ninguém',()=>{
 const {s,e}=run(80);
 assert.equal(s.st.impact.kind,'range');assert.equal(s.st.hits,0);
 assert.equal(e.filter(x=>x.type==='burst').length,3);
 assert.deepEqual(e.filter(x=>x.type==='burst').map(x=>x.n),[1,2,3]);
 assert.ok(Math.abs(s.st.impact.r-ZS.range)<1e-6);
 const tt=e.filter(x=>x.type==='burst').map(x=>x.time);
 assert.ok(tt[1]-tt[0]>=ZS.burstGap-.02 && tt[2]-tt[1]>=ZS.burstGap-.02);
});
test('Mod 278: dash atravessa a onda; contato nunca dá duplo dano',()=>{
 const a=run(12,{hero:h=>{h.iframes=true;}});
 assert.equal(a.e.filter(x=>x.type==='hit').length,0);
 assert.equal(a.s.st.impact.kind,'range');
 const b=run(12);
 assert.equal(b.e.filter(x=>x.type==='hit').length,1);
});
test('Mod 278: não cancelável por dano comum; aborto só por morte/cena/saída da dimensão',()=>{
 const s=createZarkhaelCircularSword().start({x:0,y:0,z:0});
 assert.equal(s.holdBoss,true);
 for(let i=0;i<50;i++)s.step(1/60,{x:99,y:0,z:0,iframes:false});
 assert.equal(s.holdBoss,true);s.abort();assert.equal(s.holdBoss,true);
 for(let i=0;i<20;i++)s.step(1/60,{x:99,y:0,z:0,iframes:false});
 assert.equal(s.done,true);assert.equal(s.holdBoss,false);
});
test('Mod 278: kit/IA usam espada exclusiva, GLB verdadeiro e não afetam outros poderes',()=>{
 const k=KITS.zarkhael;
 assert.deepEqual(k.skills.map(x=>x.type),['hydra_judgment','zarkhael_black_moon_flames']);
 assert.equal(k.sword.type,'zarkhael_circular_sword');assert.equal(k.ult,null);
 assert.equal(powerStats('zarkhael',k.sword).dmg,Math.round(k.sword.dmg*.8));
 assert.ok(rangeScore('zarkhael_circular_sword',12)>0);
 const pick=chooseZarkhaelMove(k,{dist:12,cds:{s1:9,s2:9},last:'',hpFrac:1,heroHpFrac:1},()=>.5);
 assert.equal(pick.move?.id,'sw');
 const src=fs.readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
 assert.ok(src.includes("mountZarkhaelSword(THREE,GLTFLoader,rig.model,'./EspadaBispo3.glb?v=278')"));
 assert.ok(src.includes("if(zarkSword&&zarkSword.holdBoss&&enemy.visible&&enemyAlive)"));
 assert.ok(src.includes("else if(!silent&&!(zarkSword&&zarkSword.holdBoss))playEnemyAnimation('hit'"));
 assert.ok(src.includes("updateZarkhaelSword(dt)"));
 assert.ok(src.includes("stopZarkhaelSword();clearHazards()"));
 assert.ok(ZARK_SWORD_BUILD.startsWith('278-'));
});
test('Mod 278: som e VFX por evento, sem fumaça, usa shader e instâncias',()=>{
 const src=fs.readFileSync(new URL('./zarkhael-circular-sword3d.js',import.meta.url),'utf8');
 assert.ok(src.includes('ShaderMaterial'));
 assert.ok(src.includes('InstancedMesh'));
 assert.ok(src.includes('shape') || src.includes('ShapeGeometry'));
 assert.ok(!/smoke|fumaça\s*\(/i.test(src.slice(src.indexOf('export function createZarkhaelCircularSwordVFX'))));
});
