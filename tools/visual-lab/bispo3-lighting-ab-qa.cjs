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
    if(pre.vs)await page.evaluate(()=>window.SevenSinsDebug3D.vsGo());
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
      d.fly(null);d.view(.4,.12,7);d.speed(1);
    });
    await page.waitForTimeout(2200);
    const state=await page.evaluate(()=>{
      const d=window.SevenSinsDebug3D;
      return {game:d.state(),dim:d.dimState(),visual:d.dimensionVisualState(),camera:d.cam(),renderer:d.rinfo()};
    });
    assert.equal(state.dim.battle?.key,'bishop3',label+': wrong dimension');
    assert.equal(state.dim.battle?.active,true,label+': battle inactive');
    assert.equal(state.dim.profile,'zarkhael',label+': wrong boss profile');
    assert.equal(state.dim.voidMode,true,label+': arena inactive');
    assert.equal(state.visual?.visible,true,label+': arena visual missing');
    assert.ok(state.game.enemy.visible,label+': boss missing');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const screenshot=path.join(out,label+'.png');
    const bytes=await page.screenshot({path:screenshot,timeout:60000});
    assert.ok(bytes.length>20000,label+': screenshot blank');
    await page.waitForTimeout(1600);
    const videoPath=await page.video().path();
    await context.close();
    return {state,screenshot:path.basename(screenshot),video:path.relative(out,videoPath),errors,assets};
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
