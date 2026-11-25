'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../mundo-3d-prototype.js'), 'utf8');
const call = material => {
  const match = source.match(new RegExp('addNearCameraFade\\(lib\\.materials\\.' + material + ',\\s*([0-9.]+)\\)'));
  assert.ok(match, 'fade de câmera da espécie tropical precisa continuar configurado para ' + material);
  return Number(match[1]);
};
const ditherKeep = (distance, near) => Math.min(1, Math.max(0, (distance - 0.6) / near));

test('tronco da figueira não fica opaco na distância de obstrução observada', () => {
  const fadeFn = source.match(/function addNearCameraFade\\(material,near=3\\.2\\)\\s*\\{([\\s\\S]*?)\\n\\}/);
  assert.ok(fadeFn, 'função de fade próxima da câmera precisa existir');
  assert.match(fadeFn[1], /camFade=clamp\\(\\(length\\(vViewPosition\\)-0\\.6\\)\\//);
  assert.match(fadeFn[1], /dither>camFade\\)discard/);

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
