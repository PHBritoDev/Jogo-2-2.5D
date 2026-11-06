"use strict";
/**
 * Agentes V5 - ferramentas de diagnostico reutilizaveis para sites e jogos WebGL.
 * Apenas diagnostico: jamais modifica automaticamente codigo, credenciais, branches ou contas.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return +(s[Math.floor((s.length-1)/2)]).toFixed(2);};
const pct=(a,p)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return +(s[Math.min(s.length-1,Math.ceil(s.length*p)-1)]).toFixed(2);};
function perfSummary(samples,opts={}){
 const frames=samples.map(x=>x.frameMs).filter(x=>Number.isFinite(x)&&x>0);
 const fps=frames.map(x=>1000/x),memory=samples.map(x=>x.jsHeapMB).filter(Number.isFinite);
 const draw=samples.map(x=>x.drawCalls).filter(Number.isFinite);
 const triangles=samples.map(x=>x.triangles).filter(Number.isFinite);
 return {count:frames.length,fpsMedian:median(fps),fpsP10:pct(fps,.1),frameP95:pct(frames,.95),frameMax:frames.length?Math.max(...frames):null,
   slowFrames:frames.filter(x=>x>33.34).length,heapMBMax:memory.length?Math.max(...memory):null,
   drawCallsMedian:median(draw),trianglesMedian:median(triangles),
   conditions:{softwareRenderer:!!opts.softwareRenderer,simulatedMobile:!!opts.simulatedMobile,
     caution:"Chromium/SwiftShader nao representa FPS real de Android; GPU e memoria do aparelho exigem teste em dispositivo."}};
}
function comparePerf(current,baseline,{maxRegressionPct=20}={}){
 const issues=[];if(!baseline||!current)return {status:"no-baseline",issues};
 if(current.frameP95&&baseline.frameP95&&current.frameP95>baseline.frameP95*(1+maxRegressionPct/100))
   issues.push({code:"FRAME_TIME_REGRESSION",severity:"warning",current:current.frameP95,previous:baseline.frameP95});
 if(current.drawCallsMedian&&baseline.drawCallsMedian&&current.drawCallsMedian>baseline.drawCallsMedian*1.25)
   issues.push({code:"DRAW_CALL_REGRESSION",severity:"warning",current:current.drawCallsMedian,previous:baseline.drawCallsMedian});
 if(current.heapMBMax&&baseline.heapMBMax&&current.heapMBMax>baseline.heapMBMax*1.35)
   issues.push({code:"MEMORY_GROWTH",severity:"warning",current:current.heapMBMax,previous:baseline.heapMBMax});
 return {status:issues.length?"review":"ok",issues};
}
function scanSource(source,resource){
 const findings=[];
 for(const [code,regex,sev] of [
  ["DYNAMIC_EVAL",/\beval\s*\(/g,"review"],
  ["DOM_INNER_HTML",/\.innerHTML\s*=/g,"review"],
  ["CONSOLE_ERROR",/\bconsole\.error\s*\(/g,"info"],
  ["UNSAFE_STORAGE",/localStorage\.setItem\s*\(/g,"info"]]){
   const occurrences=[...source.matchAll(regex)].length;
   if(occurrences)findings.push({code,file:resource,occurrences,severity:sev,
     message:"Sinal estatico: inspecionar contexto antes de alterar. Nao e bug confirmado."});
 }
 return findings;
}
function regressionChecks({files,requiredPaths=[],protectedPaths=[]}){
 const errors=[],notes=[];
 for(const p of requiredPaths)if(!files[p])errors.push({code:"REQUIRED_FILE_MISSING",file:p});
 for(const p of protectedPaths)if(files[p]?.changed)errors.push({code:"PROTECTED_FILE_CHANGED",file:p});
 for(const [p,v] of Object.entries(files))if(v&&v.content&&p.endsWith(".js"))
   notes.push(...scanSource(v.content,p));
 return {passed:errors.length===0,errors,notes,filesChecked:Object.keys(files).length};
}
function planFixes({perf,regression,visual=null,errors=[]}){
 const tasks=[];
 for(const issue of regression?.errors||[])tasks.push({priority:"P0",kind:"regression",target:issue.file,
   evidence:issue.code,action:"Revisar o diff e restaurar arquivo obrigatorio/protegido sem alterar funcionalidades."});
 for(const e of errors)tasks.push({priority:"P0",kind:"runtime",evidence:String(e).slice(0,400),
   action:"Reproduzir em navegador, capturar stack, localizar modulo e criar correcao pequena em branch."});
 for(const issue of perf?.issues||[])tasks.push({priority:"P1",kind:"performance",evidence:issue.code,
   action:issue.code==="DRAW_CALL_REGRESSION"?"Investigar batches, instancias, materiais e objetos visiveis.":
   issue.code==="MEMORY_GROWTH"?"Investigar descarte de buffers, texturas e vazamento de listeners.":
   "Analisar cenas pesadas, efeitos e gargalos de CPU/GPU com capturas."});
 for(const x of visual?.findings||[])if(x.severity==="warn")tasks.push({priority:"P2",kind:"visual",
   evidence:x.code,action:"Abrir screenshot e comparar manualmente com a referencia antes de alterar."});
 return {generatedAt:null,fullyAutonomous:false,canEditCode:false,
   caution:"Sugestoes de diagnostico; nunca aplicar patch ou merge automaticamente sem testes e revisao.",tasks};
}
function memoryRecord({project,source,issue,solution,status="proposed",evidence=[]}){
 const base={project:String(project||"unknown").slice(0,128),source:String(source||"unknown").slice(0,180),
 issue:String(issue||"").slice(0,500),solution:String(solution||"").slice(0,800),status,
 evidence:evidence.filter(x=>typeof x==="string").slice(0,8)};
 const id=crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0,16);
 return {id,...base};
}
function mergeMemory(existing,updates){
 const map=new Map();for(const row of [...existing,...updates])if(row?.id)map.set(row.id,row);
 return [...map.values()].sort((a,b)=>a.id.localeCompare(b.id)).slice(-500);
}
function writeJsonAtomic(p,obj){
 fs.mkdirSync(path.dirname(p),{recursive:true});
 const tmp=p+".tmp-"+process.pid;fs.writeFileSync(tmp,JSON.stringify(obj,null,2)+"\n");
 fs.renameSync(tmp,p);
}
module.exports={median,pct,perfSummary,comparePerf,scanSource,regressionChecks,planFixes,memoryRecord,mergeMemory,writeJsonAtomic};
