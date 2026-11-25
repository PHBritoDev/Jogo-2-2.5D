import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LAVA_BOUNCE_CONFIG, lavaBounceFalloff, lavaBouncePulse, lavaBounceEnabled, lavaBounceRegion, lavaBounceSourceBlend, masonryShaderPatches, masonryShaderCacheKey } from './volcano-cave-masonry.js';

test('bounce da lava cai com a distância e respeita a orientação da rocha', () => {
  assert.equal(lavaBounceFalloff(0, 1), 1);
  assert.equal(lavaBounceFalloff(0, 0), LAVA_BOUNCE_CONFIG.facingFloor);
  assert.equal(lavaBounceFalloff(0, -1), LAVA_BOUNCE_CONFIG.facingFloor);
  assert.equal(lavaBounceFalloff(0, 2), 1);
  assert.ok(lavaBounceFalloff(10, 1) < lavaBounceFalloff(0, 1));
  assert.ok(lavaBounceFalloff(30, 1) < lavaBounceFalloff(10, 1));
  assert.ok(lavaBounceFalloff(10, 0) < lavaBounceFalloff(10, 1));
  assert.equal(lavaBounceFalloff(Number.NaN, 1), 0);
  assert.equal(lavaBounceFalloff(Infinity, 1), 0);
});

test('pulsação é lenta, limitada e determinística', () => {
  const samples = Array.from({ length: 32 }, (_, i) => lavaBouncePulse(i * .15, .4));
  assert.ok(samples.every(value => value >= .76 && value <= 1.0));
  assert.ok(LAVA_BOUNCE_CONFIG.color[0] >= .85);
  assert.ok(LAVA_BOUNCE_CONFIG.color[1] >= .44);
  assert.ok(LAVA_BOUNCE_CONFIG.color[2] >= .06);
  assert.equal(LAVA_BOUNCE_CONFIG.bounceStrength, 1.38);
  assert.ok(new Set(samples.map(value => value.toFixed(5))).size > 20);
  assert.equal(lavaBouncePulse(Infinity, Number.NaN), LAVA_BOUNCE_CONFIG.pulseBase);
  assert.equal(lavaBouncePulse(0, 0), LAVA_BOUNCE_CONFIG.pulseBase);
  assert.notEqual(lavaBouncePulse(2.4, .7), lavaBouncePulse(2.4, 1.4));
});

test('bounce espacial faz fade suave na entrada do Santuário', () => {
  assert.equal(lavaBounceRegion(78), 0);
  assert.ok(lavaBounceRegion(84) > 0 && lavaBounceRegion(84) < 1);
  assert.equal(lavaBounceRegion(90), 1);
  assert.equal(lavaBounceRegion(110), 1);
  assert.equal(lavaBounceRegion(Number.NaN), 0);
});

test('a fonte de bounce interpola sem salto entre as duas cataratas', () => {
  assert.equal(lavaBounceSourceBlend(126), 0);
  assert.equal(lavaBounceSourceBlend(127), 0);
  assert.equal(lavaBounceSourceBlend(135), .5);
  assert.equal(lavaBounceSourceBlend(143), 1);
  assert.equal(lavaBounceSourceBlend(144), 1);
  assert.equal(lavaBounceSourceBlend(Number.NaN), 0);
  const samples = Array.from({ length: 17 }, (_, i) => lavaBounceSourceBlend(127 + i));
  assert.ok(samples.every((value, i) => i === 0 || value >= samples[i - 1]));
});

test('somente os lotes próximos do Santuário recebem o bounce', () => {
  assert.equal(lavaBounceEnabled('Santuário das Cataratas de Fogo', true), true);
  assert.equal(lavaBounceEnabled('Santuário • galeria superior', true), true);
  assert.equal(lavaBounceEnabled('pisos da caverna', true), true);
  assert.equal(lavaBounceEnabled('Bosque das Veias Ardentes', true), false);
  assert.equal(lavaBounceEnabled('Abismo das Coroas Mortas', true), false);
  assert.equal(lavaBounceEnabled('Santuário das Cataratas de Fogo', false), false);
});

