"use strict";
/** Asset Agent V7 — scan tracked GLBs without writing to asset files. */
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
const {inspectFile}=require("./agent-v7-glb-audit.cjs");
const root=path.resolve(__dirname,"../..");
const out=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","agente-v7");
fs.mkdirSync(out,{recursive:true});
const files=cp.execFileSync("git",["ls-files","--","*.glb"],{cwd:root,encoding:"utf8",timeout:20000}).split(/\r?\n/).filter(Boolean);
const limit=+(process.env.GLB_AUDIT_MAX_MB||50)*1024*1024;
const results=[];
for(const file of files){
 try{
  const st=fs.statSync(path.join(root,file));
  if(st.size>limit){results.push({file,status:"too-large",bytes:st.size});continue;}
  const r=inspectFile(root,file);
  results.push({status:"inspected",...r});
 }catch(e){results.push({file,status:"error",message:String(e.message||e).slice(0,250)});}
}
const report={version:7,inspected:results.filter(r=>r.status==="inspected").length,
 totalFiles:files.length,failed:results.filter(r=>r.status==="error").length,
 cannotVerify:"Inspector does not measure actual phone FPS, geometry fidelity, facial lip-sync or animation retargeting",
 results};
fs.writeFileSync(path.join(out,"catalogo-glb.json"),JSON.stringify(report,null,2)+"\n");
console.log("[AGENTE V7] "+JSON.stringify({inspected:report.inspected,total:report.totalFiles,errors:report.failed,
 hints:results.reduce((n,r)=>n+(r.issues?.length||0),0)}));
if(report.failed)process.exitCode=1;
