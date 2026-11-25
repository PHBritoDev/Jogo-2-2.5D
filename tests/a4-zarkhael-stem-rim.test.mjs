import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../zarkhael-dimension3d.js', import.meta.url), 'utf8');
const actorWorkflow = readFileSync(new URL('../.github/workflows/bispo3-lighting-ab-qa.yml', import.meta.url), 'utf8');
const start = source.indexOf('function surfaceMaterial(');
const end = source.indexOf('function makeCap(', start);
assert.ok(start >= 0 && end > start, 'surfaceMaterial must remain present');
const material = source.slice(start, end);

test('Zar’khael stem material gets a dedicated low-energy view rim', () => {
  assert.ok(material.includes("m.customProgramCacheKey = () => 'zark296-' + kind + (kind === 'stem' ? '-rim2' : '');"));
  const marker = "if (kind === 'stem') shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>'";
  const rimStart = material.indexOf(marker);
  assert.ok(rimStart >= 0, 'stem-only emissive rim must be injected after Three.js builds the view-space geometry');
  const rimEnd = material.indexOf("if (kind === 'floor') shader.fragmentShader", rimStart);
  assert.ok(rimEnd > rimStart, 'stem rim must end before the floor-only reflection');
  const rim = material.slice(rimStart, rimEnd);
  assert.match(rim, /dot\(normal,\s*geometryViewDir\)/);
  assert.doesNotMatch(rim, /geometry\.viewDir/);
  assert.doesNotMatch(rim, /normalize\(vViewPosition\)/);
  assert.match(rim, /float stemRim = 1\. - stemViewCos/);
  assert.match(rim, /totalEmissiveRadiance\s*\+=\s*vec3\(\.018,\.0018,\.0028\)/);
  assert.match(rim, /\.55\s*\+\s*\.45\s*\*\s*n/);
});

test('the rim reuses the existing tissue noise and does not add light or render resources', () => {
  const colorStart = material.indexOf("const color = kind === 'cap' ?");
  const stemStart = material.indexOf(": kind === 'stem'", colorStart);
  const floorStart = material.indexOf(": kind === 'floor'", stemStart);
  assert.ok(colorStart >= 0 && stemStart > colorStart && floorStart > stemStart);
  const stemColor = material.slice(stemStart, floorStart);
  assert.match(stemColor, /float n=tissue\(vOrganic\*vec3\(20\.,7\.,20\.\)\)/);
  assert.doesNotMatch(source, /new\s+(?:THREE|T)\.(?:PointLight|SpotLight|DirectionalLight|HemisphereLight)\b/);
  assert.doesNotMatch(source, /WebGLRenderTarget|EffectComposer|ShadowMap/);
  assert.match(source, /drawCalls:5/);
});

test('only the stem program cache key changes for the rim shader', () => {
  assert.equal((material.match(/kind === 'stem' \? '-rim1' : ''/g) || []).length, 1);
  assert.equal((material.match(/if \(kind === 'stem'\) shader\.fragmentShader/g) || []).length, 1);
});

test('actor lighting workflow reruns when its own workflow definition changes', () => {
  const trigger = actorWorkflow.split('jobs:')[0];
  assert.match(trigger, /- '\.github\/workflows\/bispo3-lighting-ab-qa\.yml'/);
});
