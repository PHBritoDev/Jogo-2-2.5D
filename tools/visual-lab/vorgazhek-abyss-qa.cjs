'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','vorgazhek-abyss');fs.mkdirSync(out,{recursive:true});
async function main(){
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const report={ok:false,errors:[],screenshots:[],notes:'WebGL via SwiftShader; not Android FPS',metrics:[]};
 try{
  const cx=await b.newContext({viewport:{width:960,height:540},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'video')}});
  const localThree=path.join(path.dirname(require.resolve('three')),'three.module.js');
  await cx.route('https://esm.sh/three@0.160.0',route=>route.fulfill({path:localThree,contentType:'text/javascript'}));
  const page=await cx.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(base+'/tools/visual-lab/vorgazhek-abyss-preview.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.ready,null,{timeout:60000});
  async function shot(name,angle,t){const result=await page.evaluate(({angle,t})=>{const q=window.abyssQA;q.camera(angle);return q.frame(t);},{angle,t});report.metrics.push({name,...result});
   const screenshot=await page.screenshot({path:path.join(out,name+'.png')});assert.ok(screenshot.length>10000,'empty capture: '+name);report.screenshots.push(name+'.png');}
  await shot('01-arena-aberta','wide',2000);await shot('02-observadores-proximos','close',5000);await shot('03-lateral','side',8500);await shot('04-aparicoes-alternadas','wide',24000);
  await page.setViewportSize({width:393,height:852});await shot('05-retrato-mobile','wide',42000);
  const data=await page.evaluate(()=>({watchers:abyssQA.arena.refs.vorgazhekAbyss.watchers,geometry:abyssQA.renderer.info.memory.geometries}));
  report.scene=data;assert.equal(data.watchers,11);assert.ok(data.geometry>0);
  // Memory disposal: capture before/after, no duplicate live scene after exit.
  report.disposal=await page.evaluate(()=>{const q=abyssQA;const before={...q.renderer.info.memory};q.rebuild();q.renderer.render(q.scene,q.cam);return {before,after:{...q.renderer.info.memory}};});
  assert.ok(report.disposal.after.geometries<report.disposal.before.geometries);
  assert.deepEqual(report.errors,[]);report.ok=true;
  await cx.close();
 }finally{fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');await b.close();}
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
