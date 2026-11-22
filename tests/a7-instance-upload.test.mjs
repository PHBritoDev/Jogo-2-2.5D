import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { diffInstanceBlocks, markInstanceUpload } from '../instance-upload3d.js';

/** Atributo no formato do Three r160 (updateRanges + addUpdateRange). */
function attr(floatCount) {
  const updateRanges = [];
  return {
    array: new Float32Array(floatCount),
    updateRanges,
    _updateRange: { offset: 0, count: -1 },
    addUpdateRange(start, count) { updateRanges.push({ start, count }); },
    clearUpdateRanges() { updateRanges.length = 0; },
    needsUpdate: false,
  };
}

/** Bytes que WebGLAttributes r160 enviaria em bufferSubData. */
function r160UploadBytes(a) {
  if (!a.needsUpdate) return 0;
  const legacy = a._updateRange;
  if (legacy.count === -1 && a.updateRanges.length === 0) return a.array.byteLength;
  let bytes = 0;
  for (const r of a.updateRanges) bytes += r.count * a.array.BYTES_PER_ELEMENT;
  if (legacy.count !== -1) bytes += legacy.count * a.array.BYTES_PER_ELEMENT;
  return bytes;
}

test('r160: só o trecho usado do capim vai à GPU, não as 18000 matrizes reservadas', () => {
  const grass = attr(18000 * 16);
  const used = 2400;
  assert.equal(markInstanceUpload(grass, 0, used * 16), true);
  assert.equal(r160UploadBytes(grass), used * 16 * 4);
  assert.ok(r160UploadBytes(grass) < grass.array.byteLength / 5);
  assert.equal(grass._updateRange.count, -1, 'não preenche o range legado junto com updateRanges');
});

test('count zero não marca upload (evitar range vazio)', () => {
  const a = attr(64);
  assert.equal(markInstanceUpload(a, 0, 0), false);
  assert.equal(a.needsUpdate, false);
  assert.equal(r160UploadBytes(a), 0);
});

test('segunda marcação no mesmo atributo não acumula ranges', () => {
  const a = attr(1000);
  markInstanceUpload(a, 0, 100);
  markInstanceUpload(a, 0, 40);
  assert.equal(a.updateRanges.length, 1);
  assert.equal(r160UploadBytes(a), 40 * 4);
});

test('abaixo da capacidade, andar sem trocar blocos não reempacota', () => {
  const blocks = [
    { id: '1:2', count: 800, distance: 40 },
    { id: '2:2', count: 500, distance: 90 },
  ];
  const first = diffInstanceBlocks([], blocks, 18000);
  assert.equal(first.changed, true);
  assert.equal(first.clipped, false);
  assert.deepEqual(first.order.map(b => b.id), ['1:2', '2:2']);
  const moved = blocks.map(b => ({ ...b, distance: b.distance + 24 }));
  const again = diffInstanceBlocks(first.order, moved, 18000);
  assert.equal(again.changed, false);
  assert.equal(again.used, 1300);
});

test('acima da capacidade fica o bloco mais próximo e a entrada de outro bloco reempacota', () => {
  const near = { id: 'a', count: 100, distance: 10 };
  const far = { id: 'b', count: 100, distance: 80 };
  const first = diffInstanceBlocks([], [far, near], 150);
  assert.equal(first.clipped, true);
  assert.deepEqual(first.order, [{ id: 'a', count: 100 }, { id: 'b', count: 50 }]);
  const same = diffInstanceBlocks(first.order, [near, far], 150);
  assert.equal(same.changed, false);
  const entered = diffInstanceBlocks(first.order, [near, far, { id: 'c', count: 80, distance: 5 }], 150);
  assert.equal(entered.changed, true);
  assert.deepEqual(entered.order.map(b => b.id), ['c', 'a']);
});

test('jornada usa o diff e o upload parcial no capim, flores, árvores e rochas', () => {
  const w = fs.readFileSync(new URL('../jornada-world3d.js', import.meta.url), 'utf8');
  assert.match(w, /diffInstanceBlocks\(grassPlan/);
  assert.match(w, /diffInstanceBlocks\(flowerPlan/);
  assert.match(w, /markInstanceUpload\(grass\.instanceMatrix, 0, g \* 16\)/);
  assert.match(w, /markInstanceUpload\(flowers\.instanceMatrix, 0, f \* 16\)/);
  assert.match(w, /markInstanceUpload\(trunks\.instanceMatrix, 0, tr \* 16\)/);
  assert.match(w, /markInstanceUpload\(rocks\.instanceMatrix, 0, rk \* 16\)/);
  assert.doesNotMatch(w, /grass\.instanceMatrix\.needsUpdate = flowers\.instanceMatrix\.needsUpdate = true/);
  assert.match(w, /GA\.set\(v\.G\.subarray/);
});
