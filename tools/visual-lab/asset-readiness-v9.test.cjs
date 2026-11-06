"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {analyzeReplacement,classifyRound}=require("./asset-readiness-v9.cjs");
function glb(payload){
 const raw=Buffer.from(JSON.stringify({asset:{version:"2.0"},...payload}),"utf8");
 const padded=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]);
 const b=Buffer.alloc(20+padded.length);b.write("glTF",0,"ascii");
 b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(padded.length,12);
 b.writeUInt32LE(0x4e4f534a,16);padded.copy(b,20);return b;
}
test("substituicao nao pode apagar clipes anteriores",()=>{
 const old=glb({animations:[{name:"Idle"},{name:"Attack"}]});
 const next=glb({animations:[{name:"Idle"},{name:"Walk"}]});
 const r=analyzeReplacement(old,next);
 assert.deepEqual(r.regressedAnimations,["attack"]);
 assert.equal(r.readyForHumanReview,false);
 assert.equal(r.canAutoSwap,false);
});
test("dados novos validos continuam exigindo teste humano de jogo",()=>{
 const a=glb({animations:[{name:"Idle"}]});
 const b=glb({animations:[{name:"Idle"},{name:"Walk"}],
  nodes:[{name:"Jaw"}],skins:[{joints:[0]}]});
 const r=analyzeReplacement(a,b);
 assert.equal(r.readyForHumanReview,true);
 assert.ok(r.checks.some(c=>c.status==="needs-runtime-test"));
 assert.deepEqual(r.addedAnimations,["walk"]);
});
test("skill enviada sem evidencia nao aprova habilidade",()=>{
 const r=classifyRound({code:1,report:{status:"falhou",summary:{bossAbilitiesTriggered:["s1"]},
  abilityEvidence:{hydraObserved:false,flameObserved:true,flameSamples:22}}});
 assert.ok(r.codes.includes("SKILL_SENT_BUT_UNOBSERVED_HYDRA"));
 assert.equal(r.hydraSamples,null);
});
test("evidencia positiva separa Hidra de Chamas",()=>{
 const r=classifyRound({code:0,report:{status:"capturado_com_decisoes_adaptativas",
  summary:{bossAbilitiesTriggered:["s1","s2"]},
  abilityEvidence:{hydraObserved:true,hydraSamples:18,flameObserved:true,flameSamples:41}}});
 assert.deepEqual(r.codes,[]);
 assert.equal(r.hydraSamples,18);
 assert.equal(r.flameSamples,41);
});
test("sem relatório sinaliza infraestrutura, não defeito de magia",()=>{
 const r=classifyRound({code:124,spawnError:"timeout",report:null});
 assert.ok(r.codes.includes("RUNNER_FAILURE"));
 assert.ok(r.codes.includes("MISSING_REPORT"));
 assert.ok(!r.codes.includes("SKILL_SENT_BUT_UNOBSERVED_HYDRA"));
});
