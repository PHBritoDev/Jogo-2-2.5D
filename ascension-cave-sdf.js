/**
 * Caverna de Eldória — C2: volume 3D da rocha (SDF) e malha por Surface Nets. Puro JS, sem Three/DOM, usável em
 * Web Worker e testável em Node.
 *
 * Antes, paredes e abóbada eram UMA folha de altura (`caveRoofAt`) que "caía" na borda. As paredes viravam saias
 * verticais esticadas, sem reentrâncias, saliências ou estratos. Agora:
 *  - O piso caminhável continua sendo a folha de altura exata de `caveFloor`/`caveFloorVisual`. A física, os
 *    gatilhos e a colisão dos pés continuam iguais (nada muda no que já é jogável).
 *  - Paredes e abóbada saem de um campo 3D: o vazio de antes (contorno `caveField` + domo `caveRoofAt`), deformado
 *    por ruído 3D e por **estratos inclinados** (bancadas e saliências de calcário).
 *    - A deformação é **zero na altura dos pés** (até 0,8 m sobre o piso) e cresce até 2,6 m. Assim a parede
 *      visível na altura do corpo continua onde a colisão está.
 *    - Acima disso aparecem reentrâncias e beirais de verdade.
 *  - A câmera usa o mesmo campo (`caveSolidAt`): o que se vê é o que segura a câmera.
 * Surface Nets (dual contouring simplificado): 1 vértice por célula cruzada e quads entre células vizinhas. Malha
 * contínua sem buracos, ~1 m de resolução (1,35 m no mobile). A avaliação é esparsa: só as colunas perto de parede
 * e a faixa da abóbada.
 */
import { CAVE, caveField, caveFloor, caveCeil, fbm, hash2 } from './ascension-layout.js';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Altura da abóbada (folha antiga; continua sendo o "esqueleto" do domo). */
export function caveRoofAt(x, z) {
  const f = caveField(x, z), base = caveFloor(x, z);
  if (f < -.4) return base - .6;
  const C = caveCeil(x, z), wallH = Math.min(C, 4.6), band = 2.5 + .2 * C;
  return base - .6 + (wallH + .6) * smooth(-.4, .7, f) + Math.max(0, C - wallH) * smooth(.7, band, f) - 2.2 * (fbm(x * .16, z * .16, 901, 3) - .5) * smooth(1, 4, f);
}
function chasmDrop(x, z) {
  const c = CAVE.chasm, w = .9 * (fbm(x * .2, z * .2, 41, 2) - .5);
  const e = ((x - c.x) / (c.rx + w)) ** 2 + ((z - c.z) / (c.rz + w)) ** 2;
  return e >= 1 ? 0 : 34 * smooth(1, .78, e) + 6 * fbm(x * .3, z * .3, 902, 2);
}
function poolDrop(x, z) { let d = 0; for (const p of CAVE.pools) { const r = Math.hypot(x - p.x, z - p.z); if (r < p.r + .6) d = Math.max(d, 1.3 * smooth(p.r + .6, p.r - .8, r)); } return d; }
/** Altura do piso visual (abismo e poças rebaixados; a colisão impede pisar neles). */
export function caveFloorVisual(x, z) { return caveFloor(x, z) - chasmDrop(x, z) - poolDrop(x, z); }

// ruído de valor 3D determinístico (mesma família de hash do layout)
function h3(i, j, k, s) { return hash2(i + k * 7919, j - k * 104729, s); }
function vnoise3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h3(xi, yi, zi, s), h3(xi + 1, yi, zi, s), u), l(h3(xi, yi + 1, zi, s), h3(xi + 1, yi + 1, zi, s), u), v),
    l(l(h3(xi, yi, zi + 1, s), h3(xi + 1, yi, zi + 1, s), u), l(h3(xi, yi + 1, zi + 1, s), h3(xi + 1, yi + 1, zi + 1, s), u), v), w);
}
function fbm3(x, y, z, s) { return (vnoise3(x, y, z, s) * .62 + vnoise3(x * 2.07, y * 2.07, z * 2.07, s + 13) * .38); }

