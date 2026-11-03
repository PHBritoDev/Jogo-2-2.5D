"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {assessCinematic,PHASES,distance,auditHudCover}=require("./cinematic-criteria.cjs");
const {indexReport}=require("./cinematic-run.cjs");

const record=(phase,ms=0,point=[0,5,9])=>({
  ms,phase,cosmic:phase?{phase}:null,camera:point,fov:56
});
test("sem camera ou fases nunca aprova uma cena inventada",()=>{
  const a=assessCinematic([],{started:true,ended:true,captures:5});
  assert.equal(a.status,"falhou");assert.ok(a.problems.some(x=>x.code==="no_samples"));
  const b=assessCinematic([record(null),record(null,1000)],{started:false,ended:false,captures:6});
  assert.equal(b.status,"falhou");
  assert.ok(b.problems.some(x=>x.code==="not_observed"));
});
test("cena completa com fases e liberacao tem status: capturado para revisao",()=>{
  const rows=PHASES.map((p,i)=>record(p,i*1200,[i,8,10]));
  rows.push(record(null,6200));
  const v=assessCinematic(rows,{
    started:true,ended:true,captures:6,startFov:56,endFov:56,
    finalLock:false,movementAttempted:true,moveMeters:.7,browserErrors:[]
  });
  assert.equal(v.status,"capturado_para_revisao");
  assert.equal(v.problems.length,0);assert.equal(v.missingPhases.length,0);
  assert.equal(v.frameCount,5);
});
test("camera presa, fase ausente e retorno de FOV geram alertas corretos",()=>{
  const rows=[record("boss_aura",0,[0,0,0]),record(null,2000,[100,0,0])];
  const v=assessCinematic(rows,{started:true,ended:true,captures:5,finalLock:true,
    startFov:56,endFov:76,movementAttempted:true,moveMeters:0});
  assert.equal(v.status,"falhou");
  assert.ok(v.problems.some(x=>x.code==="controls_locked"));
  for(const code of ["phases_not_sampled","cinematic_cut_review","fov_not_restored","movement_not_confirmed"])
    assert.ok(v.warnings.some(x=>x.code===code),"alerta ausente: "+code);
  assert.equal(distance([0,0,0],[3,4,0]),5);
});
test("erros Javascript nunca sao tratados como sucesso",()=>{
 const a=assessCinematic([record("boss_aura"),record(null,1000)],
   {started:true,ended:true,captures:5,browserErrors:["TypeError"]});
 assert.ok(a.problems.some(x=>x.code==="javascript_errors"));
 assert.equal(a.status,"falhou");
});
test("relatorio offline escapa texto e inclui perfis de telefone",()=>{
 const before=process.env.VISUAL_OUTPUT;
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"cinema-v6-"));
 try{
   process.env.VISUAL_OUTPUT=tmp;
   delete require.cache[require.resolve("./cinematic-run.cjs")];
   const {indexReport:writer}=require("./cinematic-run.cjs");
   const r=writer([
     {mode:"landscape",status:"capturado_para_revisao",viewport:{width:852,height:480},
      assessment:{phases:PHASES,problems:[],warnings:[]},captures:["screenshots/x.png"],
      qa:{perf:{samples:30,medianFrameMs:18,p95FrameMs:60},moveMeters:1,endFov:56},video:"videos/a.webm"},
     {mode:"portrait",status:"capturado_para_revisao",viewport:{width:393,height:852},
      assessment:{phases:PHASES,problems:[],warnings:[]},captures:[],
      qa:{perf:null,moveMeters:.5,endFov:56},video:null}
   ]);
   assert.equal(r.status,"capturado_para_revisao");
   const html=fs.readFileSync(path.join(tmp,"cinematica","ver-cena.html"),"utf8");
   assert.match(html,/landscape/);assert.match(html,/portrait/);
   assert.match(html,/videos\/a.webm/);
   assert.match(html,/não comprovam performance em celular/);
 }finally{
   if(before===undefined)delete process.env.VISUAL_OUTPUT;else process.env.VISUAL_OUTPUT=before;
   fs.rmSync(tmp,{recursive:true,force:true});
 }
});


test("camera inicial reenquadra sem falso positivo de salto interno",()=>{
 const rows=[
  record("boss_aura",0,[0,0,0]),
  record("boss_aura",1500,[100,0,0]),
  record("circle_build",2600,[150,0,0]),
  record("circle_build",3800,[210,0,0])
 ];
 const v=assessCinematic(rows,{started:true,ended:true,captures:7});
 assert.equal(v.status,"capturado_para_revisao");
 assert.deepEqual(v.largeCameraJumps.map(x=>x.kind),
   ["initial_reframe","phase_cut","within_phase"]);
 assert.ok(v.warnings.some(x=>x.code==="abrupt_camera_jumps"));
 assert.ok(v.warnings.some(x=>x.code==="cinematic_cut_review"));
});
test("HUD com retangulos sobrepostos nao duplica ocupacao central e alerta",()=>{
 const vp={width:400,height:800};
 const rects=[
   {x:0,y:0,width:400,height:800,visible:false},
   {x:145,y:320,width:110,height:170,visible:true},
   {x:145,y:320,width:110,height:170,visible:true}
 ];
 const hud=auditHudCover(vp,rects);
 assert.ok(hud.centerCoverage>.17&&hud.centerCoverage<.42,
   "cobertura nao pode somar sobreposicoes: "+hud.centerCoverage);
 assert.equal(auditHudCover({width:0,height:100},rects),null);
 const v=assessCinematic([record("boss_aura"),record(null,2200)],
   {started:true,ended:true,captures:5,hud,perf:{p95FrameMs:360}});
 assert.ok(v.warnings.some(x=>x.code==="hud_covers_scene"));
 assert.ok(v.warnings.some(x=>x.code==="slow_software_renderer"));
 assert.equal(v.status,"capturado_para_revisao","sem confundir alerta com falha");
});
