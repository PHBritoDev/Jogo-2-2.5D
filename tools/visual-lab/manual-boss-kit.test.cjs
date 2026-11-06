"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
const game=fs.readFileSync(path.join(root,"mundo-3d-prototype.js"),"utf8");
const agent=fs.readFileSync(path.join(__dirname,"agent-run.cjs"),"utf8");

test("QA: isolamento das magias so existe com API debug3d e opt-in",()=>{
 assert.match(game,/if\(window\.SevenSinsDebug3D&&window\.__qaManualBossSkills===true\)return;/);
 assert.match(game,/if\(new URLSearchParams\(location\.search\)\.has\('debug3d'\)\)window\.SevenSinsDebug3D=/);
 assert.match(game,/function updateFoeKit\(dt\)\{\n if\(swordTraining\|\|squadOn\)return;/);
});
test("agente arma isolamento antes de liberar o VS e desarma no fim",()=>{
 const enable=agent.indexOf("window.__qaManualBossSkills=true");
 const vs=agent.indexOf("window.SevenSinsDebug3D.vsGo()");
 const disable=agent.indexOf("window.__qaManualBossSkills=false");
 assert.ok(enable>0&&vs>enable&&disable>vs,"a trava somente do laboratorio deve ficar confinada a sessao Playwright");
 assert.match(agent,/logs\.qaManualBossKit=true/);
});
