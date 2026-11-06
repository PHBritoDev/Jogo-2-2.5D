"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {newState,ingest,evidence}=require("./ability-observer-v8.cjs");
test("observa Hidra mesmo entre dois screenshots separados",()=>{
 const s=newState();
 ingest(s,{at:10,hydra:{phase:"emerge"},moonFlames:null});
 ingest(s,{at:12,hydra:{phase:"charge"},moonFlames:null});
 ingest(s,{at:20,hydra:null,moonFlames:null});
 const r=evidence(s);
 assert.equal(r.hydraObserved,true);
 assert.equal(r.hydraSamples,2);
 assert.deepEqual(r.hydraPhases,["emerge","charge"]);
 assert.equal(r.flameObserved,false);
});
test("chamas automáticas não contam como prova de Hidra",()=>{
 const s=newState();
 ingest(s,{at:1,hydra:null,moonFlames:{phase:"shots"}});
 const e=evidence(s);
 assert.equal(e.hydraObserved,false);
 assert.equal(e.flameObserved,true);
});
test("chamada de magia sem amostras não gera aprovação fictícia",()=>{
 const s=newState();ingest(s,{at:1,hydra:null,moonFlames:null});
 assert.equal(evidence(s).hydraObserved,false);
 assert.equal(evidence(s).sampledStates,1);
});
test("histórico limita eventos e deduplica fases sem descartar amostras",()=>{
 const s=newState();
 for(let i=0;i<500;i++)ingest(s,{at:i,hydra:{phase:"charge"},moonFlames:{phase:i%2?"shots":"windup"}});
 const e=evidence(s);
 assert.equal(e.hydraSamples,500);assert.equal(e.flameSamples,500);
 assert.deepEqual(e.hydraPhases,["charge"]);
 assert.ok(s.events.length<=240);
});
