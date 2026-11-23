import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../tools/visual-lab/bispo3-runtime-qa.cjs', import.meta.url), 'utf8');
const sixSeals = await readFile(new URL('../tools/visual-lab/zarkhael-six-seals-qa.cjs', import.meta.url), 'utf8');

test('Bispo 3 runtime QA launches each skill once and polls read-only state', () => {
  const start = runtime.indexOf("for(const id of ['s1','s2','sw','ult'])");
  const end = runtime.indexOf('report.restored=', start);
  assert.ok(start >= 0 && end > start);
  const block = runtime.slice(start, end);
  assert.match(block, /const launch=await p\.evaluate\(id=>/);
  assert.match(block, /d\.kitMove\(id\)/);
  assert.ok(block.indexOf('d.skills()') < block.indexOf('d.kitMove(id)'));
  const pollStart = block.indexOf('p.waitForFunction(id=>');
  const pollEnd = block.indexOf('},id,{timeout:180000,polling:250});', pollStart);
  assert.ok(pollStart >= 0 && pollEnd > pollStart);
  const poll = block.slice(pollStart, pollEnd);
  assert.doesNotMatch(poll, /kitMove|\.power\(\)|\.skills\(\)|\.god\(\)/);
  assert.match(poll, /s\.cinematic\?\.phase==='aura'/);
});

test('six-seals QA launches once and observes the actual aura phase', () => {
  const start = sixSeals.indexOf('const launch=await page.evaluate');
  const end = sixSeals.indexOf('if(!launchState)', start);
  assert.ok(start >= 0 && end > start);
  const block = sixSeals.slice(start, end);
  assert.match(block, /d\.kitMove\('ult'\)/);
  assert.ok(block.indexOf('d.skills()') < block.indexOf("d.kitMove('ult')"));
  assert.doesNotMatch(block, /for\s*\(/);
  assert.match(block, /page\.waitForFunction/);
  assert.match(block, /c\?\.phase==='aura'/);
});
