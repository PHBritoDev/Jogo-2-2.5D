"use strict";
// Real browser evidence, never a screenshot of the supplied reference.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(process.env.GALAXY_QA_OUTPUT||'visual-lab-results/galaxy-menu-three');
const base=process.env.GALAXY_QA_BASE_URL||'http://127.0.0.1:4173';
fs.mkdirSync(output,{recursive:true});
// Capture the last genuinely rendered frame without racing the software GPU's next frame.
// This pauses only the menu through its existing visibility handler; it does not redraw or edit pixels.
async function capture(page,file){
 await page.evaluate(()=>{window.__captureHidden=Object.getOwnPropertyDescriptor(document,'hidden');Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 try{await page.screenshot({path:file,animations:'disabled',timeout:45000});}
 finally{await page.evaluate(()=>{const saved=window.__captureHidden;if(saved)Object.defineProperty(document,'hidden',saved);else delete document.hidden;delete window.__captureHidden;document.dispatchEvent(new Event('visibilitychange'));});}
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const reports=[];
 try{
  for(const view of [{name:'desktop-1536x864',width:1536,height:864},{name:'mobile-emulated-852x393',width:852,height:393},{name:'narrow-667x375',width:667,height:375,reduced:true}]){
   const context=await browser.newContext({viewport:{width:view.width,height:view.height},hasTouch:view.width<900,isMobile:view.width<900,deviceScaleFactor:1,reducedMotion:view.reduced?'reduce':'no-preference'});
   const page=await context.newPage(),errors=[],bad=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url?.endsWith('favicon.ico')){errors.push(m.text());console.error(m.text());}});page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))bad.push([r.status(),r.url()]);});
   const start=Date.now();await page.goto(base+'/tools/visual-lab/galaxy-menu-preview.html');
   await page.waitForFunction(()=>document.querySelector('#galaxy-screen')?.dataset.gxModelsReady==='true',null,{timeout:90000});
   const loadMs=Date.now()-start;
   // Regression: fallback feathers must have a material and finite instance transforms;
   // central suspension must begin on masonry, not inside the broken arch's gap.
   if(view.width===1536){
    const contracts=await page.evaluate(async()=>{
     const T=await import('three'),{addCinematicStage}=await import('../../galaxies-cinematic-stage.js');
     const parent=new T.Group(),stage=addCinematicStage(parent,1536,864);
     const feathers=stage.group.getObjectByName('menu-wings-fallback').children[0];
     const validFeathers=feathers.count===94&&!!feathers.material?.isMaterial&&Array.from(feathers.instanceMatrix.array).every(Number.isFinite);
     stage.alignChains([{position:new T.Vector3(0,0,0),userData:{screenRadius:150}}],1536,864);
     const chain=parent.children.find(o=>o.isInstancedMesh),left=new T.Matrix4(),right=new T.Matrix4();chain.getMatrixAt(0,left);chain.getMatrixAt(28,right);
     const anchored=Math.abs(left.elements[12])>=1536*.0649&&Math.abs(right.elements[12])>=1536*.0649;
     const gs=new Set(),ms=new Set(),ts=new Set();parent.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material?.isMaterial)ms.add(o.material);});
     ms.forEach(m=>{Object.values(m).forEach(t=>{if(t?.isTexture)ts.add(t);});m.dispose();});gs.forEach(g=>g.dispose());ts.forEach(t=>t.dispose());
     return {validFeathers,anchored};
    });
    assert.deepEqual(contracts,{validFeathers:true,anchored:true});
   }

   const readyAt=await page.evaluate(()=>performance.now());
   await page.waitForFunction(t=>Number(document.querySelector('#galaxy-screen')?.dataset.gxTelemetryAt)>t,readyAt,{timeout:15000});
   const info=await page.evaluate(()=>{const root=document.querySelector('#galaxy-screen'),c=root.querySelector('canvas'),gl=c.getContext('webgl2');return {models:{guardian:root.dataset.gxGuardianModel,wings:root.dataset.gxWingsModel,lust:root.dataset.gxLustModel,hero:root.dataset.gxHeroModel,storm:root.dataset.gxStormModel,rock:root.dataset.gxScannedRock,fort:root.dataset.gxScannedFort,environment:root.dataset.gxEnvironment},gpu:{calls:+root.dataset.gxDrawCalls,triangles:+root.dataset.gxTriangles,textures:+root.dataset.gxTextures},canvasCount:root.querySelectorAll('canvas').length,glError:gl.getError()};});
   assert.equal(info.canvasCount,1);assert.equal(info.glError,0);assert.ok(Object.values(info.models).every(Boolean),'all models loaded');
   assert.equal(await page.locator('.gx-nav button').count(),5);assert.equal(await page.locator('.gx-nav button:disabled').count(),3);
   // One before/after image per required size; narrow is functional QA only.
   if(!view.reduced)await capture(page,path.join(output,view.name+'.png'));
   const planets=[];
   for(let id=1;id<=7;id++){
    const orb=page.locator(`.gx-orb[data-id="${id}"]`);
    if(view.width<900)await orb.tap();else{await orb.focus();await page.keyboard.press('Enter');}
    assert.equal(await orb.getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.gx-orb.sel').getAttribute('data-id'),String(id));
    if(id!==1){assert.equal(await page.locator('.gx-enter').count(),0);assert.ok(await page.locator('.gx-access').isVisible());}
    const bounds=await orb.boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44,'touch target');
    planets.push({id,selected:true,locked:id!==1});
   }
   await page.locator('.gx-nav-settings').click();assert.equal(await page.evaluate(()=>window.menuQA.settings),1);
   await page.locator('.gx-orb[data-id="1"]').click();
   await page.evaluate(()=>window.menuQA.canEnter=false);
   // Re-select to update readiness immediately, then poll while loading.
   await page.locator('.gx-orb[data-id="1"]').click();assert.ok(await page.locator('.gx-enter').isDisabled());
   await page.evaluate(()=>window.menuQA.canEnter=true);await page.waitForFunction(()=>!document.querySelector('.gx-enter').disabled);
   // Exercise the visibility handler: a hidden menu must schedule no frames.
   await page.evaluate(()=>{window.__originalRAF=window.requestAnimationFrame;window.__rafCalls=0;window.requestAnimationFrame=cb=>{window.__rafCalls++;return window.__originalRAF(cb);};Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
   await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__rafCalls),0);
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));window.requestAnimationFrame=window.__originalRAF;});
   // Lose/restore actual WebGL context. SVG fallback retains all controls.
   await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2');window.__loss=gl.getExtension('WEBGL_lose_context');window.__loss.loseContext();});
   await page.waitForFunction(()=>!document.querySelector('#galaxy-screen').classList.contains('gx-three-on'));
   assert.ok(await page.locator('.gx-enter').isVisible());
   await page.evaluate(()=>window.__loss.restoreContext());
   await page.waitForFunction(()=>document.querySelector('#galaxy-screen').classList.contains('gx-three-on'));
   await page.locator('.gx-enter').click();await page.waitForFunction(()=>window.menuQA.opened===1);
   assert.equal(await page.locator('#galaxy-screen,canvas.gx-three-canvas').count(),0);
   // Dynamic coins/progress and close-before-GLB-load lifecycle.
   await page.evaluate(()=>window.menuQA.mount({coins:1234,progress:{questStep:4,bishopsDefeated:2}}));
   assert.equal((await page.locator('.gx-wallet b').innerText()).replace(/\D/g,''),'1234');
   assert.equal(await page.locator('.gx-bar em').innerText(),'31%');
   await page.evaluate(()=>window.menuQA.close());await page.waitForTimeout(100);
   assert.equal(await page.locator('#galaxy-screen').count(),0);
   reports.push({view,loadMs,info,planets,settings:true,readiness:true,contextRestored:true,callbackAndTeardown:true,dynamicValues:true,errors,bad});
   await context.close();assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  }
  const fallback=await browser.newContext({viewport:{width:1536,height:864}}),page=await fallback.newPage();
  await page.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:native.call(this,type,...args);};});
  await page.goto(base+'/tools/visual-lab/galaxy-menu-preview.html');
  await page.waitForSelector('.gx-enter');await page.waitForTimeout(500);
  assert.equal(await page.locator('#galaxy-screen.gx-three-on').count(),0);
  await page.locator('.gx-orb[data-id="2"]').click();assert.ok(await page.locator('.gx-access').isVisible());
  await page.locator('.gx-orb[data-id="1"]').click();
  await capture(page,path.join(output,'fallback-webgl-unavailable.png'));
  await page.locator('.gx-enter').click();await page.waitForFunction(()=>window.menuQA.opened===1);
  await fallback.close();reports.push({view:{name:'WebGL unavailable'},fallback:true,entered:true});
 }finally{await browser.close();}
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({environment:'Chromium/SwiftShader; mobile viewport emulation, not physical Android',reports},null,2));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(output,'failure.txt'),e.stack||String(e));process.exitCode=1;});
