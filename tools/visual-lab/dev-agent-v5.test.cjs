"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const a=require("./dev-agent-v5-core.cjs");
test("percentis e FPS sao calculados de amostras reais",()=>{
 const s=a.perfSummary([{frameMs:16.7,drawCalls:80,triangles:5000},{frameMs:20,drawCalls:85,triangles:5500},{frameMs:40,drawCalls:100,triangles:6200}],{softwareRenderer:true});
 assert.equal(s.count,3);assert.equal(s.slowFrames,1);assert.equal(s.frameP95,40);
 assert.equal(s.conditions.softwareRenderer,true);assert.ok(s.fpsMedian>40);
});
test("sem baseline nao inventa regressao",()=>{
 assert.equal(a.comparePerf({frameP95:20},null).status,"no-baseline");
});
test("regressao detecta frame time e drawcalls",()=>{
 const c={frameP95:50,drawCallsMedian:180,heapMBMax:230},p={frameP95:25,drawCallsMedian:100,heapMBMax:100};
 assert.equal(a.comparePerf(c,p).issues.length,3);
});
test("respeita arquivos protegidos mesmo quando o resto passa",()=>{
 const r=a.regressionChecks({files:{"DevoradorLunar.glb":{changed:true},"world.js":{content:"console.error('fail')"}},
 requiredPaths:["world.js"],protectedPaths:["DevoradorLunar.glb"]});
 assert.equal(r.passed,false);assert.equal(r.errors[0].code,"PROTECTED_FILE_CHANGED");
});
test("programador so prepara plano; sem editar codigo ou gerar aprovacoes",()=>{
 const p=a.planFixes({perf:{issues:[{code:"FRAME_TIME_REGRESSION"}]},regression:{errors:[{code:"REQUIRED_FILE_MISSING",file:"world.js"}]},errors:["simulated"]});
 assert.equal(p.canEditCode,false);assert.equal(p.fullyAutonomous,false);assert.equal(p.tasks[0].priority,"P0");assert.equal(p.tasks.length,3);
});
test("memoria tecnica gera ID deterministico e deduplica fatos",()=>{
 const r=a.memoryRecord({project:"RPG",source:"QA",issue:"FPS baixo",solution:"reduzir draw calls",evidence:["run 1"]});
 assert.equal(r.id.length,16);assert.equal(a.mergeMemory([r],[r]).length,1);
});
test("scanner so sinaliza riscos potenciais",()=>{
 const findings=a.scanSource("eval(source); el.innerHTML = data;","app.js");
 assert.deepEqual(findings.filter(x=>x.severity==="review").map(x=>x.code),["DYNAMIC_EVAL","DOM_INNER_HTML"]);
});
