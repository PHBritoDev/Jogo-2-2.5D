'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const dir=path.resolve('visual-lab-results/focus-movement');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.SevenSinsDebug3D?.combatStep&&document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:120000});
  const start=await page.evaluate(()=>{
   const d=SevenSinsDebug3D;d.freeRoam();d.motionQA({x:40,z:30,enemyDistance:0});d.combatStep(.35,{fps:30,draw:false});return d.heroState();
  });
  await page.keyboard.down('w');
  const forward=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.5,{fps:30,draw:false});return d.heroState()});
  await page.screenshot({path:path.join(dir,'moving-before-blur.png')});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  const after=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.7,{fps:30,draw:false});return d.heroState()});
  await page.screenshot({path:path.join(dir,'stopped-after-blur.png')});
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  const last=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.3,{fps:30,draw:false});return d.heroState()});
  await page.keyboard.up('w');
  const drift=Math.hypot(last.p[0]-after.p[0],last.p[2]-after.p[2]);
  const motion=Math.hypot(forward.p[0]-start.p[0],forward.p[2]-start.p[2]);
  const pass=motion>.2&&after.speed<.08&&last.speed<.08&&drift<.06;
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({pass,start,forward,after,last,motion,drift,errors},null,2));
  if(!pass)throw Error('Movimento fantasma: tecla persistente ou estado não validado');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
