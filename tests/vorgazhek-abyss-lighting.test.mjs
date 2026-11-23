import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getVorgazhekLighting } from '../vorgazhek-abyss-dimension3d.js';

const source = readFileSync(new URL('../vorgazhek-abyss-dimension3d.js', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../tools/visual-lab/vorgazhek-abyss-preview.html', import.meta.url), 'utf8');
const runtimeQA = readFileSync(new URL('../tools/visual-lab/vorgazhek-runtime-qa.cjs', import.meta.url), 'utf8');

test('VORGAZHEK gets a stronger local fill while the abyss and exposure stay dark', () => {
  const env = getVorgazhekLighting(85);
  assert.equal(env.bg, 0x000000);
  assert.equal(env.fog, 0x010102);
  assert.ok(Math.abs(env.fogNear - 59.5) < 1e-9);
  assert.ok(Math.abs(env.fogFar - 229.5) < 1e-9);
  assert.deepEqual(env.hemi, [0xa3abb1, 0x030304, 1.1]);
  assert.deepEqual(env.sun, [0xc1cad1, .48]);
  assert.deepEqual(env.light, [0xe7e7ec, 12, 170, [0, 11, 0]]);
  assert.equal(env.exposure, 1.12);
});

test('VORGAZHEK lighting remains a fixed three-source setup without new lights or shadows', () => {
  assert.doesNotMatch(source, /new T\.(?:PointLight|DirectionalLight|HemisphereLight)/);
  const env = getVorgazhekLighting(85);
  assert.equal(env.hemi.length, 3);
  assert.equal(env.sun.length, 2);
  assert.equal(env.light.length, 4);
});

test('abyss preview consumes the exact production lighting preset', () => {
  assert.match(preview, /const e=arena\.env/);
  assert.match(preview, /new THREE\.HemisphereLight\(\.\.\.e\.hemi\)/);
  assert.match(preview, /new THREE\.DirectionalLight\(\.\.\.e\.sun\)/);
  assert.match(preview, /new THREE\.PointLight\(e\.light\[0\],e\.light\[1\],e\.light\[2\],1\.1\)/);
  assert.doesNotMatch(preview, /new THREE\.PointLight\(0xdadce6,35,180\)/);
});


test('runtime QA records landscape video at fixed size and captures portrait separately', () => {
  assert.match(runtimeQA, /browser\.newContext\(\{viewport:\{width:393,height:852\},deviceScaleFactor:1\}\)/);
  assert.doesNotMatch(runtimeQA, /page\.setViewportSize/);
  assert.match(runtimeQA, /report\.portraitState=/);
});
