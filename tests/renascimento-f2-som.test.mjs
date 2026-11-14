// Renascimento de Eldória — Fase 2: som do rio (correnteza perto da margem, marulho no vau).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRiverQuery, fordAlong, fordMask, FORD } from '../eldoria-river-banks.js';
import { RIVER_POINTS, RIVER, BRIDGE } from '../act1-world-layout.js';

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const audio = fs.readFileSync(new URL('../audio3d.js', import.meta.url), 'utf8');
const q = createRiverQuery(RIVER_POINTS, { width: RIVER.width * .98, level: RIVER.level }), fordS = fordAlong(q);
// mesma conta de riverAudioAt (mundo-3d-prototype.js)
const at = (x, z) => { const n = q.nearest(x, z); if (!n) return { riverDistance: 99, fordNear: 0 }; const d = Math.max(0, n.d - 2.6); return { riverDistance: d, fordNear: fordMask(n, fordS) * Math.max(0, 1 - d / 12) }; };
const gain = r => .16 * Math.pow(Math.max(0, 1 - r / 24), 1.4);

test('som do rio: forte na margem, some longe; marulho só perto do vau', () => {
  const bank = at(BRIDGE.x + 12, BRIDGE.z + 4), far = at(-12, -44), ford = at(FORD.x, FORD.z + 3), bridgeSide = at(BRIDGE.x, BRIDGE.z + 4);
  assert.ok(bank.riverDistance < 3 && gain(bank.riverDistance) > .1, 'perto da margem ouve-se a correnteza');
  assert.ok(far.riverDistance >= 24 || gain(far.riverDistance) === 0, 'na praça da cidade o rio não soa');
  assert.ok(ford.fordNear > .5, 'no vau o marulho aparece'); assert.equal(bridgeSide.fordNear, 0, 'na ponte não há marulho de vau');
});

test('som do rio: integração no motor de áudio existente (sem arquivos externos)', () => {
  assert.match(audio, /layers\.river = loopNoise\('lowpass'/); assert.match(audio, /layers\.riffle = loopNoise\('bandpass'/);
  assert.match(audio, /s\.riverDistance/); assert.match(audio, /s\.fordNear/);
  assert.match(world, /\.\.\.riverAudioAt\(x,z\)/); assert.ok(!/\.(mp3|ogg|wav)['"]/.test(audio), 'procedural, sem amostras');
});
