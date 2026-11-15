// Caverna de Eldória — C3: material, espeleotemas e água (regras puras + contrato de integração).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAVE_SHAFTS, planCurtains, curtainSamples, stalactiteRadius, stalagmiteRadius } from '../ascension-cave-look.js';
import { buildCaveSurface, shadeCaveSurface, caveRoofAt } from '../ascension-cave-sdf.js';
import { CAVE, caveField, caveFloor } from '../ascension-layout.js';

const cave3d = fs.readFileSync(new URL('../ascension-cave3d.js', import.meta.url), 'utf8');
const look = fs.readFileSync(new URL('../ascension-cave-look.js', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../ascension-cave-sdf.worker.js', import.meta.url), 'utf8');

test('sombreamento assado: normais unitárias apontando para o ar, oclusão em [0,32; 1] com reentrâncias reais', () => {
  const r = buildCaveSurface({ cell: 1.6 }), s = shadeCaveSurface(r), P = r.positions, I = r.indices, N = s.normals;
  let agree = 0;
  for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    if ((uy * vz - uz * vy) * N[a] + (uz * vx - ux * vz) * N[a + 1] + (ux * vy - uy * vx) * N[a + 2] > 0) agree++; }
  assert.ok(agree / (I.length / 3) > .99, 'normal do campo concorda com a face (lado do ar)');
  for (let v = 0; v < N.length; v += 3) assert.ok(Math.abs(Math.hypot(N[v], N[v + 1], N[v + 2]) - 1) < 1e-3);
  const dark = s.ao.filter(a => a < .85).length;
  assert.ok(Math.min(...s.ao) >= .32 - 1e-6 && Math.max(...s.ao) <= 1);
  assert.ok(dark > 100, `reentrâncias escurecidas (${dark})`);
});

test('cortinas de calcita: só na abóbada alta junto à parede, ponta ≥ 3,4 m acima do piso, espaçadas e determinísticas', () => {
  const S = curtainSamples(caveField, caveRoofAt, { step: 2 }), a = planCurtains(S), b = planCurtains(S);
  assert.deepEqual(a, b); assert.ok(a.length >= 6 && a.length <= 26, `${a.length} cortinas`);
  for (const c of a) { assert.ok(c.top - c.L - caveFloor(c.x, c.z) >= 3.4 - 1e-9, 'vão livre sob a cortina');
    const f = caveField(c.x, c.z); assert.ok(f >= 1.4 && f <= 4.5); }
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) assert.ok(Math.hypot(a[i].x - a[j].x, a[i].z - a[j].z) >= 6);
});

test('perfis de espeleotema: base larga, ponta fina, sem raio negativo', () => {
  for (let t = 0; t <= 1; t += .05) { assert.ok(stalactiteRadius(t) > 0); assert.ok(stalagmiteRadius(t) > 0); }
  assert.ok(stalactiteRadius(0) > 1.5 * stalactiteRadius(.5) && stalactiteRadius(.5) > 2 * stalactiteRadius(.95));
  assert.ok(stalagmiteRadius(0) > stalagmiteRadius(.9));
});

test('frestas: cada uma dentro da caverna, sobre o ar', () => {
  for (const [x, z] of CAVE_SHAFTS) assert.ok(caveField(x, z) > 0, `fresta ${x},${z}`);
});

test('C3: contrato de integração (um programa de rocha, água com profundidade, pendurados no teto real)', () => {
  assert.match(cave3d, /const caveMat = caveRockMaterial\(THREE, \{ origin/);
  assert.match(cave3d, /floorMat = caveRockMaterial\(THREE, \{ origin, floor: true/);
  assert.match(cave3d, /new THREE\.Mesh\(g, caveMat\); m\.name = 'caverna-rocha-3d'/);
  assert.match(cave3d, /setAttribute\('normal', new THREE\.BufferAttribute\(r\.normals, 3\)\)/);
  assert.match(cave3d, /buildHanging\(\); \/\/ C3/);
  assert.match(cave3d, /poolGeometry\(THREE, p, y, caveFloorVisual/);
  assert.match(cave3d, /if \(nearPath\(x, z, r \* \.7\)\) continue;/, 'estalagmites fora do caminho');
  assert.match(cave3d, /Math\.min\(\.38 \+ \.2 \* L, \.85 - f\)/, 'raio não cruza a linha onde se anda');
  assert.match(cave3d, /maxL = room - 2\.9/, 'estalactite não desce até a cabeça');
  assert.doesNotMatch(cave3d, /uC: \{ value: new THREE\.Color\(0x2fd3c6\) \}/, 'sem a poça neon antiga');
  assert.match(look, /customProgramCacheKey = \(\) => 'caverna-rocha-c[34]'/);
  assert.doesNotMatch(look, /cvHgt = dot\(tpC/, 'textura fora do relevo (mosaico no celular)');
  assert.match(worker, /shadeCaveSurface\(r\)/);
  assert.ok(CAVE.pools.length <= 6 && CAVE_SHAFTS.length <= 6, 'cabem nos uniformes de 6');
});
