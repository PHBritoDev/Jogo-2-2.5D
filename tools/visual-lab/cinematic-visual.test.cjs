"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const sharp=require("sharp");
const {rgbMetrics,compareThumb,evidenceWarnings,inspectName,inspectRun,readBaseline,prepareBaseline}
  =require("./cinematic-visual.cjs");
test("V7 analisa pixel RGB real e detecta capturas inteiramente apagadas",()=>{
 const black=Buffer.alloc(128*72*3),white=Buffer.alloc(128*72*3,255);
 const b=rgbMetrics(black,128,72),w=rgbMetrics(white,128,72);
 assert.equal(b.darkFraction,1);assert.equal(b.contrast,0);
 assert.equal(w.whiteFraction,1);assert.equal(w.mean,255);
 assert.equal(compareThumb(b.fingerprint,w.fingerprint).meanDifference,1);
 assert.deepEqual(evidenceWarnings([
   {...b,phase:"boss_aura"},{...b,phase:"circle_build"}
 ]).map(x=>x.code),["blank_sequence"]);
 assert.throws(()=>rgbMetrics(Buffer.alloc(4),128,72));
});
test("V7 associa frames de fase por evento e instante, nunca por numero de arquivo",()=>{
 const a=inspectName("screenshots/portrait-06-impact_and_return-fim.png","portrait");
 assert.deepEqual(a,{phase:"impact_and_return",stage:"fim",key:"portrait:impact_and_return:fim"});
 const b=inspectName("screenshots/portrait-99-depois.png","portrait");
 assert.equal(b.phase,"other");
});
test("V7 compara execucoes reais sem confundir diff de camera com bug",async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"cinematic-v7-"));
 const before=process.env.CINEMA_BASELINE;
 process.env.CINEMA_BASELINE=path.join(temp,"baseline");
 try{
   const p=path.join(temp,"landscape");fs.mkdirSync(path.join(p,"screenshots"),{recursive:true});
   const phases=["boss_aura","circle_build","sword_emerge_and_fall","impact_and_return"];
   const names=[];
   for(const phase of phases)for(const stage of ["entrada","fim"]){
     const name="screenshots/landscape-"+String(names.length).padStart(2,"0")+"-"+phase+"-"+stage+".png";
     names.push(name);
     await sharp({create:{width:160,height:90,channels:3,background:{
       r:30+names.length*12,g:5+names.length*6,b:20+names.length*8
     }}}).png().toFile(path.join(p,name));
   }
   const first=await inspectRun(p,"landscape",names);
   assert.equal(first.frames.length,8);
   assert.ok(first.contact&&fs.existsSync(path.join(p,first.contact)));
   assert.equal(first.comparisons.length,0);
   const saved=prepareBaseline([{status:"capturado_para_revisao",visual:first}]);
   assert.equal(saved.saved,true);assert.equal(saved.count,8);
   const baseline=readBaseline();assert.equal(Object.keys(baseline.frames).length,8);
   const second=await inspectRun(p,"landscape",names,baseline);
   assert.equal(second.comparisons.length,8);
   assert.ok(second.comparisons.every(x=>x.meanDifference===0));
   // Uma alteracao evidente gera aviso, mas sem reprovar a cena por pixels.
   const target=path.join(p,names[0]);
   await sharp({create:{width:160,height:90,channels:3,background:"#ffffff"}}).png().toFile(target);
   const third=await inspectRun(p,"landscape",names,baseline);
   assert.ok(third.warnings.some(x=>x.code==="significant_visual_change"));
   assert.equal(third.errors.length,0);
   // Baseline nao pode ser alterado por rodadas incompletas.
   const rejected=prepareBaseline([{status:"falhou",visual:third}]);
   assert.equal(rejected.saved,false);
   assert.equal(readBaseline().commit,baseline.commit);
 }finally{
   if(before===undefined)delete process.env.CINEMA_BASELINE;else process.env.CINEMA_BASELINE=before;
   fs.rmSync(temp,{recursive:true,force:true});
 }
});
test("V7 critério da cena exige prints decodificáveis",()=>{
 const {assessCinematic,PHASES}=require("./cinematic-criteria.cjs");
 const x=PHASES.map((phase,i)=>({ms:i*1000,phase,cosmic:{phase},camera:[i,1,2],fov:56}));
 const a=assessCinematic(x,{started:true,ended:true,captures:6,
   visual:{frames:[],errors:[{code:"invalid_png",detail:"arquivo corrompido"}],warnings:[],comparisons:[]}});
 assert.equal(a.status,"falhou");
 assert.ok(a.problems.some(x=>x.code==="invalid_png"));
 assert.ok(a.problems.some(x=>x.code==="few_valid_images"));
});
