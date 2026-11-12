'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve('work/npc-meshy-qa');fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={models:[],errors:[],status:'pending'};
 try{
  const page=await browser.newPage({viewport:{width:1000,height:740},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/npc-visual-qa.html',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>window.qaReady===true,{timeout:60000});
  for(const role of ['vendorMan','vendorWoman','elder','downMan','downWoman','sitting','walking','boy','girl']){
   const data=await page.evaluate(r=>window.mountNpc(r),role);
   await page.waitForTimeout(350);
   await page.screenshot({path:path.join(dir,role+'.png')});
   report.models.push(data);
   const maxDim=Math.max(...data.size),minDim=Math.min(...data.size);
   if(maxDim>3.0||maxDim<.35||data.center[1]>2.4||data.center[1]<-.4||data.min[1]<-.5)report.errors.push('Dimensoes invalidas '+role+': '+JSON.stringify(data));
   if((role==='boy'||role==='girl')&&data.size[1]>1.45)report.errors.push('Crianca maior que gaiola: '+role);
  }
  report.status=report.errors.length?'failed':'passed';
  if(report.errors.length)process.exitCode=1;
 }catch(e){report.status='failed';report.errors.push(String(e));process.exitCode=1;}finally{
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));await browser.close();
  console.log(JSON.stringify(report));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
