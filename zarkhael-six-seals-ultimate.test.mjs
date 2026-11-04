import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createZarkhaelSixSeals,ZARK_ULT,ZARK_ULT_BUILD,sixSealDangerRadius} from './zarkhael-six-seals-ultimate3d.js';
import {ZARK_ULT_VFX_BUILD} from './zarkhael-six-seals-vfx3d.js';
import {kitFor} from './powers3d.js';
import {ultimateFor,ultimateDue} from './ultimates3d.js';
const arena={x:1200,z:0,y:-2000,r:30},boss={x:1200,z:-2,y:-2000,yaw:0};
function run(step=1/60,position={x:1227,z:0},change=()=>{}){
 const s=createZarkhaelSixSeals().start(boss,arena),ev=[],observations=[],hero={...position,y:-2000,alive:true,iframes:false};
 for(let i=0;i<2500&&!s.done;i++){
  change(hero,s.st);
  for(const e of s.step(step,hero))ev.push({...e,time:s.st.t});
  observations.push({phase:s.st.phase,t:s.st.t,pt:s.st.pt,sel:s.st.seals.map(c=>c.build),rot:s.st.seals.map(c=>c.spin),aura:s.st.aura,cam:s.camera({boss})});
 }
 return {s,ev,observations};
}
test('80% de área perigosa e 20% fora (área, não raio)',()=>{
 const r=sixSealDangerRadius(30);
 assert.ok(Math.abs(r-26.832815729997478)<1e-6);
 assert.ok(Math.abs(1-(r*r)/(30*30)-.2)<1e-9);
 assert.equal(createZarkhaelSixSeals().start(boss,arena).st.seals.length,6);
});
test('3.3 s do close da aura; câmera frontal e aura não aparece de uma vez',()=>{
 const {ev,observations}=run();
 assert.ok(observations.find(o=>o.t>=1)?.aura>0);
 assert.ok(observations.find(o=>o.t>=1)?.aura<.6);
 const p=ev.find(e=>e.type==='phase'&&e.name==='seals');assert.ok(p);
 assert.ok(Math.abs(p.time-3.3)<.02);
 const cam=observations.find(o=>o.t>=1)?.cam;
 assert.ok(cam.w>.99 && cam.pos[1]<boss.y+7,'3/4 frontal baixo');
});
test('seis círculos diferentes nascem no solo e sobem um a um, formam-se em 6.7 s',()=>{
 const {s,ev,observations}=run();
 assert.deepEqual(s.st.seals.map(c=>c.h),ZARK_ULT.heights);
 assert.deepEqual(s.st.seals.map(c=>c.r),ZARK_ULT.radii.map(f=>sixSealDangerRadius(30)*f));
 const layers=ev.filter(e=>e.type==='seal');
 assert.equal(layers.length,6);
 assert.deepEqual(layers.map(e=>e.n),[1,2,3,4,5,6]);
 for(let i=1;i<6;i++)assert.ok(layers[i].time>layers[i-1].time+.75);
 assert.ok(observations.some(o=>o.t>4&&o.sel[0]>.35&&o.sel[1]<.05),'base surge antes das superiores');
 assert.ok(observations.some(o=>o.phase==='seals'&&o.rot[0]>.2&&o.rot[1]<0),'rotações alternadas');
 const boom=ev.find(e=>e.type==='phase'&&e.name==='explosions');
 assert.ok(Math.abs(boom.time-10)<.02);
});
test('direção de câmera fiel: plano frontal, depois SEIS subidas individuais',()=>{
 const a=run().observations;
 const cam=t=>a.find(x=>x.t>=t)?.cam;
 const front=cam(1.4);
 assert.equal(front.shot,'FRONTAL_BISPO');
 assert.ok(Math.abs(front.pos[1]-(boss.y+2.2))<.2,'ângulo frontal à altura do peito');
 assert.ok(Math.hypot(front.pos[0]-boss.x,front.pos[2]-boss.z)<5.6,'close real, sem afastamento');
 const heights=[];
 for(let i=0;i<6;i++){
  const t=3.3+i*ZARK_ULT.sealGap+.4,shot=cam(t);
  assert.equal(shot.shot,'CIRCULO_'+(i+1),'um enquadramento específico por círculo');
  assert.equal(shot.sealIndex,i);
  heights.push(shot.pos[1]);
 }
 for(let i=1;i<6;i++)
  assert.ok(heights[i]-heights[i-1]>5.0&&heights[i]-heights[i-1]<8.0,
   'subida de um patamar, sem saltar os círculos');
 assert.ok(heights[0]>boss.y+7&&heights[0]<boss.y+14,
  'o primeiro círculo é filmado poucos metros acima');
 const blast=cam(12);
 assert.equal(blast.shot,'EXPLOSAO_ORGANICA_3_4');
 assert.ok(blast.pos[1]>boss.y+40,'câmera continua elevada mas revela coluna e copa');
 assert.ok(Math.hypot(blast.pos[0]-arena.x,blast.pos[2]-arena.z)>30,
  'volume das explosões visto em 3/4 do alto, não disco zenital');
});
test('uma detonação cinematográfica única com expansão do núcleo até copa, precedida por compressão',()=>{
 const {s,ev}=run(1/60,{x:1200,z:0});
 const bursts=ev.filter(e=>e.type==='burst'),hits=ev.filter(e=>e.type==='hit');
 assert.deepEqual(bursts.map(e=>e.n),[1]);
 assert.equal(hits.length,1,'sem três danos repetidos');
 assert.ok(Math.abs(bursts[0].time-11.08)<.025);
 assert.ok(s.done&&Math.abs(s.st.t-15.5)<.025);
 assert.equal(s.st.bursts.length,1);
});
test('jogador mantém dash e mobilidade: faixa externa continua segura durante a explosão',()=>{
 for(const p of [{x:1227,z:0},{x:1173,z:0},{x:1200,z:27},{x:1200,z:-27},{x:1219.2,z:19.2}]){
  const {ev}=run(1/60,p);
  assert.equal(ev.filter(e=>e.type==='hit').length,0);
  assert.equal(ev.filter(e=>e.type==='burst').length,1);
 }
 const iframe=run(1/60,{x:1200,z:0},h=>{h.iframes=true;});
 assert.equal(iframe.ev.filter(e=>e.type==='hit').length,0);
});
test('cruzar o limite só conta dentro; um único dano por explosão',()=>{
 const {ev}=run(1/60,{x:1226.7,z:0});
 assert.equal(ev.filter(e=>e.type==='hit').length,1);
 const atLine=run(1/60,{x:1200+sixSealDangerRadius(30),z:0});
 assert.equal(atLine.ev.filter(e=>e.type==='hit').length,0);
 const dodge=run(1/60,{x:1200,z:0},(h,st)=>{h.x=st.t>9.8?1229:1200;});
 assert.equal(dodge.ev.filter(e=>e.type==='hit').length,0);
});
test('tempo e dano independentes do FPS; abort preserva cleanup',()=>{
 const at60=run(1/60,{x:1200,z:0}),at10=run(.1,{x:1200,z:0});
 assert.equal(at10.ev.filter(e=>e.type==='burst').length,1);
 assert.equal(at60.ev.filter(e=>e.type==='hit').length,at10.ev.filter(e=>e.type==='hit').length);
 assert.ok(Math.abs(at10.s.st.t-at60.s.st.t)<.03);
 const s=createZarkhaelSixSeals().start(boss,arena);s.step(2,{x:1200,z:0});s.abort();
 assert.equal(s.done,true);assert.equal(s.holdBoss,false);
 assert.deepEqual(s.step(1/60,{x:1200,z:0}),[]);
});
test('sem fallback genérico: kit, gatilho, câmera e espada original estão ligados',()=>{
 assert.equal(kitFor('zarkhael').ult?.type,'zarkhael_six_seals');
 assert.equal(kitFor('fallen3').ult?.type,'zarkhael_six_seals');
 assert.equal(ultimateFor('zarkhael').kind,'zarkhael_six_seals');
 assert.equal(ultimateDue('zarkhael',.59,0),0);
 assert.equal(ultimateDue('zarkhael',.24,1),1);
 const src=fs.readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
 assert.ok(src.includes("bossUlt.kind==='zarkhael6'?tickZarkUlt"));
 assert.ok(src.includes('startZarkUlt()'));
 assert.ok(src.includes('stopZarkUlt();') && src.includes('clearHazards();'));
 assert.ok(src.includes('zarkSwordWeapon?.userData?.tip'));
 assert.ok(src.includes('testUltBispo3'));
 assert.ok(ZARK_ULT_BUILD.startsWith('282-')&&ZARK_ULT_VFX_BUILD.startsWith('282-'));
});
test('VFX usa escultura flamejante e único núcleo, sem 3 blasts nem esfera genérica',()=>{
 const src=fs.readFileSync(new URL('./zarkhael-six-seals-vfx3d.js',import.meta.url),'utf8');
 for(const marker of ['ShaderMaterial','PlaneGeometry','createSingularMushroomExplosion','InstancedMesh','uBuild','uCharge','uPower','uAge','uTime','ZarkhaelSixSealsUltimate280'])assert.ok(src.includes(marker),marker);
 assert.ok(!src.includes('for(let i=0;i<3;i++){\n   const vfx=bursts[i]'), '3 efeitos antigos completamente excluídos');
 const main=fs.readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
 assert.ok(main.includes('zarkUltBossLock'), 'Boss imóvel durante ultimate');
 assert.ok(main.includes('enemyMixer.timeScale=0'), 'rig congelado');
 assert.ok(main.includes('zarkUltBossLock.mixerTimeScale'), 'restaura mixer');
 assert.ok(main.includes('!zarkUltBossLock&&combatStepNow()'), 'sem giro automático do chefe durante a ultimate');
 assert.ok(main.includes('enemyModelRoot.position.y=zarkUltBossLock.modelRootY'), 'sem correção vertical que desloca boss congelado');
 assert.ok(main.includes('modelRootY:enemyModelRoot.position.y'), 'salva altura original do rig');

 assert.ok(!/smoke|smokeSprite|fog\.density/i.test(src));
 assert.ok(!src.includes('new THREE.SphereGeometry(1,48,24)'), 'sem cúpula arredondada');
 assert.ok(!src.includes('new THREE.IcosahedronGeometry(1,1),lobeMat'), 'sem bolhas arredondadas');
 assert.ok(src.includes('singular.update(st,'), 'apenas uma explosão atualizada');
});

test('Mod 282: copa volumétrica real em vez de disco rígido, clarão e poeira de uma única detonação',()=>{
 const eruption=fs.readFileSync(new URL('./zarkhael-singular-eruption3d.js',import.meta.url),'utf8');
 const billow=fs.readFileSync(new URL('./zarkhael-billow-cloud3d.js',import.meta.url),'utf8');
 assert.ok(eruption.includes("createBillowingCrown(T,root)"),'a erupção deve renderizar a copa orgânica');
 assert.ok(!eruption.includes("const crown=new T.Mesh(lathe("),'remover de verdade a copa rígida de antes');
 assert.ok(eruption.includes('billow.update(age,st'),'o relógio da animação controla a copa');
 for(const marker of ['SingleExplosionBillowingFire','SingleExplosionGroundCloud','SingleExplosionGroundFlash','InstancedMesh','uWarp','aSeed','aHeat','uSmoky'])
  assert.ok(billow.includes(marker),'camada ausente: '+marker);
 assert.equal((eruption.match(/const shock=\[\]/g)||[]).length,1,'anéis de pressão pertencem à mesma erupção');
});
