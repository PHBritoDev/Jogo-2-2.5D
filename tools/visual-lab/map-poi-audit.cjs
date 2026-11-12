'use strict';
const { chromium }=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const output=path.resolve('visual-lab-results/map-pois');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const results=[];
 try{
  for(const [name,viewport] of [['desktop',{width:1365,height:768}],['mobile',{width:844,height:390}]]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1,isMobile:name==='mobile',hasTouch:name==='mobile'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:120000});
   const actual=await page.evaluate(async()=>{
    const mod=await import('./map3d.js');const state=mod.createMapState();
    const coliseu=mod.MAP_POIS.find(p=>p.name==='Coliseu da Ascensão');
    const arena=mod.MAP_POIS.find(p=>p.name==='Arena do Vale');
    const before=mod.discoverPois(state,coliseu.x,coliseu.z).map(p=>p.id);
    const after=mod.discoverPois(state,arena.x,arena.z).map(p=>p.id);
    const restored=mod.createMapState(mod.serializeMapState(state));
    mod.revealAround(state,coliseu.x,coliseu.z,45);
    mod.revealAround(state,arena.x,arena.z,30);
    const saved=JSON.stringify(mod.serializeMapState(state));
    localStorage.setItem(mod.MAP_STORE_KEY,saved);
    window.SevenSinsDebug3D?.freeRoam?.();
    return {coliseu,arena,before,after,restored:[...restored.pois],saved,unique:new Set(mod.MAP_POIS.map(p=>p.id)).size===mod.MAP_POIS.length};
   });
   const saved=actual.saved;delete actual.saved;
   await page.addInitScript(value=>localStorage.setItem('seven-sins-3d-map-v3',value),saved);
   await page.reload({waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:120000});
   await page.evaluate(()=>{SevenSinsDebug3D.freeRoam();document.getElementById('map-toggle-3d').click();});
   await page.locator('#world-map').waitFor({state:'visible',timeout:10000});
   await page.screenshot({path:path.join(output,'map-'+name+'.png')});
   const ok=actual.unique&&actual.coliseu.id!==actual.arena.id&&actual.before.includes(actual.coliseu.id)&&actual.after.includes(actual.arena.id)&&actual.restored.includes(actual.coliseu.id)&&actual.restored.includes(actual.arena.id);
   results.push({name,ok,actual,errors});
   await page.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));
 if(results.some(r=>!r.ok)){console.error(JSON.stringify(results,null,2));process.exitCode=1;}else console.log('Dois locais independentes no mapa: PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
