"use strict";
/** Regras verificaveis para cenas cinematograficas; nao avalia beleza artistica. */
const PHASES=["boss_aura","circle_build","sword_emerge_and_fall","impact_and_return"];
const finitePoint=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const distance=(a,b)=>finitePoint(a)&&finitePoint(b)?Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]):null;
function assessCinematic(samples,meta={}){
 const problems=[],warnings=[];
 const add=(kind,code,description)=>({kind,code,description});
 if(!Array.isArray(samples)||!samples.length){
   problems.push(add("error","no_samples","Nenhuma amostra real foi coletada"));
   return {status:"falhou",problems,warnings,phases:[],durationSeconds:0,frameCount:0};
 }
 const active=samples.filter(x=>!!x?.cosmic),phases=[...new Set(active.map(x=>x.cosmic?.phase).filter(Boolean))];
 const expected=Array.isArray(meta.phases)?meta.phases:PHASES;
 if(active.length===0)problems.push(add("error","not_observed","Nenhuma fase da ultimate foi observada no motor"));
 if(!meta.started)problems.push(add("error","not_started","O motor não confirmou o lançamento da ultimate"));
 if(!meta.ended)problems.push(add("error","not_finished","A ultimate não terminou no período de teste"));
 const unknown=samples.some(x=>!finitePoint(x.camera)||!Number.isFinite(x.fov));
 if(unknown)warnings.push(add("warning","camera_telemetry","Há amostras sem câmera/FOV válidos"));
 const omitted=expected.filter(n=>!phases.includes(n));
 if(omitted.length)warnings.push(add("warning","phases_not_sampled","Não houve captura de todas as fases: "+omitted.join(", ")));
 if(meta.ended&&meta.finalLock===true)problems.push(add("error","controls_locked","Ultimate terminou mas o estado do motor ainda indica bloqueio"));
 if(meta.ended&&Number.isFinite(meta.startFov)&&Number.isFinite(meta.endFov)&&Math.abs(meta.endFov-meta.startFov)>4)
   warnings.push(add("warning","fov_not_restored","FOV final difere do inicial; verificar câmera no vídeo"));
 if(meta.movementAttempted&&!(Number.isFinite(meta.moveMeters)&&meta.moveMeters>.12))
   warnings.push(add("warning","movement_not_confirmed","Comando de movimento não mudou a posição; verificar colisões e controle"));
 const jumps=[];
 for(let i=1;i<samples.length;i++){
   const d=distance(samples[i-1].camera,samples[i].camera);
   if(d!==null&&d>40)jumps.push({at:i,meters:+d.toFixed(2)});
 }
 if(jumps.length)warnings.push(add("warning","abrupt_camera_jumps","Deslocamentos de câmera grandes; confirmar se foram cortes intencionais"));
 if(meta.browserErrors?.length)problems.push(add("error","javascript_errors",meta.browserErrors.length+" erros JavaScript durante a cena"));
 if((meta.captures||0)<4)problems.push(add("error","few_captures","Menos de quatro imagens reais da cena"));
 const first=samples[0].ms,last=samples[samples.length-1].ms;
 return {status:problems.length?"falhou":"capturado_para_revisao",problems,warnings,phases,
   expectedPhases:expected,missingPhases:omitted,largeCameraJumps:jumps,
   durationSeconds:Number.isFinite(first)&&Number.isFinite(last)?+((last-first)/1000).toFixed(1):0,
   frameCount:samples.length,sceneEnded:!!meta.ended,moveMeters:meta.moveMeters??null,
   disclaimer:"Testes estruturais no Chromium/SwiftShader. A captura nao comprova beleza, FPS Android ou ausencia de bugs visuais."};
}
module.exports={PHASES,finitePoint,distance,assessCinematic};
