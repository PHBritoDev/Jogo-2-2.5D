const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const output = 'docs/qa/fauna-19';
const mobile = process.argv.includes('--mobile');
const animals = [
  ['coelho', -300, -45, .42], ['montanha', -670, -49, .52],
  ['lava', -1010, -20, .36], ['dourado', -320, -42, .17], ['grilo', -300, -45, .085]
];
(async () => {
  fs.mkdirSync(output, { recursive:true });
  const browser = await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:mobile?{width:852,height:393}:{width:960,height:540},isMobile:mobile,hasTouch:mobile});
    await page.addInitScript(() => {
      localStorage.setItem('seven-sins-3d-prologo-ceu','1');
      localStorage.setItem('seven-sins-3d-graphics','low');
      localStorage.setItem('sevenSins3DCampaignV6',JSON.stringify({version:6,act1Rev:2,questStep:1,coins:47,awakeningSeen:true,playerName:'QA',actCardSeen:true}));
    });
    page.on('pageerror', e=>console.error(e.message));
    await page.goto(process.env.FAUNA_URL || 'http://localhost:4203/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.SevenSinsDebug3D?.state().calls>0,null,{timeout:180000});
    const filter=process.argv.find(arg=>arg.startsWith('--kind='))?.slice(7);
    const report=output+'/'+(mobile?'touch':'desktop')+'.json';
    const results=filter && fs.existsSync(report)?JSON.parse(fs.readFileSync(report,'utf8')):[];
    for(const [kind,x,z,size] of animals) {
      if(filter && filter!==kind)continue;
      const result=await page.evaluate(async ({kind,x,z,size,mobile})=>{
        const api=window.SevenSinsDebug3D, sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
        api.freeRoam(); api.speed(2); api.setHour(kind==='grilo'?18.8:12);
        api.teleport(x+7,z+1);
        let point;
        for(let i=0;i<81 && !point;i++){
          const px=x+(i%9-4)*1.3, pz=z+(Math.floor(i/9)-4)*1.3;
          if(await api.faunaSpawn(kind,px,pz,0))point=[px,pz];
        }
        if(!point)return {kind,spawn:false};
        const [px,pz]=point;
        api.teleport(px+6,pz+1);
        const canvas=document.querySelector('canvas#scene');
        const stream=canvas.captureStream(12), data=[];
        const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:550000});
        const finished=new Promise(resolve=>{recorder.ondataavailable=e=>data.push(e.data);recorder.onstop=resolve;});
        let frames=0, landed=false, watching=true, side=false, states=new Set(), range=[Infinity,-Infinity];
        function follow(){
          if(!watching)return;
          const a=api.faunaState().list.find(a=>a.qa&&a.kind===kind);
          if(a){
            const az=a.yaw+(side?1.25:.18), dist=Math.max(.25,size*2.1);
            const cx=a.x+Math.sin(az)*dist, cz=a.z+Math.cos(az)*dist;
            const cy=Math.max(api.groundAt(cx,cz)+.14,a.y+size*.9);
            api.camFix([cx,cy,cz],[a.x,a.y+size*.45,a.z]);
            if (states.has('flight') && a.state==='idle')landed=true;
            states.add(a.state);range=[Math.min(range[0],a.y),Math.max(range[1],a.y)];
          }
          frames++;requestAnimationFrame(follow);
        }
        follow();while(frames<10)await sleep(150);recorder.start();
        const start=performance.now(), firstFrame=frames;
        await sleep(2400);side=true;api.teleport(px+1,pz+.25);
        const responseStart=frames;
        const bird=['montanha','lava','dourado'].includes(kind);
        for(let i=0;i<360 && (states.size<2 || frames-responseStart<22 || (bird && !landed));i++)await sleep(350);
        await sleep(1000);watching=false;recorder.stop();await finished;stream.getTracks().forEach(t=>t.stop());
        const url=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(new Blob(data));});
        const captureMs=performance.now()-start;
        const {draws,tris,counts,loaded}=api.faunaState();
        let dayHidden;
        if(kind==='grilo'){
          api.setHour(12);
          for(let i=0;i<100 && api.faunaState().list.some(a=>a.kind==='grilo');i++)await sleep(180);
          dayHidden=!api.faunaState().list.some(a=>a.kind==='grilo');
        }
        return {kind,spawn:true,biome:api.faunaBiome(px,pz),point,states:[...states],landed,simulationSpeed:2,dayHidden,range,draws,tris,counts,loaded,
          fps:+((frames-firstFrame)*1000/captureMs).toFixed(1),worldCalls:api.state().calls,heapMiB:Math.round(performance.memory.usedJSHeapSize/1048576),video:url.split(',')[1]};
      },{kind,x,z,size,mobile});
      if(result.video){
        const video=output+'/'+(mobile?'touch-':'')+kind+'.webm';
        fs.writeFileSync(video,Buffer.from(result.video,'base64'));
        const frames=require('node:child_process').execFileSync('ffprobe',['-v','error','-select_streams','v','-count_frames','-show_entries','stream=nb_read_frames','-of','csv=p=0',video],{encoding:'utf8'});
        result.videoFrames=Number(frames.trim());
        assert.ok(result.videoFrames>=5,kind+' captured game frames');
        delete result.video;
      }
      console.log(JSON.stringify(result));const index=results.findIndex(r=>r.kind===kind);if(index<0)results.push(result);else results[index]=result;
      fs.writeFileSync(report,JSON.stringify(results,null,2)+'\n');
    }
    for(const r of results) {
      if(mobile&&r.kind==='grilo')assert.equal(r.spawn,false);
      else {assert.ok(r.spawn,r.kind);assert.ok(r.states.length>=2,r.kind+' must react');if(r.kind==='grilo')assert.ok(r.dayHidden);if(r.states.includes('flight'))assert.ok(r.landed,r.kind+' must land');}
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
