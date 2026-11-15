// Caverna de Eldória — C2: rocha em volume 3D (SDF + Surface Nets), colisão e câmera pelo mesmo campo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { caveField, caveFloor, caveWalk, CAVE } from '../ascension-layout.js';
import { caveSDF, caveColumn, caveSolidAt, buildCaveSurface, makeGridSolid, SDF_BOX, SDF_TUNE } from '../ascension-cave-sdf.js';

const cave = fs.readFileSync(new URL('../ascension-cave3d.js', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../ascension-cave-sdf.worker.js', import.meta.url), 'utf8');
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const mobile = buildCaveSurface({ cell: 1.6 }), desktop = buildCaveSurface({ cell: 1 });

test('rocha 3D não invade o espaço do corpo onde se anda (pés e cabeça livres)', () => {
  let n = 0;
  for (let k = 0; k < 6000 && n < 1500; k++) {
    const x = SDF_BOX.x0 + rnd() * (SDF_BOX.x1 - SDF_BOX.x0), z = SDF_BOX.z0 + rnd() * (SDF_BOX.z1 - SDF_BOX.z0);
    if (!caveWalk(x, z)) continue; n++;
    const fl = caveFloor(x, z), c = caveColumn(x, z);
    assert.ok(caveSDF(x, fl + .3, z, c) < 0, `pés livres em ${x.toFixed(1)},${z.toFixed(1)}`);
    if (caveField(x, z) > 1.4) assert.ok(caveSDF(x, fl + 1.8, z, c) < 0, `cabeça livre em ${x.toFixed(1)},${z.toFixed(1)}`);
  }
  assert.ok(n > 1000, 'amostras caminháveis suficientes');
  assert.ok(SDF_TUNE.footClear >= .8, 'sem deformação na altura dos pés');
});

test('malha: fechada por dentro da caixa, determinística e dentro do orçamento', () => {
  for (const r of [mobile, desktop]) {
    const I = r.indices, P = r.positions, E = new Map();
    for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) { const key = a < b ? a * 1e7 + b : b * 1e7 + a; E.set(key, (E.get(key) || 0) + 1); }
    let holes = 0; for (const [key, c] of E) if (c === 1) { const a = Math.floor(key / 1e7), x = P[a * 3], y = P[a * 3 + 1], z = P[a * 3 + 2]; if (x > SDF_BOX.x0 + 3 && x < SDF_BOX.x1 - 3 && z > SDF_BOX.z0 + 3 && z < SDF_BOX.z1 - 3 && y > r.y[0] + 3 && y < r.y[1] - 3) holes++; }
    assert.equal(holes, 0, 'sem buracos na rocha');
  }
  assert.ok(mobile.indices.length / 3 <= 30000, `mobile ${mobile.indices.length / 3} tri`); assert.ok(desktop.indices.length / 3 <= 85000, `desktop ${desktop.indices.length / 3} tri`); // C5: +galeria, rampa, mirante, nicho e saída (~+12 % de superfície); o mobile segue ≤ 30 k
  const again = buildCaveSurface({ cell: 1.6 }); assert.equal(again.indices.length, mobile.indices.length); assert.equal(again.positions[123], mobile.positions[123]);
});

test('câmera: a grade rápida concorda com o campo exato (≥ 99 %) e segura a câmera na rocha', () => {
  const S = makeGridSolid(desktop.columns); let ok = 0, n = 0;
  for (let k = 0; k < 5000; k++) { const x = -80 + rnd() * 150, z = -158 + rnd() * 170, y = -10 + rnd() * 40; n++; if (S(x, y, z) === caveSolidAt(x, y, z)) ok++; }
  assert.ok(ok / n >= .99, `concordância ${(ok / n * 100).toFixed(1)} %`);
  assert.equal(S(0, -3, -58), false, 'meio do salão é ar'); assert.equal(S(0, 60, -58), true, 'acima do domo é rocha'); assert.equal(S(200, 0, 0), true, 'fora da caixa é rocha');
});

test('integração: worker com reserva na thread principal, folha antiga até chegar, rollback e câmera pelo mesmo campo', () => {
  assert.match(cave, /new Worker\(new URL\('\.\/ascension-cave-sdf\.worker\.js', import\.meta\.url\), \{ type: 'module' \}\)/);
  assert.match(cave, /setTimeout\(local, 0\)/); assert.match(cave, /caverna=0/); assert.match(cave, /gridSdf = makeGridSDF\(r\.columns\); gridSolid = /); // C3: mesmo campo, valor exposto para o teto real
  assert.match(cave, /if \(gridSolid\) \{ if \(gridSolid\(x, y, z, \.6\)\) return true; \}/);
  assert.match(cave, /const ready = Promise\.all\(\[readyAssets, sdfReady\]\)/);
  assert.match(worker, /buildCaveSurface/); assert.ok(CAVE.chambers.length >= 6, 'câmaras preservadas');
});
