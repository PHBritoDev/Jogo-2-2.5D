"use strict";
/**
 * Agente V9: "preflight" de substituicao de GLB.
 * Nao altera personagem, malha, rig, animacoes ou arquivos do jogo.
 * Le metadados V7 e calcula o que precisa ser validado antes de um swap.
 */
const {inspectModel}=require("./agent-v7-glb-audit.cjs");
const REQUIRED=["idle","walk","run","attack","hurt","fall","getup","jump","dash","death"];
const NICE=["facialMorphs","jawNode","skin"];
function analyzeReplacement(oldGLB,newGLB,{name="personagem",mobileMaxBytes=16*1024*1024,mobileMaxTriangles=50000}={}){
 const previous=inspectModel(oldGLB,{file:"atual/"+name,maxBytes:mobileMaxBytes,maxTriangles:mobileMaxTriangles});
 const candidate=inspectModel(newGLB,{file:"novo/"+name,maxBytes:mobileMaxBytes,maxTriangles:mobileMaxTriangles});
 const missing=REQUIRED.filter(k=>!candidate.animationCoverage[k]);
 const added=REQUIRED.filter(k=>!previous.animationCoverage[k]&&candidate.animationCoverage[k]);
 const regressions=REQUIRED.filter(k=>previous.animationCoverage[k]&&!candidate.animationCoverage[k]);
 const checks=[
  {id:"animated-movement",status:missing.length?"review":"metadata-pass",missing},
  {id:"animation-regression",status:regressions.length?"blocked":"metadata-pass",missing:regressions},
  {id:"skin-rig",status:candidate.skins?"metadata-pass":"review",details:"Verify rig, pivots and retargeting in a renderer"},
  {id:"mouth-face",status:candidate.facial.namedMorphs.length||candidate.facial.namedNodes.length?"metadata-pass":"review",
   details:"Names only; actual lip movement and blendshape weights not verified"},
  {id:"mobile-size",status:candidate.bytes<=mobileMaxBytes?"metadata-pass":"review",value:candidate.bytes,limit:mobileMaxBytes},
  {id:"mobile-topology",status:candidate.triangles<=mobileMaxTriangles&&!candidate.trianglesPartial?"metadata-pass":"review",
    value:candidate.triangles,limit:mobileMaxTriangles},
  {id:"gameplay-collision",status:"needs-runtime-test"},
  {id:"bone-mapping",status:"needs-runtime-test"},
  {id:"ground-alignment",status:"needs-runtime-test"},
  {id:"actual-android-fps",status:"needs-device-test"}
 ];
 const blocking=checks.filter(x=>x.status==="blocked");
 return {schema:1,name,previous:{file:previous.file,animations:previous.animations,skins:previous.skins,
  triangles:previous.triangles,bytes:previous.bytes},
  candidate:{file:candidate.file,animations:candidate.animations,skins:candidate.skins,
    triangles:candidate.triangles,bytes:candidate.bytes,facial:candidate.facial},
  addedAnimations:added,missingAnimations:missing,regressedAnimations:regressions,checks,
  canAutoSwap:false,readyForHumanReview:!blocking.length,
  decision:"Never replace an existing model based solely on GLB metadata; preview animations and verify gameplay in real WebGL."};
}
function classifyRound(record){
 const e=record?.report?.errors||[];
 const ab=record?.report?.abilityEvidence||{};
 const skills=record?.report?.summary?.bossAbilitiesTriggered||[];
 const issues=[];
 if(record?.spawnError)issues.push("RUNNER_FAILURE");
 if(record?.code!==0)issues.push("NONZERO_EXIT");
 if(!record?.report)issues.push("MISSING_REPORT");
 if(record?.report?.status==="falhou")issues.push("GAMEPLAY_QA_FAILED");
 if(skills.includes("s1")&&!ab.hydraObserved)issues.push("SKILL_SENT_BUT_UNOBSERVED_HYDRA");
 if(skills.includes("s2")&&!ab.flameObserved)issues.push("SKILL_SENT_BUT_UNOBSERVED_FLAMES");
 if(ab.hydraObserved&&!ab.flameObserved)issues.push("FLAMES_NOT_OBSERVED");
 if(e.some(x=>/pageerror|webgl|shader|compile/i.test(String(x))))issues.push("WEBGL_OR_JS_ERROR");
 return {codes:[...new Set(issues)],hydraSamples:ab.hydraSamples??null,
   flameSamples:ab.flameSamples??null,skillCommands:skills,
   evidence:"Structured QA reports only; codes are investigation leads, not confirmed gameplay bugs."};
}
module.exports={analyzeReplacement,classifyRound,REQUIRED,NICE};
