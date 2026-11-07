"use strict";
// Reproducible metadata baseline. Runtime/visual approval is a separate gate.
const fs=require("node:fs"),path=require("node:path");
const {parseGlb,inspectFile}=require("./agent-v7-glb-audit.cjs");
const out=process.env.ENEMY1_AUDIT_OUTPUT||"visual-lab-results/enemy1-migration";
fs.mkdirSync(out,{recursive:true});
const reports=["Enemy1.glb","Enemy1-lod.glb","Demonio1.glb"].map(file=>{
 const {json:g}=parseGlb(fs.readFileSync(file));
 const r={...inspectFile(process.cwd(),file),clips:(g.animations||[]).map(a=>({
 name:a.name,duration:Math.max(...a.samplers.map(s=>g.accessors[s.input].max?.[0]||0)),
 channels:a.channels.map(c=>({node:g.nodes[c.target.node]?.name,path:c.target.path}))
 })),nodes:g.nodes,skins:g.skins,materials:g.materials,extensionsUsed:g.extensionsUsed||[]};
 fs.writeFileSync(path.join(out,file+".json"),JSON.stringify(r,null,2));
 console.log(JSON.stringify({file,bytes:r.bytes,triangles:r.triangles,skins:r.skins.length,
 clips:r.clips.map(a=>({name:a.name,duration:a.duration})),bones:g.skins?.map(s=>s.joints.map(i=>g.nodes[i].name))}));
 return r;
});
fs.writeFileSync(path.join(out,"summary.json"),JSON.stringify(reports.map(({nodes,materials,skins,clips,...r})=>r),null,2));
