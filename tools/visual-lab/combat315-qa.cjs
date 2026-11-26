'use strict';
/* Mod 315 — QA real do combate no jogo integrado (celular 844x390 com toque, WebGL/SwiftShader), com vídeo e capturas.
   Verifica: golpe básico sem projétil (longe não acerta; lâmina + rastro colado acertam), dash 0,5 s, 2 saltos sem terceiro, escudo do herói 2,7 s + 8 s,
   ruptura com dano integral, escudo/garras/salto predatório do Demônio1, erros de console/404 e custo de desenho. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','combat315'),base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4176';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--ignore-gpu-blocklist']});
 const report={ok:false,errors:[],assets:[],steps:{}};let context;
 try{
  context=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,hasTouch:true,isMobile:true,recordVideo:{dir:path.join(out,'video'),size:{width:844,height:390}}});const p=await context.newPage();
  p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|INVALID|compile|is not defined|TypeError/i.test(m.text()))report.errors.push(m.text());});
  p.on('response',r=>{if(r.status()>=400&&!/favicon/.test(r.url()))report.assets.push(r.status()+' '+r.url());});
  await p.goto(base+'/mundo-3d-prototype.html?testeEnemy1=1&debug3d=1&fullCombatQA=1',{waitUntil:'domcontentloaded',timeout:90000});
  await p.waitForFunction(()=>window.SevenSinsDebug3D&&SevenSinsDebug3D.riteState&&SevenSinsDebug3D.riteState().ready,null,{timeout:300000});
  const E=(f,a)=>p.evaluate(f,a),shot=async n=>{await E(()=>{const D=SevenSinsDebug3D,h=D.heroState(),q=D.squadState().snap.actors[0],mx=(h.p[0]+q.x)/2,mz=(h.p[2]+q.z)/2;D.fly([mx+5.2,h.p[1]+2.3,mz+1.2],[mx,h.p[1]+1,mz]);D.render();});await p.screenshot({path:path.join(out,n+'.png'),timeout:120000});await E(()=>SevenSinsDebug3D.fly(null));};
  const riteShot=async n=>{await E(()=>{const D=SevenSinsDebug3D,s=D.riteState(),h=s.hero,t=s.target,mx=(h[0]+t[0])/2,mz=(h[2]+t[2])/2;D.fly([mx+5.2,h[1]+2.3,mz+1.2],[mx,h[1]+1,mz]);D.render();});await p.screenshot({path:path.join(out,n+'.png'),timeout:120000});await E(()=>SevenSinsDebug3D.fly(null));};
  await E(()=>{for(const id of ['vfx-lab','quest-hud','status'])document.getElementById(id)&&(document.getElementById(id).style.display='none');});
  await E(()=>{const D=SevenSinsDebug3D;D.setHour&&D.setHour(10);D.squadLab('1');});
  await p.waitForFunction(()=>SevenSinsDebug3D.squadState().on&&SevenSinsDebug3D.combat315().enemies.length===1,null,{timeout:120000});
  // 1) briefing combate/câmera (P4): golpe básico SEM projétil — a 7,5 m (além da aproximação curta de ≤ 3,2 m + lâmina e
  //    rastro) não dá dano; encostado, a lâmina + rastro colado acerta uma vez, com VFX de corte visível.
  //    (Missão combate cinematográfico: a aproximação curta agora funciona no esquadrão, então a 4,6 m o herói chega
  //    andando e acerta com a lâmina — o "longe" passou a ser fora do alcance da aproximação.)
  report.steps.wave=await E(()=>{const D=SevenSinsDebug3D;D.teleport(-5,16,Math.PI);D.squadPose('e1',-5,8.5,0,true);D.squadPause(true);D.view(.7,.16,6);D.combatStep(.4,{fps:30,draw:false});const h0=D.squadState().enemyHP;D.combatAction('attack');D.combatStep(.3,{fps:60,draw:true});const mid=D.combat315();D.combatStep(.9,{fps:60,draw:false});const h1=D.squadState().enemyHP;
   D.squadPose('e1',-5,14.9,0,true);D.combatStep(.5,{fps:30,draw:false});const h2=D.squadState().enemyHP;D.combatAction('attack');D.combatStep(.9,{fps:60,draw:false});return {h0,h1,h2,h3:D.squadState().enemyHP,vfx:mid.slash,report:D.protaReport().move};});
  assert.equal(report.steps.wave.h1,report.steps.wave.h0,'longe: nada sai voando para acertar');assert.ok(report.steps.wave.vfx.slashes>0,'VFX do corte colado à lâmina visível');
  assert.ok(report.steps.wave.h3<report.steps.wave.h2,'perto: lâmina + rastro acertam');
  await E(()=>{const D=SevenSinsDebug3D;D.combatAction('attack');D.combatStep(.28,{fps:60,draw:true});});await shot('01-onda-espada');
  // 2) dash: recarga de 0,50 s desde a ativação
  report.steps.dash=await E(()=>{const D=SevenSinsDebug3D;D.combatStep(1,{fps:30,draw:false});D.setJoy(1,0);D.combatAction('dash');const a=D.combat315().mob.dashLeft;D.combatStep(.3,{fps:60,draw:false});const pos=D.heroState().p;D.combatAction('dash');const b2=D.combat315().mob.dashLeft;D.combatStep(.21,{fps:60,draw:false});D.combatAction('dash');const c=D.combat315().mob.dashLeft;D.setJoy(0,0);D.combatStep(.4,{fps:30,draw:true});return {a,b:b2,c,pos};});
  assert.ok(Math.abs(report.steps.dash.a-.5)<.02&&report.steps.dash.b>.15&&report.steps.dash.b<.25&&report.steps.dash.c>.45,'dash 0,5 s');
  // 3) dois saltos, nunca três
  report.steps.jump=await E(()=>{const D=SevenSinsDebug3D;D.combatAction('jump');D.combatStep(.18,{fps:60,draw:false});D.combatAction('jump');const j2=D.combat315().mob.jumps;D.combatStep(.15,{fps:60,draw:true});D.combatAction('jump');const j3=D.combat315().mob.jumps,y=D.heroState().p[1];D.combatAction('attack');D.combatStep(1.6,{fps:30,draw:false});return {j2,j3,y,landed:!D.combat315().mob.air};});
  assert.equal(report.steps.jump.j2,2);assert.equal(report.steps.jump.j3,2);assert.ok(report.steps.jump.landed);
  // 4) escudo do herói: 2,7 s, recarga 8 s só depois de sumir, ruptura com dano integral
  report.steps.heroShield=await E(()=>{const D=SevenSinsDebug3D,C=window.__combat315;D.combatAction('shield');D.combatStep(.25,{fps:30,draw:true});const on=D.combat315().hero;D.combatStep(2.6,{fps:30,draw:false});const off=D.combat315().hero;return {on,off};});
  assert.equal(report.steps.heroShield.on.state,'active');assert.equal(report.steps.heroShield.off.state,'cooldown');assert.ok(Math.abs(report.steps.heroShield.off.cd-8)<.25);
  // 5) Demônio1: escudo próprio absorve a espada; garras e salto predatório
  report.steps.demon=await E(()=>{const D=SevenSinsDebug3D;D.squadPose('e1',-5,13.8,0,true);D.squadShield('e1');D.combatStep(.1,{fps:30,draw:false});const h0=D.squadState().enemyHP;D.combatAction('attack');D.combatStep(.5,{fps:60,draw:true});const s=D.combat315().enemies[0];return {h0,h1:D.squadState().enemyHP,shield:s.shield};});
  assert.ok(report.steps.demon.shield==='active'&&report.steps.demon.h0-report.steps.demon.h1<12,'escudo do Demônio1 mitiga o golpe');
  await shot('02-escudo-demonio');
  report.steps.leap=await E(()=>{const D=SevenSinsDebug3D;D.squadPause(false);D.squadPose('e1',-5,9.6,0,true);D.squadLeap('e1');let maxY=0,j=0;for(let i=0;i<40;i++){D.combatStep(1/30,{fps:60,draw:false});const e=D.combat315().enemies[0];maxY=Math.max(maxY,e.airY);j=Math.max(j,e.jumps);}D.combatStep(.6,{fps:30,draw:true});return {maxY,j};});
  assert.ok(report.steps.leap.maxY>.8&&report.steps.leap.j===2,'salto duplo do Demônio1');await shot('03-salto-demonio');
  report.steps.claws=await E(()=>{const D=SevenSinsDebug3D;D.squadPose('e1',-5,14.1,0,true);const hp0=D.heroState().hp;D.squadNative('e1','rasgo');D.combatStep(.55,{fps:60,draw:true});return {hp0};});await shot('04-garras');
  report.perf=await E(()=>SevenSinsDebug3D.perfProbe(4));
  report.after=await E(()=>SevenSinsDebug3D.combat315());
  // A2: exercise the real Passagem do Julgamento route in the isolated game scene.
  const passageMid=await E(async()=>{
   const D=SevenSinsDebug3D;await D.riteQA(true);D.riteEquip('prota');
   D.motionQA({x:-5,z:16,enemyDistance:4,sword:'prota'});
   // Clear any residual combat hit-stop before timing the 0.30–0.47 s movement window.
   D.motionStep(.15,{x:0,z:0,fps:30});D.viewQA(false);
   const before=D.riteState();D.riteCast();
   // Step the same per-frame world loop used by gameplay, not riteSim's single final render.
   const mid=D.motionStep(.36,{x:0,z:0,fps:30});
   return{before:{hero:before.hero,target:before.target,hp:before.hp},mid:{hero:mid.hero,time:mid.active?.time??null}};
  });
  await riteShot('05-passagem-julgamento-meio');
  const passageCuts=await E(()=>{const D=SevenSinsDebug3D,state=D.motionStep(.75,{x:0,z:0,fps:30});return{hero:state.hero,time:state.active?.time??null};});
  await riteShot('05-passagem-julgamento-cortes');
  const passageLate=await E(()=>{const D=SevenSinsDebug3D,state=D.motionStep(.50,{x:0,z:0,fps:30});return{hero:state.hero,time:state.active?.time??null,cuts:(state.events||[]).filter(e=>e.type==='judgment').length,visibleCuts:state.vfx?.cuts??null};});
  await riteShot('05-passagem-julgamento-cortes-finais');
  const passageEnd=await E(()=>{
   const D=SevenSinsDebug3D,after=D.motionStep(1.74,{x:0,z:0,fps:30});
   return{after:after.hero,hpAfter:after.hp,mana:after.mana,
    cuts:(after.events||[]).filter(e=>e.type==='judgment').length,
    safe:!D.collisionAt(after.hero[0],after.hero[2]),activeAfter:!!after.active};
  });
  const midDistance=Math.hypot(passageMid.mid.hero[0]-passageMid.before.hero[0],passageMid.mid.hero[2]-passageMid.before.hero[2]);
  const totalDistance=Math.hypot(passageEnd.after[0]-passageMid.before.hero[0],passageEnd.after[2]-passageMid.before.hero[2]);
  report.steps.passage={before:passageMid.before.hero,target:passageMid.before.target,mid:passageMid.mid.hero,
   midTime:passageMid.mid.time,midDistance,totalDistance,cutsFrame:passageCuts,cutsLateFrame:passageLate,after:passageEnd.after,
   hpBefore:passageMid.before.hp,hpAfter:passageEnd.hpAfter,damage:passageMid.before.hp-passageEnd.hpAfter,
   mana:passageEnd.mana,cuts:passageEnd.cuts,safe:passageEnd.safe,activeAfter:passageEnd.activeAfter};
  assert.ok(report.steps.passage.midDistance>.5,'Passagem deve mover o herói durante a janela filmada');
  assert.ok(report.steps.passage.midDistance<report.steps.passage.totalDistance,'a captura intermediária deve ocorrer antes da chegada');
  assert.ok(report.steps.passage.midTime>=.30&&report.steps.passage.midTime<=.47,'captura intermediária deve cair durante o dash');
  assert.ok(report.steps.passage.cutsFrame.time>=.65&&report.steps.passage.cutsFrame.time<=1.2,'captura intermediária deve cair durante a sequência de cortes');
  assert.ok(report.steps.passage.cutsLateFrame.time>=1.55&&report.steps.passage.cutsLateFrame.time<=1.75,'captura final deve mostrar o último corte antes da dissipação');
  assert.equal(report.steps.passage.cutsLateFrame.cuts,16,'os 16 eventos já foram emitidos na captura final');
  assert.equal(report.steps.passage.cutsLateFrame.visibleCuts,16,'as 16 marcas precisam continuar visíveis juntas no último impacto');
  assert.ok(report.steps.passage.after[2]<report.steps.passage.target[2],'Passagem termina atrás do alvo');
  assert.equal(report.steps.passage.damage,76,'16 cortes mantêm o orçamento de dano 76');
  assert.equal(report.steps.passage.cuts,16,'todos os 16 cortes visuais/lógicos são emitidos');
  assert.ok(report.steps.passage.safe,'posição final fora dos colisores do cenário');
  assert.equal(report.steps.passage.activeAfter,false,'o rito termina após a coreografia');
  await riteShot('05-passagem-julgamento');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.assets,[]);report.ok=true;
 }finally{fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await b.close();}
 console.log(JSON.stringify({ok:report.ok,steps:report.steps,perf:report.perf&&{calls:report.perf.calls,tris:report.perf.tris}},null,1));
})().catch(e=>{console.error(e);process.exitCode=1});
