const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const label=process.argv[2]||'depois',out='docs/qa/vhazrael-duelo/'+label;
 const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:852,height:393},hasTouch:label.includes('mobile')});
 const quality=process.env.VZ_QUALITY || (label.includes('mobile')?'low':'medium');
 await page.addInitScript(q=>localStorage.setItem('seven-sins-3d-graphics',q),quality);
 page.on('pageerror',e=>console.error('page:',e.message));
 await page.goto((process.env.VZ_HOST||'http://localhost:4219')+'/mundo-3d-prototype.html?testeDimensao=bishop1&debug3d=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.SevenSinsDebug3D?.vsGo,null,{timeout:180000});
 await page.waitForFunction(()=>{if(SevenSinsDebug3D.dimState().vs)SevenSinsDebug3D.vsGo();return SevenSinsDebug3D.dimState().battle?.active && SevenSinsDebug3D.vzStats()?.alive},null,{timeout:180000});
 await page.evaluate(()=>{SevenSinsDebug3D.freeze(true);SevenSinsDebug3D.vzAuditReset();const stream=document.querySelector('#scene').captureStream(12);window.record=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:550000});const parts=[];record.ondataavailable=e=>parts.push(e.data);window.movie=new Promise(resolve=>record.onstop=()=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(parts))});record.start()});
 const samples=[],start=Date.now();
 for(let i=0;i<180;i++){
  const k=['w','a','s','d'][Math.floor(i/3)%4];await page.keyboard.down(k);
  if(i%4===0)await page.keyboard.press('j');
  if(i%14===6)await page.keyboard.press('f');
  const sample=await page.evaluate(i=>{
    const api=SevenSinsDebug3D,b=api.vzBladeClearance()?.boss;
    if(!b)return null;
    if(i%24===0) {
      const gap=[2.25,6,1.8,4.5][(i/24)%4];
      api.teleport(b[0]+Math.sin(b[3])*gap,b[2]+Math.cos(b[3])*gap,b[3]+Math.PI);
    }
    if(api.state().hp<150)api.heroHeal();
    api.combatStep(.5,{fps:[30,45,60][Math.floor(i/60)]});
    const v=api.vzStats(),world=api.state();return {draws:world.calls,triangles:world.triangles,heap:performance.memory?.usedJSHeapSize,t:api.vzAudit().t,act:v?.act,air:v?.air,shield:v?.shield,mix:v?.mix,blade:api.vzBladeClearance()};
  },i);
  samples.push(sample);await page.keyboard.up(k);
  if(i%30===0)console.log(i,sample?.t,sample?.act);
 }
 if(!samples.some(s=>s?.mix?.melee>0))throw Error('duelo sem esgrima');
 fs.writeFileSync(out+'.json',JSON.stringify({quality,elapsed:Date.now()-start,audit:await page.evaluate(()=>SevenSinsDebug3D.vzAudit()),samples},null,1));
 const movie=await page.evaluate(()=>{record.stop();return window.movie});fs.writeFileSync(out+'.webm',Buffer.from(movie,'base64'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
