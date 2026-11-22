// Run on a served checkout with Playwright; evidence is written outside the game.
const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
async function capture(){
  const out=path.resolve(process.env.QA_OUTPUT||'greed-results');
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
  try {
    const size={width:852,height:393};
    const context=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,recordVideo:{dir:out,size}});
    const page=await context.newPage(), errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    page.on('response',r=>{if(r.status()>=400)requests.push([r.status(),r.url()])});
    page.on('requestfailed',r=>requests.push([r.failure()?.errorText,r.url()]));
    if(process.env.THREE_ROOT)await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({
      path:path.join(process.env.THREE_ROOT,new URL(r.request().url()).pathname.split('/three@0.160.0/')[1]),contentType:'application/javascript'}));
    await page.goto(new URL('mundo-3d-prototype.html?debug3d=1',process.env.GAME_URL).href,{waitUntil:'domcontentloaded'});
    const wait=fn=>page.waitForFunction(fn,null,{timeout:150000});
    await wait(()=>window.SevenSinsDebug3D&&document.querySelector('#loading')?.classList.contains('hidden'));
    await page.evaluate(()=>{const d=SevenSinsDebug3D;d.act6(28,4);d.startDim('greed')});
    await wait(()=>document.querySelector('#vs-go')?.disabled===false);
    await page.evaluate(()=>SevenSinsDebug3D.vsGo());
    await wait(()=>SevenSinsDebug3D.dimState().battle?.active);
    await page.evaluate(()=>{const d=SevenSinsDebug3D;d.placeAt(0,-2000,12,Math.PI);d.view(0,-.23,6)});
    const shot=async name=>{await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,name+'.jpg'),quality:89})};
    await shot('combate');
    await page.addStyleTag({content:'body *{visibility:hidden!important} canvas{visibility:visible!important}'});
    await page.evaluate(()=>SevenSinsDebug3D.fly([0,-1997,22],[2,-1980,-53]));
    await shot('frente');
    const times=await page.evaluate(()=>new Promise(resolve=>{
      const intervals=[];let last;
      function frame(t){if(last)intervals.push(t-last);last=t;if(intervals.length===36)resolve(intervals);else requestAnimationFrame(frame)}
      requestAnimationFrame(frame);
    }));
    for(let i=1;i<=8;i++){
      await page.evaluate(i=>SevenSinsDebug3D.fly([-1.7*i,-1997,22-i],[2,-1980,-53]),i);
      await page.waitForTimeout(250);
    }
    await shot('lateral');
    const video=page.video();await context.close();await video.saveAs(path.join(out,'percurso.webm'));await video.delete();
    times.sort((a,b)=>a-b);
    const metrics={p95:times[Math.ceil(.95*times.length)-1],samples:times.length,errors,requests};
    fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));console.log(metrics);
    assert.equal(errors.length+requests.length,0);
  }finally{await browser.close()}
}
capture().catch(e=>{console.error(e);process.exitCode=1});
