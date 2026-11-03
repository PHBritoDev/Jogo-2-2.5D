"use strict";
/**
 * Agente V6: auditor de CENAS (nao substitui o agente de combate V5).
 * Grava a ultimate cosmica ja existente do Bispo 2 em orientacoes de celular.
 * A futura ultimate usa o mesmo contrato de evidencias quando tiver QA no motor.
 * Nunca interfere com jogo salvo: ?testeDimensao= e ?debug3d=1.
 */
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const {assessCinematic,PHASES,auditHudCover}=require("./cinematic-criteria.cjs");
const {inspectRun,readBaseline,prepareBaseline}=require("./cinematic-visual.cjs");
const ROOT=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results");
const CINE=path.join(ROOT,"cinematica");
const BASE=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const MODES=Object.freeze({
  landscape:{width:852,height:480},
  portrait:{width:393,height:852}
});
const wanted=(process.env.CINEMA_SIZES||"landscape,portrait").split(",").map(x=>x.trim()).filter(Boolean);
if(!wanted.length||wanted.some(x=>!Object.prototype.hasOwnProperty.call(MODES,x)))
  throw Error("CINEMA_SIZES inválido. Permitidos: landscape,portrait");
const TARGETS={bishop2:{profile:"vorgazhek",label:"Cosmica de Vorgazhek"},bishop3:{profile:"zarkhael",label:"Futura cinematica de Zarkhael"}};
const TARGET=process.env.CINEMA_TARGET||"bishop2";
if(!TARGETS[TARGET])throw Error("CINEMA_TARGET deve ser bishop2 ou bishop3");
const EXPECTED=(process.env.CINEMA_PHASES||"").split(",").map(x=>x.trim()).filter(Boolean);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const safeName=x=>String(x??"").replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,44);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rounded=x=>Number.isFinite(x)?+x.toFixed(3):null;
fs.mkdirSync(CINE,{recursive:true});
async function state(page){
  return page.evaluate(()=>{
    const d=window.SevenSinsDebug3D;
    if(!d||typeof d.dimState!=="function")return null;
    const dim=d.dimState(),player=d.state();
    let cine=null,probe=null;
    try{cine=d.cineState();}catch{}
    try{probe=d.sceneProbe();}catch{}
    let audio=null;try{audio=d.audioState?.()||null;}catch{}
    return {dim,player,cine,probe,audio};
  });
}
async function shot(page,dir,result,name){
  const relative="screenshots/"+safeName(name)+".png";
  try{
    await page.screenshot({path:path.join(dir,relative),timeout:25000,animations:"disabled"});
    result.captures.push(relative);
  }catch(e){result.warnings.push("Print "+name+": "+e.message.slice(0,250));}
}
async function readyBattle(page,result){
  await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.dimState==="function",
    null,{timeout:115000});
  const deadline=Date.now()+95000;
  while(Date.now()<deadline){
    const s=await state(page);
    if(s?.dim?.vs){
      // Um click() feito via evaluate nao constitui ativacao de usuario para
      // WebAudio. Playwright .click() envia um gesto verdadeiro ao navegador.
      try{
        const btn=page.locator("#vs-go");
        await btn.click({timeout:6500});
        result.qa.trustedStartClick=true;
      }catch(e){
        result.qa.trustedStartClick=false;
        result.warnings.push("VS sem gesto real: "+String(e).slice(0,160));
        await page.evaluate(()=>window.SevenSinsDebug3D.vsGo()).catch(()=>{});
      }
    }
    if(s?.dim?.battle?.active&&s.dim.visible&&s.dim.profile===TARGETS[TARGET].profile)return s;
    await pause(1750);
  }
  throw Error("A dimensão de "+TARGET+" não entrou na batalha de teste");
}
async function launchUltimate(page,result){
  const deadline=Date.now()+28000;
  while(Date.now()<deadline){
    const launch=await page.evaluate(()=>{
      const d=window.SevenSinsDebug3D;
      d.god();d.skills();d.speed(2);
      d.power();
      // Nao confundir nome do kitMove com a prova de que a cena iniciou.
      const reply=d.kitMove("ult"),dim=d.dimState();
      return {reply,cosmic:dim.cinematic||dim.cosmic||null,profile:dim.profile};
    });
    if(launch.cosmic){
      result.launch=launch.reply;
      return true;
    }
    await pause(2500);
  }
  throw Error("O motor não iniciou a ultimate de "+TARGET+"; exija kitMove(ult) e dimState().cinematic (ou cosmic, Bispo 2)");
}
async function inspectOnce(page,result,mode){
  const s=await state(page),now=Date.now();
  if(!s)throw Error("API QA desapareceu durante a cena");
  const dim=s.dim||{},probe=s.probe||{};
  const camera=probe.camera?.xyz||s.cine?.cam||null;
  const cinematic=dim.cinematic||dim.cosmic||null;
  const row={ms:now-result.startedMs,phase:cinematic?.phase||null,
    cosmic:cinematic?{phase:cinematic.phase,pi:cinematic.pi,pt:cinematic.pt,
      lock:cinematic.lock,white:cinematic.white,circles:cinematic.circles}:null,
    camera:Array.isArray(camera)?camera.map(Number):null,
    fov:Number.isFinite(dim.camFov)?dim.camFov:null,
    hero:[s.player?.x,s.player?.y,s.player?.z].map(Number),
    hp:dim.hp,audio:s.audio?.state??"indisponivel",audioMuted:s.audio?.muted??null,
    drawCalls:probe.renderer?.calls??null,
    triangles:probe.renderer?.triangles??null,mode};
  result.samples.push(row);
  return row;
}
async function oneMode(browser,mode){
  const dir=path.join(CINE,mode),shots=path.join(dir,"screenshots"),videoDir=path.join(dir,"videos");
  fs.mkdirSync(shots,{recursive:true});fs.mkdirSync(videoDir,{recursive:true});
  const result={mode,target:TARGET,viewport:MODES[mode],startedMs:Date.now(),started:false,ended:false,
    captures:[],samples:[],warnings:[],errors:[],launch:null,video:null,qa:{},
    browser:"Chromium + WebGL SwiftShader (não é FPS de Android)"};
  let context,page;
  try{
    context=await browser.newContext({viewport:MODES[mode],deviceScaleFactor:1,
      isMobile:true,hasTouch:true,recordVideo:{dir:videoDir,size:MODES[mode]}});
    page=await context.newPage();
    page.on("pageerror",e=>{if(result.errors.length<20)result.errors.push("JS: "+e.message.slice(0,400));});
    page.on("requestfailed",r=>{if(result.warnings.length<20)result.warnings.push("Recurso: "+r.url().slice(0,130));});
    const url=BASE+"/mundo-3d-prototype.html?testeDimensao="+TARGET+"&debug3d=1&build=cinema-v6";
    result.url=url;
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
    const initial=await readyBattle(page,result);
    result.qa.audioBefore=initial.audio||null;
    const gl=await page.evaluate(()=>{
      const canvas=document.getElementById("scene"),ctx=canvas?.getContext("webgl2")||canvas?.getContext("webgl");
      return {valid:!!ctx,width:canvas?.width,height:canvas?.height};
    });
    if(!gl.valid)throw Error("WebGL não disponível no navegador");
    result.webgl=gl;
    result.qa.startFov=initial.dim.camFov;
    await shot(page,dir,result,mode+"-00-antes");
    await page.evaluate(()=>{
      const meter={last:0,frames:[],active:true};window.__cinemaMeter=meter;
      const tick=t=>{if(!meter.active)return;if(meter.last){
        const dt=t-meter.last;if(dt>0&&dt<5000){meter.frames.push(dt);if(meter.frames.length>2400)meter.frames.shift();}
      }meter.last=t;requestAnimationFrame(tick);};
      requestAnimationFrame(tick);
    });
    await launchUltimate(page,result);
    result.started=true;
    result.qa.audioAtLaunch=(await state(page))?.audio||null;
    // Mede a interferencia geometrica do HUD, inclusive no retrato de celular.
    // Este calculo NUNCA modifica a interface e nao simula pixels invisiveis.
    const hudRects=await page.evaluate(()=>{
      const ids=["#top","#top-right","#enemy-hud","#hud-hero","#player-hud",
        "#status","#quest-box","#hint","#dim-test-panel","#combat-callout"];
      return ids.map(selector=>{
        const el=document.querySelector(selector);
        if(!el)return null;
        const style=getComputedStyle(el),box=el.getBoundingClientRect();
        return {selector,x:box.x,y:box.y,width:box.width,height:box.height,
          visible:style.display!=="none"&&style.visibility!=="hidden"&&
          Number(style.opacity)>.05&&!el.hidden&&box.width>0&&box.height>0};
      }).filter(Boolean);
    });
    result.qa.hud=auditHudCover(MODES[mode],hudRects);
    result.qa.hudRectangles=hudRects;
    const observed=new Set(),phaseStartedAt=new Map(),phaseShotTier=new Map();
    const deadline=Date.now()+115000;
    let sawActive=false,round=0;
    while(Date.now()<deadline){
      const v=await inspectOnce(page,result,mode);
      const phase=v.phase;
      if(phase){sawActive=true;observed.add(phase);}
      if(sawActive&&!phase){result.ended=true;break;}
      if(!v.hp||v.hp<=0||!Number.isFinite(v.fov)){
        result.warnings.push("HP ou FOV inválido na amostra "+round);
      }
      // A V6 tirava somente uma imagem por fase: podia perder a magia
      // que so aparece no meio/fim. Agora registra entrada, meio e fim,
      // sempre que o tempo real permitir, ate 18 imagens por orientacao.
      if(phase&&!phaseStartedAt.has(phase))phaseStartedAt.set(phase,Date.now());
      const age=phase?(Date.now()-phaseStartedAt.get(phase)):0;
      const tier=age>=2600?2:age>=950?1:0;
      const before=phaseShotTier.get(phase)??-1;
      if(phase&&tier>before&&result.captures.length<18){
        const name=mode+"-"+String(result.captures.length).padStart(2,"0")+
          "-"+phase+"-"+["entrada","meio","fim"][tier];
        await shot(page,dir,result,name);
        phaseShotTier.set(phase,tier);
      }
      round++;
      await pause(650);
    }
    result.phases=[...observed];
    result.qa.endFov=(await state(page))?.dim?.camFov??null;
    if(result.ended){
      const s=await state(page);
      result.qa.finalLock=(s?.dim?.cinematic||s?.dim?.cosmic)?.lock??false;
      const posBefore=[s?.player?.x,s?.player?.z];
      await page.keyboard.down("w");
      await pause(850);
      await page.keyboard.up("w");
      await pause(350);
      const after=await state(page);
      const posAfter=[after?.player?.x,after?.player?.z];
      result.qa.movementAttempted=true;
      result.qa.moveMeters=posBefore.every(Number.isFinite)&&posAfter.every(Number.isFinite)?
        rounded(Math.hypot(posAfter[0]-posBefore[0],posAfter[1]-posBefore[1])):null;
      result.qa.endFov=after?.dim?.camFov??null;
      result.qa.audioAtEnd=after?.audio||null;
    }
    result.qa.perf=await page.evaluate(()=>{
      const m=window.__cinemaMeter;
      if(!m)return null;m.active=false;
      const f=[...m.frames].sort((a,b)=>a-b);
      if(!f.length)return {samples:0};
      return {samples:f.length,medianFrameMs:f[Math.floor(f.length*.5)],
        p95FrameMs:f[Math.min(f.length-1,Math.floor(f.length*.95))],
        note:"Valores somente do Chromium/SwiftShader, nao do Android"};
    }).catch(()=>null);
    await shot(page,dir,result,mode+"-99-depois");
  }catch(e){
    result.errors.push(e.stack||String(e));
    if(page&&!page.isClosed())await shot(page,dir,result,mode+"-erro");
  }finally{
    if(context){
      try{
        const video=page?.video();
        await context.close();
        if(video)result.video=path.relative(dir,await video.path()).replace(/\\/g,"/");
      }catch(e){result.warnings.push("Vídeo: "+e.message.slice(0,250));}
    }
  }
  // Verifica conteudo dos PNGs realmente salvos, nao apenas as fases do motor.
  result.visual=await inspectRun(dir,mode,result.captures,readBaseline()).catch(e=>({
    frames:[],comparisons:[],warnings:[],errors:[{code:"visual_analyzer_failed",detail:String(e.message)}],contact:null}));
  result.assessment=assessCinematic(result.samples,{
    started:result.started,ended:result.ended,
    browserErrors:result.errors,startFov:result.qa.startFov,
    endFov:result.qa.endFov,finalLock:result.qa.finalLock,
    movementAttempted:result.qa.movementAttempted,moveMeters:result.qa.moveMeters,
    captures:result.captures.length,phases:EXPECTED.length?EXPECTED:TARGET==="bishop2"?PHASES:[],
    hud:result.qa.hud,perf:result.qa.perf,
    audioStates:result.samples.map(x=>x.audio),audioMuted:result.qa.audioAtEnd?.muted??false,
    visual:result.visual
  });
  result.status=result.assessment.status;
  fs.writeFileSync(path.join(dir,"relatorio.json"),JSON.stringify(result,null,2)+"\n");
  process.stdout.write("[CINEMA "+mode+"] "+result.status+" | "+
    result.assessment.phases.join(",")+" | prints="+result.captures.length+"\n");
  return result;
}
function indexReport(results){
  const summary={schema:1,commit:process.env.GITHUB_SHA||"local",target:TARGET,
    status:results.length&&results.every(r=>r.status==="capturado_para_revisao")?
      "capturado_para_revisao":"falhou",
    profiles:results.map(r=>({mode:r.mode,status:r.status,phases:r.assessment.phases,
      warnings:r.assessment.warnings.length,errors:r.assessment.problems.length,
      viewport:r.viewport,captures:r.captures.length,perf:r.qa.perf,
      movementMeters:r.qa.moveMeters,hud:r.qa.hud,audioAtEnd:r.qa.audioAtEnd,clickedVS:r.qa.trustedStartClick,
      visualWarnings:r.visual?.warnings?.length||0,visualErrors:r.visual?.errors?.length||0,
      baselineComparisons:r.visual?.comparisons?.length||0})),
    note:"Analise estrutural e evidencias, sem aprovacao artistica automatica. "+
      "O Bispo 3 requer implementacao de kitMove(ult) e dimState().cinematic."
  };
  fs.writeFileSync(path.join(CINE,"resumo.json"),JSON.stringify(summary,null,2)+"\n");
  const items=results.map(r=>'<section style="margin:24px 0;padding:15px;background:#1e293b;border-radius:12px"><h2>'+
    esc(r.mode)+" — "+esc(r.status)+'</h2><p>Fases: '+esc(r.assessment.phases.join(" → "))+
    '</p><p>Problemas: '+esc(r.assessment.problems.map(x=>x.code).join(", ")||"nenhum")+
    ' · Avisos: '+esc(r.assessment.warnings.map(x=>x.code).join(", ")||"nenhum")+
    '</p><p>Imagens auditadas: '+(r.visual?.frames?.length||0)+
    ' · Alertas de pixels: '+(r.visual?.warnings?.length||0)+
    ' · Comparações com histórico: '+(r.visual?.comparisons?.length||0)+
    '</p><p>Movimento após a cena: '+esc(r.qa.moveMeters??"não confirmado")+
    ' unidades · FOV final: '+esc(r.qa.endFov??"—")+
    ' · HUD central: '+esc(r.qa.hud?.centerCoverage!==undefined?Math.round(r.qa.hud.centerCoverage*100)+'%':"indisponível")+
    ' · p95 frame (SwiftShader): '+esc(r.qa.perf?.p95FrameMs!==undefined?Math.round(r.qa.perf.p95FrameMs)+' ms':"indisponível")+
    ' · WebAudio: '+esc(r.qa.audioAtEnd?.state??"não observado")+'</p>'+
    (r.visual?.contact?'<p><a href="'+esc(r.mode+'/'+r.visual.contact)+'"><img alt="Contato com os quadros da cena" loading="lazy" style="width:100%;max-width:960px;border-radius:9px" src="'+esc(r.mode+'/'+r.visual.contact)+'"></a></p>':"")+
    (r.video?'<video controls playsinline preload="metadata" style="width:100%;max-width:760px" src="'+
       esc(r.mode+"/"+r.video)+'"></video>':"")+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(220px,48vw),1fr));gap:8px">'+
    r.captures.map(f=>'<a href="'+esc(r.mode+"/"+f)+'"><img loading="lazy" alt="'+
      esc(f)+'" src="'+esc(r.mode+"/"+f)+'" style="width:100%;border-radius:7px"></a>').join("")+
    '</div><p><a href="'+esc(r.mode+'/relatorio.json')+'">Telemetria detalhada</a></p></section>').join("");
  const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Auditoria cinematográfica do jogo</title>'+
    '<style>body{background:#0f172a;color:#e2e8f0;font:15px system-ui;max-width:1050px;margin:auto;padding:20px}a{color:#7dd3fc}p{line-height:1.5}</style>'+
    '<h1>🎬 Agente V6 — Auditoria cinematográfica</h1><p>Status: '+esc(summary.status)+
    '. Os vídeos são reais do navegador, não comprovam performance em celular físico ou beleza do efeito.</p>'+
    items+'</html>';
  fs.writeFileSync(path.join(CINE,"ver-cena.html"),html);
  const md="# Agente V6 — Auditoria cinematográfica\n\n"+
    "- Status: "+summary.status+"\n- Commit: "+summary.commit+
    "\n- Perfis: "+summary.profiles.map(x=>x.mode+"="+x.status).join(", ")+
    "\n\nAbra cinematica/ver-cena.html após extrair o artefato. A inspeção humana das imagens e do vídeo continua necessária.\n";
  fs.writeFileSync(path.join(CINE,"DIAGNOSTICO.md"),md);
  return summary;
}
async function run(){
  let browser,results=[];
  try{
    browser=await chromium.launch({headless:true,args:[
      "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
      "--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"
    ]});
    for(const mode of wanted)results.push(await oneMode(browser,mode));
  }catch(e){process.stderr.write("Auditoria: "+String(e.stack||e)+"\n");}
  finally{if(browser)await browser.close().catch(()=>{});}
  const result=indexReport(results);
  // Salva nova referencia apenas quando ambas as orientacoes produziram
  // capturas validas. O cache anterior nunca e sobrescrito apos falha.
  const baseline=prepareBaseline(results);
  fs.writeFileSync(path.join(CINE,"baseline-status.json"),JSON.stringify(baseline,null,2)+"\n");
  process.stdout.write("[CINEMA V7] referencia visual: "+(baseline.saved?"salva":"preservada")+
    " | "+(baseline.reason||baseline.count)+"\n");
  if(result.status!=="capturado_para_revisao")process.exitCode=1;
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={indexReport};
