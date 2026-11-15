// Caverna de Eldória — C4: luz por câmara, ambiente misturado e áudio por câmara (puro + contrato de integração).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAVE_MOODS, MOOD_ZONES, MIN_HEMI, CAVE_KEYS, SHAFT_COLORS, moodWeights, moodAt, easeEnv, caveAudioAt } from '../ascension-cave-light.js';
import { CAVE_SHAFTS } from '../ascension-cave-look.js';
import { CAVE, caveField } from '../ascension-layout.js';

const cave3d = fs.readFileSync(new URL('../ascension-cave3d.js', import.meta.url), 'utf8');
const audio = fs.readFileSync(new URL('../audio3d.js', import.meta.url), 'utf8');
const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const rgb = h => [h >> 16 & 255, h >> 8 & 255, h & 255];

test('cada câmara do layout tem humor próprio; dentro dela o humor é só dela', () => {
  for (const c of CAVE.chambers) { assert.ok(CAVE_MOODS[c.id], c.id); const w = moodWeights(c.x, c.z); assert.ok(w[c.id] > .85, `${c.id} domina no centro (${JSON.stringify(w)})`); }
  assert.ok(moodWeights(0, 2).entrada > .85, 'boca do túnel');
});

test('mistura: pesos somam 1 em toda a caverna; transição contínua; piso nunca no breu (hemisfério ≥ mínimo)', () => {
  let prev = null;
  for (let z = 14; z >= -150; z -= 1.5) for (const x of [-60, -40, -20, 0, 20, 40, 60]) {
    if (caveField(x, z) < .75) continue;
    const w = moodWeights(x, z), s = Object.values(w).reduce((a, b) => a + b, 0); assert.ok(Math.abs(s - 1) < 1e-6);
    const m = moodAt(x, z); assert.ok(m.hemi[2] >= MIN_HEMI - 1e-9); assert.ok(Math.max(...rgb(m.hemi[1])) >= 0x12, 'chão do hemisfério não é preto');
    assert.ok(m.fogFar > m.fogNear + 40 && m.exposure > 1.2 && m.exposure < 1.5);
  }
  // ao longo do corredor salão → gruta, a cor da névoa muda sem saltos
  for (let x = 0; x >= -42; x -= .5) { const f = rgb(moodAt(x, -60).fog); if (prev) assert.ok(f.every((v, i) => Math.abs(v - prev[i]) <= 6), `salto de névoa em x=${x}`); prev = f; }
});

test('humores distintos: quente na prisão e na entrada, frio no eco, violeta no cristal, verde-água na gruta', () => {
  const warm = h => { const [r, , b] = rgb(h); return r > b; };
  assert.ok(warm(CAVE_MOODS.prisao.fog) && warm(CAVE_MOODS.prisao.hemi[0]));
  assert.ok(warm(CAVE_MOODS.entrada.sun[0]) && warm(CAVE_MOODS.salao.sun[0]), 'sol dourado');
  assert.ok(!warm(CAVE_MOODS.eco.fog));
  { const [r, g, b] = rgb(CAVE_MOODS.cristal.hemi[0]); assert.ok(b > g && r > g, 'violeta'); }
  { const [r, g, b] = rgb(CAVE_MOODS.gruta.hemi[0]); assert.ok(g > r && b > r, 'verde-água'); }
});

test('suavização: easeEnv converge para o alvo e nunca ultrapassa', () => {
  const cur = moodAt(0, -46), tgt = moodAt(-58, -106); let last = Infinity;
  for (let i = 0; i < 300; i++) { easeEnv(cur, tgt, 1 / 30); const d = Math.abs(cur.exposure - tgt.exposure) + Math.abs(cur.fogFar - tgt.fogFar); assert.ok(d <= last + 1e-9); last = d; }
  assert.ok(last < .05); assert.equal(cur.fog, tgt.fog);
});

test('luzes: poucas fontes com motivo na cena, uma cor de feixe por fresta, áudio em faixa', () => {
  assert.ok(CAVE_KEYS.length <= 9); for (const k of CAVE_KEYS) { assert.ok(k[1] > 0 && k[1] <= 3.5 && k[2] <= 26); assert.ok(k[4].length > 8, 'papel descrito'); }
  assert.equal(SHAFT_COLORS.length, CAVE_SHAFTS.length);
  { const [r, , b] = rgb(SHAFT_COLORS[0]); assert.ok(r > b, 'feixe do salão é dourado'); }
  for (const [x, z] of [[0, 2], [0, -58], [-42, -62], [34, -100], [-58, -106]]) { const a = caveAudioAt(x, z); for (const v of [a.room, a.drip, a.draft]) assert.ok(v >= 0 && v <= 1); }
  assert.ok(caveAudioAt(0, -58).room > caveAudioAt(0, 2).room, 'salão ecoa mais que a boca');
  assert.ok(caveAudioAt(-46, -57).drip > caveAudioAt(34, -100).drip, 'gotas perto das poças');
});

test('C4: contrato de integração (env por câmara, luzes pelo orçamento, poça de luz no shader, áudio da caverna)', () => {
  assert.match(cave3d, /const env = moodAt\(CAVE\.spawn\.x, CAVE\.spawn\.z\)/);
  assert.match(cave3d, /easeEnv\(env, target, dt\)/);
  assert.match(cave3d, /const L = CAVE_KEYS\.map\(/); assert.match(cave3d, /l\.layers\.set\(31\)/, 'luzes passam pelo orçamento de 4');
  assert.match(cave3d, /shaftColors: SHAFT_COLORS, shaftGlow:/);
  assert.match(cave3d, /audioAt: \(x, z\) => caveAudioAt\(x, z\)/);
  assert.match(world, /cave:ascKey==='cave'&&ascZones\.cave&&ascZones\.cave\.audioAt\?ascZones\.cave\.audioAt\(x-ASC_ZONES\.cave\.x,z-ASC_ZONES\.cave\.z\):null/);
  assert.match(audio, /caveVerb = ctx\.createConvolver\(\)/); assert.match(audio, /return stepsOnly\(dt, s\); \}/, 'na caverna: sem pássaros/grilos, passos continuam');
  assert.match(audio, /if \(caveSend\) caveSend\.gain\.setTargetAtTime\(cv \? /, 'fora da caverna o eco volta a 0');
});
