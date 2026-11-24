import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../tools/visual-lab/bispo3-runtime-qa.cjs', import.meta.url), 'utf8');
const sixSeals = await readFile(new URL('../tools/visual-lab/zarkhael-six-seals-qa.cjs', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../.github/workflows/bispo3-dimension-qa.yml', import.meta.url), 'utf8');

test('Bispo 3 runtime QA enters after the cutscene and polls without repeated actions', () => {
  const activeStart = runtime.indexOf('async function active()');
  const shotStart = runtime.indexOf('async function shot', activeStart);
  assert.ok(activeStart >= 0 && shotStart > activeStart);
  const active = runtime.slice(activeStart, shotStart);
  assert.match(active, /const pre=await p\.evaluate/);
  assert.match(active, /if\(pre\.vs\)await p\.evaluate/);
  assert.match(active, /!s\.cineActive&&!s\.menuGate&&!s\.paused/);
  assert.doesNotMatch(active, /if\(s\.vs\)d\.vsGo/);

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

test('six-seals QA launches once, proves the safe annulus and records cleanup', () => {
  const activeStart = sixSeals.indexOf('const pre=await page.evaluate');
  const launchStart = sixSeals.indexOf('const launch=await page.evaluate', activeStart);
  assert.ok(activeStart >= 0 && launchStart > activeStart);
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
