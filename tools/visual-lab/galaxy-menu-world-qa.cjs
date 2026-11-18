'use strict';
// Integration: the production menu releases the actual world gate (no freeRoam bypass).
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.GALAXY_QA_OUTPUT||'visual-lab-results/galaxy-menu-three');
const base=process.env.GALAXY_QA_BASE_URL||'http://127.0.0.1:4173';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:852,height:393}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('seven-sins-3d-prologo-ceu','1');
  localStorage.setItem('seven-sins-3d-graphics','low');
  localStorage.setItem('sevenSins3DCampaignV6',JSON.stringify({version:6,act1Rev:2,questStep:1,coins:47,awakeningSeen:true,playerName:'Auditor',actCardSeen:true}));
 });
 try{
  await page.goto(base+'/mundo-3d-prototype.html?debug3d=1&galaxias=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#galaxy-screen',{timeout:120000});
  await page.waitForFunction(()=>{const b=document.querySelector('.gx-enter');return b&&!b.disabled;},null,{timeout:180000});
  assert.equal(await page.evaluate(()=>SevenSinsDebug3D.state().dim.gate),true);
  await page.locator('.gx-enter').click();
  await page.waitForFunction(()=>!document.querySelector('#galaxy-screen')&&window.SevenSinsDebug3D?.state().dim.gate===false,null,{timeout:30000});
  await page.waitForFunction(()=>SevenSinsDebug3D.state().calls>0,null,{timeout:60000});
  const state=await page.evaluate(()=>SevenSinsDebug3D.state());
  assert.equal(state.coins,47);assert.equal(state.quest,1);assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(output,'world-after-enter.png')});
  fs.writeFileSync(path.join(output,'world-report.json'),JSON.stringify({state,errors,passed:true},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(output,'world-failure.txt'),e.stack||String(e));process.exitCode=1;});
