'use strict';
/* QA isolado: teste de giro de camera na mata + auditoria da substituicao de tochas.
 * Nao mede FPS do Android fisico; usa WebGL SwiftShader e grava evidencias.
 */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const out=path.resolve('visual-lab-results/forest-stutter-mod314');
fs.mkdirSync(out,{recursive:true});
const report={status:'incomplete',platform:'Chromium SwiftShader 852x480, nao Android real',
  commit:process.env.GITHUB_SHA||'local',errors:[],samples:[],torches:null,summary:null};
(async()=>{
 let browser,ctx;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage',
    '--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  ctx=await browser.newContext({viewport:{width:852,height:480},deviceScaleFactor:1,isMobile:true,hasTouch:true,
    recordVideo:{dir:out,size:{width:852,height:480}}});
  const page=await ctx.newPage();
  page.on('pageerror',e=>report.errors.push(String(e.message||e).slice(0,350)));
  page.on('response',r=>{if(r.status()>=400&&/\.(?:glb|js)(?:\?|$)/.test(r.url()))report.errors.push('HTTP '+r.status()+' '+r.url().slice(0,160));});
  const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
  await page.goto(base+'/mundo-3d-prototype.html?debug3d=1&perfFloresta=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.teleport==='function',null,{timeout:165000});
  await page.evaluate(()=>window.SevenSinsDebug3D.freeRoam());
  await page.waitForFunction(()=>window.SevenSinsDebug3D?.torchAudit?.().loaded>=2,null,{timeout:90000});
  report.torches=await page.evaluate(()=>window.SevenSinsDebug3D.torchAudit());
  report.torchMeshes=await page.evaluate(()=>window.SevenSinsTorchMeshAudit||[]);
  await page.evaluate(()=>{const a=window.SevenSinsDebug3D;a.teleport(-20.6,-45.5);a.fly(null);a.view(1.2,.12,5.5);});
  await page.waitForTimeout(1000);
  await page.screenshot({path:path.join(out,'tochas-vila.png')});
  await page.evaluate(()=>{const a=window.SevenSinsDebug3D;a.teleport(-145,-61);a.fly(null);a.view(1.2,.12,6);});
  await page.waitForTimeout(1400);
  try{await page.waitForFunction(()=>window.SevenSinsDebug3D?.torchAudit?.().district?.loaded===3,null,{timeout:45000});}
  catch(e){report.errors.push('Distrito ainda nao carregou as 3 tochas GLB');}
  report.torches.district=await page.evaluate(()=>window.SevenSinsDebug3D.torchAudit()?.district||null);
  const source=fs.readFileSync(path.resolve(__dirname,'../../mundo-3d-prototype.js'),'utf8');
  if(/const pole=new THREE.Mesh\(new THREE.CylinderGeometry\(\.06,\.08,2\.6,5\)/.test(source))
    report.errors.push('Postes procedurais antigos ainda presentes no codigo');
  if(report.torches.loaded!==2||report.torches.district?.loaded!==3)
    report.errors.push('Numero de GLBs de tochas diferente do esperado');
  await page.screenshot({path:path.join(out,'tochas-distrito.png')});
  // Regressão explícita: nenhuma geometria/chama genérica de tochas deve voltar.
  const caveSource=fs.readFileSync(path.resolve(__dirname,'../../ascension-cave3d.js'),'utf8');
  if(/createVillageTorchFire|TochasVentoFogoGPU|ChamaFluidaTocha/.test(source+caveSource))
    report.errors.push('Chama procedural de tocha voltou a ser criada');
  if(fs.existsSync(path.resolve(__dirname,'../../eldoria-torch-fire3d.js')))
    report.errors.push('Gerador legado de chamas ainda existe');
  // Capturar ambas as câmeras na caverna real, sem teleporte para dentro de parede.
  await page.evaluate(async()=>{const a=window.SevenSinsDebug3D;await a.ascension('cave',{x:0,z:-12,yaw:Math.PI});a.view(0,.08,5.5);});
  await page.waitForTimeout(1100);
  await page.screenshot({path:path.join(out,'caverna-terceira-pessoa.png')});
  report.caveThird=await page.evaluate(()=>window.SevenSinsDebug3D.cameraCollisionAudit());
  if(report.caveThird.solid)report.errors.push('Camera terceira pessoa dentro de rocha da caverna');
  await page.evaluate(()=>window.SevenSinsDebug3D.view(0,.08,.72));
  await page.waitForTimeout(950);
  await page.screenshot({path:path.join(out,'caverna-primeira-pessoa.png')});
  report.cave=await page.evaluate(()=>({camera:window.SevenSinsDebug3D.snapCam(),state:window.SevenSinsDebug3D.ascState(),collision:window.SevenSinsDebug3D.cameraCollisionAudit()}));
  if(report.cave.collision.solid)report.errors.push('Camera primeira pessoa dentro de rocha da caverna');
  if(!report.cave.camera.every(Number.isFinite))report.errors.push('Camera da caverna inválida');
  await page.evaluate(()=>window.SevenSinsDebug3D.ascension(null));

  const spots=[[34,-56],[-52,-111]];
  for(let k=0;k<spots.length;k++){
    await page.evaluate(([x,z])=>{const a=window.SevenSinsDebug3D;a.teleport(x,z);a.fly(null);a.view(0,.12,6);},spots[k]);
    await page.waitForTimeout(1300);
    const metrics=await page.evaluate(async()=>{
      const a=window.SevenSinsDebug3D,d=[],last={t:null};
      return new Promise(resolve=>{
        let start=performance.now(),n=0;
        function frame(t){
          if(last.t!==null)d.push(t-last.t);
          last.t=t;
          // Giro constante para acionar o culling real e as atualizacoes de instancias.
          if((n++%3)===0)a.view((t-start)*.0017,.10,6);
          if(t-start>7300){d.sort((a,b)=>a-b);const at=q=>d[Math.min(d.length-1,Math.floor(q*(d.length-1)))];resolve({
            samples:d.length,p50:at(.5),p95:at(.95),p99:at(.99),max:at(1),
            spikes100:d.filter(x=>x>100).length,spikes300:d.filter(x=>x>300).length,
            cpu:window.SevenSinsForestPerf||null,draw:a.state()?.calls});return;}
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    });
    report.samples.push({spot:spots[k],...metrics});
    await page.screenshot({path:path.join(out,'floresta-giro-'+(k+1)+'.png')});
  }
  report.summary={torchesLoaded:report.torches.loaded,districtTorches:report.torches.district,
    p95Max:Math.max(...report.samples.map(x=>x.p95)),spikes300:report.samples.reduce((n,x)=>n+x.spikes300,0)};
  report.status=report.errors.length?'suspected_errors':'captured';
  if(report.errors.length)process.exitCode=1;
 }catch(e){report.status='failed';report.errors.push(String(e.stack||e).slice(0,1700));process.exitCode=1;}
 finally{if(ctx)await ctx.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});
  report.videos=fs.readdirSync(out).filter(x=>x.endsWith('.webm'));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('FOREST_QA '+JSON.stringify(report.summary||{status:report.status,errors:report.errors}));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});