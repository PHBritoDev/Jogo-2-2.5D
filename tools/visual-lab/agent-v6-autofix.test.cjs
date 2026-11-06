"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {stageRepair,propose,proposedSpecifier,syntaxCheck}=require("./agent-v6-autofix-core.cjs");
function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"agent-v6-test-"));
 fs.mkdirSync(path.join(root,"tools/visual-lab"),{recursive:true});
 try{return fn(root,path.join(root,"tools/visual-lab"));}
 finally{fs.rmSync(root,{recursive:true,force:true});}
}
test("corrige extensão JS ausente sem tocar no arquivo de origem",()=>{
 fixture((root,dir)=>{
  fs.writeFileSync(path.join(dir,"actual.js"),"export const x=3;");
  const app=path.join(dir,"entry.js"),text='import {x} from "./actual";\nconsole.log(x);\n';
  fs.writeFileSync(app,text);
  const r=stageRepair(root,"tools/visual-lab/entry.js");
  assert.equal(r.status,"validated");assert.equal(r.changes[0].to,"./actual.js");
  assert.equal(fs.readFileSync(app,"utf8"),text);
 });
});
test("corrige apenas nome inequivoco com caixa distinta",()=>{
 fixture((root,dir)=>{
  fs.writeFileSync(path.join(dir,"Actual.js"),"export const x=1;");
  fs.writeFileSync(path.join(dir,"entry.js"),'import {x} from "./actual.js";');
  assert.equal(stageRepair(root,"tools/visual-lab/entry.js").changes[0].to,"./Actual.js");
 });
});
test("não corrige caso ambíguo e não inventa dependência inexistente",()=>{
 fixture((root,dir)=>{
  fs.writeFileSync(path.join(dir,"a.js"),"export const a=1;");
  fs.writeFileSync(path.join(dir,"a.mjs"),"export const a=2;");
  fs.writeFileSync(path.join(dir,"entry.js"),'import "./a";\nimport "./missing";');
  const r=stageRepair(root,"tools/visual-lab/entry.js");
  assert.equal(r.status,"unchanged");
 });
});
test("não altera arquivos de jogo fora do laboratório",()=>{
 fixture((root,dir)=>{
  fs.writeFileSync(path.join(root,"game.js"),'import "./missing";');
  assert.equal(stageRepair(root,"game.js").reason,"OUT_OF_SCOPE");
 });
});
test("não permite traversal, arquivos existentes ou entradas externas",()=>{
 fixture((root,dir)=>{
  fs.writeFileSync(path.join(dir,"real.js"),"const ok=true;");
  assert.equal(proposedSpecifier(root,path.join(dir,"entry.js"),"https://domain"),null);
  assert.equal(proposedSpecifier(root,path.join(dir,"entry.js"),"../../../outside"),null);
  assert.equal(stageRepair(root,"../../etc/passwd").status,"skipped");
 });
});
test("não aprova sintaxe inválida",()=>{
 const result=syntaxCheck("const = ;",".js");assert.equal(result.ok,false);
});
test("relatório não oferece merge automático",()=>{
 fixture((root,dir)=>{
  fs.writeFileSync(path.join(dir,"a.js"),"export const ok=1;");
  const r=propose(root,["tools/visual-lab/a.js"]);
  assert.equal(r.canMerge,false);assert.equal(r.filesScanned,1);
 });
});