test('materiais fora do Santuário não recebem varying, uniforme ou branch de bounce', () => {
  const enabled = masonryShaderPatches(true);
  const disabled = masonryShaderPatches(false);
  const enabledVertex = enabled.vertexPrefix + enabled.vertexChunk;
  const enabledFragment = enabled.fragmentPrefix + enabled.fragmentChunk;
  const disabledVertex = disabled.vertexPrefix + disabled.vertexChunk;
  const disabledFragment = disabled.fragmentPrefix + disabled.fragmentChunk;
  assert.match(enabledVertex, /vLavaBounce/);
  assert.match(enabledFragment, /uLavaPulse/);
  assert.match(enabledVertex, /vec3 spill=mix\(vec3\(29\.,8\.,122\.\),vec3\(-31\.,12\.,149\.\),smoothstep\(127\.000,143\.000,position\.z\)\)/);
  assert.match(disabledVertex, /position\.z>135\./);
  assert.match(enabledVertex, /float deltaLen2=dot\(delta,delta\)/);
  assert.match(enabledVertex, /inversesqrt\(max\(deltaLen2,/);
  assert.doesNotMatch(disabledVertex, /vLavaBounce|uLavaPulse|uLavaGain/);
  assert.doesNotMatch(disabledFragment, /vLavaBounce|uLavaPulse|uLavaGain/);
  assert.doesNotMatch(enabledVertex + enabledFragment, /uLavaGain/);
});

test('variantes com e sem bounce usam chaves distintas no cache de programas do Three.js', () => {
  const enabled = masonryShaderCacheKey(true);
  const disabled = masonryShaderCacheKey(false);
  assert.notEqual(enabled, disabled);
  assert.equal(enabled, masonryShaderCacheKey(true));
  assert.equal(disabled, masonryShaderCacheKey(false));
  const c = LAVA_BOUNCE_CONFIG;
  const shaderConfig = [c.distanceFalloff, c.regionStartZ, c.regionFullZ, c.sourceBlendStartZ, c.sourceBlendEndZ, c.facingFloor, c.facingGain, c.bounceStrength, c.color];
  assert.ok(enabled.endsWith(JSON.stringify([true, ...shaderConfig])));
  assert.ok(disabled.endsWith(JSON.stringify([false, ...shaderConfig])));
  assert.match(enabled, /^volcano-cave-masonry-v2:/);
  assert.match(disabled, /^volcano-cave-masonry-v2:/);
  const masonry = readFileSync(new URL('./volcano-cave-masonry.js', import.meta.url), 'utf8');
  assert.match(masonry, /material\.customProgramCacheKey=\(\)=>masonryShaderCacheKey\(lavaEnabled\)/);
});

test('shader usa o relógio real da caverna e só anima os lotes do Santuário', () => {
  const masonry = readFileSync(new URL('./volcano-cave-masonry.js', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('./volcano-cave-scene.js', import.meta.url), 'utf8');
  assert.match(masonry, /if\(lavaEnabled\)shader\.uniforms\.uLavaPulse=lavaPulseUniform/);
  assert.match(masonry, /if\(palette\.stoneMap&&lavaEnabled\)m\.onBeforeRender=/);
  assert.doesNotMatch(masonry, /uLavaGain/);
  assert.doesNotMatch(masonry, /new T\.PointLight|shadowMap/);
  assert.match(scene, /masonry\(T,floors,971,\{stoneMap,clock\}\)/);
  assert.match(scene, /masonry\(T,s,862\+i,\{stoneMap,clock\}\)/);
  assert.match(scene, /masonry\(T,galleries,2491,\{stoneMap,clock\}\)/);
  assert.match(scene, /clock\.value=t/);
  const enabled = masonryShaderPatches(true);
  assert.match(enabled.fragmentChunk, /vLavaBounce\*uLavaPulse\*1\.380/);
  assert.match(enabled.fragmentChunk, /wetGlint\*uLavaPulse/);
  assert.doesNotMatch(enabled.fragmentChunk, /sin\(/);
});
