'use strict';
// QA REAL: câmera, física de abismos, texturas, iluminação e assets no navegador WebGL.
// SwiftShader/viewport mobile NÃO equivalem a teste num smartphone físico.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve('visual-lab-results/ascension-zones');
fs.mkdirSync(output,{recursive:true});
const report={status:'incomplete',platform:'Chromium SwiftShader — mobile simulated 852x480',shots:[],pageErrors:[],assetErrors:[],checks:[]};
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
const safe=t=>String(t).replace(/[^a-z0-9_-]/gi,'-');
(async()=>{
 let browser,ctx;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  ctx=await browser.newContext({viewport:{width:852,height:480},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:output,size:{width:852,height:480}}});
  const page=await ctx.newPage();
  page.on('pageerror',e=>report.pageErrors.push(String(e.message||e).slice(0,500)));
  page.on('response',r=>{if(r.status()>=400&&(/\.glb(?:\?|$)|ascension-.*\.js/.test(r.url())))report.assetErrors.push({url:r.url(),status:r.status()});});
  await page.goto(base+'/mundo-3d-prototype.html?debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{
   const loading=document.getElementById('loading')?.textContent||'';
   if(loading.includes('Falha ao montar o mundo 3D'))return 'failed';
   return typeof window.SevenSinsDebug3D?.ascension==='function'?'ready':false;
  },null,{timeout:180000}).then(async h=>{if(await h.jsonValue()!=='ready')throw Error('O mundo 3D falhou ao carregar');});
  await page.evaluate(()=>window.SevenSinsDebug3D.freeRoam());
  async function enter(key){const state=await page.evaluate(async key=>window.SevenSinsDebug3D.ascension(key),key);assert.equal(state.key,key);return state;}
  async function snap(name,x,z,{yaw=0,pitch=.14,distance=6}={}){
   const state=await page.evaluate(({x,z,yaw,pitch,distance})=>{
    const a=window.SevenSinsDebug3D,st=a.ascState(),O={x:st.world.x-st.local.x,z:st.world.z-st.local.z};
    a.teleport(O.x+x,O.z+z);a.fly(null);a.view(yaw,pitch,distance);
    const cam=a.snapCam();return {state:a.ascState(),camera:cam,rinfo:a.rinfo(),draw:a.state()?.calls,tri:a.state()?.triangles};
   },{x,z,yaw,pitch,distance});
   await page.waitForTimeout(800);
   const filename=safe(name)+'.png';
   await page.screenshot({path:path.join(output,filename),timeout:65000});
   const fps=await page.evaluate(()=>document.body.innerText.match(/\b\d{1,3}\s*FPS\b/)?.[0]||null);
   report.shots.push({name,filename,fps,...state});
   assert.ok(state.camera.every(Number.isFinite),'Camera inválida: '+name);
   return state;
  }
  await enter('cave');
  await snap('caverna-entrada',0,2,{yaw:Math.PI});
  await snap('caverna-corredor',-2,-98,{yaw:Math.PI});
  await snap('caverna-corredor-1p',-2,-98,{yaw:Math.PI,distance:.72});
  // Prova: altura de camera em 1p acompanha o MESMO heroi, nao o relevo do mundo externo.
  // Testar tambem girando para ambos os lados — a camera nunca pode entrar na rocha.
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
   await page.evaluate(yaw=>window.SevenSinsDebug3D.view(yaw,.12,.72),yaw);
   await page.waitForTimeout(450);
   const check=await page.evaluate(async()=>{
    const a=window.SevenSinsDebug3D,s=a.ascState(),cam=a.snapCam();
    const m=await import('./ascension-cave3d.js');
    return {yaw:cam[3],eyeOffset:cam[1]-s.world.y,blocked:m.caveCamSolid(s.local.x+cam[0]-s.world.x,cam[1],s.local.z+cam[2]-s.world.z),cam,local:s.local};
   });
   report.checks.push({name:'caverna-camera-1p-giro',passed:!check.blocked&&check.eyeOffset>1.15&&check.eyeOffset<1.43,measurement:check});
   assert.ok(!check.blocked&&check.eyeOffset>1.15&&check.eyeOffset<1.43,'Camera 1p entra na rocha ou fica alta demais: '+JSON.stringify(check));
  }
  await page.screenshot({path:path.join(output,'caverna-1p-altura-verificada.png')});
  const caveMovement=await page.evaluate(()=>{
   const a=window.SevenSinsDebug3D,st=a.ascState(),ox=st.world.x-st.local.x,oz=st.world.z-st.local.z;
   a.teleport(ox-2,oz-98);a.fly(null);a.view(0,.1,.72);
   const before=a.ascState().local;a.motionStep(6,{x:0,z:-1,fps:30});
   const after=a.ascState().local;return {before,after,meters:Math.hypot(after.x-before.x,after.z-before.z)};
  });
  report.checks.push({name:'travessia-corredor-da-caverna-1p',passed:caveMovement.meters>18&&caveMovement.after.z<-116,measurement:caveMovement});
  assert.ok(caveMovement.meters>18&&caveMovement.after.z<-116,'Corredor principal da caverna bloqueado ou movimento lento em primeira pessoa');

  await snap('caverna-grota',-42,-62,{yaw:-.7});
  await snap('caverna-portal',-4,-136,{yaw:Math.PI});
  // Checkpoint foi definido na entrada segura: atravessar abismo deve resultar em respawn.
  await page.evaluate(()=>{
   const a=window.SevenSinsDebug3D,st=a.ascState(),O={x:st.world.x-st.local.x,z:st.world.z-st.local.z};
   a.teleport(O.x+8,O.z-60);a.fly(null);a.view(0,.1,5);
  });
  await page.waitForFunction(()=>{
   const a=window.SevenSinsDebug3D,s=a?.ascState();
   return s?.key==='cave' && s.local && Math.abs(s.local.x)<1.5 && Math.abs(s.local.z-2)<1.5;
  },null,{timeout:50000});
  report.checks.push({name:'queda-no-abismo-caverna',passed:true,respawn:await page.evaluate(()=>window.SevenSinsDebug3D.ascState())});
  await enter('ascent');
  await snap('escadaria-base',0,-3,{yaw:Math.PI});
  await snap('escadaria-intermediaria',0,-160,{yaw:Math.PI});
  const island=await page.evaluate(async()=>{const m=await import('./ascension-layout.js');return m.islandCenter();});
  await snap('escadaria-ultima-passagem',0,-372,{yaw:Math.PI,distance:5.2});
  await snap('escadaria-ponte-ilha',0,-380,{yaw:Math.PI,distance:4});
  const bridgeMovement=await page.evaluate(()=>{
   const a=window.SevenSinsDebug3D,st=a.ascState(),ox=st.world.x-st.local.x,oz=st.world.z-st.local.z;
   a.teleport(ox,oz-365);a.fly(null);a.view(0,.1,5.5);
   const before=a.ascState().local;a.motionStep(4,{x:0,z:-1,fps:30});
   const after=a.ascState().local;return {before,after,meters:Math.hypot(after.x-before.x,after.z-before.z)};
  });
  report.checks.push({name:'travessia-escada-ilha',passed:bridgeMovement.after.z<-369&&bridgeMovement.after.y>158,measurement:bridgeMovement});
  assert.ok(bridgeMovement.after.z<-369&&bridgeMovement.after.y>158,'Falha ao caminhar sobre junção escada/ilha');

  await snap('ilha-deserto-negro',island.x,island.z,{yaw:Math.PI, distance:7});
  await page.evaluate(()=>{
   const a=window.SevenSinsDebug3D,st=a.ascState(),O={x:st.world.x-st.local.x,z:st.world.z-st.local.z};
   a.teleport(O.x+4,O.z-20);a.fly(null);
  });
  await page.waitForFunction(()=>{
   const a=window.SevenSinsDebug3D,s=a?.ascState();
   return s?.key==='ascent' && s.local && Math.abs(s.local.x)<1.5 && Math.abs(s.local.z+3)<1.5;
  },null,{timeout:50000});
  report.checks.push({name:'queda-escadaria',passed:true,respawn:await page.evaluate(()=>window.SevenSinsDebug3D.ascState())});
  assert.deepEqual(report.assetErrors.filter(x=>/TochaMedievalTripo/.test(x.url)),[],'Tocha 3D ausente na cena');
  const fireAudit=await page.evaluate(()=>window.SevenSinsDebug3D.torchAudit());
  report.checks.push({name:'nenhuma-chama-generica-de-codigo',passed:fireAudit.genericFire.length===0,measurement:fireAudit});
  assert.deepEqual(fireAudit.genericFire,[],'Chamas genericas persistem sobre os modelos GLB');
  report.status='passed';
  await page.close();
 }catch(e){report.status='failed';report.error=String(e.stack||e).slice(0,3000);process.exitCode=1;}
 finally{
  if(ctx)await ctx.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});
  report.videos=fs.readdirSync(output).filter(x=>x.endsWith('.webm'));
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,shots:report.shots.length,checks:report.checks.length,errors:report.pageErrors.length,assets:report.assetErrors.length,error:report.error||''}));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
