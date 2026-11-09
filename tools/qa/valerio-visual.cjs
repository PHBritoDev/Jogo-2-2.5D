"use strict";
// Agent de inspeção visual real do campo de Valério. Isolado do combate/Claude.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve('valerio-qa-results');fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={reference:'1000364204.mp4 (provided by creator, not available in CI)',shots:[],errors:[],render:null,status:'unverified'};
try {
 const context=await browser.newContext({viewport:{width:900,height:540},deviceScaleFactor:1});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push('page: '+e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push('console: '+m.text().slice(0,400))});
 await page.goto('http://127.0.0.1:4181/mundo-3d-prototype.html?testeDimensao=bishop1&debug3d=1&valerio=qa',{waitUntil:'domcontentloaded',timeout:45000});
 const result=await page.waitForFunction(()=>{
   const load=document.getElementById('loading')?.textContent||'';
   if(/Falha ao montar o mundo 3D/i.test(load))return {failed:load.slice(0,400)};
   if(typeof window.SevenSinsDebug3D?.dimState==='function')return {ready:true};
   return null;
 },null,{timeout:110000}).then(x=>x.jsonValue());
 if(result.failed)throw new Error(result.failed);
 await page.waitForTimeout(5000);
 report.state=await page.evaluate(()=>({dimensions:window.SevenSinsDebug3D.dimState(),render:window.SevenSinsDebug3D.rinfo?.()}));
 const poses=[{id:'entrada',camera:[400, -1983, 13],target:[400,-1997,-28]},
              {id:'campo',camera:[400,-1988,-5],target:[400,-1999,-80]},
              {id:'horizonte',camera:[412,-1981,20],target:[400,-1998,-115]}];
 for(const pose of poses) {
   try {await page.evaluate(({camera,target})=>{const api=window.SevenSinsDebug3D;api.freeRoam?.();api.fly?.(camera,target)},pose);}catch(e){report.errors.push('cam '+pose.id+': '+e.message)}
   await page.waitForTimeout(1700);
   const filename='valerio-'+pose.id+'.png';
   await page.screenshot({path:path.join(out,filename),timeout:25000});
   report.shots.push(filename);
 }
 report.status='captured';report.render=report.state.render;
 if(report.errors.some(x=>/SyntaxError|WebGLProgram|Shader Error|Failed to fetch dynamically imported/i.test(x)))throw Error('WebGL/module errors');
 await context.close();
}catch(e){report.status='failed';report.failure=String(e.message||e);process.exitCode=1}
finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close()}
})();