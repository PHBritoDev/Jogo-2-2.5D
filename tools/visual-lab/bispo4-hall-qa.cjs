'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','bispo4-hall'),base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4174';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const report={ok:false,errors:[],quality:{},memory:[],renderer:'Chromium / SwiftShader, not Android FPS'};
 try{
  const c=await b.newContext({viewport:{width:1440,height:810},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'video'),size:{width:960,height:540}}});
  await c.route('https://esm.sh/three@0.160.0',r=>r.fulfill({path:path.join(path.dirname(require.resolve('three')),'three.module.js'),contentType:'text/javascript'}));
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await p.goto(base+'/tools/visual-lab/bispo4-hall-preview.html');await p.waitForFunction(()=>window.ready);await p.evaluate(()=>{hallQA.stop();document.body.classList.add('capture');});
  async function shot(name){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>{hallQA.frame(2000);r()}))));const bytes=await p.screenshot({path:path.join(out,name+'.png')});assert.ok(bytes.length>18000,name+' blank');return bytes;}
  await shot('01-corredor-desktop');
  for(const name of ['door','ceiling','floor']){await p.evaluate(n=>hallQA.pose(n),name);await shot('02-'+name);}
  const reflected=await shot('03-reflexo-ligado');await p.evaluate(()=>hallQA.arena.refs.hall.uniforms.uReflection.value=0);const plain=await shot('03-reflexo-desligado');assert.notDeepEqual(reflected,plain);await p.evaluate(()=>hallQA.arena.refs.hall.uniforms.uReflection.value=1);
  await p.evaluate(()=>{hallQA.pose('floor');hallQA.camera.position.x+=8;hallQA.camera.lookAt(0,0,-90)});await shot('04-reflexo-camera-lateral');
  await p.evaluate(()=>hallQA.pose('wide'));
  for(const q of ['low','medium','high']){await p.evaluate(q=>hallQA.quality(q),q);await shot('05-'+q);report.quality[q]=await p.evaluate(()=>({stats:hallQA.arena.refs.hall.stats(),render:{...hallQA.renderer.info.render},memory:{...hallQA.renderer.info.memory}}));}
  assert.ok(report.quality.low.render.triangles<report.quality.high.render.triangles);assert.ok(report.quality.high.render.calls<=6);
  report.cinematicCamera=await p.evaluate(()=>{const q=hallQA,c=q.camera.clone();c.position.x+=9;q.renderer.render(q.scene,c);return {actual:q.arena.refs.hall.uniforms.uHallCamera.value.toArray(),expected:c.position.toArray()};});assert.deepEqual(report.cinematicCamera.actual,report.cinematicCamera.expected);
  await p.setViewportSize({width:393,height:852});await shot('06-corredor-mobile');
  // Real rendering after repeated dispose, including a second idempotent call.
  for(let i=0;i<3;i++)report.memory.push(await p.evaluate(()=>{const q=hallQA,old=q.arena;let frees=0;old.group.traverse(o=>o.geometry?.addEventListener('dispose',()=>frees++));q.rebuild();old.dispose();q.frame(2000);return {frees,old:old.refs.hall.stats(),memory:{...q.renderer.info.memory}};}));
  assert.ok(report.memory.every(m=>m.frees===6&&m.old.disposed));assert.equal(report.memory[0].memory.geometries,report.memory[2].memory.geometries);assert.equal(report.memory[2].memory.textures,0);
  report.frameCpuMs=await p.evaluate(()=>{const values=[];for(let i=0;i<20;i++){const t=performance.now();hallQA.frame(2500+i*16);values.push(performance.now()-t);}values.sort((a,b)=>a-b);return {median:values[10],p95:values[19],note:'CPU submission including shader overhead; not GPU time or device FPS'};});
  report.otherDimensions=await p.evaluate(async()=>{const THREE=await import('https://esm.sh/three@0.160.0'),{buildDimensionArena}=await import('../../dimension-arenas3d.js'),q=hallQA,results=[];q.arena.group.visible=false;for(const theme of ['vault','eyes','mushrooms','root']){const a=buildDimensionArena(THREE,theme,{x:0,y:0,z:0,radius:30});a.group.visible=true;q.scene.add(a.group);a.update(2000,q.camera,852,{quality:'low'});q.renderer.render(q.scene,q.camera);results.push({theme,calls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles});q.scene.remove(a.group);a.dispose();}q.arena.group.visible=true;return results;});assert.ok(report.otherDimensions.every(x=>x.calls>0&&x.triangles>0));
  assert.deepEqual(report.errors,[]);report.ok=true;await c.close();
 }finally{fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');await b.close();}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
