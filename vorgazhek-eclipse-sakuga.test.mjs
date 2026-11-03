import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEclipseSword,ECLIPSE,ECLIPSE_SWORD_BUILD,eclipseArms} from './vorgazhek-eclipse-sword3d.js';
import {ECLIPSE_SAKUGA_BUILD,sakugaLevels} from './vorgazhek-eclipse-sakuga3d.js';
const ground=()=>0;
test('Mod 274 — fases da camada Sakuga só acompanham o Eclipse verdadeiro',()=>{
 const es=createEclipseSword({ground}).start();
 assert.ok(ECLIPSE_SWORD_BUILD.startsWith('274-'));
 assert.ok(ECLIPSE_SAKUGA_BUILD.startsWith('274-'));
 assert.equal(sakugaLevels(null).rift,0);
 assert.deepEqual(sakugaLevels({phase:'idle'}),{wings:0,rift:0,burst:0});
 for(let i=0;i<120;i++)es.step(1/60,{x:0,y:0,z:12},{boss:{x:0,y:0,z:0}});
 const charge=sakugaLevels(es.st);
 assert.ok(charge.wings>.5&&charge.rift===0&&charge.burst===0,'asas se abrem antes do corte');
 const pose=eclipseArms(es.st);
 assert.ok(pose&&pose.rla[1]>.9,'animacao/pose original erguida permanece');
 while(es.st.phase==='charge')es.step(1/60,{x:0,y:0,z:12},{boss:{x:0,y:0,z:0}});
 for(let i=0;i<33&&es.st.phase==='release';i++)
   es.step(1/60,{x:0,y:0,z:12},{boss:{x:0,y:0,z:0}});
 const vals=sakugaLevels(es.st);
 assert.ok(vals.rift>0,'rasgo acompanha movimento da espada');
 assert.equal(ECLIPSE.dmg,22,'dano original preservado');
 assert.equal(ECLIPSE.charge,3.2,'timing original preservado');
});
test('Mod 274 — abort e morte limpam a sobreposicao visual',()=>{
 for(const s of ['idle','abort','fade']){
  const levels=sakugaLevels({phase:s,pt:.8,aborted:true});
  assert.equal(levels.wings+levels.rift+levels.burst,0);
 }
 assert.deepEqual(sakugaLevels({phase:'release',pt:.6,done:true}),{wings:0,rift:0,burst:0});
});
test('Mod 274 — shader proprio e VFX limitado em baixo detalhe',()=>{
 const src=fs.readFileSync(new URL('./vorgazhek-eclipse-sakuga3d.js',import.meta.url),'utf8');
 const base=fs.readFileSync(new URL('./vorgazhek-eclipse-sword3d.js',import.meta.url),'utf8');
 assert.ok(src.includes("name='AsasRubroNegras'") && src.includes("name='FendaBrancoCarmesim'"),
   'silhueta lateral e fenda vertical em geometria 3D');
 assert.ok(src.includes("low?10:24")&&src.includes("!low||i<2"),
   'debris e raios escalonados no mobile');
 assert.ok(base.includes('sakuga.update(es, ctx, dt)'));
 assert.ok(base.includes('sakuga.clear()')&&base.includes('sakuga.dispose()'));
 assert.ok(base.includes("slashG = crescentGeo(T)"),'golpe 3D anterior nao foi substituido');
 const world=fs.readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
 assert.ok(world.includes("if(m.type==='vorgazhek_eclipse_sword'){startEclipseSword(m);return;}"),
   'nao voltou ataque generico');
});
