'use strict';
/** Enter the actual bishop 2 game dimension, capture video and assert navigation. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','vorgazhek-runtime');fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={ok:false,errors:[],screenshots:[],networkFailures:[],state:null,navigation:null,renderer:'Chromium SwiftShader, not mobile FPS'};
 try{
  const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'videos')}});
  const page=await context.newPage();
  page.on('pageerror',err=>report.errors.push(err.message));
  page.on('console',msg=>{if(msg.type()==='error'&&/shader|WebGL|compile|INVALID/i.test(msg.text()))report.errors.push(msg.text());});
  page.on('response',res=>{if(res.status()>=400&&!res.url().endsWith('favicon.ico'))report.networkFailures.push({status:res.status(),url:res.url()});});
  await page.goto(base+'/mundo-3d-prototype.html?testeDimensao=bishop2&debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.SevenSinsDebug3D,null,{timeout:180000});
  await page.waitForFunction(()=>{const d=window.SevenSinsDebug3D;const s=d?.dimState?.();if(s?.vs)d.vsGo();const n=d?.dimState?.();return !!(n?.battle?.active&&!n.vs&&n.voidMode);},null,{timeout:180000});
  await page.evaluate(()=>{SevenSinsDebug3D.god();SevenSinsDebug3D.speed(1);});
  // The VS / boss reveal briefly holds an overhead camera; inspect actual play after it releases.
  await page.waitForTimeout(8000);
  await page.evaluate(()=>{SevenSinsDebug3D.fly(null);SevenSinsDebug3D.view(0,.1,8.5);});
  await page.waitForTimeout(1800);
  async function shot(label){await page.screenshot({path:path.join(out,label+'.png'),timeout:60000});report.screenshots.push(label+'.png');}
  report.state=await page.evaluate(()=>({dimension:SevenSinsDebug3D.dimState(),render:SevenSinsDebug3D.rinfo(),state:SevenSinsDebug3D.state()}));
  assert.equal(report.state.dimension.battle.key,'bishop2','real game entered bishop2');
  await shot('01-batalha-real-paisagem');
  report.navigation=await page.evaluate(()=>({centerBlocked:SevenSinsDebug3D.collisionAt(800,0),innerBlocked:SevenSinsDebug3D.collisionAt(862,0),outsideBlocked:SevenSinsDebug3D.collisionAt(893,0)}));
  assert.equal(report.navigation.centerBlocked,false);assert.equal(report.navigation.innerBlocked,false);assert.equal(report.navigation.outsideBlocked,true);
  await page.evaluate(()=>{SevenSinsDebug3D.fly(null);SevenSinsDebug3D.view(.65,.08,8.5);});await page.waitForTimeout(1500);await shot('02-angulo-lateral');
  await page.setViewportSize({width:393,height:852});await page.waitForTimeout(1000);await shot('03-retrato-celular');
  assert.deepEqual(report.errors,[]);report.ok=true;
  await context.close();
 }finally{fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
 console.log(JSON.stringify({ok:report.ok,errors:report.errors,shots:report.screenshots,navigation:report.navigation},null,2));
}
main().catch(err=>{console.error(err);process.exitCode=1});
