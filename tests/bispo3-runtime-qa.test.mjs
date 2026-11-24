import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../tools/visual-lab/bispo3-runtime-qa.cjs', import.meta.url), 'utf8');
const sixSeals = await readFile(new URL('../tools/visual-lab/zarkhael-six-seals-qa.cjs', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../.github/workflows/bispo3-dimension-qa.yml', import.meta.url), 'utf8');
const world = await readFile(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

test('Bispo 3 runtime QA enters after the cutscene and polls without repeated actions', () => {
  const activeStart = runtime.indexOf('async function active()');
  const shotStart = runtime.indexOf('async function shot', activeStart);
  assert.ok(activeStart >= 0 && shotStart > activeStart);
  const active = runtime.slice(activeStart, shotStart);
  assert.match(active, /const pre=await p\.evaluate/);
  const ready=active.indexOf("await p.waitForFunction(()=>{const button=document.querySelector('#vs-go');return !!button&&!button.disabled;");
  const launch=active.indexOf("SevenSinsDebug3D.vsGo()",ready);
  const battle=active.indexOf("s.battle?.active",launch);
  assert.ok(ready>=0&&launch>ready&&battle>launch,"runtime QA must wait for the real VS button to enable before starting exactly once");
  assert.match(active, /!s\.cineActive&&!s\.menuGate&&!s\.paused/);
  assert.doesNotMatch(active, /if\(s\.vs\)d\.vsGo/);

  const exitStart=runtime.indexOf("TESTE DAS DIMENSÕES");
  const toggle=runtime.indexOf("toggle.click()",exitStart);
  const menuReady=runtime.indexOf("getComputedStyle(menu).display!=='none'",toggle);
  const reentry=runtime.indexOf("Dimensão III",menuReady);
  const cleanup=runtime.indexOf("!s.voidMode&&!s.battle",reentry);
  const reenterBattle=runtime.indexOf("await active()",cleanup);
  assert.ok(exitStart>=0&&toggle>exitStart&&menuReady>toggle&&reentry>menuReady&&cleanup>reentry&&reenterBattle>cleanup,
    "runtime QA must abort through the real dimension menu, prove disposal, then re-enter");
  assert.doesNotMatch(runtime,/Sair da dimensão|Reiniciar luta/,"QA must not depend on buttons absent from the production test panel");

  const start = runtime.indexOf("for(const id of ['s1','s2','sw'])");
  const end = runtime.indexOf('report.restored=', start);
  assert.ok(start >= 0 && end > start);
  const block = runtime.slice(start, end);
  assert.match(block, /const launch=await p\.evaluate\(id=>/);
  assert.match(block, /d\.kitMove\(id\)/);
  assert.doesNotMatch(block, /id==='ult'/);
  assert.match(runtime, /window\.__qaManualBossSkills=true/);
  const pollStart = block.indexOf('p.waitForFunction(id=>');
  const pollEnd = block.indexOf('},id,{timeout:180000,polling:250});', pollStart);
  assert.ok(pollStart >= 0 && pollEnd > pollStart);
  const poll = block.slice(pollStart, pollEnd);
  assert.doesNotMatch(poll, /kitMove|\.power\(\)|\.skills\(\)|\.god\(/);
});

test('six-seals QA slows its runtime clock and waits for the exact camera shot before capture', () => {
  const setupStart=sixSeals.indexOf('const setup=await page.evaluate');
  const launchStart=sixSeals.indexOf('const launch=await page.evaluate',setupStart);
  const slow=sixSeals.indexOf('const timeScale=d.speed(0.1)',setupStart);
  assert.ok(setupStart>=0&&slow>setupStart&&launchStart>slow,
    'the dedicated ultimate capture must slow the real game clock before launching');
  assert.match(sixSeals,/state\\.shot===expectedShot&&state\\.t>=target/,
    'each screenshot must be synchronized to the expected camera shot, not only an elapsed timestamp');
  assert.match(sixSeals,/timeScale/,
    'the effective QA time scale must be recorded for diagnosing capture timing');
});

test('six-seals QA launches once, proves the safe annulus and records cleanup', () => {
  const activeStart = sixSeals.indexOf('const pre=await page.evaluate');
  const launchStart = sixSeals.indexOf('const launch=await page.evaluate', activeStart);
  assert.ok(activeStart >= 0 && launchStart > activeStart);
  const vsReady=sixSeals.indexOf('await page.waitForFunction(()=>{const button=document.querySelector("#vs-go");return !!button&&!button.disabled;');
  const vsLaunch=sixSeals.indexOf('window.SevenSinsDebug3D.vsGo()',vsReady);
  const battleReady=sixSeals.indexOf('s.battle?.active',vsLaunch);
  assert.ok(vsReady>=0&&vsLaunch>vsReady&&battleReady>vsLaunch,"six-seals QA must wait for the real VS button before launching");
  assert.match(sixSeals, /!s\.cineActive&&!s\.menuGate&&!s\.paused/);
  assert.match(sixSeals, /window\.__qaManualBossSkills=true/);
  assert.match(sixSeals, /d\.teleport\(x,z\)/);
  assert.match(sixSeals, /d\.god\(false\)/);
  assert.match(sixSeals, /frame\.safeDistance>frame\.dangerRadius/);
  assert.match(sixSeals, /frame\.burstHits\[0\]\.hit!==false/);
  assert.match(sixSeals, /frame\.hp!==data\.launch\.hpBefore/);
  assert.match(sixSeals, /16-fim-limpo\.png/);
  assert.doesNotMatch(sixSeals, /data\.frames\[8\]\.camera\[1\]>=camHeights\[5\]/);
  const launchEnd = sixSeals.indexOf('let launchState=', launchStart);
  const launch = sixSeals.slice(launchStart, launchEnd);
  assert.match(launch, /d\.kitMove\("ult"\)/);
  assert.doesNotMatch(launch, /for\s*\(/);
});

test('Bispo 3 workflow executes the dedicated cinematic QA after runtime QA', () => {
  assert.match(workflow, /tools\/visual-lab\/zarkhael-six-seals-qa\.cjs/);
  assert.match(workflow, /node tools\/visual-lab\/zarkhael-six-seals-qa\.cjs/);
});


test('Bispo 3 workflow valida e identifica o SHA exato da PR', () => {
  assert.ok(workflow.includes('ref: ${{ github.event.pull_request.head.sha || github.sha }}'));
  assert.ok(workflow.includes("PR_HEAD_SHA: '${{ github.event.pull_request.head.sha || github.sha }}'"));
  assert.ok(workflow.includes('run: test "$(git rev-parse HEAD)" = "$PR_HEAD_SHA"'));
  assert.ok(workflow.includes('name: bispo3-dimension-${{ github.event.pull_request.head.sha || github.sha }}'));
  assert.ok(sixSeals.includes('build:process.env.PR_HEAD_SHA||process.env.GITHUB_SHA'));
});


test('six-seals QA não aprova a cinematográfica sem WebM finalizado e válido', () => {
  const start = sixSeals.indexOf('const video=page.video();');
  const end = sixSeals.indexOf('report.ok=wanted.every', start);
  assert.ok(start >= 0 && end > start, 'finalização do vídeo precisa ocorrer antes do resultado do modo');
  const finalizer = sixSeals.slice(start, end);
  assert.match(finalizer, /if\(!video\)throw new Error/);
  assert.match(finalizer, /header!=="1a45dfa3"/);
  assert.match(finalizer, /data\.video=\{available:false,error:message\}/);
  assert.match(finalizer, /data\.status="failed"/);
  assert.ok(finalizer.includes("process.exitCode=1"), "falha ao salvar WebM precisa falhar o processo de QA");
  const videoSaved = finalizer.indexOf('data.video={file:"ultimate-bispo3-281.webm"');
  const approved = finalizer.indexOf('data.status="approved"');
  assert.ok(videoSaved >= 0 && approved > videoSaved, 'aprovação só ocorre depois de validar e salvar o WebM');
  assert.doesNotMatch(sixSeals.slice(0, start), /data.status="approved"/,
    'nenhum modo pode ser aprovado antes de finalizar a gravação');
  assert.match(sixSeals, /report\.ok=wanted\.every\(m=>report\.modes\[m\]\.status==="approved"\)/);
});
test('six-seals QA diagnostica em até 12 s uma ultimate criada mas sem relógio ativo', () => {
  assert.match(sixSeals, /diagnostics:\{bossUltKind:s\.bossUltKind,bossUltTime:s\.bossUltTime/);
  assert.match(sixSeals, /squad:s\.squad,dtScale:s\.dtScale,paused:s\.paused,cineActive:s\.cineActive/);
  assert.match(sixSeals, /launch\.diagnostics\.bossUltKind!=="zarkhael6"/);
  assert.match(sixSeals, /s\.cinematic\?\.t>.08&&s\.bossUltKind==="zarkhael6"&&s\.bossUltTime>.08/);
  assert.match(sixSeals, /timeout:12000,polling:125/);
  assert.match(sixSeals, /data\.firstTick=await firstTick\.jsonValue\(\)/);
});
test('ZAR’KHAEL six-seals ultimate continues ticking in the mandatory squad encounter', () => {
  const start = world.indexOf('function updateBossUltimates(dt,now){');
  const end = world.indexOf('function startSupernova()', start);
  assert.ok(start >= 0 && end > start, 'scheduler central de ultimates precisa existir');
  const scheduler = world.slice(start, end);
  assert.match(scheduler, /const squadZarkUlt=bossUlt\.kind==='zarkhael6'&&!!zarkUlt&&isZarkhaelProfile\(encounterProfile\)/);
  assert.match(scheduler, /if\(squadOn&&!squadZarkUlt\)\{if\(bossUlt\.kind\)endBossUlt\(\);return;\}/,
    'ultimates genéricas continuam bloqueadas para esquadras');
  assert.match(scheduler, /bossUlt\.kind==='zarkhael6'\?tickZarkUlt/,
    'a ultimate autoral do ZAR’KHAEL precisa chegar ao seu relógio de atualização');
});
