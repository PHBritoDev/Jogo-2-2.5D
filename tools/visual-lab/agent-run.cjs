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
const { inspectFrame, cameraWinner, summarizeRun } = require("./agent-perception.cjs");
const { writeReport } = require("./agent-report.cjs");
const abilityObserver = require("./ability-observer-v8.cjs");

const root = path.resolve(process.env.VISUAL_OUTPUT || "visual-lab-results");
const dir = path.join(root, "agente");
const png = path.join(dir, "screenshots");
const videos = path.join(dir, "videos");
fs.mkdirSync(png, {recursive:true});
fs.mkdirSync(videos, {recursive:true});
const roundProfile = ["padrao", "proximidade", "alternativo"].includes(process.env.AGENT_ROUND_PROFILE) ? process.env.AGENT_ROUND_PROFILE : "padrao";
const base = (process.env.VISUAL_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const delay = ms => new Promise(r => setTimeout(r, ms));
const logs = { mode: "agente-visual-adaptativo", roundProfile, date: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || "local", browser: "Chromium/SwiftShader",
  decisions: [], captures: [], flags: [], errors: [], warnings: [], actions: [], cameraSearches: [],
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
    let probe=null;try{if(typeof d.sceneProbe==="function")probe=d.sceneProbe();}catch(e){probe={error:String(e)};}
    return {dim:d.dimState(), player:d.state(), sceneProbe:probe};
  });
}
async function sampleVision(previous){
  const jpg=await page.locator("#scene").screenshot({type:"jpeg",quality:52,timeout:25000});
  const {data,info}=await sharp(jpg).resize(96,54,{fit:"fill"})
    .removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.channels!==3)throw Error("A amostra visual precisa ter 3 canais RGB");
  const old=analyzePixels(data,info.width,info.height,previous);
  const rich=inspectFrame(data,info.width,info.height,previous);
  // Mantem indicadores conhecidos da politica V1 e adiciona zonas, bordas,
  // movimento e nota de visibilidade. Nenhuma IA semantica e envolvida.
  const metrics={...old,...rich,flags:[...new Set([...old.flags,...rich.flags])],
    centerDarkFraction:old.centerDarkFraction,centerBrightFraction:old.centerBrightFraction};
  return {metrics,pixels:data};
}

/** Examina de fato tres cameras e escolhe a imagem menos bloqueada.
 * Nao supoe que a primeira configuracao e a melhor. */
async function cameraSweep(tick){
  // Cada rodada consecutiva testa angulos diferentes do MESMO jogo.
  // Mudar a camera nao muda dano, poderes, colisoes ou o comportamento normal.
  const optionSets={
    padrao:[
      {id:"frontal-alta",orbit:.35,distance:17,height:9},
      {id:"lateral",orbit:1.92,distance:22,height:8},
      {id:"diagonal-distante",orbit:3.55,distance:28,height:12}
    ],
    proximidade:[
      {id:"proxima-frontal",orbit:.7,distance:12,height:6.5},
      {id:"proxima-lateral",orbit:2.25,distance:16,height:7},
      {id:"diagonal-media",orbit:4.0,distance:21,height:8}
    ],
    alternativo:[
      {id:"posterior-alta",orbit:3.1,distance:20,height:11},
      {id:"lateral-oposta",orbit:4.7,distance:20,height:8},
      {id:"longa-alta",orbit:5.6,distance:32,height:14}
    ]
  };
  const options=optionSets[roundProfile];
  const candidates=[];
  for(const option of options){
    await page.evaluate(v=>{
      const d=window.SevenSinsDebug3D,s=d.state(),e=s.enemy||{};
      if(!Number.isFinite(e.x)||!Number.isFinite(e.z))return;
      const angle=v.orbit;
      d.fly([e.x+Math.cos(angle)*v.distance,s.y+v.height,
             e.z+Math.sin(angle)*v.distance],[e.x,s.y+3.1,e.z]);
    },option);
    await delay(400);
    const sample=await sampleVision(null);
    candidates.push({...option,vision:sample.metrics});
  }
  const winner=cameraWinner(candidates);
  if(winner){
    await page.evaluate(v=>{
      const d=window.SevenSinsDebug3D,s=d.state(),e=s.enemy||{};
      if(!Number.isFinite(e.x)||!Number.isFinite(e.z))return;
      d.fly([e.x+Math.cos(v.orbit)*v.distance,s.y+v.height,
             e.z+Math.sin(v.orbit)*v.distance],[e.x,s.y+3.1,e.z]);
    },winner);
  }
  logs.cameraSearches.push({
    tick,chosen:winner?.id??null,
    options:candidates.map(v=>({id:v.id,quality:v.vision.quality,flags:v.vision.flags}))
  });
  log("camera auditada: "+(winner?.id??"nenhuma")+" / notas "+
    candidates.map(v=>v.id+"="+v.vision.quality).join(", "));
  return winner;
}

