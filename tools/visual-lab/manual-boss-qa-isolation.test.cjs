"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
const game=fs.readFileSync(path.join(root,"mundo-3d-prototype.js"),"utf8");
const lab=fs.readFileSync(path.join(__dirname,"agent-run.cjs"),"utf8");

test("Isolamento do kit exige API de QA e opt-in explícito",()=>{
  assert.match(game,/if\(window\.SevenSinsDebug3D && window\.__qaManualBossSkills===true\)return;/);
  assert.match(game,/if\(new URLSearchParams\(location\.search\)\.has\('debug3d'\)\)window\.SevenSinsDebug3D=/);
  assert.match(game,/function updateFoeKit\(dt\)\{\n if\(swordTraining\|\|squadOn\)return;/);
});

test("Laboratório reserva kit antes de verificar o VS e limpa ao finalizar",()=>{
  const enable=lab.indexOf("window.__qaManualBossSkills=true");
  const vs=lab.indexOf("window.SevenSinsDebug3D.vsGo()");
  const disable=lab.indexOf("window.__qaManualBossSkills=false");
  assert.ok(enable>0 && vs>enable && disable>vs, "A trava só pode existir no contexto Playwright");
  assert.match(lab,/logs\.qaManualBossKit=true/);
});
