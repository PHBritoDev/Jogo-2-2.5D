'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','bispo4-runtime'),base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4174';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const report={ok:false,errors:[],assets:[],skills:{}};let context;
 try{
  context=await b.newContext({viewport:{width:960,height:540},deviceScaleFactor:1,hasTouch:true,isMobile:true,recordVideo:{dir:path.join(out,'video'),size:{width:960,height:540}}});const p=await context.newPage();
  p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|INVALID|compile/i.test(m.text()))report.errors.push(m.text());});p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))report.assets.push({url:r.url(),status:r.status()});});
  await p.goto(base+'/mundo-3d-prototype.html?testeDimensao=bishop4&debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>window.SevenSinsDebug3D,null,{timeout:180000});
  async function active(){await p.waitForFunction(()=>{const d=SevenSinsDebug3D;if(d.dimState().vs)d.vsGo();return d.dimState().battle?.active&&!d.dimState().vs&&d.hallVisualState()?.updates>0;},null,{timeout:180000});await p.waitForFunction(()=>!document.querySelector('#portal-veil').classList.contains('on'),null,{timeout:30000});}
  async function shot(n){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.screenshot({path:path.join(out,n+'.png'),timeout:60000});}
  await active();await p.evaluate(()=>{SevenSinsDebug3D.god();const s=document.querySelector('#graphics-profile-3d');s.value='low';s.dispatchEvent(new Event('change'));});
  await p.waitForFunction(()=>SevenSinsDebug3D.hallVisualState().quality==='low');
  report.navigation=await p.evaluate(()=>{const d=SevenSinsDebug3D;d.motionQA({x:1600,z:10,enemyDistance:14});const before=d.state(),walk=d.motionStep(1,{z:-1});return {before,walk,inside:d.collisionAt(1600,0),outside:d.collisionAt(1635,0)};});
  assert.ok(report.navigation.walk.hero[2]<report.navigation.before.z-1);assert.equal(report.navigation.inside,false);assert.equal(report.navigation.outside,true);
  await shot('00-caminhada');report.jump=await p.evaluate(()=>{const d=SevenSinsDebug3D;d.walkJump();return d.motionStep(.12,{z:0});});assert.ok(report.jump.hero[1]>-1999.8);await shot('00-pulo');await p.evaluate(()=>SevenSinsDebug3D.motionStep(1.5,{z:0}));
  await p.keyboard.press('KeyF');report.dash=await p.evaluate(()=>SevenSinsDebug3D.motionStep(.08,{z:-1}));assert.ok(report.dash.motion.dash>0);await shot('00-dash');
  await p.evaluate(()=>SevenSinsDebug3D.motionStep(.8,{z:0}));report.attack=await p.evaluate(()=>SevenSinsDebug3D.motionStep(.25,{z:0,attack:true}));assert.ok(report.attack.active);await shot('00-ataque');
  await p.evaluate(()=>{const d=SevenSinsDebug3D;d.fly(null);d.view(0,.08,8);d.speed(1)});await p.waitForTimeout(2000);await shot('01-combate');
  await p.evaluate(()=>SevenSinsDebug3D.view(.8,.14,9));await p.waitForTimeout(1000);await shot('02-camera-girada');
  report.quality=[];for(const q of ['max','high','low']){await p.evaluate(q=>{const s=document.querySelector('#graphics-profile-3d');s.value=q;s.dispatchEvent(new Event('change'))},q);await p.waitForTimeout(750);report.quality.push(await p.evaluate(()=>SevenSinsDebug3D.hallVisualState()));}
  assert.deepEqual(report.quality.map(s=>s.quality),['high','medium','low']);
  report.sword=await p.evaluate(()=>({available:SevenSinsDebug3D.hallVisualState().swordAvailable,request:SevenSinsDebug3D.kitMove('sw')}));assert.equal(report.sword.available,false);assert.equal(report.sword.request,null);report.sword.note='The current production kit deliberately has no separate boss sword power; s1 supplies the four swords. Player attack tested above.';
  await p.evaluate(()=>SevenSinsDebug3D.speed(6));
  for(const id of ['s1','s2']){
   const h=await p.waitForFunction(id=>{const d=SevenSinsDebug3D;d.god();d.power();d.kitMove(id);const s=id==='s1'?d.vxState():d.cyState();return s&&s.t>.7?s:null;},id,{polling:200,timeout:180000});report.skills[id]=await h.jsonValue();await shot('03-'+id);
   await p.waitForFunction(()=>!SevenSinsDebug3D.vxState()&&!SevenSinsDebug3D.cyState(),null,{polling:100,timeout:180000});
  }
  await p.evaluate(()=>SevenSinsDebug3D.speed(1));
  await p.waitForFunction(()=>{const d=SevenSinsDebug3D;d.god();d.luStart();return d.luState().phase==='boss';},null,{polling:100,timeout:180000});
  await p.waitForFunction(()=>SevenSinsDebug3D.luState().t>.8,null,{timeout:60000});report.skills.ultimateBoss=await p.evaluate(()=>({state:SevenSinsDebug3D.luState(),hall:SevenSinsDebug3D.hallVisualState()}));await shot('04-ultimate-bispo');
  await p.waitForFunction(()=>SevenSinsDebug3D.luState().phase==='moon',null,{timeout:120000});await shot('04-ultimate-cosmos');
  await p.waitForFunction(()=>SevenSinsDebug3D.luState().phase==='return',null,{polling:50,timeout:180000});report.skills.ultimateReturn=await p.evaluate(()=>({state:SevenSinsDebug3D.luState(),hall:SevenSinsDebug3D.hallVisualState()}));await shot('04-ultimate-retorno');
  await p.waitForFunction(()=>SevenSinsDebug3D.luState().none,null,{timeout:90000});report.restored=await p.evaluate(()=>SevenSinsDebug3D.hallVisualState());assert.ok(report.restored.architectureVisible.every(Boolean));await shot('05-combate-restaurado');
  await p.evaluate(()=>[...document.querySelectorAll('#dim-test-panel button')].find(b=>b.textContent.includes('Sair da dimensão')).click());await p.waitForFunction(()=>!SevenSinsDebug3D.dimState().voidMode,null,{timeout:30000});assert.equal(await p.evaluate(()=>SevenSinsDebug3D.hallVisualState()),null);
  await p.evaluate(()=>[...document.querySelectorAll('#dim-test-panel button')].find(b=>b.textContent.includes('Reiniciar luta')).click());await active();await p.waitForFunction(()=>{const d=SevenSinsDebug3D,y=d.cam()[1]+2000;return y>1&&y<12&&d.hallVisualState().updates>2;},null,{timeout:90000});
  await p.setViewportSize({width:393,height:852});await p.waitForTimeout(1000);await shot('06-reentrada-mobile');report.reentry=await p.evaluate(()=>SevenSinsDebug3D.hallVisualState());assert.equal(report.reentry.disposed,false);
  const center=await p.screenshot({clip:{x:126,y:426,width:98,height:153}});assert.ok(center.length>1500,'blank reentry');assert.deepEqual(report.errors,[]);assert.deepEqual(report.assets,[]);report.ok=true;
 }finally{fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await b.close();}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
