// Run on the baseline or the PR checkout. The fixture moves the hero but
// leaves all boss actions, reads and decisions to the game's normal AI.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

async function run() {
  const label = process.argv[2] || 'depois';
  const mobile = label.includes('mobile');
  const out = 'docs/qa/vhazrael-duelo/'+label;
  const quality = process.env.VZ_QUALITY || (mobile ? 'low' : 'medium');
  const host = process.env.VZ_HOST || 'http://localhost:4219';
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'vhazrael-frames-'));
  const browser = await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:852,height:393},hasTouch:mobile});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(q=>{
      localStorage.setItem('seven-sins-3d-graphics',q);
      // combatStep draws every captured frame. Suspend the separate zero-dt
      // world animation loop while stepping to avoid rendering each frame twice.
      const next=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=callback=>{
        if(window.manualDuelFrames && callback.name==='animate')return 0;
        return next(callback);
      };
    },quality);
    await page.goto(host+'/mundo-3d-prototype.html?testeDimensao=bishop1&debug3d=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>{
      const api=window.SevenSinsDebug3D;
      if(api?.dimState().vs)api.vsGo();
      return api?.dimState().battle?.active && api.vzStats()?.alive;
    },null,{timeout:180000});
    await page.evaluate(()=>{
      window.manualDuelFrames=true;
      SevenSinsDebug3D.freeze(true);
      SevenSinsDebug3D.vzAuditReset();
      const stream=document.querySelector('#scene').captureStream(12);
      const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:550000});
      const parts=[];
      recorder.ondataavailable=e=>parts.push(e.data);
      window.finishDuelMovie=()=>new Promise(resolve=>{
        recorder.onstop=()=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(new Blob(parts));
        };
        recorder.stop();
      });
      recorder.start();
    });
    const samples=[],start=Date.now();
    let frames=0;
    for(let i=0;i<180;i++){
      const key=['w','a','s','d'][Math.floor(i/3)%4];
      await page.keyboard.down(key);
      if(i%4===0)await page.keyboard.press('j');
      if(i%14===6)await page.keyboard.press('f');
      const result=await page.evaluate(({i,detail})=>{
        const api=SevenSinsDebug3D,b=api.vzBladeClearance().boss;
        if(i%24===0){
          const gap=[2.25,6,1.8,4.5][(i/24)%4];
          api.teleport(b[0]+Math.sin(b[3])*gap,b[2]+Math.cos(b[3])*gap,b[3]+Math.PI);
        }
        if(api.state().hp<150)api.heroHeal();
        const images=[];
        const fps=[30,45,60][Math.floor(i/60)];
        if(detail){
          for(let step=0;step<5;step++){
            api.combatStep(.1,{fps});
            images.push(document.querySelector('#scene').toDataURL('image/jpeg',.82).split(',')[1]);
          }
        }else api.combatStep(.5,{fps});
        const v=api.vzStats(),world=api.state();
        return {images,sample:{draws:world.calls,triangles:world.triangles,heap:performance.memory?.usedJSHeapSize,
          t:api.vzAudit().t,act:v.act,air:v.air,shield:v.shield,mix:v.mix,blade:api.vzBladeClearance()}};
      },{i,detail:mobile && i<60});
      samples.push(result.sample);
      for(const img of result.images){
        fs.writeFileSync(path.join(temp,String(frames++).padStart(3,'0')+'.jpg'),Buffer.from(img,'base64'));
      }
      await page.keyboard.up(key);
      if(i%30===0)console.log(i,result.sample.t,result.sample.act);
    }
    const audit=await page.evaluate(()=>SevenSinsDebug3D.vzAudit());
    assert.ok(audit.t>=90 && audit.events.windup>0 && audit.events.leap>0);
    assert.ok(samples.every(s=>!s.mix?.spell));
    assert.deepEqual(errors,[]);
    fs.writeFileSync(out+'.json',JSON.stringify({quality,elapsed:Date.now()-start,audit,samples,errors},null,1));
    const movie=await page.evaluate(()=>finishDuelMovie());
    fs.writeFileSync(out+'.webm',Buffer.from(movie,'base64'));
    if(frames)execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','10','-i',
      path.join(temp,'%03d.jpg'),'-c:v','libvpx-vp9','-threads','2','-pix_fmt','yuv420p',out+'-30s.webm']);
  }finally{
    await browser.close();
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
