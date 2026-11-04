"use strict";
/**
 * Mod 280: captura da ULTIMATE REAL do Bispo 3 no browser 3D com WebGL,
 * sem mocks, em portrait e landscape. Audita six seals, safe zone, 1 blast.
 */
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path");
const base=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const out=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","zarkhael-ultimate-281");
fs.mkdirSync(out,{recursive:true});
const modes={portrait:{width:393,height:852},landscape:{width:852,height:480}};
const wanted=(process.env.ZARK_U_QA_SIZES||"portrait,landscape").split(",").map(x=>x.trim()).filter(Boolean);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const report={build:process.env.GITHUB_SHA||"local",date:new Date().toISOString(),modes:{},ok:false};
 const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 try{
  for(const mode of wanted){
   if(!modes[mode])throw Error("Tamanho desconhecido: "+mode);
   const folder=path.join(out,mode);fs.mkdirSync(folder,{recursive:true});
   const data=report.modes[mode]={frames:[],console:[],jsErrors:[],glErrors:[],status:"started"};
   const videoDir=path.join(require("node:os").tmpdir(),"zark281-"+process.pid+"-"+mode);
   fs.mkdirSync(videoDir,{recursive:true});
   const ctx=await browser.newContext({viewport:modes[mode],deviceScaleFactor:1,hasTouch:true,isMobile:true,
    recordVideo:{dir:videoDir,size:modes[mode]}});
   const page=await ctx.newPage();
   page.on("pageerror",e=>data.jsErrors.push(e.message.slice(0,500)));
   page.on("console",m=>{if(m.type()==="error"){const x=m.text().slice(0,650);data.console.push(x);if(/shader|WebGL|INVALID_OPERATION|VALIDATE_STATUS|cannot compile/i.test(x))data.glErrors.push(x);}});
   page.on("requestfailed",req=>{if(/zarkhael|six-seals/i.test(req.url()))data.jsErrors.push("Asset falhou: "+req.url().slice(0,160));});
   try{
    const url=base+"/mundo-3d-prototype.html?testeDimensao=bishop3&debug3d=1&build=mod282-single-eruption-qa";
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.dimState==="function",null,{timeout:110000});
    let active=false;
    for(let j=0;j<60;j++){
     const state=await page.evaluate(()=>window.SevenSinsDebug3D.dimState());
     if(state.vs){try{await page.locator("#vs-go").click({timeout:5500});}catch{await page.evaluate(()=>window.SevenSinsDebug3D.vsGo());}}
     if(state.battle?.active&&state.visible&&state.profile==='zarkhael'){active=true;break;}
     await sleep(1200);
    }
    if(!active)throw Error("Batalha do Bispo 3 não iniciou");
    let launch=false;
    for(let j=0;j<24;j++){
     const state=await page.evaluate(()=>{
      const d=window.SevenSinsDebug3D;d.god();d.power();
      return {response:d.kitMove('ult'),cine:d.dimState().cinematic};
     });
     if(state.cine&&state.cine.phase==='aura'){launch=true;break;}
     await sleep(800);
    }
    if(!launch)throw Error("Ultimate não iniciou por kitMove(ult)");
    // Storyboard real: frontal, seis tomadas separadas, pré-ruptura e
    // TRÊS explosões com momento de formação e de expansão registrados.
    // Um blast só: mostrar CARGA, núcleo único, coluna subindo,
    // copa de fogo crescendo, anéis da mesma explosão e dissipação.
    const schedule=[
     ['01-bispo-frente',1.25,'FRONTAL_BISPO'],
     ['02-aura-controlada',2.88,'FRONTAL_BISPO'],
     ['03-circulo-1',3.91,'CIRCULO_1'],
     ['04-circulo-2',5.03,'CIRCULO_2'],
     ['05-circulo-3',6.14,'CIRCULO_3'],
     ['06-circulo-4',7.26,'CIRCULO_4'],
     ['07-circulo-5',8.38,'CIRCULO_5'],
     ['08-circulo-6',9.49,'CIRCULO_6'],
     ['09-carga-antes-da-explosao',10.52,'EXPLOSOES_VISTA_ALTA'],
     ['10-nucleo-ignite',11.20,'EXPLOSOES_VISTA_ALTA'],
     ['11-coluna-crescendo',11.94,'EXPLOSOES_VISTA_ALTA'],
     ['12-copa-formando',12.77,'EXPLOSOES_VISTA_ALTA'],
     ['13-cogumelo-abrindo',13.63,'EXPLOSOES_VISTA_ALTA'],
     ['14-apice-uma-explosao',14.40,'EXPLOSOES_VISTA_ALTA'],
     ['15-dissipacao',15.03,'EXPLOSOES_VISTA_ALTA']];
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
      burstCount:state.bursts.length,vfx:state.vfx,bossFrozen:state.bossFrozen,mixerScale:state.mixerScale,bossPos:state.bossPos,lockPos:state.lockPos,occluders:state.occluders,hudCompact:state.hudCompact,bytes};
     data.frames.push(frame);
     if(frame.shot!==expectedShot)throw Error("PLANO ERRADO "+name+": "+frame.shot+" em vez de "+expectedShot);
     if(!frame.vfx)throw Error("VFX invisível em "+name);
     if(!frame.hudCompact)throw Error("A interface do jogo cobriu a cinematográfica "+name);
     if(!frame.bossFrozen || frame.mixerScale!==0)throw Error('O BISPO SE MOVE DURANTE A ULTIMATE em '+name);
     if(frame.bossPos&&frame.lockPos&&frame.bossPos.some((v,j)=>Math.abs(v-frame.lockPos[j])>.03))
      throw Error('Bispo saiu do lugar durante a ultimate: '+name);
     if(frame.phase!=='aura'&&frame.occluders<3)
      throw Error("Cogumelos gigantes ainda atrapalham a câmera "+name);
    }
    const camHeights=data.frames.slice(2,8).map(f=>f.camera?.[1]);
    for(let j=1;j<6;j++){
     const d=camHeights[j]-camHeights[j-1];
     if(!(d>=5&&d<=9))
      throw Error("A câmera NÃO subiu um patamar no círculo "+(j+1)+": "+d+" ("+camHeights+")");
    }
    if(!(data.frames[0].camera[1]<data.frames[2].camera[1])
      ||data.frames[0].fov>51)
      throw Error("A câmera não começou frontal e próxima ao Bispo");
    if(data.frames[8].sealCount!==6 ||
       data.frames[8].burstCount!==0 ||
       data.frames[9].burstCount!==1 ||
       data.frames[14].burstCount!==1 ||
       data.frames[8].camera[1]<=camHeights[5])
      throw Error("Seis selos/uma explosão/câmera final inválidos");
    if(data.glErrors.length||data.jsErrors.some(e=>/ReferenceError|SyntaxError|Asset falhou/.test(e)))
      throw Error("Erro WebGL/JS detectado: "+JSON.stringify(data.glErrors.concat(data.jsErrors)).slice(0,1200));
    data.status="approved";
    data.visualReview="As capturas precisam de comparação humana com as referências originais; aprovação técnica não mede fidelidade artística.";
    process.stdout.write("[BISPO3 281] "+mode+" -> 6 selos, 1 blast, screenshots reais, sem shader error.\n");
   }catch(e){
    data.status="failed";data.failure=String(e.stack||e).slice(0,1400);
    process.stderr.write("[BISPO3 281] "+mode+" FAIL: "+data.failure+"\n");process.exitCode=1;
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
main().catch(e=>{console.error(e);process.exitCode=1;});
