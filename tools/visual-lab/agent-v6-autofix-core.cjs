"use strict";
/**
 * Agente Autocorretor V6 — reparos determinísticos de imports locais.
 * NUNCA altera o repositório de trabalho, publica, abre PR nem mescla código.
 * Só sugere patches quando existe exatamente um destino válido e a sintaxe passa.
 */
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),cp=require("node:child_process");
const SUPPORTED=/\.(?:js|mjs|cjs)$/i;
function guardInside(root,target){
 const base=path.resolve(root),file=path.resolve(target);
 return file.startsWith(base+path.sep) && file!==base;
}
function locateCaseInsensitive(root,candidate){
 const pieces=path.relative(root,candidate).split(path.sep);
 if(pieces.some(x=>x===".."||x==="."||!x))return null;
 let parent=path.resolve(root);
 for(const piece of pieces){
  if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory())return null;
  const matches=fs.readdirSync(parent).filter(e=>e.toLowerCase()===piece.toLowerCase());
  if(matches.length!==1)return null;
  parent=path.join(parent,matches[0]);
 }
 if(!guardInside(root,parent)||!fs.statSync(parent).isFile())return null;
 return parent;
}
function proposedSpecifier(root,file,spec){
 if(!spec.startsWith("./")&&!spec.startsWith("../"))return null;
 if(spec.includes("?")||spec.includes("#")||spec.includes("\\"))return null;
 const target=path.resolve(path.dirname(file),spec);
 if(!guardInside(root,target))return null;
 if(fs.existsSync(target))return null; // direct import already resolves
 const candidates=SUPPORTED.test(spec)?[target]:[target+".js",target+".mjs",target+".cjs"];
 const found=candidates.map(c=>locateCaseInsensitive(root,c)).filter(Boolean);
 if(found.length!==1)return null;
 const relative=path.relative(path.dirname(file),found[0]).split(path.sep).join("/");
 return relative.startsWith(".")?relative:"./"+relative;
}
function analyzeFile(root,file,{allowGameFiles=false}={}){
 if(!guardInside(root,file)||!SUPPORTED.test(file))return {error:"INVALID_FILE",changes:[]};
 const rel=path.relative(root,file).split(path.sep).join("/");
 const blocked=/(^|\/)(?:node_modules|\.git)\//.test(rel) || 
  (!allowGameFiles&&!rel.startsWith("tools/visual-lab/"));
 if(blocked)return {file:rel,error:"OUT_OF_SCOPE",changes:[]};
 const source=fs.readFileSync(file,"utf8"),changes=[];
 // Somente uma única linha por import; não modifica exportações/strings arbitrárias.
 const re=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])(\.[^'"\r\n]+)\1/g;
 let m;while((m=re.exec(source))!==null){
  const start=m.index+m[0].lastIndexOf(m[2]);
  const line=source.slice(source.lastIndexOf("\n",m.index)+1,m.index);
  if(/^\s*(?:\/\/|\*)/.test(line))continue;
  const fix=proposedSpecifier(root,file,m[2]);
  if(fix&&fix!==m[2])changes.push({start,end:start+m[2].length,from:m[2],to:fix});
 }
 let patched=source;for(const c of [...changes].reverse())patched=patched.slice(0,c.start)+c.to+patched.slice(c.end);
 return {file:rel,source,patched,changes};
}
function syntaxCheck(patched,extension){
 const kind=extension===".cjs"?"commonjs":"module";
 const r=cp.spawnSync("node",["--input-type="+kind,"--check"],{input:patched,encoding:"utf8",timeout:10000});
 return {ok:r.status===0,error:r.status===0?null:(r.stderr||r.error?.message||"syntax error").slice(0,600)};
}
function stageRepair(root,rel,{allowGameFiles=false}={}){
 const target=path.resolve(root,rel),analysis=analyzeFile(root,target,{allowGameFiles});
 if(analysis.error)return {file:rel,status:"skipped",reason:analysis.error,changes:[]};
 if(!analysis.changes.length)return {file:analysis.file,status:"unchanged",changes:[]};
 const check=syntaxCheck(analysis.patched,path.extname(target));
 if(!check.ok)return {file:analysis.file,status:"rejected",reason:check.error,changes:analysis.changes};
 // Safeguard: re-analyze the patched content in a temporary sandbox; cannot mutate project.
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"autofix-v6-"));
 try{
  const staged=path.join(tmp,path.basename(target));
  fs.writeFileSync(staged,analysis.patched);
  if(fs.readFileSync(staged,"utf8")!==analysis.patched)throw Error("Falha ao conferir arquivo temporario");
  return {file:analysis.file,status:"validated",changes:analysis.changes,
    patchedContent:analysis.patched,syntax:"passed",provenance:"temporary copy only"};
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
function propose(root,files,options={}){
 const candidates=[...new Set(files)].filter(x=>typeof x==="string").slice(0,250);
 const results=candidates.map(f=>stageRepair(root,f,options));
 return {version:6,mode:"dry-run-with-temporary-validation",canMerge:false,
  filesScanned:results.length,validated:results.filter(x=>x.status==="validated").length,
  results,warning:"Correcoes propostas exigem revisao e testes de runtime antes de aplicar ao jogo."};
}
module.exports={guardInside,locateCaseInsensitive,proposedSpecifier,analyzeFile,syntaxCheck,stageRepair,propose};
