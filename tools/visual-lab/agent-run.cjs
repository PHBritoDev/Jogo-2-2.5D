"use strict";

/**
 * Agente visual adaptativo: abre a batalha real do Bispo 3, captura pixels
 * WebGL a cada decisao, ajusta as suas acoes a partir de imagem + telemetria
 * QA e deixa evidencias (prints, video, decisao por passo e alertas visuais).
 * Nao usa uma API de IA/multimodal; seu cerebro e um algoritmo visual local,
 * para nao exigir chaves, permissao de administracao ou servicos pagos.
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const { chromium } = require("playwright");
const { analyzePixels, decide } = require("./agent-policy.cjs");

const root = path.resolve(process.env.VISUAL_OUTPUT || "visual-lab-results");
const dir = path.join(root, "agente");
const png = path.join(dir, "screenshots");
const videos = path.join(dir, "videos");
fs.mkdirSync(png, {recursive:true});
fs.mkdirSync(videos, {recursive:true});
const base = (process.env.VISUAL_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const delay = ms => new Promise(r => setTimeout(r, ms));
const logs = { mode: "agente-visual-adaptativo", date: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || "local", browser: "Chromium/SwiftShader",
  decisions: [], captures: [], flags: [], errors: [], warnings: [], actions: [],
  status: "iniciando", disclaimer:
    "A percepcao usa pixels de capturas reais + telemetria QA, nao um modelo multimodal. Alertas visuais sao suspeitas, nao bugs confirmados."
};
let context, page, browser;
function flush(){fs.writeFileSync(path.join(dir, "agente-relatorio.json"), JSON.stringify(logs, null, 2) + "\n");}
function log(message) { console.log("[AGENTE VISUAL] " + message); }
async function screenshot(name) {
  const file = path.join(png, name + ".png");
  try {
    await page.screenshot({path:file,animations:"disabled",timeout:25000});
    logs.captures.push(path.relative(root,file));
  } catch(e) { logs.warnings.push("Screenshot "+name+": "+e.message); }
}
async function gameState(){
  return page.evaluate(()=>{
    const d=window.SevenSinsDebug3D;
    if(!d)return null;
    return {dim:d.dimState(), player:d.state()};
  });
}
async function sampleVision(previous){
  const jpg=await page.locator("#scene").screenshot({type:"jpeg",quality:52,timeout:25000});
  const {data,info}=await sharp(jpg).resize(96,54,{fit:"fill"})
    .removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.channels!==3)throw Error("A amostra visual precisa ter 3 canais RGB");
  const metrics=analyzePixels(data,info.width,info.height,previous);
  return {metrics,pixels:data};
}
async function stepAction(decision, tick, s){
  const item={tick, reason:decision.reason, buttons:[]};
  if(decision.heal){
    try{
      await page.evaluate(()=>{
        const d=window.SevenSinsDebug3D,hp=d.dimState().hp;
        if(hp>0 && hp<65)d.hurtPlayer(hp-100);
      });
      item.buttons.push("healing QA");
    }catch(e){logs.warnings.push("cura QA: "+e.message);}
  }
  if(decision.camera){
    try{
      await page.evaluate(view=>{
        const d=window.SevenSinsDebug3D,s=d.state(),e=s.enemy||{};
        if(!Number.isFinite(e.x)||!Number.isFinite(e.z))return;
        const angle=.46+view.orbit*.9;
        d.fly([e.x+Math.cos(angle)*view.distance,s.y+view.height,
               e.z+Math.sin(angle)*view.distance],
              [e.x,s.y+3.0,e.z]);
      },decision.camera);
      item.buttons.push("camera adaptativa");
    }catch(e){logs.warnings.push("camera QA: "+e.message);}
  }
  if(decision.bossSkill) {
    try{
      const spell=await page.evaluate(id=>{
        const d=window.SevenSinsDebug3D;
        d.power();
        return d.kitMove(id);
      },decision.bossSkill);
      item.buttons.push("Bispo "+decision.bossSkill+" "+String(spell));
      item.launchedSkill=spell || null;
    }catch(e){logs.warnings.push("magia chefe: "+e.message);}
  }
  // Movimento nao-determinista: reage aos pixels, ao ataque do bispo e a distancia.
  if(decision.move){
    try{
      await page.keyboard.down(decision.move);
      await delay(320+tick%4*75);
    }finally{await page.keyboard.up(decision.move).catch(()=>{});}
    item.buttons.push("movimento "+decision.move);
  }
  for(const k of decision.keys){
    try{
      await page.keyboard.press(k,{delay:80});
      item.buttons.push("tecla "+(k===" "?"pulo":k));
    }catch(e){logs.warnings.push("tecla "+k+": "+e.message);}
  }
  if(decision.cast){
    try{
      const cast=await page.evaluate(kind=>window.SevenSinsDebug3D.cast(kind),decision.cast);
      item.buttons.push("protagonista "+decision.cast);
      item.cast=cast;
    }catch(e){logs.warnings.push("magia protagonista: "+e.message);}
  }
  return item;
}

async function execute(){
  try{
    browser=await chromium.launch({headless:true,args:[
      "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
      "--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"
    ]});
    context=await browser.newContext({
      viewport:{width:852,height:480}, deviceScaleFactor:1,hasTouch:true,isMobile:true,
      recordVideo:{dir:videos,size:{width:852,height:480}}, reducedMotion:"reduce"
    });
    page=await context.newPage();
    page.on("pageerror",e=>logs.errors.push("JS: "+e.message));
    page.on("console",m=>{
      if(m.type()==="error"&&logs.errors.length<45)logs.errors.push("Console: "+m.text().slice(0,500));
    });
    page.on("requestfailed",r=>{
      if(logs.warnings.length<45)logs.warnings.push("Rede: "+r.url().slice(0,180)+": "+r.failure()?.errorText);
    });
    logs.url=base+"/mundo-3d-prototype.html?testeDimensao=bishop3&debug3d=1&build=agente-visual";
    await page.goto(logs.url,{waitUntil:"domcontentloaded",timeout:45000});
    await page.waitForFunction(()=>typeof window.SevenSinsDebug3D?.dimState==="function",
      null,{timeout:115000});
    logs.webgl=await page.evaluate(()=>{
      const canvas=document.getElementById("scene");
      const gl=canvas?.getContext("webgl2")||canvas?.getContext("webgl");
      return {valid:!!gl,version:gl?.getParameter(gl.VERSION),width:canvas?.width,height:canvas?.height};
    });
    if(!logs.webgl.valid)throw Error("Jogo carregou sem WebGL; nao ha visao 3D real");

    const deadline=Date.now()+95000;
    let ready=false;
    while(Date.now()<deadline){
      const s=await gameState();
      if(s?.dim?.vs)await page.evaluate(()=>window.SevenSinsDebug3D.vsGo()).catch(()=>{});
      if(s?.dim?.battle?.active&&s.dim.visible&&s.dim.profile==="zarkhael"){
        ready=true;break;
      }
      await delay(1750);
    }
    if(!ready){
      logs.preFight=await gameState();
      await screenshot("erro-batalha-nao-iniciou");
      throw Error("Bispo 3 nao entrou em batalha real no navegador");
    }
    await page.evaluate(()=>{
      const d=window.SevenSinsDebug3D;
      d.god();
      d.skills();
      d.speed(6);
    });
    await screenshot("00-visual-inicial");

    const seen={s1:false,s2:false,hydraObserved:false,flameObserved:false,hydraFinished:false};
    let prevPixels=null, prevPosition=null, lastPhase="",lastCastTick=-99;
    let flagsCount=0, activeSamples=0, actionSamples=0, blackoutStreak=0;
    const start=Date.now();
    for(let tick=0;tick<32 && Date.now()-start<120000;tick++){
      const state=await gameState();
      if(!state?.dim?.battle?.active || state?.dim?.hp<=0){
        logs.flags.push({tick,issue:"batalha_interrompida",state:state?.dim||null});
        break;
      }
      let visual;
      try{visual=await sampleVision(prevPixels);}
      catch(e){logs.errors.push("Captura/analise WebGL: "+e.message);break;}
      prevPixels=visual.pixels;
      const metrics=visual.metrics, phase=state.dim.hydra?.phase||
        state.dim.moonFlames?.phase||"sem-habilidade";
      if(state.dim.hydra)seen.hydraObserved=true;
      if(state.dim.moonFlames)seen.flameObserved=true;
      if(seen.hydraObserved&&!state.dim.hydra)seen.hydraFinished=true;
      if(state.dim.hydra||state.dim.moonFlames)activeSamples++;
      if(metrics.flags.length){
        flagsCount++;
        logs.flags.push({tick,phase,kind:"suspeita_visual",alerts:metrics.flags});
      }
      if(metrics.flags.includes("quadro_escuro")||
         metrics.flags.includes("poucos_detalhes_visiveis"))blackoutStreak++;
      else blackoutStreak=0;

      const decision=decide({tick,vision:metrics,state,seen,prevPosition,lastCastTick});
      if(!decision.reason.includes("aguardando_batalha_real"))actionSamples++;
      let actual;
      try{actual=await stepAction(decision,tick,state);}
      catch(e){logs.errors.push("Acao "+tick+": "+e.message); break;}
      if(decision.bossSkill && actual.launchedSkill)seen[decision.bossSkill]=true;
      if(decision.cast)lastCastTick=tick;
      prevPosition={x:state.player.x,z:state.player.z};
      const entry={tick,elapsed:+((Date.now()-start)/1000).toFixed(1),phase,
        vision:metrics,enemyDistance:
          state.player?.enemy?+Math.hypot(state.player.x-state.player.enemy.x,
            state.player.z-state.player.enemy.z).toFixed(2):null,
        hp:state.dim.hp,decision,executed:actual};
      logs.decisions.push(entry);
      if(phase!==lastPhase || metrics.flags.some(f=>f==="brilho_encobrindo_tela") && tick%3===0 ||
        tick%6===0){
        await screenshot(String(tick+1).padStart(2,"0")+"-"+phase.replace(/[^a-z_]/gi,"-"));
        lastPhase=phase;
      }
      log("passo "+tick+" | fase="+phase+" | brilho="+metrics.brightness+
        " | variacao="+metrics.change+" | movimento="+decision.move+
        " | habilidade="+(decision.bossSkill||"-")+" | " + decision.reason.join(","));
      if(blackoutStreak>=7){
        logs.flags.push({tick,issue:"muitos_quadros_escuros_verificar_webgl"});
        break;
      }
      // Duas habilidades reais gravadas e tempo de observacao suficiente.
      if(seen.hydraObserved&&seen.flameObserved&&tick>=22&&!state.dim.moonFlames)break;
      await delay(1700);
    }
    logs.finalState=await gameState();
    logs.summary={bossAbilitiesTriggered:[...["s1","s2"].filter(k=>seen[k])],
      hydraObserved:seen.hydraObserved,flameObserved:seen.flameObserved,
      stepCount:logs.decisions.length,activeSamples,actionSamples,framesWithFlags:flagsCount,
      notes: "Alertas sao heuristicas de pixels, sem prova automatica da gravidade do defeito visual."};
    await screenshot("99-visual-final");
    if(!seen.s1||!seen.hydraObserved || actionSamples<5 || logs.captures.length<3)
      throw Error("Agente nao conseguiu verificar a Hidra em batalha real com acoes/capturas suficientes");
    if(blackoutStreak>=7)throw Error("A captura visual parece escura ou sem detalhes durante varias etapas");
    logs.status="capturado_com_decisoes_adaptativas";
  }catch(e){
    logs.status="falhou";
    logs.errors.push(e.stack||String(e));
    if(page && !page.isClosed())await screenshot("erro-agente");
  }finally{
    if(context){
      try{
        const video=page?.video();
        await context.close();
        if(video)logs.videoFile=path.relative(root,await video.path());
      }catch(e){logs.errors.push("Video: "+e.message);}
    }
    if(browser)await browser.close().catch(()=>{});
    flush();
    log("resultado="+logs.status+
      " | decisoes="+logs.decisions.length+" | capturas="+logs.captures.length+
      " | erros="+logs.errors.length);
    if(logs.status!=="capturado_com_decisoes_adaptativas")process.exitCode=1;
  }
}
execute();
