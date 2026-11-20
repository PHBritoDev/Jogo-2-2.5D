'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const dir=path.resolve('visual-lab-results/focus-movement');fs.mkdirSync(dir,{recursive:true});
 const report={pass:false,phase:'launch',screenshots:{},errors:[]};
 let browser,page,held=false,failed;
 const capture=async(name)=>{
  try{await page.screenshot({path:path.join(dir,name+'.png'),timeout:10000});report.screenshots[name]='ok';}
  catch(e){report.screenshots[name]='failed: '+e.message;report.errors.push('screenshot '+name+': '+e.message);}
 };
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>report.errors.push('pageerror: '+e.message));
  report.phase='loading';
  await page.goto('http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.SevenSinsDebug3D?.combatStep&&document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:120000});
  report.phase='movement';
  report.start=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.freeRoam();d.motionQA({x:40,z:30,enemyDistance:0});d.combatStep(.35,{fps:30,draw:false});return d.heroState()});
  await page.keyboard.down('w');held=true;
  report.forward=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.5,{fps:30,draw:false});return d.heroState()});
  await capture('moving-before-blur');
  report.phase='blur';
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  report.after=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.7,{fps:30,draw:false});return d.heroState()});
  await capture('stopped-after-blur');
  report.phase='visibilitychange';
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  report.last=await page.evaluate(()=>{const d=SevenSinsDebug3D;d.combatStep(.3,{fps:30,draw:false});return d.heroState()});
  report.drift=Math.hypot(report.last.p[0]-report.after.p[0],report.last.p[2]-report.after.p[2]);
  report.motion=Math.hypot(report.forward.p[0]-report.start.p[0],report.forward.p[2]-report.start.p[2]);
  report.inputPass=report.motion>.2&&report.after.speed<.08&&report.last.speed<.08&&report.drift<.06;
  report.capturePass=Object.values(report.screenshots).every(s=>s==='ok');
  report.pass=report.inputPass&&report.capturePass;
  report.phase='complete';
  if(!report.inputPass)throw Error('Movimento fantasma: tecla persistente ou estado não validado');
  if(!report.capturePass)throw Error('QA de input concluído, mas captura visual falhou; veja report.json');
 }catch(e){
  failed=e;report.errors.push('test: '+e.message);
 }finally{
  if(held&&page){try{await page.keyboard.up('w')}catch(e){report.errors.push('key release: '+e.message)}}
  if(browser){try{await browser.close()}catch(e){report.errors.push('browser close: '+e.message)}}
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));
 }
 if(failed)throw failed;
})().catch(e=>{console.error(e);process.exitCode=1});
