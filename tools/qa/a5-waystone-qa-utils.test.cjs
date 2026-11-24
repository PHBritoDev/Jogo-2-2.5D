'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isRuntimeAssetUrl, hasCompletedTouchLifecycle } = require('./a5-waystone-qa-utils.cjs');

test('detecta módulos e modelos mesmo com query string ou fragmento', () => {
  for (const url of [
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js?cache=1',
    'https://phbritodev.github.io/Jogo-2-2.5D/Prota_otimizado_2K.glb',
    'https://example.test/models/enemy.glb#preview'
  ]) assert.equal(isRuntimeAssetUrl(url), true, url);
});

test('não classifica imagens, estilos, mapas ou extensões apenas parecidas como runtime JS/GLB', () => {
  for (const url of [
    'https://example.test/forest.png',
    'https://example.test/hud.css',
    'https://example.test/module.js.map',
    'https://example.test/model.glb.txt',
    'https://example.test/model.png?redirect=other.js',
    'not a URL'
  ]) assert.equal(isRuntimeAssetUrl(url), false, url);
});

test('trata entradas ausentes ou não textuais como inválidas', () => {
  for (const value of [undefined, null, 42, {}, '']) assert.equal(isRuntimeAssetUrl(value), false);
});


test('pathfinder rejeita atalho diagonal bloqueado pelo passo X do controlador', async () => {
  const { isAxisSeparatedSegmentClear } = await import('./a5-waystone-pathfinding.mjs');
  const blocked = (x, z) => Math.abs(x - 0.15) < 1e-8 && Math.abs(z) < 1e-8;
  assert.equal(blocked(0.15, -0.15), false, 'o ponto diagonal isolado parece livre');
  assert.equal(isAxisSeparatedSegmentClear({ x: 0, z: 0 }, { x: 0.3, z: -0.3 }, blocked, 0.3), false);
});

test('pathfinder rejeita bloqueio no passo Z depois de aceitar X', async () => {
  const { isAxisSeparatedSegmentClear } = await import('./a5-waystone-pathfinding.mjs');
  const blocked = (x, z) => Math.abs(x - 0.15) < 1e-8 && Math.abs(z + 0.15) < 1e-8;
  assert.equal(isAxisSeparatedSegmentClear({ x: 0, z: 0 }, { x: 0.3, z: -0.3 }, blocked, 0.3), false);
});

test('pathfinder mantém reta quando os dois passos reais estão livres', async () => {
  const { isAxisSeparatedSegmentClear } = await import('./a5-waystone-pathfinding.mjs');
  const blocked = (x, z) => x > 2 && z < -2;
  assert.equal(isAxisSeparatedSegmentClear({ x: 0, z: 0 }, { x: 0.3, z: -0.3 }, blocked, 0.12), true);
});

test('pathfinder rejeita entrada inválida e aceita segmento sem deslocamento', async () => {
  const { isAxisSeparatedSegmentClear } = await import('./a5-waystone-pathfinding.mjs');
  assert.equal(isAxisSeparatedSegmentClear({ x: 0, z: 0 }, { x: 1, z: 1 }, null), false);
  assert.equal(isAxisSeparatedSegmentClear({ x: 1, z: 2 }, { x: 1, z: 2 }, () => true), true);
});

test('exige encerramento real do mesmo pointer touch após touchEnd', () => {
  const valid = [
    { type: 'pointerdown', pointerType: 'touch', pointerId: 7, ending: false },
    { type: 'pointerup', pointerType: 'touch', pointerId: 7, ending: true },
    { type: 'lostpointercapture', pointerType: 'touch', pointerId: 7, ending: true }
  ];
  assert.equal(hasCompletedTouchLifecycle(valid), true);
  assert.equal(hasCompletedTouchLifecycle([valid[0]]), false);
  assert.equal(hasCompletedTouchLifecycle([
    valid[0], { type: 'pointerup', pointerType: 'touch', pointerId: 7, ending: false }
  ]), false);
  assert.equal(hasCompletedTouchLifecycle([
    valid[0], { type: 'pointerup', pointerType: 'touch', pointerId: 8, ending: true }
  ]), false);
  assert.equal(hasCompletedTouchLifecycle([
    { type: 'pointerdown', pointerType: 'mouse', pointerId: 7, ending: false },
    valid[1]
  ]), false);
  assert.equal(hasCompletedTouchLifecycle([
    valid[0], valid[1], { type: 'pointerdown', pointerType: 'touch', pointerId: 9, ending: false }
  ]), false);
});
