// Caverna de Eldória — C1: câmera a ombro em passagem estreita e lábio do abismo legível.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAVE, CHASM_RIM, caveWalk, inChasm, onBridge, caveField } from '../ascension-layout.js';

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const cave = fs.readFileSync(new URL('../ascension-cave3d.js', import.meta.url), 'utf8');

test('lábio do abismo: pedras fora da borda, com vãos, longe da ponte, e bloqueando onde estão', () => {
  assert.ok(CHASM_RIM.length >= 25 && CHASM_RIM.length <= 60, `pedras: ${CHASM_RIM.length}`);
  const b = CAVE.bridge;
  for (const p of CHASM_RIM) {
    assert.ok(!inChasm(p.x, p.z), 'fora do vazio'); assert.ok(caveField(p.x, p.z) > 1, 'dentro do volume da caverna');
    const t = Math.max(0, Math.min(1, ((p.x - b.a[0]) * (b.b[0] - b.a[0]) + (p.z - b.a[1]) * (b.b[1] - b.a[1])) / ((b.b[0] - b.a[0]) ** 2 + (b.b[1] - b.a[1]) ** 2)));
    assert.ok(Math.hypot(p.x - (b.a[0] + (b.b[0] - b.a[0]) * t), p.z - (b.a[1] + (b.b[1] - b.a[1]) * t)) >= 3.6, 'cabeceiras da ponte livres');
    assert.equal(caveWalk(p.x, p.z), false, 'a pedra é sólida');
  }
  // há vãos: ao menos um trecho de 3 m de borda sem pedra (o salto continua possível)
  let gaps = 0; for (let a = 0; a < Math.PI * 2; a += .05) { const x = CAVE.chasm.x + Math.cos(a) * CAVE.chasm.rx * 1.08, z = CAVE.chasm.z + Math.sin(a) * CAVE.chasm.rz * 1.08; if (!CHASM_RIM.some(p => Math.hypot(p.x - x, p.z - z) < 1.6)) gaps++; }
  assert.ok(gaps > 10, 'borda com vãos');
  for (let z = -48; z >= -72; z -= 2) assert.equal(caveWalk(0, z), true, `ponte caminhável em z=${z}`);
});

test('C1: integração (câmera a ombro, malha do lábio)', () => {
  assert.match(world, /if\(L<3\.2\)\{let best=L;for\(const sg of \[1,-1\]\)/, 'ombro só quando o braço reto ficaria < 3,2 m');
  assert.match(world, /caveSide=0;camera\.position\.lerp/, 'fora da caverna o ombro zera');
  assert.match(cave, /caverna-labio-abismo/); assert.match(cave, /CHASM_RIM/);
});
