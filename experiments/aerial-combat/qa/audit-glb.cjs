const fs=require('node:fs');const{parseGlb,inspectFile}=require('../../../tools/visual-lab/agent-v7-glb-audit.cjs');
// A local leftover GLB must not mask a missing asset in the branch checkout.
for(const script of ['experiments/aerial-combat/app.js','experiments/aerial-combat/rig.js'])for(const m of fs.readFileSync(script,'utf8').matchAll(/['"]\.\.\/\.\.\/([^'"]+\.glb)['"]/g))fs.accessSync(m[1]);
fs.mkdirSync('aerial-results/source',{recursive:true});
const file='Prota_otimizado_2K.glb',{json:g}=parseGlb(fs.readFileSync(file));
const report={...inspectFile(process.cwd(),file),nodes:g.nodes,skins:g.skins,materials:g.materials,clips:g.animations.map(a=>({name:a.name,duration:Math.max(...a.samplers.map(s=>g.accessors[s.input].max?.[0]||0)),channels:a.channels.length}))};
fs.writeFileSync('aerial-results/source/prota.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({file,bytes:report.bytes,triangles:report.triangles,clips:report.clips}));
if(report.animations.length!==19)throw Error('Source clip count changed; review mapping');