async function stepAction(decision, tick, s){
  const item={tick, reason:decision.reason, buttons:[]};
  if(decision.heal){
    try{
      await page.evaluate(()=>{
        const d=window.SevenSinsDebug3D,hp=d.dimState().hp;
        if(hp>0 && hp<95)d.hurtPlayer(hp-100);
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
      const action=await page.evaluate(id=>{
        const d=window.SevenSinsDebug3D;
        const before=d.dimState();
        // Combos nao podem nascer sobre outro cast ativo. O kitMove antigo
        // retorna nome mesmo se startHydra recusar por conflito.
        const busy=!!(before.hydra||before.moonFlames);
        if(busy)return {accepted:false,reason:"conflito_de_habilidade",active:before.hydra?"hydra":"flames"};
        d.power();
        const name=d.kitMove(id);
        const after=d.dimState();
        const started=id==="s1"?!!after.hydra:id==="s2"?!!after.moonFlames:!!name;
        return {accepted:!!name&&started,name,reason:started?"fase_ativa_confirmada":"sem_estado_ativo"};
      },decision.bossSkill);
      item.buttons.push("Bispo "+decision.bossSkill+" "+String(action.name||action.reason));
      item.skillConfirmation=action;
      item.launchedSkill=action.accepted?action.name:null;
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
    // QA-only: o poder Hidra causa dano rapido mesmo com "god".
    // Uma captura WebGL/camera pode demorar varios segundos em SwiftShader.
    // Curar apenas entre capturas era tarde: em execucoes reais o heroi
    // perdeu a batalha antes do segundo poder (evidencia Run 41589780231).
    await page.evaluate(()=>{
      const d=window.SevenSinsDebug3D;
      d.god();
      d.skills();
      d.speed(3);  // 6x acelerava dano enquanto Playwright fotografava.
      if(window.__qaAbilityRecorderInterval)clearInterval(window.__qaAbilityRecorderInterval);
      window.__qaAbilityBuffer=[];
      const captureAbility=()=>{
        try{
          const dim=window.SevenSinsDebug3D?.dimState?.();
          if(!dim?.battle?.active||dim.profile!=="zarkhael")return;
          const record={at:performance.now(),hydra:dim.hydra?{phase:dim.hydra.phase}:null,
            moonFlames:dim.moonFlames?{phase:dim.moonFlames.phase}:null};
          // Keep short proof of positive phase samples, not a giant screenshot buffer.
          if(record.hydra||record.moonFlames){
            if(window.__qaAbilityBuffer.length<300)window.__qaAbilityBuffer.push(record);
          }
        }catch(_e){}
      };
      captureAbility();
      window.__qaAbilityRecorderInterval=setInterval(captureAbility,85);
      if(window.__visualQAHealingInterval)clearInterval(window.__visualQAHealingInterval);
      window.__visualQAHeals=0;
      window.__visualQAHealErrors=0;
      const survive=()=>{
        try{
          const live=window.SevenSinsDebug3D;
          const state=live?.dimState?.();
          if(!state?.battle?.active || !state.visible ||
              state.profile!=="zarkhael" || !Number.isFinite(state.hp) ||
              state.hp<=0 || state.hp>=95)return;
          // Metodo existente da API debug; nunca habilita cura a jogador real.
          live.hurtPlayer(state.hp-100);
          window.__visualQAHeals++;
        }catch(_e){window.__visualQAHealErrors++;}
      };
      survive();
      window.__visualQAHealingInterval=setInterval(survive,200);
    });
    await screenshot("00-visual-inicial");

    const seen={s1:false,s2:false,hydraObserved:false,flameObserved:false,hydraFinished:false};
    const abilityState=abilityObserver.newState();
    const drainAbility=async()=>{
      const samples=await page.evaluate(()=>window.__qaAbilityBuffer?.splice(0)||[]);
      for(const sample of samples)abilityObserver.ingest(abilityState,sample);
      const proof=abilityObserver.evidence(abilityState);
      if(proof.hydraObserved)seen.hydraObserved=true;
      if(proof.flameObserved)seen.flameObserved=true;
      return proof;
    };
    let prevPixels=null, prevPosition=null, lastPhase="",lastCastTick=-99, lastCameraScan=-99;
    let flagsCount=0, activeSamples=0, actionSamples=0, blackoutStreak=0;
    const start=Date.now();
    for(let tick=0;tick<32 && Date.now()-start<120000;tick++){
      const state=await gameState();
      await drainAbility();
      if(!state?.dim?.battle?.active || state?.dim?.hp<=0){
        logs.flags.push({tick,issue:"batalha_interrompida",state:state?.dim||null});
        break;
      }
      let visual;
      try{visual=await sampleVision(prevPixels);}
      catch(e){logs.errors.push("Captura/analise WebGL: "+e.message);break;}
      let metrics=visual.metrics;
      let swept=false;
      const needsAngle=metrics.flags.some(flag=>[
        "possivel_objeto_escuro_obstruindo_camera",
        "centro_sem_visibilidade","brilho_encobrindo_tela","quadro_escuro"
      ].includes(flag));
      if((tick===1||tick===8||(needsAngle&&tick-lastCameraScan>=5))&&
          tick-lastCameraScan>=4){
        try{
          const picked=await cameraSweep(tick);
          if(picked){
            swept=true;
            lastCameraScan=tick;
            await screenshot("camera-escolhida-"+String(tick).padStart(2,"0")+"-"+picked.id);
            // A camera mudou; comparar movimento entre dois angulos seria falso.
            visual=await sampleVision(null);
            metrics=visual.metrics;
          }
        }catch(e){logs.warnings.push("varredura de camera: "+e.message);}
      }
      prevPixels=visual.pixels;
      const phase=state.dim.hydra?.phase||
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
      if(swept){decision.camera=null;decision.reason.push("camera_escolhida_por_comparacao_de_pixeis");}
      if(!decision.reason.includes("aguardando_batalha_real"))actionSamples++;
      let actual;
      try{actual=await stepAction(decision,tick,state);}
      catch(e){logs.errors.push("Acao "+tick+": "+e.message); break;}
      if(decision.bossSkill && actual.launchedSkill)seen[decision.bossSkill]=true;
      if(decision.cast)lastCastTick=tick;
      prevPosition={x:state.player.x,z:state.player.z,attemptedMove:!!decision.move};
      const entry={tick,elapsed:+((Date.now()-start)/1000).toFixed(1),phase,
        vision:metrics,enemyDistance:
          state.player?.enemy?+Math.hypot(state.player.x-state.player.enemy.x,
            state.player.z-state.player.enemy.z).toFixed(2):null,
        hp:state.dim.hp,sceneProbe:state.sceneProbe||null,decision,executed:actual};
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
    await drainAbility();
    logs.abilityEvidence=abilityObserver.evidence(abilityState);
    logs.finalState=await gameState();
    logs.qaHealing=await page.evaluate(()=>({heals:window.__visualQAHeals||0,
      errors:window.__visualQAHealErrors||0,active:!!window.__visualQAHealingInterval}));
    logs.summary={bossAbilitiesTriggered:[...["s1","s2"].filter(k=>seen[k])],
      hydraObserved:seen.hydraObserved,flameObserved:seen.flameObserved,
      stepCount:logs.decisions.length,activeSamples,actionSamples,framesWithFlags:flagsCount,
      notes: "Alertas sao heuristicas de pixels, sem prova automatica da gravidade do defeito visual.",
      diagnostic:summarizeRun(logs),cameraAnalyses:logs.cameraSearches.length};
    await screenshot("99-visual-final");
    if(!seen.s1||!seen.hydraObserved||!seen.s2||!seen.flameObserved || actionSamples<5 || logs.captures.length<3)
      throw Error("Agente nao conseguiu verificar a Hidra em batalha real com acoes/capturas suficientes");
    if(blackoutStreak>=7)throw Error("A captura visual parece escura ou sem detalhes durante varias etapas");
    logs.status="capturado_com_decisoes_adaptativas";
  }catch(e){
    logs.status="falhou";
    logs.errors.push(e.stack||String(e));
    if(page && !page.isClosed())await screenshot("erro-agente");
  }finally{
    if(page && !page.isClosed()){
      try{await page.evaluate(()=>{
        if(window.__qaAbilityRecorderInterval){clearInterval(window.__qaAbilityRecorderInterval);window.__qaAbilityRecorderInterval=null;}
        if(window.__visualQAHealingInterval){
          clearInterval(window.__visualQAHealingInterval);
          window.__visualQAHealingInterval=null;
        }
      });}catch(_e){}
    }
    if(context){
      try{
        const video=page?.video();
        await context.close();
        if(video)logs.videoFile=path.relative(root,await video.path());
      }catch(e){logs.errors.push("Video: "+e.message);}
    }
    if(browser)await browser.close().catch(()=>{});
    try{
      const report=writeReport(logs,dir);
      logs.diagnostic={issues:report.issues,summary:report.summary,
        dashboard:"agente/ver-analise.html",report:"agente/DIAGNOSTICO.md"};
    }catch(e){logs.warnings.push("Gerar painel: "+e.message);}
    flush();
    log("resultado="+logs.status+
      " | decisoes="+logs.decisions.length+" | capturas="+logs.captures.length+
      " | erros="+logs.errors.length);
    if(logs.status!=="capturado_com_decisoes_adaptativas")process.exitCode=1;
  }
}
execute();
