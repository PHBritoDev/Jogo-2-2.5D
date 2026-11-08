'use strict';
/** Gameplay regression through the real test dimension and existing debug controls. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','bispo3-runtime');fs.mkdirSync(out,{recursive:true});
async function main(){
 const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={errors:[],assets:[],skills:{},ok:false};
 try{
  const p=await b.newPage({viewport:{width:852,height:480},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|INVALID|compile/i.test(m.text()))report.errors.push(m.text());});p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))report.assets.push({url:r.url(),status:r.status()});});
  await p.goto(base+'/mundo-3d-prototype.html?testeDimensao=bishop3&debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction(()=>window.SevenSinsDebug3D,null,{timeout:180000});
  async function active(){await p.waitForFunction(()=>{const d=SevenSinsDebug3D,s=d.dimState();if(s.vs)d.vsGo();const next=d.dimState();return next.battle?.active&&!next.vs&&next.voidMode&&d.dimensionVisualState()?.visible;},null,{timeout:180000});await p.waitForFunction(()=>!document.querySelector('#portal-veil').classList.contains('on'),null,{timeout:30000});}
  async function shot(name){await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await p.screenshot({path:path.join(out,name+'.png'),timeout:60000});}
  await active();await p.evaluate(()=>{SevenSinsDebug3D.god();document.querySelector('#graphics-profile-3d').value='low';document.querySelector('#graphics-profile-3d').dispatchEvent(new Event('change'));});await p.waitForTimeout(2000);
  report.initial=await p.evaluate(()=>({state:SevenSinsDebug3D.state(),visual:SevenSinsDebug3D.dimensionVisualState(),memory:SevenSinsDebug3D.rinfo()}));
  assert.equal(report.initial.visual.eyes,336);assert.equal(report.initial.visual.quality,'low');
  report.navigation=await p.evaluate(()=>{const d=SevenSinsDebug3D;d.motionQA({x:1200,z:10,enemyDistance:14});const before=d.state();const walk=d.motionStep(1,{z:-1});const attack=d.motionStep(.4,{x:1,z:0,attack:true});return {before,walk,attack,inside:d.collisionAt(1200,0),outside:d.collisionAt(1235,0)};});
  assert.ok(report.navigation.walk.hero[2]<report.navigation.before.z-1);assert.equal(report.navigation.inside,false);assert.equal(report.navigation.outside,true);assert.ok(report.navigation.attack.active||report.navigation.attack.clip);
  await p.evaluate(()=>{const d=SevenSinsDebug3D;d.fly(null);d.view(.4,.12,7);d.speed(1);});await p.waitForTimeout(2500);await shot('01-combate-arena');
  report.quality=[];
  for(const q of ['max','high','low']){await p.evaluate(q=>{const s=document.querySelector('#graphics-profile-3d');s.value=q;s.dispatchEvent(new Event('change'));},q);await p.waitForTimeout(1000);report.quality.push(await p.evaluate(()=>SevenSinsDebug3D.dimensionVisualState()));}
  assert.deepEqual(report.quality.map(x=>x.quality),['high','medium','low']);
  // Request powers, but accept them ONLY after actual runtime phase evidence.
  await p.evaluate(()=>SevenSinsDebug3D.speed(8));
  for(const id of ['s1','s2','sw','ult']){
    const h=await p.waitForFunction(id=>{const d=SevenSinsDebug3D;d.god();d.power();d.kitMove(id);const s=d.dimState();return id==='s1'?(s.hydra?.phase==='charge'?s.hydra:null):id==='s2'?(s.moonFlames?.fired>0?s.moonFlames:null):id==='sw'?(['spin','wave','detonate'].includes(d.dimensionVisualState()?.swordPhase)?d.dimensionVisualState().swordPhase:null):(s.cinematic?.vfx?s.cinematic:null);},id,{timeout:180000,polling:250});
    report.skills[id]=await h.jsonValue();await shot('02-poder-'+id);
    if(id==='ult'){
      const c=await p.waitForFunction(()=>{const s=SevenSinsDebug3D.dimState().cinematic;return s?.occluders===3?s:null;},null,{timeout:90000,polling:100});report.cinematic=await c.jsonValue();assert.equal(report.cinematic.occluders,3);await shot('03-camera-ultimate');
    }
    await p.waitForFunction(()=>{const d=SevenSinsDebug3D,s=d.dimState();return !s.hydra&&!s.moonFlames&&!s.cinematic&&!d.dimensionVisualState()?.swordPhase;},null,{timeout:180000,polling:100});
  }
  report.restored=await p.evaluate(()=>SevenSinsDebug3D.dimensionVisualState());assert.ok(report.restored.architectureVisible.every(Boolean));
  await p.evaluate(()=>{SevenSinsDebug3D.speed(1);const buttons=[...document.querySelectorAll('#dim-test-panel button')];buttons.find(b=>b.textContent.includes('Sair da dimensão')).click();});
  await p.waitForFunction(()=>!SevenSinsDebug3D.dimState().voidMode&&!SevenSinsDebug3D.dimState().battle,null,{timeout:30000});report.exit=await p.evaluate(()=>({visual:SevenSinsDebug3D.dimensionVisualState(),memory:SevenSinsDebug3D.rinfo()}));assert.equal(report.exit.visual,null);
  await p.evaluate(()=>{const buttons=[...document.querySelectorAll('#dim-test-panel button')];buttons.find(b=>b.textContent.includes('Reiniciar luta')).click();});await active();await p.waitForFunction(()=>{const d=SevenSinsDebug3D,y=d.cam()[1]+2000,v=d.dimensionVisualState();return y>1&&y<12&&v?.time>0&&v.quality==='low';},null,{timeout:60000});
  report.reentry=await p.evaluate(()=>SevenSinsDebug3D.dimensionVisualState());assert.equal(report.reentry.eyes,336);assert.equal(report.reentry.disposed,false);assert.equal(report.reentry.visible,true);
  await p.setViewportSize({width:393,height:852});await p.waitForTimeout(1200);await shot('04-reentrada-retrato');
  const center=await p.screenshot({clip:{x:126,y:426,width:98,height:153}});assert.ok(center.length>1500,'reentry scene is blank behind HUD');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.assets,[]);report.ok=true;
 }finally{fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');await b.close();}
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
