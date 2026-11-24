import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const qa = readFileSync(new URL('../tools/visual-lab/vorgazhek-lighting-ab-qa.cjs', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/bispo2-abyss-qa.yml', import.meta.url), 'utf8');
const bossSource = readFileSync(new URL('../vorgazhek3d.js', import.meta.url), 'utf8');

test('VORGAZHEK A/B uses the current squad rig, fixed camera/time and untouched abyss', () => {
  assert.match(qa, /VISUAL_BASELINE_URL/);
  assert.match(qa, /VG_FILE/);
  assert.match(qa, /VG_idle/);
  assert.match(bossSource, /NewBispo2_Otimizado\.glb/);
  assert.match(qa, /q\.hero\.position\.set\(-3,\.9,10\)/);
  assert.match(qa, /q\.cam\.position\.set\(18,10,15\)/);
  assert.match(qa, /q\.cam\.position\.set\(12,3\.5,18\)/);
  assert.match(qa, /bossRoot\.position\.set\(-\.7,0,7\.6\)/);
  assert.match(qa, /q\.frame\(2000\)/);
  assert.match(qa, /bossMeanDelta/);
  assert.match(qa, /rectsOverlap/);
  assert.match(qa, /bossP95Delta/);
  assert.match(qa, /bossVisiblePctDelta/);
  assert.match(qa, /assert\.deepEqual\(h\.rects\.boss,b\.rects\.boss/);
  assert.match(qa, /assert\.deepEqual\(h\.rects\.hero,b\.rects\.hero/);
  assert.match(qa, /waterMeanDelta/);
  assert.match(qa, /angleWaterMeanDelta/);
  assert.match(qa, /obliqueWaterMeanDelta/);
  assert.match(qa, /obliqueWaterP95Delta/);
  assert.doesNotMatch(qa, /h\.roi\.boss\.mean>b\.roi\.boss\.mean\+/);
  assert.match(qa, /obliqueWaterMeanDelta/);
  assert.match(qa, /obliqueWaterP95Delta/);
  assert.match(qa, /obliqueHorizonMeanDelta/);
  assert.match(workflow, /github\.event\.pull_request\.base\.sha/);
  assert.match(workflow, /vorgazhek-lighting-ab-qa\.cjs/);
  assert.match(workflow, /RUN_RUNTIME/);
});
