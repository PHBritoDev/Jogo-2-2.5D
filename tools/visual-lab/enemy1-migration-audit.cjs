"use strict";
// MOD 289 — auditoria reproduzível da migração Enemy1 → Demonio1.glb (modelo visual único).
// Metadados do GLB + garantia de que nenhum código ainda carrega os modelos antigos. Aprovação visual é outro gate.
const fs=require("node:fs"),path=require("node:path");
const {parseGlb,inspectFile}=require("./agent-v7-glb-audit.cjs");
const out=process.env.ENEMY1_AUDIT_OUTPUT||"visual-lab-results/enemy1-migration";
fs.mkdirSync(out,{recursive:true});
const file="Demonio1.glb",{json:g}=parseGlb(fs.readFileSync(file));
const r={...inspectFile(process.cwd(),file),clips:(g.animations||[]).map(a=>({
 name:a.name,duration:Math.max(...a.samplers.map(s=>g.accessors[s.input].max?.[0]||0)),
 channels:a.channels.map(c=>({node:g.nodes[c.target.node]?.name,path:c.target.path}))
})),nodes:g.nodes,skins:g.skins,materials:g.materials,extensionsUsed:g.extensionsUsed||[]};
fs.writeFileSync(path.join(out,file+".json"),JSON.stringify(r,null,2));
console.log(JSON.stringify({file,bytes:r.bytes,triangles:r.triangles,skins:r.skins.length,clips:r.clips.map(a=>({name:a.name,duration:+a.duration.toFixed(3)}))}));
// nenhum carregamento do modelo antigo pode sobrar
const legacy=["Enemy1.glb","Enemy1-lod.glb"],hits=[];
for(const f of fs.readdirSync(".").filter(n=>/\.(js|mjs|html)$/.test(n)&&!/\.test\.mjs$/.test(n))) /* testes podem citar os nomes antigos para checar a ausência */for(const [i,l] of fs.readFileSync(f,"utf8").split("\n").entries())if(legacy.some(x=>l.includes("./"+x)))hits.push(f+":"+(i+1));
const leftover=legacy.filter(x=>fs.existsSync(x));
fs.writeFileSync(path.join(out,"summary.json"),JSON.stringify({file,bytes:r.bytes,triangles:r.triangles,clips:r.clips.length,legacyLoads:hits,legacyFiles:leftover},null,2));
if(hits.length||leftover.length){console.error("Referências/arquivos antigos do Enemy1:",hits,leftover);process.exit(1);}
console.log("ok: nenhum carregamento de Enemy1.glb/Enemy1-lod.glb");
