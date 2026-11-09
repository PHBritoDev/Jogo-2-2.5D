"use strict";
// Agent de inspeção visual real do campo de Valério. Isolado do combate/Claude.
const {chromium}=require('../visual-lab/node_modules/playwright'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve('valerio-qa-results');fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={reference:'1000364204.mp4 (provided by creator, not available in CI)',shots:[],errors:[],render:null,status:'unverified'};
try {
 const context=await browser.newContext({viewport:{width:900,height:540},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:900,height:540}}});
 const page=await context.newPage();
 let videoFile=null;
 page.on('pageerror',e=>report.errors.push('page: '+e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push('console: '+m.text().slice(0,400))});
 await page.goto((process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173')+'/mundo-3d-prototype.html?testeDimensao=bishop1&debug3d=1&meadowQA=1',{waitUntil:'domcontentloaded',timeout:45000});
 const result=await page.waitForFunction(()=>{
   const load=document.getElementById('loading')?.textContent||'';
   if(/Falha ao montar o mundo 3D/i.test(load))return {failed:load.slice(0,400)};
   if(typeof window.SevenSinsDebug3D?.dimState==='function')return {ready:true};
   return null;
 },null,{timeout:110000}).then(x=>x.jsonValue());
 if(result.failed)throw new Error(result.failed);
 // Enter the real battle: the URL only schedules it and the VS card needs a click.
 let entered=false;
 const deadline=Date.now()+95000;
 while(Date.now()<deadline){
   const state=await page.evaluate(()=>window.SevenSinsDebug3D.dimState());
   if(state?.vs)await page.evaluate(()=>window.SevenSinsDebug3D.vsGo()).catch(e=>report.errors.push('VS: '+e.message));
   if(state?.battle?.active && state.visible && state.profile==='vhazrael'){entered=true;break;}
   await page.waitForTimeout(1500);
 }
 if(!entered)throw Error('The bishop1 test route did not enter the real dimension battle');
 await page.waitForTimeout(1200);
 await page.evaluate(()=>{window.SevenSinsDebug3D.god?.();});
 report.state=await page.evaluate(()=>({dimensions:window.SevenSinsDebug3D.dimState(),render:window.SevenSinsDebug3D.rinfo?.()}));
 if(!/bishop1|vhazrael/i.test(JSON.stringify(report.state.dimensions)))throw Error('Bishop I dimension did not activate; refusing false screenshot validation');
 const poses=[{id:'olhos',camera:[400,-1997.7,18],target:[400,-1997.3,-60]},
              {id:'cinema',camera:[403,-1995.0,12],target:[400,-1998,-100]}];
 for(const pose of poses) {
   if(pose.camera)try {await page.evaluate(({camera,target})=>{const api=window.SevenSinsDebug3D;api.freeRoam?.();api.fly?.(camera,target)},pose);}catch(e){report.errors.push('cam '+pose.id+': '+e.message)}
   await page.waitForTimeout(1700);
   const filename='valerio-'+pose.id+'.png';
   await page.screenshot({path:path.join(out,filename),timeout:90000,animations:'disabled'});
   report.shots.push(filename);
 }
 // Visual evidence for deform/recovery: same camera, real running shaders.
 await page.evaluate(()=>{window.SevenSinsDebug3D.fly?.([400,-1997.5,16],[400,-1999,0]);});
 await page.waitForTimeout(600);
 await page.screenshot({path:path.join(out,'meadow-before-impact.png'),timeout:90000});
 console.log('MEADOW_FRAME_BEFORE='+ (await page.screenshot({type:'jpeg',quality:32})).toString('base64'));
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('golden-meadow-impact',{detail:{x:400,z:0,radius:19}})));
 await page.waitForTimeout(350);
 await page.screenshot({path:path.join(out,'meadow-impact.png'),timeout:90000});
 console.log('MEADOW_FRAME_IMPACT='+ (await page.screenshot({type:'jpeg',quality:32})).toString('base64'));
 await page.waitForTimeout(11100);
 await page.screenshot({path:path.join(out,'meadow-regrown.png'),timeout:90000});
 console.log('MEADOW_FRAME_REGROWN='+ (await page.screenshot({type:'jpeg',quality:32})).toString('base64'));
 report.shots.push('meadow-before-impact.png','meadow-impact.png','meadow-regrown.png');
 // Camera offset removes the boss silhouette, allowing review of sky, hill, and fine vegetation.
 await page.evaluate(()=>window.SevenSinsDebug3D.fly?.([430,-1997.7,28],[452,-1994,-85]));
 await page.waitForTimeout(650);
 await page.screenshot({path:path.join(out,'meadow-landscape.png'),timeout:90000});
 console.log('MEADOW_FRAME_LANDSCAPE='+(await page.screenshot({type:'jpeg',quality:32})).toString('base64'));
 report.shots.push('meadow-landscape.png');
 report.status='captured';report.render=report.state.render;
 if(report.errors.some(x=>/SyntaxError|WebGLProgram|Shader Error|Failed to fetch dynamically imported/i.test(x)))throw Error('WebGL/module errors');
 await context.close();
}catch(e){report.status='failed';report.failure=String(e.message||e);process.exitCode=1}
finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('BISHOP1_QA_REPORT='+JSON.stringify(report));await browser.close()}
})();