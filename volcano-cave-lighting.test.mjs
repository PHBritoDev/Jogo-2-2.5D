import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LAVA_BOUNCE_CONFIG, lavaBounceFalloff, lavaBouncePulse, lavaBounceEnabled, lavaBounceRegion } from './volcano-cave-masonry.js';

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
  assert.ok(LAVA_BOUNCE_CONFIG.color[0] >= .75);
  assert.ok(LAVA_BOUNCE_CONFIG.color[1] >= .22);
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

test('somente os lotes próximos do Santuário recebem o bounce', () => {
  assert.equal(lavaBounceEnabled('Santuário das Cataratas de Fogo', true), true);
  assert.equal(lavaBounceEnabled('Santuário • galeria superior', true), true);
  assert.equal(lavaBounceEnabled('pisos da caverna', true), true);
  assert.equal(lavaBounceEnabled('Bosque das Veias Ardentes', true), false);
  assert.equal(lavaBounceEnabled('Abismo das Coroas Mortas', true), false);
  assert.equal(lavaBounceEnabled('Santuário das Cataratas de Fogo', false), false);
});

test('shader usa o relógio real da caverna e só anima os lotes do Santuário', () => {
  const masonry = readFileSync(new URL('./volcano-cave-masonry.js', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('./volcano-cave-scene.js', import.meta.url), 'utf8');
  assert.match(masonry, /shader\.uniforms\.uLavaPulse=lavaPulseUniform/);
  assert.match(masonry, /shader\.uniforms\.uLavaGain=lavaGain/);
  assert.match(masonry, /uniform float uLavaPulse/);
  assert.match(masonry, /vLavaBounce/);
  assert.match(masonry, /smoothstep\('\+glslNumber\(cfg\.regionStartZ\)/);
  assert.match(masonry, /vLavaBounce=wet\*\([^;]+\)\*lavaRegion/);
  assert.match(masonry, /lavaBounceEnabled\(group\.name,!!palette\.clock\)/);
  assert.doesNotMatch(masonry, /new T\.PointLight|shadowMap/);
  assert.match(scene, /masonry\(T,floors,971,\{stoneMap,clock\}\)/);
  assert.match(scene, /masonry\(T,s,862\+i,\{stoneMap,clock\}\)/);
  assert.match(scene, /masonry\(T,galleries,2491,\{stoneMap,clock\}\)/);
  assert.match(scene, /clock\.value=t/);
  assert.match(masonry, /m\.onBeforeRender=\(\)=>\{/);
  assert.match(masonry, /lavaPulseUniform\.value=lavaBouncePulse\(lavaClock\.value,pulsePhase\)/);
  assert.doesNotMatch(masonry, /uLavaTime|vLavaPhase/);
  const fragmentStart = masonry.indexOf('const fragmentChunk=');
  const fragmentEnd = masonry.indexOf('shader.fragmentShader=', fragmentStart);
  assert.ok(fragmentStart >= 0 && fragmentEnd > fragmentStart);
  const fragmentChunk = masonry.slice(fragmentStart, fragmentEnd);
  assert.match(fragmentChunk, /uLavaPulse/);
  assert.doesNotMatch(fragmentChunk, /sin\(/);
});
