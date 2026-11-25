import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cameraAboveWaterSurfaceY } from '../camera-water-clearance3d.js';

test('levanta a câmera que coincide com a lâmina do lago usando a profundidade real', () => {
  const cameraY = -0.42;
  const groundY = -1.405;
  const depth = 0.9854814922185404;
  const surfaceY = groundY + depth;
  assert.ok(Math.abs(surfaceY - (-0.4195185077814596)) < 1e-9);
  const safeY = cameraAboveWaterSurfaceY(cameraY, groundY, depth, 0.4);
  assert.ok(Math.abs(safeY - (surfaceY + 0.4)) < 1e-9);
  assert.ok(safeY - cameraY > 0.39);
});

test('não move a câmera quando já existe folga acima da água', () => {
  assert.equal(cameraAboveWaterSurfaceY(0.2, -1.405, 0.985, 0.4), 0.2);
});

test('não inventa altura em terra seca, sentinela ou profundidade inválida', () => {
  for (const depth of [-99, -0.1, 0, 0.05, 5.01, NaN, Infinity]) {
    assert.equal(cameraAboveWaterSurfaceY(-0.42, -1.405, depth, 0.4), -0.42);
  }
});

test('não fabrica posição para câmera ou terreno inválidos', () => {
  assert.equal(cameraAboveWaterSurfaceY(-0.42, NaN, 0.98, 0.4), -0.42);
  assert.ok(Number.isNaN(cameraAboveWaterSurfaceY(NaN, -1.4, 0.98, 0.4)));
});

test('limita margem configurada e usa margem segura quando a configuração não é finita', () => {
  assert.equal(cameraAboveWaterSurfaceY(-0.5, -1, 0.5, -1), -0.5);
  assert.equal(cameraAboveWaterSurfaceY(-0.5, -1, 0.5, 10), 0.5);
  assert.ok(Math.abs(cameraAboveWaterSurfaceY(-0.5, -1, 0.5, NaN) - (-0.1)) < 1e-12);
});

const mainSource = new URL('../../mundo-3d-prototype.js', import.meta.url);
if (fs.existsSync(mainSource)) {
  test('o follow-camera integrado consulta a lâmina e exclui regiões com semântica diferente', () => {
    const source = fs.readFileSync(mainSource, 'utf8');
    assert.match(source, /cameraAboveWaterSurfaceY/);
    assert.match(source, /terrain3D\.waterDepth\(cx,cz\)/);
    assert.match(source, /!inJourney\(camera\.position\.x,camera\.position\.z\)/);
    assert.match(source, /!sakuraWorld\?\.root\.visible/);
  });
}
