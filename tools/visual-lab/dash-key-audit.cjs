'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const dir=path.resolve('visual-lab-results/dash-key');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:1365,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.getElementById('loading')?.classList.contains('hidden')&&window.SevenSinsDebug3D?.combat315,null,{timeout:120000});
  const before=await page.evaluate(()=>{
   const D=window.SevenSinsDebug3D;D.freeRoam();D.combatStep(2,{fps:30,draw:false});
   return {content:getComputedStyle(document.querySelector('#dash .btn-label'),'::after').content,left:D.combat315().mob.dashLeft};
  });
  await page.screenshot({path:path.join(dir,'dash-key-before.png')});
  await page.keyboard.press('f');
  const after=await page.evaluate(()=>window.SevenSinsDebug3D.combat315().mob.dashLeft);
  await page.screenshot({path:path.join(dir,'dash-key-after.png')});
  const ok=before.content.includes('F')&&!before.content.includes('⇧')&&before.left<.03&&after>.35;
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({ok,before,after,errors},null,2));
  if(!ok)throw Error('Atalho visual ou tecla F do DASH não correspondem');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
