"use strict";
/**
 * Captura da ULTIMATE REAL do Bispo 3 em portrait e landscape.
 * Verifica os seis selos, uma única explosão e a faixa segura externa de 20%.
 */
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path");
const base=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const out=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","zarkhael-ultimate-281");
fs.mkdirSync(out,{recursive:true});
const modes={portrait:{width:393,height:852},landscape:{width:852,height:480}};
const wanted=(process.env.ZARK_U_QA_SIZES||"portrait,landscape").split(",").map(x=>x.trim()).filter(Boolean);
async function main(){
 const report={build:process.env.GITHUB_SHA||"local",date:new Date().toISOString(),modes:{},ok:false};
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 try{
  for(const mode of wanted){
   if(!modes[mode])throw Error("Tamanho desconhecido: "+mode);
   const folder=path.join(out,mode);fs.mkdirSync(folder,{recursive:true});
   const data=report.modes[mode]={frames:[],console:[],jsErrors:[],glErrors:[],assets:[],status:"started"};
   const videoDir=path.join(require("node:os").tmpdir(),"zark281-"+process.pid+"-"+mode);
   fs.mkdirSync(videoDir,{recursive:true});
   const ctx=await browser.newContext({viewport:modes[mode],deviceScaleFactor:1,hasTouch:true,isMobile:true,
    recordVideo:{dir:videoDir,size:modes[mode]}});
   const page=await ctx.newPage();
   page.on("pageerror",e=>data.jsErrors.push(e.message.slice(0,500)));
   page.on("console",m=>{if(m.type()==="error"){const x=m.text().slice(0,650);data.console.push(x);if(/shader|WebGL|INVALID_OPERATION|VALIDATE_STATUS|cannot compile/i.test(x))data.glErrors.push(x);}});
   page.on("response",r=>{if(r.status()>=400&&!r.url().endsWith("/favicon.ico"))data.assets.push({url:r.url(),status:r.status()});});
   page.on("requestfailed",req=>{if(/zarkhael|six-seals/i.test(req.url()))data.jsErrors.push("Asset falhou: "+req.url().slice(0,160));});
   try{
    const url=base+"/mundo-3d-prototype.html?testeDimensao=bishop3&debug3d=1&build=mod282-single-eruption-qa";
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.dimState==="function",null,{timeout:110000});
    await page.waitForFunction(()=>{const s=window.SevenSinsDebug3D.dimState();return s.vs||s.battle?.active;},null,{timeout:110000,polling:125});
    const pre=await page.evaluate(()=>window.SevenSinsDebug3D.dimState());
    if(pre.vs)await page.evaluate(()=>window.SevenSinsDebug3D.vsGo());
    await page.waitForFunction(()=>{
     const d=window.SevenSinsDebug3D,s=d.dimState();
     return s.battle?.active&&s.visible&&s.profile==="zarkhael"&&!s.vs&&!s.cineActive&&!s.menuGate&&!s.paused&&
      !document.querySelector("#portal-veil")?.classList.contains("on");
    },null,{timeout:110000,polling:125});
    // O jogador começa na faixa externa segura. Invulnerabilidade é desligada antes do burst.
    const setup=await page.evaluate(()=>{
     const d=window.SevenSinsDebug3D,s=d.dimState(),a=s.arena;
     if(!a||!Array.isArray(a.center)||!Number.isFinite(a.radius)||!Number.isFinite(a.floorY))
      throw new Error("Arena do Bispo 3 indisponível no debug state");
     window.__qaManualBossSkills=true;
     d.god(true);d.skills();d.power();
     const x=a.center[0]+a.radius*.95,z=a.center[1];
     d.teleport(x,z);d.god(false);d.speed(2);
     const p=d.state(),safeDistance=Math.hypot(p.x-a.center[0],p.z-a.center[1]),dangerRadius=a.radius*Math.sqrt(.8);
     if(Math.abs(p.y-a.floorY)>1)throw new Error("Jogador saiu do piso da dimensão: y="+p.y+" floor="+a.floorY);
     if(!(safeDistance>dangerRadius+.25&&safeDistance<a.radius-.25))
      throw new Error("Jogador não ficou na faixa segura externa: "+safeDistance+" / "+dangerRadius+" / "+a.radius);
     return {arena:a,player:{x:p.x,y:p.y,z:p.z},safeDistance,dangerRadius,hpBefore:s.hp};
    });
    const launch=await page.evaluate(()=>{
     const d=window.SevenSinsDebug3D,response=d.kitMove("ult");
     return {response,cine:d.dimState().cinematic};
    });
    let launchState=launch.cine;
    if(!launchState||launchState.phase!=="aura"){
     const h=await page.waitForFunction(()=>{
      const c=window.SevenSinsDebug3D.dimState().cinematic;
      return c?.phase==="aura"?c:null;
     },null,{timeout:45000,polling:125});
     launchState=await h.jsonValue();
    }
    if(!launchState)throw Error("Ultimate não iniciou por kitMove(ult); resposta="+String(launch.response));
    data.launch={...setup,response:launch.response,phase:launchState.phase};
    const schedule=[
     ["01-bispo-frente",1.25,"FRONTAL_BISPO"],
     ["02-aura-controlada",2.88,"FRONTAL_BISPO"],
     ["03-circulo-1",3.91,"CIRCULO_1"],
     ["04-circulo-2",5.03,"CIRCULO_2"],
     ["05-circulo-3",6.14,"CIRCULO_3"],
     ["06-circulo-4",7.26,"CIRCULO_4"],
     ["07-circulo-5",8.38,"CIRCULO_5"],
     ["08-circulo-6",9.49,"CIRCULO_6"],
     ["09-carga-antes-da-explosao",10.52,"EXPLOSAO_ORGANICA_3_4"],
     ["10-nucleo-ignite",11.20,"EXPLOSAO_ORGANICA_3_4"],
     ["11-coluna-crescendo",11.94,"EXPLOSAO_ORGANICA_3_4"],
     ["12-copa-formando",12.77,"EXPLOSAO_ORGANICA_3_4"],
     ["13-cogumelo-abrindo",13.63,"EXPLOSAO_ORGANICA_3_4"],
     ["14-apice-uma-explosao",14.40,"EXPLOSAO_ORGANICA_3_4"],
     ["15-dissipacao",15.03,"EXPLOSAO_ORGANICA_3_4"]];
    for(const [name,target,expectedShot] of schedule){
     const h=await page.waitForFunction(t=>{
      const state=window.SevenSinsDebug3D?.dimState()?.cinematic;
      return state&&state.t>=t?state:null;
     },target,{timeout:120000,polling:125});
     const state=await h.jsonValue();
     const image=path.join(folder,name+".png");
     await page.screenshot({path:image,animations:"disabled",timeout:30000});
     const bytes=fs.statSync(image).size;
     if(bytes<9000)throw Error("Imagem inválida/sem geometria aparente: "+name+" "+bytes);
     const frame={name,time:state.t,phase:state.phase,shot:state.shot,expectedShot,
      camera:state.cam,fov:state.fov,sealCount:state.selos.filter(a=>a[1]>.95).length,
      burstCount:state.bursts.length,burstHits:state.burstHits,hits:state.hits,
      center:state.center,hero:state.hero,arenaRadius:state.arenaRadius,dangerRadius:state.dangerRadius,
      safeDistance:state.safeDistance,hp:state.hp,vfx:state.vfx,bossFrozen:state.bossFrozen,
      mixerScale:state.mixerScale,bossPos:state.bossPos,lockPos:state.lockPos,
      occluders:state.occluders,hudCompact:state.hudCompact,bytes};
     data.frames.push(frame);
     if(frame.shot!==expectedShot)throw Error("PLANO ERRADO "+name+": "+frame.shot+" em vez de "+expectedShot);
     if(!frame.vfx)throw Error("VFX invisível em "+name);
     if(!frame.hudCompact)throw Error("A interface do jogo cobriu a cinematográfica "+name);
     if(!frame.bossFrozen||frame.mixerScale!==0)throw Error("O BISPO SE MOVE DURANTE A ULTIMATE em "+name);
     if(frame.bossPos&&frame.lockPos&&frame.bossPos.some((v,j)=>Math.abs(v-frame.lockPos[j])>.03))
      throw Error("Bispo saiu do lugar durante a ultimate: "+name);
     if(frame.phase!=="aura"&&frame.occluders<3)throw Error("Cogumelos gigantes ainda atrapalham a câmera "+name);
     if(!(frame.safeDistance>frame.dangerRadius+.25&&frame.safeDistance<frame.arenaRadius-.25))
      throw Error("Jogador saiu da faixa segura externa em "+name);
     if(frame.burstCount===1&&(frame.hits!==0||frame.burstHits.length!==1||frame.burstHits[0].hit!==false||frame.hp!==data.launch.hpBefore))
      throw Error("A explosão atingiu o jogador na faixa segura externa em "+name);
    }
    const camHeights=data.frames.slice(2,8).map(f=>f.camera?.[1]);
    for(let j=1;j<6;j++){
     const d=camHeights[j]-camHeights[j-1];
     if(!(d>=5&&d<=9))throw Error("A câmera NÃO subiu um patamar no círculo "+(j+1)+": "+d+" ("+camHeights+")");
    }
    if(!(data.frames[0].camera[1]<data.frames[2].camera[1])||data.frames[0].fov>51)
     throw Error("A câmera não começou frontal e próxima ao Bispo");
    if(data.frames[8].sealCount!==6||data.frames[8].burstCount!==0||
       data.frames[9].burstCount!==1||data.frames[14].burstCount!==1)
     throw Error("Seis selos/uma explosão inválidos");
    const cleanup=await page.waitForFunction(()=>{
     const d=window.SevenSinsDebug3D,s=d.dimState(),v=d.dimensionVisualState();
     return !s.cinematic?{dim:s,visual:v,hud:document.body.classList.contains("zark-ult-cine")}:null;
    },null,{timeout:60000,polling:125});
    data.cleanup=await cleanup.jsonValue();
    if(data.cleanup.dim.hp!==data.launch.hpBefore||data.cleanup.dim.cineActive||data.cleanup.dim.bossUltKind||
       data.cleanup.hud||!data.cleanup.visual?.architectureVisible?.every(Boolean))
     throw Error("A limpeza da ultimate não restaurou HP, câmera e arquitetura");
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:path.join(folder,"16-fim-limpo.png"),animations:"disabled",timeout:30000});
    if(data.glErrors.length||data.jsErrors.length||data.assets.length)
     throw Error("Erro WebGL/JS/asset: "+JSON.stringify(data.glErrors.concat(data.jsErrors,data.assets)).slice(0,1400));
    data.status="approved";
    data.visualReview="As capturas precisam de comparação humana com as referências originais; aprovação técnica não mede fidelidade artística.";
    process.stdout.write("[BISPO3 281] "+mode+" -> 6 selos, 1 blast, faixa segura, limpeza, sem shader/JS/asset error.\n");
   }catch(e){
    data.status="failed";data.failure=String(e.stack||e).slice(0,1800);
    try{data.lastState=await page.evaluate(()=>{const d=window.SevenSinsDebug3D;return{dim:d?.dimState?.(),visual:d?.dimensionVisualState?.(),state:d?.state?.()};});}catch{}
    process.stderr.write("[BISPO3 281] "+mode+" FAIL: "+data.failure+"\n");
    process.exitCode=1;
   }finally{
    const video=page.video();
    await ctx.close().catch(()=>{});
    try{if(video){const p=await video.path();fs.copyFileSync(p,path.join(folder,"ultimate-bispo3-281.webm"));}}
    catch(e){data.jsErrors.push("Vídeo indisponível: "+String(e).slice(0,160));}
   }
  }
  report.ok=wanted.every(m=>report.modes[m].status==="approved");
 }finally{fs.writeFileSync(path.join(out,"resultado.json"),JSON.stringify(report,null,2)+"\n");await browser.close();}
 if(!report.ok)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
