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

test('figueiras do cinturão usam fade de 8 m; sub-bosque preserva 2,2 m', () => {
  const start = source.indexOf('// A copa/tronco das árvores do cinturão precisa abrir a 8 m:');
  const end = source.indexOf('function tropicalProfile()', start);
  assert.ok(start >= 0 && end > start, 'fade das árvores do percurso precisa estar configurado');
  const block = source.slice(start, end);
  assert.ok(block.includes('beltTropical.group,8.0') && block.includes('beltUnder.group,2.2'),
    'árvores altas e sub-bosque precisam de alcances distintos');
  assert.ok(block.includes('Array.isArray(o.material)') && block.includes('addNearCameraFade(material,near)'),
    'todas as malhas e materiais da copa/tronco recebem o fade');
  assert.ok(ditherKeep(4.64, 8.0) >= 0.49 && ditherKeep(4.64, 8.0) <= 0.51,
    'a distância observada de 4,64 m abre aproximadamente metade da figueira');
  assert.equal(ditherKeep(4.64, 2.2), 1,
    'o alcance antigo de 2,2 m deixava a figueira totalmente opaca a 4,64 m');
});
