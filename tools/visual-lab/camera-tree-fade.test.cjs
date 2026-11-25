'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../mundo-3d-prototype.js'), 'utf8');
const call = material => {
  const token = 'addNearCameraFade(lib.materials.' + material + ',';
  const index = source.indexOf(token);
  assert.notEqual(index, -1, 'fade de câmera tropical ausente para ' + material);
  const start = index + token.length;
  const end = source.indexOf(')', start);
  return Number(source.slice(start, end).trim());
};
const ditherKeep = (distance, near) => Math.min(1, Math.max(0, (distance - 0.6) / near));

test('tronco da figueira não fica opaco na distância de obstrução observada', () => {
  const start = source.indexOf('function addNearCameraFade(material,near=3.2){');
  const end = source.indexOf('\n}', start);
  assert.notEqual(start, -1, 'função de fade próxima da câmera precisa existir');
  assert.ok(end > start, 'corpo da função de fade precisa estar completo');
  const fadeFn = source.slice(start, end);
  assert.ok(fadeFn.includes('camFade=clamp((length(vViewPosition)-0.6)/'),
    'o fade precisa continuar baseado na distância real até a câmera');
  assert.ok(fadeFn.includes('if(camFade<0.999&&dither>camFade)discard;'),
    'o shader precisa abrir fragmentos por dithering, sem alpha blend caro');

  const barkNear = call('bark');
  const leavesNear = call('leaves');
  const observedHitDistance = 4.64;
  const baselineKept = ditherKeep(observedHitDistance, 2.6);
  const candidateKept = ditherKeep(observedHitDistance, barkNear);

  assert.equal(baselineKept, 1, 'o valor anterior de 2,6 m deixava o tronco 100% opaco a 4,64 m');
  assert.equal(barkNear, leavesNear, 'tronco e copa precisam compartilhar a janela de fade');
  assert.ok(candidateKept <= 0.51 && candidateKept >= 0.49,
    'a distância observada precisa descartar aproximadamente metade dos fragmentos do tronco');
});

test('árvore ancestral GLB também abre o tronco quando a câmera entra no volume', () => {
  const live = fs.readFileSync(path.join(__dirname, '../../eldoria-live-village3d.js'), 'utf8');
  const start = live.indexOf('function addNearCameraFade(material, near = 8.0) {');
  const end = live.indexOf('\n}', start);
  assert.ok(start >= 0 && end > start, 'o módulo da vila precisa possuir o mesmo fade por distância');
  const fadeFn = live.slice(start, end);
  assert.ok(fadeFn.includes('nearCameraFadeMaterials = new WeakSet()'),
    'materiais compartilhados pelos dois GLBs não podem receber o hook duas vezes');
  assert.ok(fadeFn.includes('length(vViewPosition)-0.6') && fadeFn.includes('dither>camFade'),
    'o GLB usa o mesmo dither espacial do cinturão tropical');
  assert.ok(fadeFn.includes('customProgramCacheKey') && fadeFn.includes('material.needsUpdate = true'),
    'o shader precisa invalidar o programa compilado');
  const treeBlock = live.slice(live.indexOf("if (spec.kind === 'tree')"), live.indexOf('root.add(obj)', live.indexOf("if (spec.kind === 'tree')")));
  assert.ok(treeBlock.includes('Array.isArray(child.material)'),
    'malhas GLB com mais de um material também precisam ser cobertas');
  assert.ok(treeBlock.includes('addNearCameraFade(material, 8.0)'),
    'o tronco e a copa da árvore ancestral precisam compartilhar a janela de 8 m');
});
