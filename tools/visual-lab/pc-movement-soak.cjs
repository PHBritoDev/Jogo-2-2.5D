const { chromium }=require('playwright');
const assert=require('node:assert/strict'), fs=require('fs');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 await page.addInitScript(()=>{localStorage.setItem('seven-sins-3d-prologo-ceu','1');localStorage.setItem('seven-sins-3d-graphics','low');localStorage.setItem('sevenSins3DCampaignV6',JSON.stringify({version:6,act1Rev:2,questStep:1,coins:47,awakeningSeen:true,playerName:'QA',actCardSeen:true}));});
 await page.goto(process.env.PC_URL||'http://localhost:4202/index.html?debug3d=1',{waitUntil:'domcontentloaded'});
 const frame=await page.locator('iframe').elementHandle().then(h=>h.contentFrame());
 await frame.waitForFunction(()=>window.SevenSinsDebug3D?.state().calls>0,null,{timeout:180000});
 await frame.evaluate(()=>window.focus());
 const state=()=>frame.evaluate(()=>{const {x,z,hp}=SevenSinsDebug3D.state();return {x,z,hp};});
 const before=await state(), start=Date.now(),samples=[];
 for(let i=0;Date.now()-start<600000;i++){
  const k=['w','d','s','a'][i%4];await page.keyboard.down(k);await page.waitForTimeout(600);await page.keyboard.up(k);
  await page.keyboard.press(['Space','f','e','j'][i%4]);
  if(i%8===0){await page.keyboard.press('i');await page.keyboard.press('i');samples.push(await state());}
  await page.waitForTimeout(1500);
 }
 assert.ok(samples.some(s=>Math.hypot(s.x-before.x,s.z-before.z)>.05),'player moved');
 fs.writeFileSync('docs/qa/pc-movement-soak.json',JSON.stringify({elapsedMs:Date.now()-start,before,samples},null,2));
 await page.screenshot({path:'docs/qa/pc-movement-soak.png',timeout:120000});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
