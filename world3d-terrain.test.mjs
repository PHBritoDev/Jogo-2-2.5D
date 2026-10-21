import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain, buildTerrainArrays, colorTerrain, scatterForest, buildAxis } from './world3d-terrain.js';

// Mesmos marcos usados por mundo-3d-prototype.js (Mod 186).
const mainTrail = [[0, 14], [0, 4], [.5, -6], [-1.8, -17], [0, -29], [2.2, -43], [-1.2, -59], [-2, -76], [5, -91], [15, -99], [27, -108], [44, -119], [46, -132], [45, -140]];
const villageTrail = [[2.2, -43], [0, -41], [-4.6, -41.4], [-8.7, -43.3], [-12.2, -44.5]];
function hill(x, z) {
  const progress = Math.min(1, Math.max(0, (-z - 70) / 49)), rise = progress * progress * (3 - 2 * progress);
  const ax = Math.abs(x - 44 * progress), edge = Math.min(1, Math.max(0, (30 - ax) / 18));
  return 5.5 * rise * edge * edge * (3 - 2 * edge);
}
const terrain = createTerrain({
  hill,
  keepouts: [{ x: 0, z: 4, r: 11, fade: 8 }, { x: 0, z: -29, r: 10, fade: 7 }, { x: -12.2, z: -44.5, r: 17.2, fade: 8 }, { x: -18.5, z: -52, r: 5 }, { x: 44, z: -119, r: 12, fade: 8 }, { x: .1, z: -56.1, r: 6 }],
  paths: [{ points: mainTrail, r: 5.5, fade: 6 }, { points: villageTrail, r: 4.5, fade: 5 }]
});

test('marcos da campanha ficam dentro do vale e sem relevo extra', () => {
  const spots = { inicio: [0, 4], clareira: [0, -29], vila: [-12.2, -44.5], gaiolas: [.1, -56.1], ruina: [-18.5, -52], guarda: [41, -117], portal: [44, -119] };
  for (const [name, [x, z]] of Object.entries(spots)) {
    assert.ok(terrain.walkable(x, z), name + ' precisa ser caminhável');
    assert.ok(Math.abs(terrain.height(x, z) - hill(x, z)) < 1e-6, name + ' não pode ganhar relevo extra');
  }
  for (const [x, z] of mainTrail) assert.ok(Math.abs(terrain.height(x, z) - hill(x, z)) < 1e-6, 'trilha plana em ' + x + ',' + z);
});

test('o vale é fechado: toda direção encontra encosta íngreme antes do fim da malha', () => {
  for (let a = 0; a < 64; a++) {
    const dx = Math.cos(a / 64 * Math.PI * 2), dz = Math.sin(a / 64 * Math.PI * 2);
    let blockedAt = -1;
    for (let r = 0; r < 300; r += .5) { if (!terrain.walkable(dx * r, -64 + dz * r)) { blockedAt = r; break; } }
    assert.ok(blockedAt > 15, 'limite muito perto do centro na direção ' + a);
    // Onde o jogador para, a encosta já está visivelmente acima do chão do vale (sem parede invisível em campo aberto).
    const h = terrain.height(dx * blockedAt, -64 + dz * blockedAt);
    assert.ok(h > 1.2, 'limite sem relevo visível na direção ' + a + ' (h=' + h.toFixed(2) + ')');
    // E logo adiante as serras sobem de verdade.
    assert.ok(terrain.height(dx * (blockedAt + 40), -64 + dz * (blockedAt + 40)) > 12, 'serra baixa demais na direção ' + a);
  }
});

test('relevo é determinístico e contínuo (sem degraus/buracos)', () => {
  const t2 = createTerrain({ hill });
  assert.equal(terrain.boundaryDistance(30, -10), t2.boundaryDistance(30, -10));
  let maxStep = 0;
  for (let x = -200; x < 200; x += 1) { const a = terrain.height(x, -64), b = terrain.height(x + .25, -64); maxStep = Math.max(maxStep, Math.abs(a - b)); }
  assert.ok(maxStep < 2.5, 'degrau abrupto de ' + maxStep.toFixed(2));
});

test('malha não uniforme cobre o horizonte e tem índices válidos', () => {
  const axis = buildAxis(124, 2, 40, 1.075);
  for (let i = 1; i < axis.length; i++) assert.ok(axis[i] > axis[i - 1]);
  const built = buildTerrainArrays(terrain, { outerSteps: 12 });
  assert.equal(built.positions.length, built.nx * built.nz * 3);
  let max = 0; for (const i of built.indices) max = Math.max(max, i);
  assert.ok(max < built.nx * built.nz);
  const normals = new Float32Array(built.positions.length); for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  const colors = colorTerrain(terrain, built.positions, normals);
  assert.ok(colors.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
});

test('floresta respeita áreas livres, separa colisão e encosta', () => {
  const isFree = (x, z) => Math.hypot(x, z - 4) > 8;
  const specs = scatterForest(terrain, { isFree });
  assert.ok(specs.length > 300);
  for (const t of specs) {
    if (t.collide) { assert.ok(terrain.boundaryDistance(t.x, t.z) < -11); assert.ok(isFree(t.x, t.z)); }
    else assert.equal(t.kind, 'conifer');
  }
  assert.ok(specs.some(t => t.collide) && specs.some(t => !t.collide));
});

test('lago escavado bloqueia a parte funda e mantém a margem caminhável', () => {
  const t = createTerrain({ ponds: [{ x: -42, z: -96, r: 13, depth: 2.2, level: -.55 }] });
  assert.ok(!t.walkable(-42, -96), 'centro do lago não pode ser caminhável');
  assert.ok(t.waterDepth(-42, -96) > 1);
  assert.ok(t.walkable(-42 + 20, -96), 'fora do lago continua caminhável');
  assert.ok(t.waterDepth(0, 0) < 0);
});
