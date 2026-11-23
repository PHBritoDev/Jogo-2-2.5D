'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const dir=path.resolve('visual-lab-results/focus-movement');fs.mkdirSync(dir,{recursive:true});
 const report={pass:false,phase:'launch',screenshots:{},warnings:[],errors:[]};
 let browser,page,video,held=false,failed;
 const capture=async(name)=>{
  const target=path.join(dir,name+'.png');
  try{
   await page.screenshot({path:target,timeout:10000});
   report.screenshots[name]='playwright';
  }catch(e){
   report.warnings.push('playwright screenshot '+name+' timed out; using CDP fallback: '+e.message);
   // Chromium CDP bypasses Playwright's screenshot preparation (including font waits).
   // It still captures actual browser pixels; never substitute a synthetic image.
   let session;
   try{
    session=await page.context().newCDPSession(page);
    const shot=await session.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
    const bytes=Buffer.from(shot.data||'','base64');
    if(bytes.length<8||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('CDP returned no valid PNG');
    fs.writeFileSync(target,bytes);
    report.screenshots[name]='cdp';
   }catch(fallbackError){
    report.screenshots[name]='failed: '+e.message+'; CDP: '+fallbackError.message;
    report.errors.push('cdp screenshot '+name+': '+fallbackError.message);
   }finally{if(session)try{await session.detach()}catch{}}
  }
 };
 const frameHero=async state=>page.evaluate(({p})=>{
  const d=SevenSinsDebug3D,from=[p[0]+3.4,p[1]+2.8,p[2]+7.2],to=[p[0],p[1]+1,p[2]];
  d.camFix(from,to);
  return {from,to,cam:d.heroState().cam};
 },{p:state.p});
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const videoDir=path.join(dir,'video');fs.mkdirSync(videoDir,{recursive:true});
  page=await browser.newPage({viewport:{width:1280,height:720},recordVideo:{dir:videoDir,size:{width:1280,height:720}}});
  video=page.video();
  page.on('pageerror',e=>report.errors.push('pageerror: '+e.message));
  report.phase='loading';
  await page.goto('http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.SevenSinsDebug3D?.combatStep&&document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:120000});
  report.phase='movement';
  report.start=await page.evaluate(()=>{const d=SevenSinsDebug3D,lane=d.motionLane();if(!lane)throw Error('no flat QA lane found');d.freeRoam();d.motionQA({x:lane.x,z:lane.z,enemyDistance:0});d.combatStep(.35,{fps:30,draw:false});return {...d.heroState(),qaLane:{x:lane.x,y:lane.y,z:lane.z}}});
  await page.keyboard.down('w');held=true;
  report.forward=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.5,{fps:30,draw:false});return d.heroState()});
  report.frameMoving=await frameHero(report.forward);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await capture('moving-before-blur');
  report.phase='blur';
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  report.after=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.7,{fps:30,draw:false});return d.heroState()});
  report.frameAfterBlur=await frameHero(report.after);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await capture('stopped-after-blur');
  report.phase='visibilitychange';
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  report.last=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.3,{fps:30,draw:false});return d.heroState()});
  // Exercise the real page's keyboard binding while pointer lock switches A -> B.
  // A stale KeyW must not continue moving the hero without a new keydown.
  report.phase='pointerlock-switch';
  await page.keyboard.up('w');held=false;
  await page.evaluate(()=>{
    const canvas=document.querySelector('#scene');
    if(!canvas)throw Error('scene canvas absent');
    const other=document.createElement('canvas');
    other.id='a1-qa-second-lock-target';
    document.body.append(other);
    Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>window.__a1LockTarget});
    window.__a1LockTarget=canvas;
    document.dispatchEvent(new Event('pointerlockchange'));
  });
  await page.keyboard.down('w');held=true;
  report.lockBefore=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.4,{fps:30,draw:false});return d.heroState()});
  report.lockDuplicate=await page.evaluate(()=>{
    // Reproduce a duplicate keydown (repeat=false) arriving after the target
    // changes but before pointerlockchange; it must not rebind the held KeyW.
    window.__a1LockTarget=document.querySelector('#a1-qa-second-lock-target');
    const duplicate=new KeyboardEvent('keydown',{key:'w',code:'KeyW',bubbles:true,repeat:false});
    window.dispatchEvent(duplicate);
    document.dispatchEvent(new Event('pointerlockchange'));
    return {repeat:duplicate.repeat,isTrusted:duplicate.isTrusted};
  });
  report.lockAfter=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.8,{fps:30,draw:false});return d.heroState()});
  // The first simulation step includes normal deceleration from the last W frame.
  // Distinguish this short stopping distance from continued movement after release.
  report.lockDrift=Math.hypot(report.lockAfter.p[0]-report.lockBefore.p[0],report.lockAfter.p[2]-report.lockBefore.p[2]);
  report.lockSettled=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.5,{fps:30,draw:false});return d.heroState()});
  report.lockResidualDrift=Math.hypot(report.lockSettled.p[0]-report.lockAfter.p[0],report.lockSettled.p[2]-report.lockAfter.p[2]);
  report.lockPass=report.lockDuplicate.repeat===false&&report.lockAfter.speed<.08&&report.lockSettled.speed<.08&&report.lockResidualDrift<.06;
  report.frameAfterPointerLock=await frameHero(report.lockSettled);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await capture('stopped-after-pointerlock-switch');
  await page.keyboard.up('w');held=false;
  await page.evaluate(()=>{window.__a1LockTarget=null;document.dispatchEvent(new Event('pointerlockchange'));document.querySelector('#a1-qa-second-lock-target')?.remove()});
  report.drift=Math.hypot(report.last.p[0]-report.after.p[0],report.last.p[2]-report.after.p[2]);
  report.motion=Math.hypot(report.forward.p[0]-report.start.p[0],report.forward.p[2]-report.start.p[2]);
  report.inputPass=report.motion>.2&&report.after.speed<.08&&report.last.speed<.08&&report.drift<.06;
  report.capturePass=Object.values(report.screenshots).length===3&&Object.values(report.screenshots).every(s=>s==='playwright'||s==='cdp');
  report.pass=report.inputPass&&report.capturePass&&report.lockPass;
  report.phase='complete';
  if(!report.inputPass)throw Error('Movimento fantasma: tecla persistente ou estado não validado');
  if(!report.lockPass)throw Error('Pointer lock A->B manteve movimento após keydown duplicado');
  if(!report.capturePass)throw Error('QA de input concluído, mas captura visual falhou; veja report.json');
 }catch(e){
  failed=e;report.errors.push('test: '+e.message);
 }finally{
  if(held&&page){try{await page.keyboard.up('w')}catch(e){report.errors.push('key release: '+e.message)}}
  if(browser){try{await browser.close()}catch(e){report.errors.push('browser close: '+e.message)}}
  if(video){
   try{
    const videoPath=await video.path(),stat=fs.statSync(videoPath);
    report.video=path.relative(process.cwd(),videoPath);
    report.videoBytes=stat.size;
    report.videoPass=stat.size>1024;
   }catch(e){report.videoPass=false;report.errors.push('video finalize: '+e.message)}
  }else report.videoPass=false;
  if(!report.videoPass){report.pass=false;if(!failed)failed=new Error('QA video missing or empty')}
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));
 }
 if(failed)throw failed;
})().catch(e=>{console.error(e);process.exitCode=1});
