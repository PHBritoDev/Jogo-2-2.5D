const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const output = process.env.OUT || 'evidence';
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context = await browser.newContext({
    viewport:{width:720,height:405}, hasTouch:true, isMobile:true,
    recordVideo:{dir:output,size:{width:720,height:405}}
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.text().startsWith('cave:'))console.log(m.text());});
  const root = path.resolve(path.dirname(require.resolve('three')),'..');
  const prefix = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
  await page.route(prefix+'**', r=>r.fulfill({path:path.join(root,new URL(r.request().url()).pathname.split('three@0.160.0/')[1]),contentType:'text/javascript'}));
  const sleep = ms=>new Promise(resolve=>setTimeout(resolve,ms));
  try {
    await page.addInitScript(()=>localStorage.setItem('seven-sins-3d-graphics','low'));
    await page.goto((process.env.GAME_URL || 'http://localhost:4263')+'/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.SevenSinsDebug3D && document.querySelector('#loading').classList.contains('hidden'),null,{timeout:240000});
    await page.evaluate(()=>{
      const d=SevenSinsDebug3D;
      d.whiteQA();d.fly();d.act2(11);d.journeyStep(12,0);d.god();d.sprint(true);d.speed(1);
    });
    const metrics=[];
    await page.exposeFunction('landmark',async(name,data)=>{
      metrics.push({name,...data});
      fs.writeFileSync(path.join(output,'route.json'),JSON.stringify(metrics,null,2));
      await page.screenshot({path:path.join(output,name+'.jpg'),quality:85});
    });
    await page.evaluate(async()=>{
      const d=SevenSinsDebug3D,{nodes}=await import('/volcano-cave-layout.js');
      const {DISTRICT_SPOTS:s}=await import('/act2-flow.js');
      const frame=()=>new Promise(requestAnimationFrame);
      async function fight(sub){
        const start=performance.now();
        while(d.storyState().q===12 && d.storyState().sub<sub){
          if(performance.now()-start>150000)throw Error('encontro '+sub);
          const state=d.storyState();
          if(state.waitingTap)d.tapStory();
          if(state.pack?.active && !state.scene){
            d.combatAction('attack');
            for(const actor of d.squadState().snap?.actors||[])if(actor.alive)d.squadHit(actor.id,35);
            if(!d.squadState().on)d.hurtBoss(9999);
          }
          await frame();
        }
      }
      async function walk(x,z,name){
        console.log('cave: '+name);
        const start=performance.now(),times=[];
        let distance=0,previous=d.walkState(),last=start,lastProgress=start,nearest=Infinity;
        while(true){
          const t=performance.now(),p=d.walkState(),dx=x-p.x,dz=z-p.z,remaining=Math.hypot(dx,dz);
          distance+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p;
          if(t>last)times.push(t-last);last=t;
          const st=d.storyState();
          if(remaining<1 || (name==='exterior'&&st.label==='ENTRAR NO VULCÃO') ||
             (name==='door'&&st.label==='USAR A CHAVE') || (name==='portal'&&st.label==='ENTRAR NO PORTAL'))break;
          if(st.pack?.active&&st.q===12){await fight(st.sub+1);lastProgress=performance.now();continue;}
          if(st.scene){if(st.waitingTap)d.tapStory();await frame();lastProgress=performance.now();continue;}
          if(remaining<nearest-.1){lastProgress=t;nearest=remaining;}
          if(t-lastProgress>25000)throw Error('rota bloqueada '+JSON.stringify({name,p,remaining,state:st.label}));
          d.viewQA(false,Math.atan2(-dx,-dz),.12);d.walkMove(dx,dz,.3);
          await frame();
        }
        times.sort((a,b)=>a-b);
        await window.landmark(name,{metres:distance,seconds:(performance.now()-start)/1000,
          frames:times.length,p95:times[Math.max(0,Math.ceil(times.length*.95)-1)],render:d.squadRender(),camera:d.camInfo()});
      }
      d.placeAt(s.volcanoExit.x,d.groundAt(s.volcanoExit.x,s.volcanoExit.z),s.volcanoExit.z);
      await walk(s.volcanoGate.x,s.volcanoGate.z,'exterior');d.interact();
      for(let i=0;!d.storyState().inVolcano;i++){if(i===1800)throw Error('entrada');await frame();}
      for(const key of ['choir','aqueduct','lantern','vestibule','overlook','stair','falls','arcade','pass','fork','willow','kiln','ford','roots','lab','door','lab','lip','spine','hall','span','gate','throne','portal']){
        if(!nodes[key])continue;
        await walk(nodes[key][0]-1200,nodes[key][1],key);
        if(key==='lab'&&d.storyState().sub===0)await fight(1);
        if(key==='door'){d.interact();await fight(2);}
        if(key==='hall')await fight(3);
        if(key==='throne')await fight(4);
      }
      if(d.storyState().label!=='ENTRAR NO PORTAL')throw Error('portal');
      d.interact();
    });
    await sleep(1500);
    const result=await page.evaluate(()=>({vs:SevenSinsDebug3D.dimState().vs,boss:SevenSinsDebug3D.dimState().battle?.key}));
    if(!result.vs || result.boss!=='bishop2')throw Error(JSON.stringify(result));
    if(errors.length)throw Error(errors.join('\n'));
  } finally {
    fs.writeFileSync(path.join(output,'errors.json'),JSON.stringify(errors));
    await context.close();await browser.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
