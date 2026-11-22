'use strict';
/** QA da integração Mod349 — entra na dimensão REAL, atravessa as três formas
 * e força a ultimate por meio do debug3d. Não altera save nem gameplay normal. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4176';
const out=path.resolve(process.env.VISUAL_OUTPUT||'work/evidence','ganancia-atomic-campaign');
fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={ok:false,errors:[],network:[],phases:[],shots:[],renderer:'Chromium SwiftShader: não é FPS Android'};
 let context;
 try{
  context=await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'videos')}});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error'&&/webgl|shader|compile|invalid operation/i.test(e.text()))report.errors.push(e.text())});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.network.push([r.status(),r.url()])});
  await page.goto(base+'/mundo-3d-prototype.html?testeDimensao=greed&debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.SevenSinsDebug3D,null,{timeout:180000});
  await page.waitForFunction(()=>SevenSinsDebug3D.dimState()?.battle?.key==='greed',null,{timeout:180000});
  await page.waitForFunction(()=>{
   const d=SevenSinsDebug3D,s=d.dimState();if(s?.vs)d.vsGo();return d.dimState()?.battle?.active;
  },null,{timeout:180000});
  await page.evaluate(()=>{SevenSinsDebug3D.god();SevenSinsDebug3D.speed(1);});
  await page.waitForFunction(()=>SevenSinsDebug3D.gk()?.phase===1,null,{timeout:180000});
  report.phases.push({name:'I',state:await page.evaluate(()=>SevenSinsDebug3D.gk())});
  await page.evaluate(()=>SevenSinsDebug3D.gk('kill'));
  await page.waitForFunction(()=>SevenSinsDebug3D.gk()?.phase===2,null,{timeout:180000});
  report.phases.push({name:'II',state:await page.evaluate(()=>SevenSinsDebug3D.gk())});
  await page.evaluate(()=>SevenSinsDebug3D.gk('kill'));
  await page.waitForFunction(()=>SevenSinsDebug3D.gk()?.phase===3&&!String(SevenSinsDebug3D.gk()?.act).startsWith('gkPhase'),null,{timeout:180000});
  report.phases.push({name:'III',state:await page.evaluate(()=>SevenSinsDebug3D.gk())});
  const armed=await page.evaluate(()=>SevenSinsDebug3D.gk('usura'));
  assert.equal(armed?.phase,3,'ultimate armada na fase III');
  async function capture(phase){
   await page.waitForFunction(p=>SevenSinsDebug3D.atomicState()?.phase===p,phase,{timeout:90000});
   const state=await page.evaluate(()=>({atomic:SevenSinsDebug3D.atomicState(),gk:SevenSinsDebug3D.gk(),render:SevenSinsDebug3D.rinfo()}));
   report.phases.push({name:phase,state});const name=String(report.shots.length+1).padStart(2,'0')+'-'+phase+'.png';
   await page.screenshot({path:path.join(out,name),timeout:60000});report.shots.push(name);
  }
  await capture('announce');await capture('charge');await capture('escape');await capture('detonate');await capture('aftermath');
  await page.waitForFunction(()=>SevenSinsDebug3D.atomicState()?.phase==='idle',null,{timeout:90000});
  assert.deepEqual(report.errors,[],'sem erros WebGL/JS');
  report.ok=true;
 }finally{
  if(context)await context.close();
  fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
 console.log(JSON.stringify({ok:report.ok,phases:report.phases.map(x=>x.name),shots:report.shots,errors:report.errors},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
