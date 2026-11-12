'use strict';
const { chromium } = require('playwright');
const { mkdirSync, writeFileSync } = require('node:fs');
const path=require('node:path');
(async()=>{
 const dir=path.resolve('visual-lab-results/hud-shield');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const results=[];
 try{
  for (const [name,viewport] of [['pc',{width:1365,height:768}],['android',{width:844,height:390}]]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1,isMobile:name==='android',hasTouch:name==='android'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('#actions #shield').waitFor({state:'attached',timeout:15000});
   await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:90000});
   await page.waitForTimeout(1500);
   const checks=await page.evaluate(()=>{
    const actions=document.querySelector('#actions'),ids=Array.from(actions.querySelectorAll('button')).map(b=>b.id);
    const shield=document.querySelector('#actions #shield');
    const bounds=shield.getBoundingClientRect();
    return {ids,shieldCount:document.querySelectorAll('#actions #shield').length,defCount:document.querySelectorAll('#actions #defend').length,shieldLabel:shield?.textContent?.trim(),shieldKey:shield?.dataset.key,visible:!!(bounds.width&&bounds.height),rect:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}};
   });
   await page.screenshot({path:path.join(dir,'hud-'+name+'.png'),fullPage:false});
   const ok=checks.defCount===0&&checks.shieldCount===1&&checks.ids.indexOf('shield')===checks.ids.indexOf('attack')+1&&checks.ids.indexOf('jump')===checks.ids.indexOf('shield')+1&&checks.shieldKey==='G'&&checks.visible;
   results.push({name,ok,checks,errors});
   await page.close();
  }
 }finally{await browser.close();}
 writeFileSync(path.join(dir,'report.json'),JSON.stringify(results,null,2));
 if(results.some(r=>!r.ok)){console.error(JSON.stringify(results,null,2));process.exitCode=1;}else console.log('HUD PC e Android: posição ESCUDO e ausência DEF confirmadas');
})().catch(e=>{console.error(e);process.exitCode=1});
