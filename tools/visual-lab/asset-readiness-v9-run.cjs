"use strict";
/** Modelo antigo/novo: somente comparacao, sem escrita nos ativos. */
const fs=require("node:fs"),path=require("node:path");
const {analyzeReplacement}=require("./asset-readiness-v9.cjs");
const old=process.env.OLD_GLB,newer=process.env.NEW_GLB;
if(!old||!newer){
 console.log("[V9] Nenhuma substituicao solicitada. Configure OLD_GLB e NEW_GLB para comparar GLBs reais.");
 process.exit(0);
}
const root=path.resolve(__dirname,"../..");
function safeFile(p){
 const abs=path.resolve(root,p);
 if(!abs.startsWith(root+path.sep)||!abs.toLowerCase().endsWith(".glb"))throw Error("Invalid GLB path");
 if(!fs.existsSync(abs))throw Error("GLB missing: "+p);
 return abs;
}
try{
 const result=analyzeReplacement(fs.readFileSync(safeFile(old)),fs.readFileSync(safeFile(newer)),{name:path.basename(newer)});
 const dir=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","agente-v9");
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,"comparacao-glb.json"),JSON.stringify(result,null,2)+"\n");
 console.log("[V9] "+JSON.stringify({old,newer,regressions:result.regressedAnimations,missing:result.missingAnimations,
  review:result.readyForHumanReview,canAutoSwap:result.canAutoSwap}));
 if(result.regressedAnimations.length)process.exitCode=2;
}catch(e){console.error("[V9] "+String(e.message||e));process.exitCode=1;}
