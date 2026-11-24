'use strict';
/** Same real Bispo 3 combat state on main and candidate; screenshots/video are evidence, not Android FPS. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const baselineUrl=process.env.VISUAL_BASELINE_URL;
const candidateUrl=process.env.VISUAL_CANDIDATE_URL;
const out=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','bispo3-lighting-ab');
fs.mkdirSync(out,{recursive:true});
fs.mkdirSync(path.join(out,'video'),{recursive:true});
const report={
  renderer:'Chromium / SwiftShader — same runtime state, not Android FPS',
  baselineSha:process.env.A4_BASE_SHA||'unknown',
  candidateSha:process.env.A4_CANDIDATE_SHA||process.env.GITHUB_SHA||'unknown',
  viewport:{width:852,height:480,deviceScaleFactor:1,quality:'low'},
  baseline:null,candidate:null,errors:[],assets:[],ok:false
};
function expectedFillFor(label) {
  // Main keeps the pre-A4 warm/wide fill; the candidate must prove the new local/cool fill.
  if (label === '01-main') return {
    position:[1200,18,4], intensity:3.5, distance:110, decay:1.1,
    color:[1,.863157,.737910], minSlotIntensity:3.1
  };
  return {
    position:[1200,7,0], intensity:16, distance:36, decay:1.1,
    color:[.737910,.791298,.887923], minSlotIntensity:15
  };
}
async function capture(label,url,browser){
  const context=await browser.newContext({
    viewport:{width:852,height:480},deviceScaleFactor:1,hasTouch:true,isMobile:true,
    recordVideo:{dir:path.join(out,'video'),size:{width:852,height:480}}
  });
  const page=await context.newPage();
  const errors=[],assets=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|INVALID|compile/i.test(m.text()))errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))assets.push({url:r.url(),status:r.status()});});
  try{
    await page.goto(url.replace(/\/$/,'')+'/mundo-3d-prototype.html?testeDimensao=bishop3&debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>window.SevenSinsDebug3D,null,{timeout:180000});
    // Freeze automatic boss skills before the VS transition, not after combat has already begun.
    await page.evaluate(()=>{window.__qaManualBossSkills=true;window.SevenSinsDebug3D.god();});
    await page.waitForFunction(()=>{
      const s=window.SevenSinsDebug3D.dimState();
      return s.vs||s.battle?.active;
    },null,{timeout:180000,polling:250});
    const pre=await page.evaluate(()=>window.SevenSinsDebug3D.dimState());
    if(pre.vs){
      // The VS panel can exist while its start button is still disabled. Wait for
      // the real control to become ready, then issue exactly one trusted click.
      await page.waitForFunction(()=>{
        const button=document.querySelector('#vs-go');
        return !!button&&!button.disabled;
      },null,{timeout:180000,polling:250});
      await page.locator('#vs-go').click({timeout:15000});
    }else if(!pre.battle?.active){
      throw new Error('VS panel disappeared before combat became active');
    }
    await page.waitForFunction(()=>{
      const d=window.SevenSinsDebug3D,s=d.dimState();
      return s.battle?.active&&!s.vs&&s.voidMode&&d.dimensionVisualState()?.visible&&!s.cineActive&&!s.menuGate&&!s.paused;
    },null,{timeout:180000,polling:250});
    await page.waitForFunction(()=>!document.querySelector('#portal-veil').classList.contains('on'),null,{timeout:30000});
    await page.evaluate(()=>{
      const d=window.SevenSinsDebug3D;
      const quality=document.querySelector('#graphics-profile-3d');
      if(quality){quality.value='low';quality.dispatchEvent(new Event('change'));}
      d.motionQA({x:1200,z:10,enemyDistance:12,sword:'prota'});
      d.fly(null);d.view(.4,.12,7);
      // motionQA freezes the real loop (debugDtScale=0); restore it so the
      // production camera follows the teleported actors before measuring light slots.
      d.realtime();
    });
    await page.waitForFunction(()=>{
      const d=window.SevenSinsDebug3D,s=d.state(),c=d.cam(),hero=d.protaReport();
      return Math.abs(s.x-1200)<.1&&Math.abs(s.z-10)<.1&&
        Math.hypot(c[0]-s.x,c[1]-s.y,c[2]-s.z)<14&&hero.visible===true;
    },null,{timeout:20000,polling:100});
    // The shared dimLight has a deliberate ±5% breathing pulse. Let the
    // four-slot budget settle, then accept that documented production range.
    await page.waitForTimeout(1400);
    const state=await page.evaluate(()=>{
      const d=window.SevenSinsDebug3D;
      return {game:d.state(),dim:d.dimState(),visual:d.dimensionVisualState(),camera:d.cam(),hero:d.protaReport(),renderer:d.rinfo()};
    });
    // Confirm the production PointLight is not merely configured: the shared
    // four-slot mobile budget must actually select the dimension fill for this camera.
    const lighting=await page.evaluate(()=>window.SevenSinsDebug3D.perfProbe(1));
    // A valid lighting frame must contain both combatants, not merely visible scene objects.
    const actorFrame=await page.evaluate(()=>{
      const d=window.SevenSinsDebug3D;
      return {hero:d.camView(),boss:d.projectBoss(),viewport:{width:innerWidth,height:innerHeight}};
    });
    assert.equal(actorFrame.hero?.onScreen,true,label+': protagonist is outside the camera frame');
    assert.ok(Number.isFinite(actorFrame.hero?.camToHero)&&actorFrame.hero.camToHero<=14,
      label+': protagonist is only a distant speck, not framed at combat distance');
    assert.ok(Array.isArray(actorFrame.boss)&&actorFrame.boss.length===2&&actorFrame.boss.every(Number.isFinite),
      label+': boss target has no valid screen projection');
    assert.ok(actorFrame.boss[0]>=0&&actorFrame.boss[0]<=actorFrame.viewport.width&&
      actorFrame.boss[1]>=0&&actorFrame.boss[1]<=actorFrame.viewport.height,
      label+': boss target is outside the camera frame');
    assert.equal(lighting.lights?.slots,4,label+': mobile light budget slot count changed');
    const expectedFill=expectedFillFor(label);
    const fill=lighting.lights?.activeDetails?.find(source=>
      source.position&&
      Math.abs(source.position[0]-expectedFill.position[0])<.5&&
      Math.abs(source.position[1]-expectedFill.position[1])<.5&&
      Math.abs(source.position[2]-expectedFill.position[2])<.5&&
      Math.abs(source.intensity-expectedFill.intensity)<=expectedFill.intensity*.051&&
      Math.abs(source.distance-expectedFill.distance)<.01&&
      Math.abs(source.decay-expectedFill.decay)<.001&&
      source.color?.length===3&&source.color.every((value,i)=>Math.abs(value-expectedFill.color[i])<.012)&&
      source.slotColor?.length===3&&source.slotColor.every((value,i)=>Math.abs(value-expectedFill.color[i])<.012)&&
      Math.abs(source.slotDistance-expectedFill.distance)<.01&&
      Math.abs(source.slotDecay-expectedFill.decay)<.001);
    assert.ok(fill,label+': expected Zar’khael fill is not selected in the active shader slots');
    assert.ok(fill.slotIntensity>expectedFill.minSlotIntensity,label+': selected dimension fill has not reached its expected shader intensity');
    const lightingCheck={expected:expectedFill,observed:{
      name:fill.name,position:fill.position,intensity:fill.intensity,distance:fill.distance,
      color:fill.color,slotIntensity:fill.slotIntensity,slotColor:fill.slotColor,slotDistance:fill.slotDistance,slotDecay:fill.slotDecay
    }};
    assert.equal(lighting.shaderPointLights,4,label+': shader point-light count changed');
    assert.equal(state.dim.battle?.key,'bishop3',label+': wrong dimension');
    assert.equal(state.dim.battle?.active,true,label+': battle inactive');
    assert.equal(state.dim.profile,'zarkhael',label+': wrong boss profile');
    assert.equal(state.dim.voidMode,true,label+': arena inactive');
    assert.equal(state.visual?.visible,true,label+': arena visual missing');
    assert.ok(state.game.enemy.visible,label+': boss missing');
    assert.ok(state.hero?.visible,label+': protagonist missing or hidden');
    assert.ok(Math.hypot(state.camera[0]-state.game.x,state.camera[1]-state.game.y,state.camera[2]-state.game.z)<14,
      label+': production camera is not physically close to the protagonist in the arena');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const screenshot=path.join(out,label+'.png');
    const bytes=await page.screenshot({path:screenshot,timeout:60000});
    assert.ok(bytes.length>20000,label+': screenshot blank');
    await page.waitForTimeout(1600);
    const videoPath=await page.video().path();
    await context.close();
    return {state,lighting,actorFrame,lightingCheck,screenshot:path.basename(screenshot),video:path.relative(out,videoPath),errors,assets};
  }catch(error){
    await context.close().catch(()=>{});
    throw error;
  }
}
async function main(){
  if(!baselineUrl||!candidateUrl)throw new Error('VISUAL_BASELINE_URL and VISUAL_CANDIDATE_URL are required');
  const browser=await chromium.launch({
    headless:true,
    ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
    args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  try{
    report.baseline=await capture('01-main',baselineUrl,browser);
    report.candidate=await capture('02-candidate',candidateUrl,browser);
    report.errors=[...report.baseline.errors,...report.candidate.errors];
    report.assets=[...report.baseline.assets,...report.candidate.assets];
    assert.deepEqual(report.errors,[]);
    assert.deepEqual(report.assets,[]);
    report.ok=true;
  }catch(error){
    report.failure=error.stack||String(error);
    throw error;
  }finally{
    fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