/** Dados por coluna (x,z): campo horizontal, piso visual e abóbada. Caros (fbm 2D); calculados uma vez por coluna. */
export function caveColumn(x, z) { return { f: caveField(x, z), fl: caveFloorVisual(x, z), rf: caveRoofAt(x, z) }; }

export const SDF_TUNE = Object.freeze({ footClear: .8, fullAt: 2.6, wallAmp: 1.15, roofAmp: .38, strata: .34 });
/**
 * Campo 3D: > 0 rocha, < 0 ar (aproximadamente em metros perto da superfície).
 * Ar = dentro do contorno E abaixo da abóbada. Abaixo do piso também é "ar" para este campo, porque o piso é a folha
 * de altura à parte: assim o Surface Nets não gera uma segunda superfície no chão.
 */
export function caveSDF(x, y, z, col = caveColumn(x, z)) {
  const { f, fl, rf } = col;
  let d = Math.max(-f, y - rf);
  const T = SDF_TUNE, lift = smooth(fl + T.footClear, fl + T.fullAt, y);
  if (lift > 0) {
    const wall = 1 - smooth(2, 5, f); // 1 junto à parede, 0 no meio da câmara (domo quase liso: estalactites assentam)
    const n = (fbm3(x * .17, y * .21, z * .17, 71) - .5) * 2;
    const strata = Math.sin((y + .22 * x - .12 * z) * 1.55 + 2.4 * fbm3(x * .05, y * .05, z * .05, 73)) * T.strata * wall;
    d += lift * ((T.wallAmp * wall + T.roofAmp * (1 - wall)) * n + strata);
  }
  return d;
}
/** Câmera/projéteis: é rocha (com folga) segundo o mesmo campo da malha? */
export function caveSolidAt(x, y, z, pad = .5) { return caveSDF(x, y, z) > -pad; }

/** Caixa da caverna (coordenadas locais) e passo da grade. */
export const SDF_BOX = Object.freeze({ x0: -82, x1: 76, z0: -160, z1: 16 });

/**
 * Surface Nets esparso. Devolve { positions: Float32Array, indices: Uint32Array, cells, evals, ms }.
 * Colunas longe de qualquer parede (|f| alto) só avaliam a faixa da abóbada; fora da caverna, rocha sem avaliar.
 */
