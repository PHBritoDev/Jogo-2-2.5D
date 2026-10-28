import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { lightningBolt, groundNormal, smooth, easeOut } from './celestial-fxkit3d.js';
import { CelestialStarfall, STARFALL } from './celestial-starfall3d.js';
const src = f => readFileSync(new URL('./' + f, import.meta.url), 'utf8');
test('MOD 229: raio ramificado é determinístico e cabe no buffer fixo', () => {
  const a = Array(40).fill(null), b = Array(40).fill(null);
  const n1 = lightningBolt(7, 0, 50, 0, 10, 0, 5, a), n2 = lightningBolt(7, 0, 50, 0, 10, 0, 5, b);
  assert.equal(n1, n2); assert.deepEqual(a.slice(0, n1), b.slice(0, n2)); assert(n1 <= 40 && n1 > 3);
  assert.deepEqual(a[n1 - 1] && a[0].slice(0, 3), [0, 50, 0]);
});
test('MOD 229: normal do terreno assenta decalques em encostas', () => {
  const flat = groundNormal(() => 2, 0, 0); assert(Math.abs(flat[1] - 1) < 1e-9);
  const slope = groundNormal((x) => x * .5, 0, 0); assert(slope[0] < 0 && slope[1] < 1 && Math.abs(Math.hypot(...slope) - 1) < 1e-9);
  assert.equal(smooth(-1), 0); assert.equal(smooth(2), 1); assert.equal(easeOut(1), 1);
});
test('MOD 229: Skill 2 — estrelas pesadas pontuam cada salva sem mudar o dano (60 acertos)', () => {
  const hits = []; const s = new CelestialStarfall({ hit: () => hits.push(1) }); const t = { id: 1, alive: true, x: 0, y: 1.15, z: 0 };
  s.start({ x: 0, y: 1.7, z: 0 }, t); for (let i = 0; i < 1300; i++) s.update(1 / 120, t);
  assert.equal(s.stars.filter(x => x.heavy).length, 9); assert.equal(hits.length, 60); assert.equal(STARFALL.count, 90);
});
test('MOD 229: Ultimate — asas antes da subida, tempestade com restauração e sem nuvens de esferas', () => {
  const m = src('mundo-3d-prototype.js'), vfx = src('celestial-whitehole-vfx3d.js'), storm = src('celestial-storm3d.js');
  assert(/rise=clamp\(\(t-\.8\)\/2\.4\)/.test(m), 'a subida espera as asas abrirem');
  assert(m.includes("Asas.glb?v=mod229"), 'reaproveita as asas do prólogo');
  for (const k of ['hemiSky', 'hemiGround', 'sunColor', 'fogNear']) assert(m.includes(k), 'snapshot guarda ' + k);
  assert(m.includes('whiteStorm?.hide()'), 'restauração esconde a tempestade');
  assert(!/SphereGeometry\(1,10,6\)/.test(vfx), 'sem nuvens de bolinhas');
  assert(!/LineSegments/.test(vfx), 'sem a chuva local embaixo do disco');
  assert(/cam\+rel/.test(storm), 'chuva relativa à câmera');
  assert(/MeshBasicMaterial\(\{ color: 0x000000/.test(vfx), 'disco negro absoluto preservado');
});
test('MOD 229: Skill 3 — lease do alvo capturado sempre devolve o inimigo ao chão', () => {
  const m = src('mundo-3d-prototype.js');
  assert(/function releasePhoenixHold\(\)\{[^}]*terrainHeightAt/.test(m));
  assert(/finally\{applyPhoenixHold\(\);\}/.test(m), 'aplica/solta o lease mesmo com exceção');
  assert(/if\(phoenixHold\)\{enemyKnockback=0;/.test(m), 'IA pausada enquanto preso');
});
