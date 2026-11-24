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


test('classifica oito lados e prioriza o primeiro degrau com menor desnível', async () => {
  const { rankShelterApproaches } = await import('./a5-waystone-pathfinding.mjs');
  const sides = rankShelterApproaches({
    center: { x: 0, z: 0 }, radius: 3.35, deckY: 1.1, stepUp: 0.55,
    sample: ({ x }) => ({ height: x > 0 ? 0.8 : 0.3, edge: -20, water: false })
  });
  assert.equal(sides.length, 8);
  assert.equal(sides[0].index, 0);
  assert.equal(sides[0].rise, 0.3);
  assert.ok(sides[0].ok);
  assert.ok(sides.every(side => side.samples.length >= 5));
  assert.ok(sides.some(side => !side.ok && side.reason === 'step-exceeds-limit'));
});

test('não declara acesso caminhável quando todos os lados excedem STEP_UP', async () => {
  const { rankShelterApproaches } = await import('./a5-waystone-pathfinding.mjs');
  const sides = rankShelterApproaches({
    center: { x: 6.5, z: -79 }, radius: 3.35, deckY: 1.328, stepUp: 0.55,
    sample: () => ({ height: 0.474, edge: -20, water: false })
  });
  assert.equal(sides.length, 8);
  assert.ok(sides.every(side => !side.ok && side.reason === 'step-exceeds-limit'));
  assert.ok(sides.every(side => Math.abs(side.rise - 0.854) < 1e-9));
});

test('rejeita lado com água, borda não caminhável ou amostra inválida', async () => {
  const { rankShelterApproaches } = await import('./a5-waystone-pathfinding.mjs');
  const water = rankShelterApproaches({
    center: { x: 0, z: 0 }, radius: 3, deckY: 1, stepUp: 0.55,
    sample: () => ({ height: 0.8, edge: -20, water: true })
  });
  assert.ok(water.every(side => side.reason === 'water'));
  const edge = rankShelterApproaches({
    center: { x: 0, z: 0 }, radius: 3, deckY: 1, stepUp: 0.55,
    sample: () => ({ height: 0.8, edge: -2, water: false })
  });
  assert.ok(edge.every(side => side.reason === 'outside-walkable-area'));
  const invalid = rankShelterApproaches({
    center: { x: 0, z: 0 }, radius: 3, deckY: 1, stepUp: 0.55,
    sample: () => ({ height: NaN, edge: -20, water: false })
  });
  assert.ok(invalid.every(side => side.reason === 'non-finite-sample'));
});


test('mede a altura junto à borda do anel, não usa terreno mais alto no ponto de aproximação', async () => {
  const { rankShelterApproaches } = await import('./a5-waystone-pathfinding.mjs');
  const sides = rankShelterApproaches({
    center: { x: 0, z: 0 }, radius: 3.35, deckY: 1.1, stepUp: 0.55,
    sample: ({ radius }) => ({ height: radius > 3.35 ? 0.8 : 0.3, edge: -20, water: false })
  });
  assert.ok(sides.every(side => !side.ok && side.reason === 'step-exceeds-limit'));
  assert.equal(sides[0].groundY, 0.3);
  assert.equal(sides[0].maxApproachGroundY, 0.8);
  assert.equal(sides[0].rise, 0.8);
});
