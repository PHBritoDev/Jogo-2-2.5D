'use strict';
const { chromium }=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const dir=path.resolve('visual-lab-results/dash-button');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 const results=[];
 try{
  for(const p of [{name:'desktop',width:1365,height:768,mobile:false},{name:'mobile',width:844,height:390,mobile:true}]){
   const context=await browser.newContext({viewport:{width:p.width,height:p.height},deviceScaleFactor:1,isMobile:p.mobile,hasTouch:p.mobile});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>document.getElementById('loading')?.classList.contains('hidden')&&window.SevenSinsDebug3D?.combat315,null,{timeout:120000});
   const setup=await page.evaluate(()=>{
     const D=window.SevenSinsDebug3D;D.freeRoam();D.combatStep(2,{fps:30,draw:false});
     const b=document.getElementById('dash'),r=b.getBoundingClientRect();
     const x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);
     return {x,y,enabled:!b.disabled,visible:r.width>0&&r.height>0,atPoint:top?.id||top?.closest?.('button')?.id||null,before:D.combat315().mob.dashLeft,prior:D.heroState().p};
   });
   await page.screenshot({path:path.join(dir,'before-'+p.name+'.png')});
   if(p.mobile)await page.touchscreen.tap(setup.x,setup.y);
   else await page.mouse.click(setup.x,setup.y);
   const after=await page.evaluate(()=>({dashLeft:window.SevenSinsDebug3D.combat315().mob.dashLeft,pos:window.SevenSinsDebug3D.heroState().p}));
   await page.screenshot({path:path.join(dir,'after-'+p.name+'.png')});
   const pass=setup.enabled&&setup.visible&&setup.atPoint==='dash'&&setup.before<.03&&after.dashLeft>.35;
   results.push({profile:p.name,pass,setup,after,errors});
   await context.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(results,null,2));
 if(results.some(r=>!r.pass)){console.error('DASH real não validado',JSON.stringify(results,null,2));process.exitCode=1;}else console.log('DASH real validado PC e mobile');
})().catch(e=>{console.error(e);process.exitCode=1});
