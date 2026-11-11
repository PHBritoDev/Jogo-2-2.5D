'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve('work/child-npc-evidence');fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const report={ok:false,errors:[],network:[]};
 try{
  const page=await browser.newPage({viewport:{width:852,height:480},deviceScaleFactor:1});
  page.on('pageerror',error=>report.errors.push(String(error)));
  page.on('response',r=>{if(r.status()>=400&&/CriancaNpc/.test(r.url()))report.network.push({status:r.status(),url:r.url()});});
  await page.goto('http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.act1==='function',null,{timeout:180000});
  await page.evaluate(()=>SevenSinsDebug3D.act1(1,0));
  await page.waitForFunction(()=>window.SevenSinsChildNpcReport?.loaded===true&&window.SevenSinsVillagerReport!=null,null,{timeout:180000});
  report.child=await page.evaluate(()=>window.SevenSinsChildNpcReport);
  assert.equal(report.child.loaded,true,report.child.error||'child model did not load');
  assert.equal(report.child.source,'CriancaNpc-otimizado.glb');
  assert.equal(report.child.girlSource,'MeninaNpc-otimizado.glb');
  assert.equal(report.child.childrenInVillage,0);
  assert.ok(Array.isArray(report.child.animations));
  assert.ok(Array.isArray(report.child.girlAnimations));
  report.village=await page.evaluate(()=>window.SevenSinsVillagerReport);
  assert.equal(report.village.vendors,3);
  assert.equal(report.village.childrenInVillage,0);
  assert.equal(report.village.residents,4,'todos os quatro adultos devem aparecer');
  report.scene=await page.evaluate(()=>{
    const n=window.SevenSinsChildNpcReport;
    return {npc:n.loaded,render:SevenSinsDebug3D.rinfo()};
  });
  // Auditar personagens, não uma parede próxima ao spawn.
  await page.evaluate(()=>{
    const api=window.SevenSinsDebug3D;api.freeRoam();
    api.fly([-12.2,8,-32],[-12.2,1.6,-44.5]);
  });
  await page.waitForTimeout(900);
  await page.screenshot({path:path.join(dir,'vila-npcs-barracas.png')});
  await page.evaluate(()=>{
    const api=window.SevenSinsDebug3D;api.act1(2,0);api.freeRoam();
    api.fly([66,5,-60],[66,1.1,-70]);
  });
  await page.waitForTimeout(950);
  await page.screenshot({path:path.join(dir,'criancas-gaiolas.png')});
  report.captures=['vila-npcs-barracas.png','criancas-gaiolas.png'];
  assert.equal(report.network.length,0);
  report.ok=true;
 }finally{fs.writeFileSync(path.join(dir,'resultado.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});