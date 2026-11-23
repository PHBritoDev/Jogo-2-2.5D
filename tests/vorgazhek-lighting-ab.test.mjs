import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const qa = readFileSync(new URL('../tools/visual-lab/vorgazhek-lighting-ab-qa.cjs', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/bispo2-abyss-qa.yml', import.meta.url), 'utf8');

test('VORGAZHEK A/B compares production presets with a real Bishop 2 GLB at fixed camera/time', () => {
  assert.match(qa, /VISUAL_BASELINE_URL/);
  assert.match(qa, /\/Bispo2-lod\.glb/);
  assert.match(qa, /q\.frame\(2000\)/);
  assert.match(qa, /bossMeanDelta/);
  assert.match(qa, /waterMeanDelta/);
  assert.match(qa, /horizonMeanDelta/);
  assert.match(workflow, /github\.event\.pull_request\.base\.sha/);
  assert.match(workflow, /vorgazhek-lighting-ab-qa\.cjs/);
  assert.match(workflow, /tests\/vorgazhek-lighting-ab\.test\.mjs/);
});
