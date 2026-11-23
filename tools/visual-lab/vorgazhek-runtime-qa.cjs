'use strict';
/** Enter the actual bishop 2 game dimension, capture video and assert navigation. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','vorgazhek-runtime');fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let context=null;let page=null;let portraitContext=null;let portraitPage=null;
 const report={ok:false,errors:[],screenshots:[],networkFailures:[],state:null,navigation:null,motion:[],renderer:'Chromium SwiftShader, not mobile FPS'};
 try{
  context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'videos')}});
  page=await context.newPage();
  page.on('pageerror',err=>report.errors.push(err.message));
  page.on('console',msg=>{if(msg.type()==='error'&&/shader|WebGL|compile|INVALID/i.test(msg.text()))report.errors.push(msg.text());});
  page.on('response',res=>{if(res.status()>=400&&!res.url().endsWith('favicon.ico'))report.networkFailures.push({status:res.status(),url:res.url()});});
  await page.goto(base+'/mundo-3d-prototype.html?testeDimensao=bishop2&debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.SevenSinsDebug3D,null,{timeout:180000});
  await page.waitForFunction(()=>{const d=window.SevenSinsDebug3D;const s=d?.dimState?.();if(s?.vs)d.vsGo();const n=d?.dimState?.();return !!(n?.battle?.active&&!n.vs&&n.voidMode);},null,{timeout:180000});
  await page.evaluate(()=>{SevenSinsDebug3D.god();SevenSinsDebug3D.speed(1);});
  // The VS / boss reveal briefly holds an overhead camera; inspect actual play after it releases.
  await page.waitForTimeout(8000);
  await page.evaluate(()=>{SevenSinsDebug3D.fly(null);SevenSinsDebug3D.view(0,.1,8.5);});
  await page.waitForTimeout(1800);
  async function shot(label){await page.screenshot({path:path.join(out,label+'.png'),timeout:60000});report.screenshots.push(label+'.png');}
  report.state=await page.evaluate(()=>({dimension:SevenSinsDebug3D.dimState(),render:SevenSinsDebug3D.rinfo(),state:SevenSinsDebug3D.state()}));
  assert.equal(report.state.dimension.battle.key,'bishop2','real game entered bishop2');
  await shot('01-batalha-real-paisagem');
  report.navigation=await page.evaluate(()=>({centerBlocked:SevenSinsDebug3D.collisionAt(800,0),innerBlocked:SevenSinsDebug3D.collisionAt(862,0),outsideBlocked:SevenSinsDebug3D.collisionAt(893,0)}));
  assert.equal(report.navigation.centerBlocked,false);assert.equal(report.navigation.innerBlocked,false);assert.equal(report.navigation.outsideBlocked,true);
  await page.evaluate(()=>{SevenSinsDebug3D.fly(null);SevenSinsDebug3D.view(.65,.08,8.5);});await page.waitForTimeout(1500);await shot('02-angulo-lateral');
  // Record real forward/backward input at fixed exposure and camera before mobile framing.
  // Screenshots and positions reveal whether the water highlight survives movement.
  for(const [key,label] of [['KeyW','04-avanco-z'],['KeyS','05-retorno-z']]){
   const before=await page.evaluate(()=>SevenSinsDebug3D.state());
   await page.keyboard.down(key);await page.waitForTimeout(1250);await page.keyboard.up(key);
   await page.waitForTimeout(300);await shot(label);
   const after=await page.evaluate(()=>SevenSinsDebug3D.state());
   const dx=after.x-before.x,dz=after.z-before.z,distance=Math.hypot(dx,dz);
   report.motion.push({key,before,after,dx,dz,distance,screenshot:label+'.png'});
   assert.ok(Number.isFinite(distance)&&distance>0.05,`${key} did not move the protagonist: ${distance}`);
  }
  const [forward,backward]=report.motion;
  assert.ok(forward.dx*backward.dx+forward.dz*backward.dz<0,'W/S must move in opposite directions');
  // Keep the recorded landscape video fixed at 960x540; portrait gets its own non-recording context.
  portraitContext=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
  portraitPage=await portraitContext.newPage();
  portraitPage.on('pageerror',err=>report.errors.push(err.message));
  portraitPage.on('console',msg=>{if(msg.type()==='error'&&/shader|WebGL|compile|INVALID/i.test(msg.text()))report.errors.push(msg.text());});
  portraitPage.on('response',res=>{if(res.status()>=400&&!res.url().endsWith('favicon.ico'))report.networkFailures.push({status:res.status(),url:res.url()});});
  await portraitPage.goto(base+'/mundo-3d-prototype.html?testeDimensao=bishop2&debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await portraitPage.waitForFunction(()=>!!window.SevenSinsDebug3D,null,{timeout:180000});
  await portraitPage.waitForFunction(()=>{const d=window.SevenSinsDebug3D;const s=d?.dimState?.();if(s?.vs)d.vsGo();const n=d?.dimState?.();return !!(n?.battle?.active&&!n.vs&&n.voidMode);},null,{timeout:180000});
  await portraitPage.evaluate(()=>{SevenSinsDebug3D.god();SevenSinsDebug3D.speed(1);});
  await portraitPage.waitForTimeout(8000);
  await portraitPage.evaluate(()=>{SevenSinsDebug3D.fly(null);SevenSinsDebug3D.view(0,.1,8.5);});
  await portraitPage.waitForTimeout(1800);
  report.portraitState=await portraitPage.evaluate(()=>({dimension:SevenSinsDebug3D.dimState(),render:SevenSinsDebug3D.rinfo(),state:SevenSinsDebug3D.state()}));
  assert.equal(report.portraitState.dimension.battle.key,'bishop2','portrait game entered bishop2');
  await portraitPage.screenshot({path:path.join(out,'03-retrato-celular.png'),timeout:60000});
  report.screenshots.push('03-retrato-celular.png');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.networkFailures,[]);report.ok=true;
 }catch(err){
  // A failed movement assertion must be diagnosable from the uploaded JSON,
  // not only from transient CI stderr. Keep the video and partial captures.
  report.failure={name:err.name||'Error',message:err.message||String(err)};
  throw err;
 }finally{
  // Finalize video even when an assertion fails; preserve evidence for diagnosis.
  try{if(portraitPage)await portraitPage.close();}catch(err){report.errors.push('portrait page close: '+err.message);}
  try{if(portraitContext)await portraitContext.close();}catch(err){report.errors.push('portrait context close: '+err.message);}
  try{if(page){const video=page.video();await page.close();if(video)report.video=await video.path();}}catch(err){report.errors.push('video finalization: '+err.message);}
  try{if(context)await context.close();}catch(err){report.errors.push('context close: '+err.message);}
  fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
 console.log(JSON.stringify({ok:report.ok,errors:report.errors,shots:report.screenshots,navigation:report.navigation},null,2));
}
main().catch(err=>{console.error(err);process.exitCode=1});
