import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {ECLIPSE_SAKUGA_BUILD,eclipseSakugaCue,eclipseWingPoint} from "./vorgazhek-eclipse-sakuga3d.js";
import {ECLIPSE,ECLIPSE_SWORD_BUILD,createEclipseSword,eclipseArms} from "./vorgazhek-eclipse-sword3d.js";

const st=(phase,pt=0,extra={})=>({phase,pt,t:pt,done:false,aborted:false,released:false,...extra});
test("Mod 274: asa cresce em carga sem antecipar explosão",()=>{
  const a=eclipseSakugaCue(st("charge",0)),b=eclipseSakugaCue(st("charge",2.2)),
    c=eclipseSakugaCue(st("charge",3.1));
  assert.equal(a.wing,0);
  assert.ok(b.wing>.5&&c.wing>b.wing);
  assert.equal(a.rift,0);
  assert.equal(b.impact,0);
  assert.equal(c.lightning,0);
});
test("Mod 274: rasgo emerge no lançamento e explosão se dissipa naturalmente",()=>{
 const anticipate=eclipseSakugaCue(st("release",.2));
 const fired=eclipseSakugaCue(st("release",.7,{released:true}));
 assert.ok(anticipate.wing>fired.wing);
 assert.equal(fired.stage,"flight");assert.ok(fired.rift>.90);
 const impactEarly=eclipseSakugaCue(st("impact",.28));
 const impactLate=eclipseSakugaCue(st("impact",2.3));
 assert.ok(impactEarly.debris>0&&impactEarly.lightning>0);
 assert.equal(impactLate.debris,0);assert.equal(impactLate.lightning,0);
 for(const phase of ["abort","fade","idle"])assert.equal(eclipseSakugaCue(st(phase,1)).wing,0);
 assert.equal(eclipseSakugaCue(st("release",.4,{aborted:true})).rift,0);
});
test("Mod 274: geometria da asa tem arco 3D orgânico, direita e esquerda espelhadas",()=>{
 for(const u of [0,.17,.4,.72,1])for(const v of [0,.25,.5,.75,1]){
   const a=eclipseWingPoint(-1,u,v),b=eclipseWingPoint(1,u,v);
   assert.ok(a.every(Number.isFinite));
   assert.equal(a[0],-b[0]);assert.equal(a[1],b[1]);assert.equal(a[2],b[2]);
 }
 assert.ok(eclipseWingPoint(1,.85,.95)[1]>eclipseWingPoint(1,.85,.05)[1]);
 assert.ok(eclipseWingPoint(1,1,.5)[0]>10);
});
test("Mod 274: não muda espada, animação, duração, dano ou mira",()=>{
 assert.equal(ECLIPSE.charge,3.2);
 assert.equal(ECLIPSE.windup,.42);
 assert.equal(ECLIPSE.dmg,22);
 assert.equal(ECLIPSE.speed,30);
 assert.match(ECLIPSE_SAKUGA_BUILD,/^274-/);
 assert.match(ECLIPSE_SWORD_BUILD,/^274-/);
 const seq=createEclipseSword().start(),hero={x:0,y:0,z:14,vx:0,vz:0,iframes:false};
 assert.equal(seq.st.phase,"charge");
 assert.ok(eclipseArms(seq.st).rla[1]>.9);
 let release=0,impact=0;
 for(let i=0;i<550&&!seq.done;i++)
   for(const ev of seq.step(1/60,hero,{from:{x:0,y:4,z:0},boss:{x:0,y:0,z:0}})){
     if(ev.type==="release")release++;if(ev.type==="impact")impact++;
   }
 assert.equal(release,1);assert.equal(impact,1);
});
test("Mod 274: VFX ligado ao Eclipse sem trocar o CLIP nem a colisão",()=>{
 const src=fs.readFileSync(new URL("./vorgazhek-eclipse-sword3d.js",import.meta.url),"utf8");
 const fx=fs.readFileSync(new URL("./vorgazhek-eclipse-sakuga3d.js",import.meta.url),"utf8");
 assert.ok(src.includes("sakuga.update(es,ctx,dt)"));
 assert.ok(src.includes("sakuga.clear()")&&src.includes("sakuga.dispose()"));
 for(const phrase of ["RasgoVerticalBrancoCarmesim","SakugaAsasAbissais","FragmentosDeBasaltoDoImpacto",
   "RelampagosRamificados","st.phase===\"impact\"","low?18:52"])
   assert.ok(fx.includes(phrase),phrase);
 assert.ok(!fx.includes("Math.random("));
 const world=fs.readFileSync(new URL("./mundo-3d-prototype.js",import.meta.url),"utf8");
 assert.ok(world.includes("eclipseVfx.update(r,{camera,boss:"));
 assert.ok(world.includes("eclipseArms(eclipseSword.st)"),"não substitui animação do bispo");
});
