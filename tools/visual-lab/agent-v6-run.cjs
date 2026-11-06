"use strict";
/** Agente V6: audita automaticamente arquivos JS do laboratório e gera patches revisáveis. */
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
const {propose}=require("./agent-v6-autofix-core.cjs");
const root=path.resolve(__dirname,"../..");
const out=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","agente-v6");
fs.mkdirSync(out,{recursive:true});
let tracked=[];
try{
 tracked=cp.execFileSync("git",["ls-files","tools/visual-lab/*.js","tools/visual-lab/*.cjs","tools/visual-lab/*.mjs"],{cwd:root,encoding:"utf8",timeout:12000}).trim().split("\n").filter(Boolean);
}catch(e){process.stderr.write("Lista Git indisponível: "+e.message+"\n");process.exitCode=1;}
const report=propose(root,tracked);
const safe=report.results.map(({patchedContent,...r})=>r);
const plan={...report,results:safe};
fs.writeFileSync(path.join(out,"diagnostico.json"),JSON.stringify(plan,null,2)+"\n");
const patches=report.results.filter(r=>r.status==="validated").map(r=>({
 file:r.file,replacements:r.changes.map(c=>({before:c.from,after:c.to})),suggestedFullContent:r.patchedContent
}));
fs.writeFileSync(path.join(out,"correcoes-para-revisao.json"),JSON.stringify(patches,null,2)+"\n");
console.log("[AGENTE V6] "+JSON.stringify({scanned:report.filesScanned,validated:report.validated,
 ignored:safe.filter(x=>x.status==="skipped").length,errors:safe.filter(x=>x.status==="rejected").length}));
if(safe.some(x=>x.status==="rejected"))process.exitCode=1;
