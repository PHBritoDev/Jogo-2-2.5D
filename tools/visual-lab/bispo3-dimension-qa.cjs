'use strict';
/** Real WebGL evidence; preview imports the production arena builder, no visual mocks. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','bispo3-dimension');fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const report={renderer:'Chromium / SwiftShader — not Android FPS',screenshots:[],errors:[],quality:{},memory:[],ok:false};
 try{
  const context=await browser.newContext({viewport:{width:768,height:1152},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'video'),size:{width:768,height:1152}}});
  // The same pinned Three r160 as production, served locally for reproducible CI.
  await context.route('https://esm.sh/three@0.160.0',route=>route.fulfill({path:path.join(path.dirname(require.resolve('three')),'three.module.js'),contentType:'text/javascript'}));
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|INVALID|compile/i.test(m.text()))report.errors.push(m.text());});
  await page.goto(base+'/tools/visual-lab/bispo3-dimension-preview.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.ready);await page.evaluate(()=>{mushroomQA.stop();document.body.classList.add('capture');});
  async function shot(name){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>{const q=mushroomQA;q.renderer.render(q.scene,q.camera);});const bytes=await page.screenshot({path:path.join(out,name+'.png')});assert.ok(bytes.length>20000,'blank capture: '+name);report.screenshots.push(name+'.png');}
  await page.evaluate(()=>{mushroomQA.wide();mushroomQA.frame(2000);});await shot('01-corredor');
  await page.setViewportSize({width:1000,height:700});
  const blink=await page.evaluate(()=>{const q=mushroomQA;q.close();const e=q.arena.refs.mushrooms.eyes[q.eyeIndex];q.player.copy(q.camera.position);const period=3.3+e.seed*4.7;return {start:period*6-e.seed*17,seed:e.seed,eye:q.eyeIndex};});
  report.blink=blink;
  for(const [name,offset] of [['02-olhos-abertos',-.06],['03-piscar-meio',.05],['04-piscar-fechado',.10],['05-piscar-reaberto',.29]]){
    await page.evaluate(t=>mushroomQA.frame(t*1000),blink.start+offset);await shot(name);
  }
  assert.notDeepEqual(fs.readFileSync(path.join(out,'02-olhos-abertos.png')),fs.readFileSync(path.join(out,'04-piscar-fechado.png')),'blink must change rendered pixels');
  // Same time, camera and opening. Only the target position differs; settle the
  // real exponential filter through 45 rendered samples before each capture.
  for(const [name,side] of [['06-olhar-esquerda',-1],['07-olhar-direita',1]]){
    const target=await page.evaluate(({side,time})=>{const q=mushroomQA;q.gaze(side);for(let i=0;i<45;i++)q.frame((time+i/30)*1000);return q.arena.refs.mushrooms.uniforms.uPlayer.value.toArray();},{side,time:blink.start+1});
    report[name]={target};await shot(name);
  }
  assert.notDeepEqual(fs.readFileSync(path.join(out,'06-olhar-esquerda.png')),fs.readFileSync(path.join(out,'07-olhar-direita.png')),'target must change eye pixels');
  await page.evaluate(()=>mushroomQA.wide());
  for(const quality of ['low','medium','high']){
    report.quality[quality]=await page.evaluate(quality=>{const q=mushroomQA;q.quality(quality);const render=q.frame(7000);return {render,memory:{...q.renderer.info.memory},stats:q.arena.refs.mushrooms.stats()};},quality);await shot('08-qualidade-'+quality);
  }
  // Close inspection is essential: a cheaper cap must not cut into a lid.
  for(const quality of ['low','medium']){
    await page.evaluate(q=>{mushroomQA.close();mushroomQA.quality(q);mushroomQA.frame(2000);},quality);
    await shot('09-close-'+quality);
  }
  assert.ok(report.quality.low.render.triangles<report.quality.medium.render.triangles);assert.ok(report.quality.medium.render.triangles<report.quality.high.render.triangles);
  assert.ok(report.quality.high.render.calls<=5);
  for(let i=0;i<3;i++)report.memory.push(await page.evaluate(()=>{const q=mushroomQA;const old=q.arena;let disposed=0;old.group.traverse(o=>{o.geometry?.addEventListener('dispose',()=>disposed++);});q.rebuild();q.frame(8000);return {disposed,oldDisposed:old.refs.mushrooms.stats().disposed,memory:{...q.renderer.info.memory}};}));
  assert.ok(report.memory.every(x=>x.oldDisposed&&x.disposed>=5));assert.equal(report.memory[1].memory.geometries,report.memory[2].memory.geometries);
  assert.deepEqual(report.errors,[]);report.ok=true;
  await context.close();
 }finally{fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
