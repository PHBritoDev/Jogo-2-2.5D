"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {writeReport}=require("./agent-report.cjs");
test("painel gera HTML offline e diagnostico mobile com fontes escapadas",()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"visual-lab-v3-"));
 try{
  const log={date:"2026-11-03",commit:"sha123",status:"capturado_com_decisoes_adaptativas",
   videoFile:"agente/videos/abc.webm",errors:[],
   captures:["agente/screenshots/test.png"],
   decisions:[{tick:0,phase:"emerge",vision:{quality:75,flags:["centro_sem_visibilidade"]},
     executed:{buttons:["a","magic"]},decision:{reason:["desviar"]}},
    {tick:1,phase:"charge",vision:{quality:80,flags:["centro_sem_visibilidade"]},
     executed:{buttons:["d"]},decision:{reason:["atacar"]}}]};
  const result=writeReport(log,root);
  const html=fs.readFileSync(path.join(root,"ver-analise.html"),"utf8");
  const markdown=fs.readFileSync(path.join(root,"DIAGNOSTICO.md"),"utf8");
  assert.match(html,/videos\/abc\.mp4/);
  assert.match(html,/videos\/abc\.webm/);
  assert.match(html,/screenshots\/test\.png/);
  assert.match(html,/centro_sem_visibilidade/);
  assert.match(markdown,/não são bugs confirmados/);
  assert.equal(result.summary.steps,2);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test("cache e marcador numerico estao alinhados entre loader, HTML, pagina e laboratorio",()=>{
 const root=path.resolve(__dirname,"../..");
 const read=n=>fs.readFileSync(path.join(root,n),"utf8");
 const h=read("mundo-3d-prototype.html"),loader=read("mod181-loader.js"),
  index=read("index.html"),lab=read("laboratorio-inimigos.html"),world=read("mundo-3d-prototype.js");
 assert.match(h,/id="marker" aria-label="Modificação 272">272<\/div>/);
 assert.match(h,/mod181-loader\.js\?v=mod272-/);
 assert.match(loader,/const BUILD = 'mod272-/);
 assert.match(index,/refresh=272&build=272/);
 assert.match(lab,/build=272/);
 assert.match(world,/sceneProbe\(\)\{/);
 const gate=world.indexOf("if(new URLSearchParams(location.search).has('debug3d'))window.SevenSinsDebug3D=");
 assert.ok(gate>=0 && world.indexOf("  sceneProbe(){",gate)>gate);
});