export function buildCaveSurface({ cell = 1, box = SDF_BOX } = {}) {
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const nx = Math.ceil((box.x1 - box.x0) / cell) + 1, nz = Math.ceil((box.z1 - box.z0) / cell) + 1;
  const cols = new Array(nx * nz);
  let yMin = 1e9, yMax = -1e9;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = box.x0 + i * cell, z = box.z0 + j * cell, f = caveField(x, z);
    if (f < -3) { cols[i + j * nx] = null; continue; }
    const c = caveColumn(x, z); cols[i + j * nx] = c;
    if (f > -1) { yMin = Math.min(yMin, caveFloor(x, z) - 2.5); yMax = Math.max(yMax, c.rf + 3); }
  }
  yMin = Math.floor(yMin); yMax = Math.ceil(yMax);
  const ny = Math.ceil((yMax - yMin) / cell) + 1, NXY = nx * ny;
  const val = new Float32Array(nx * ny * nz); let evals = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const c = cols[i + j * nx], base = i + j * NXY;
    if (!c) { for (let k = 0; k < ny; k++) val[base + k * nx] = 1; continue; }
    const x = box.x0 + i * cell, z = box.z0 + j * cell, nearWall = c.f < 4.5;
    const lo = nearWall ? -1e9 : c.rf - 3.2, hi = nearWall ? 1e9 : c.rf + 3.2, floorY = caveFloor(x, z);
    for (let k = 0; k < ny; k++) {
      const y = yMin + k * cell; let v;
      if (y < lo) v = -1; else if (y > hi) v = 1;
      else if (!nearWall && y < floorY + SDF_TUNE.footClear) v = Math.max(-c.f, y - c.rf);
      else { v = caveSDF(x, y, z, c); evals++; }
      val[base + k * nx] = v;
    }
  }
  // vértices: um por célula com troca de sinal (média dos cruzamentos nas 12 arestas)
  const vid = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1), pos = [];
  const at = (i, k, j) => val[i + k * nx + j * NXY];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const C8 = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]]; // (i,k,j)
  const cv = new Float32Array(8);
  for (let j = 0; j < nz - 1; j++) for (let k = 0; k < ny - 1; k++) for (let i = 0; i < nx - 1; i++) {
    let m = 0; for (let q = 0; q < 8; q++) { const c = C8[q]; cv[q] = at(i + c[0], k + c[1], j + c[2]); if (cv[q] > 0) m |= 1 << q; }
    if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) { const va = cv[a], vb = cv[b]; if ((va > 0) === (vb > 0)) continue; const t = va / (va - vb), A = C8[a], B = C8[b];
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; n++; }
    vid[i + k * (nx - 1) + j * (nx - 1) * (ny - 1)] = pos.length / 3;
    pos.push(box.x0 + (i + sx / n) * cell, yMin + (k + sy / n) * cell, box.z0 + (j + sz / n) * cell);
  }
  // faces: para cada aresta da grade com troca de sinal, um quad entre as 4 células que a compartilham
  const idx = [], CX = nx - 1, CXY = (nx - 1) * (ny - 1), V = (i, k, j) => (i < 0 || k < 0 || j < 0 || i >= nx - 1 || k >= ny - 1 || j >= nz - 1) ? -1 : vid[i + k * CX + j * CXY];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let j = 0; j < nz; j++) for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) {
    const v0 = at(i, k, j), s0 = v0 > 0;
    if (i < nx - 1 && j > 0 && k > 0 && s0 !== (at(i + 1, k, j) > 0)) quad(V(i, k - 1, j - 1), V(i, k, j - 1), V(i, k, j), V(i, k - 1, j), !s0);
    if (k < ny - 1 && i > 0 && j > 0 && s0 !== (at(i, k + 1, j) > 0)) quad(V(i - 1, k, j - 1), V(i - 1, k, j), V(i, k, j), V(i, k, j - 1), !s0);
    if (j < nz - 1 && i > 0 && k > 0 && s0 !== (at(i, k, j + 1) > 0)) quad(V(i - 1, k - 1, j), V(i, k - 1, j), V(i, k, j), V(i - 1, k, j), !s0);
  }
  const ms = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
  // grade 2D das colunas (para a câmera consultar o mesmo campo sem refazer o fbm 2D a cada raio)
  const gf = new Float32Array(nx * nz), gfl = new Float32Array(nx * nz), grf = new Float32Array(nx * nz);
  for (let q = 0; q < nx * nz; q++) { const c = cols[q]; if (c) { gf[q] = c.f; gfl[q] = c.fl; grf[q] = c.rf; } else { gf[q] = -4; gfl[q] = 0; grf[q] = -50; } }
  return { positions: new Float32Array(pos), indices: new Uint32Array(idx), cells: nx * ny * nz, evals, ms, grid: [nx, ny, nz], y: [yMin, yMax],
    columns: { nx, nz, cell, x0: box.x0, z0: box.z0, f: gf, fl: gfl, rf: grf } };
}

/** Teste de sólido rápido pela grade de colunas (bilinear) + ruído 3D: o mesmo campo da malha, barato o bastante para
 *  os ~100 raios de câmera por quadro. Fora da grade = rocha. */
export function makeGridSolid(G) {
  const { nx, nz, cell, x0, z0, f, fl, rf } = G;
  const lerp = (A, i, j, u, v) => { const a = A[i + j * nx], b = A[i + 1 + j * nx], c = A[i + (j + 1) * nx], d = A[i + 1 + (j + 1) * nx]; return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  return (x, y, z, pad = .5) => {
    const gx = (x - x0) / cell, gz = (z - z0) / cell, i = Math.floor(gx), j = Math.floor(gz);
    if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return true;
    const u = gx - i, v = gz - j;
    return caveSDF(x, y, z, { f: lerp(f, i, j, u, v), fl: lerp(fl, i, j, u, v), rf: lerp(rf, i, j, u, v) }) > -pad;
  };
}
