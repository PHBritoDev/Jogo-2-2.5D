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
function expectedFillFor(label,arenaOrigin) {
  // Presets store offsets relative to the arena floor; telemetry reports world coordinates.
  const localOffset = label === '01-main' ? [0,18,4] : [0,9,14];
  const position = [
    arenaOrigin.x + localOffset[0],
    arenaOrigin.y + localOffset[1],
    arenaOrigin.z + localOffset[2]
  ];
  if (label === '01-main') return {
    position, localOffset, intensity:3.5, distance:110, decay:1.1,
    color:[1,.863157,.737910], minSlotIntensity:3.1
  };
  return {
    position, localOffset, intensity:18, distance:36, decay:1.1,
    color:[.737910,.791298,.887923], minSlotIntensity:17
  };
}
function verifyBaselinePreset() {
  const root=process.env.A4_BASELINE_ROOT;
  assert.ok(root,'A4_BASELINE_ROOT must point to the exact main worktree');
  const preset=fs.readFileSync(path.join(root,'zarkhael-dimension3d.js'),'utf8');
  const world=fs.readFileSync(path.join(root,'mundo-3d-prototype.js'),'utf8');
  const budget=fs.readFileSync(path.join(root,'light-budget3d.js'),'utf8');
  assert.ok(preset.includes('light:[0xffefdf,3.5,110,[0,18,4]],exposure:.85'),
    'the exact main worktree must contain its original warm fill preset');
  assert.ok(world.includes('dimLight.color.setHex(e.light[0]);dimLight.intensity=e.light[1]')&&
    world.includes('dimLight.distance=e.light[2]')&&
    world.includes('dimLight.position.set(voidSpec.x+e.light[3][0],voidSpec.y+e.light[3][1],voidSpec.z+e.light[3][2])'),
    'main must apply the environment preset to the shared dimension PointLight');
  assert.ok(!budget.includes('activeDetails:'),'main intentionally has the legacy light-budget telemetry');
  return {baselineSourceVerified:true,baselineTelemetry:'legacy-main-no-activeDetails'};
}
async function capture(label,url,browser){
  const context=await browser.newContext({
    viewport:{width:852,height:480},deviceScaleFactor:1,hasTouch:true,isMobile:true,
    recordVideo:{dir:path.join(out,'video'),size:{width:852,height:480}}
  });
  const threeRoot=path.resolve(path.dirname(require.resolve('three')),'..');
  await context.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',route=>{
    const relative=new URL(route.request().url()).pathname.split('/three@0.160.0/')[1];
    return route.fulfill({path:path.join(threeRoot,relative),contentType:'text/javascript'});
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
    const arenaOrigin={x:state.game.x,y:state.game.y,z:state.game.z-10};
    assert.ok(Math.abs(arenaOrigin.x-1200)<.1&&Math.abs(arenaOrigin.z)<.1,
      label+': player is not at the expected Zar’khael arena origin');
    assert.ok(Number.isFinite(arenaOrigin.y)&&Math.abs(arenaOrigin.y+2000)<.5,
      label+': player is not on the known dimension floor; world-space fill cannot be compared');
    // Main can already contain the cooler fill. On that base verify the same
    // world-space source and shader slot as on the candidate.
    const legacyBaseline=label==='01-main'&&!Array.isArray(lighting.lights?.activeDetails);
    const expectedFill=expectedFillFor(legacyBaseline?'01-main':'current',arenaOrigin);
    let lightingCheck;
    if(legacyBaseline){
      // The baseline predates A4's activeDetails telemetry. Verify its exact
      // source preset from the fetched main worktree and its live PointLight
      // location through the legacy debug API; do not demand candidate-only fields.
      const baselineSource=verifyBaselinePreset();
      const nearby=await page.evaluate(()=>window.SevenSinsDebug3D.objectsNear(1200,4,1));
      const colocatedLights=nearby.filter(item=>item.endsWith('@1200.0,4.0'));
      assert.ok(colocatedLights.some(item=>item.startsWith('PointLight @')),
        label+': original main dimension PointLight is missing at the expected world X/Z');
      assert.ok(colocatedLights.some(item=>item.startsWith('orcamento-luz-')),
        label+': legacy shader slot is not colocated with the original dimension fill');
      lightingCheck={expected:expectedFill,observed:{
        ...baselineSource,colocatedLights,activeSources:lighting.lights.active,
        shaderPointLights:lighting.shaderPointLights,localOffset:expectedFill.localOffset
      }};
    }else{
      const fill=lighting.lights?.activeDetails?.find(source=>
        source.positionSpace==='world'&&source.worldPosition?.length===3&&
        Math.abs(source.worldPosition[0]-expectedFill.position[0])<.5&&
        Math.abs(source.worldPosition[1]-expectedFill.position[1])<.5&&
        Math.abs(source.worldPosition[2]-expectedFill.position[2])<.5&&
        source.slotWorldPosition?.length===3&&source.slotWorldPosition.every((value,i)=>Math.abs(value-expectedFill.position[i])<.5)&&
        Math.abs(source.intensity-expectedFill.intensity)<=expectedFill.intensity*.051&&
        Math.abs(source.distance-expectedFill.distance)<.01&&
        Math.abs(source.decay-expectedFill.decay)<.001&&
        source.color?.length===3&&source.color.every((value,i)=>Math.abs(value-expectedFill.color[i])<.012)&&
        source.slotColor?.length===3&&source.slotColor.every((value,i)=>Math.abs(value-expectedFill.color[i])<.012)&&
        Math.abs(source.slotDistance-expectedFill.distance)<.01&&
        Math.abs(source.slotDecay-expectedFill.decay)<.001);
      assert.ok(fill,label+': expected Zar’khael fill is not selected in the active shader slots');
      assert.ok(fill.slotIntensity>expectedFill.minSlotIntensity,label+': selected dimension fill has not reached its expected shader intensity');
      lightingCheck={expected:expectedFill,observed:{
        name:fill.name,positionSpace:fill.positionSpace,position:fill.worldPosition,slotWorldPosition:fill.slotWorldPosition,
        intensity:fill.intensity,distance:fill.distance,localOffset:expectedFill.localOffset,color:fill.color,
        slotIntensity:fill.slotIntensity,slotColor:fill.slotColor,slotDistance:fill.slotDistance,slotDecay:fill.slotDecay
      }};
    }
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
