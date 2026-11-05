/**
 * BISPO 4 (VÉRAXION) — modelo autoral da espada das "Quatro Sentenças do Abismo".
 *
 * Geometria procedural sem dependências (roda no Node para gerar EspadaVeraxion.glb e no navegador para os testes).
 * Recria a silhueta da referência: obsidiana preta, pomo com coroa de espinhos e rubi, empunhadura longa trançada,
 * guarda larga com chifres curvos (asas de morcego), ganchos em crescente sob a guarda, lâmina longa e larga com
 * aresta central, farpas nas bordas superiores e ponta extrema. O comprimento total é 1 (y de -0,72 na ponta até +0,28
 * no pomo); a origem fica no centro da guarda. A ponta aponta para -Y.
 *
 * Atributos: position, normal, uv (u = largura 0..1, v = 0 na ponta .. 1 no pomo) e color = máscara de zona
 *   r = tom do metal (0..1), g = canais/veios rubros que brilham, b = rubi.
 */
export const SWORD_MODEL_BUILD = '285-veraxion-sentenca';
export const SWORD_DIMS = { tip: -0.743, top: 0.257, guardHalf: 0.12, bladeHalf: 0.034 };

function makeBuilder() {
  const P = [], U = [], C = [], I = [];
  const v = (x, y, z, u, w, c) => { P.push(x, y, z); U.push(u, w); C.push(c[0], c[1], c[2]); return P.length / 3 - 1; };
  return { P, U, C, I, v, tri: (a, b, c) => I.push(a, b, c), quad: (a, b, c, d) => I.push(a, b, c, a, c, d) };
}
const vtoY = y => (y - SWORD_DIMS.tip) / (SWORD_DIMS.top - SWORD_DIMS.tip);

/** Lâmina: seção em losango (aresta central grossa, fio fino), farpas nas bordas de cima, ponta extrema. */
function blade(B) {
  const N = 46, y0 = -0.035, y1 = SWORD_DIMS.tip, rings = [];
  for (let j = 0; j <= N; j++) {
    const k = j / N, y = y0 + (y1 - y0) * k;
    // meia-largura: base larga, afina devagar e termina numa ponta longa; pequena "cintura" perto da guarda
    let hw = SWORD_DIMS.bladeHalf * (1 - 0.18 * k) * (k > 0.72 ? Math.pow(1 - (k - 0.72) / 0.28, 0.85) : 1) * (1 - 0.12 * Math.exp(-k * 40));
    // farpas curvas na metade superior das bordas (picos curtos para fora)
    if (k > 0.06 && k < 0.42) { const s = (k - 0.06) / 0.36 * 7, f = s - Math.floor(s); hw += 0.0075 * Math.pow(Math.max(0, 1 - f / 0.55), 2) * (1 - (k - 0.06) / 0.5); }
    const th = Math.max(0.0012, 0.0115 * (1 - 0.35 * k) * (k > 0.8 ? (1 - k) / 0.2 : 1));
    // perfil: fio, bisel, platô da canaleta, aresta central (em cada face)
    const sec = [[-hw, 0], [-hw * 0.62, th * 0.62], [-hw * 0.18, th * 0.92], [0, th], [hw * 0.18, th * 0.92], [hw * 0.62, th * 0.62], [hw, 0],
      [hw * 0.62, -th * 0.62], [hw * 0.18, -th * 0.92], [0, -th], [-hw * 0.18, -th * 0.92], [-hw * 0.62, -th * 0.62]];
    rings.push(sec.map(([x, z], i) => B.v(x, y, z, 0.5 + x / (2 * SWORD_DIMS.bladeHalf * 1.25), vtoY(y), [1, 1, 0])));
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < 12; i++) { const a = rings[j][i], b = rings[j][(i + 1) % 12], c = rings[j + 1][(i + 1) % 12], d = rings[j + 1][i]; B.quad(a, b, c, d); }
  const tip = B.v(0, y1 - 0.004, 0, 0.5, 0, [1, 1, 0]); for (let i = 0; i < 12; i++) B.tri(rings[N][i], rings[N][(i + 1) % 12], tip);
  const top = B.v(0, y0 + 0.01, 0, 0.5, vtoY(y0), [1, 1, 0]); for (let i = 0; i < 12; i++) B.tri(rings[0][(i + 1) % 12], rings[0][i], top);
}

/** Tubo afilado ao longo de uma curva (chifres, espinhos, ganchos). */
function horn(B, pts, r0, sides, col, rEnd = 0) {
  const n = pts.length, rings = [];
  for (let j = 0; j < n; j++) {
    const p = pts[j], q = pts[Math.min(n - 1, j + 1)], o = pts[Math.max(0, j - 1)];
    let tx = q[0] - o[0], ty = q[1] - o[1], tz = q[2] - o[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    // base ortonormal estável (referência Z, ou X se quase paralelo)
    let ax = 0, ay = 0, az = 1; if (Math.abs(tz) > 0.9) { ax = 1; az = 0; }
    let nx = ty * az - tz * ay, ny = tz * ax - tx * az, nz = tx * ay - ty * ax; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
    const k = j / (n - 1), r = r0 * Math.pow(1 - k, 0.9) + rEnd * k, ring = [];
    for (let i = 0; i < sides; i++) { const a = i / sides * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a) * 0.62; /* seção achatada: lâmina de chifre */
      ring.push(B.v(p[0] + (nx * ca + bx * sa) * r, p[1] + (ny * ca + by * sa) * r, p[2] + (nz * ca + bz * sa) * r, i / sides, vtoY(p[1]), col)); }
    rings.push(ring);
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < sides; i++) B.quad(rings[j][i], rings[j][(i + 1) % sides], rings[j + 1][(i + 1) % sides], rings[j + 1][i]);
  const e = pts[n - 1], cap = B.v(e[0], e[1], e[2], 0.5, vtoY(e[1]), col); for (let i = 0; i < sides; i++) B.tri(rings[n - 1][i], rings[n - 1][(i + 1) % sides], cap);
  const s = pts[0], cap0 = B.v(s[0], s[1], s[2], 0.5, vtoY(s[1]), col); for (let i = 0; i < sides; i++) B.tri(rings[0][(i + 1) % sides], rings[0][i], cap0);
}
/** Curva em arco (Bezier quadrática) amostrada. */
const arc = (a, c, b, n = 9) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1], u * u * a[2] + 2 * u * t * c[2] + t * t * b[2]]; });

/** Rubi em losango (octaedro alongado), faces planas. */
function gem(B, x, y, z, rx, ry, rz) {
  const pts = [[x, y + ry, z], [x, y - ry, z], [x + rx, y, z], [x - rx, y, z], [x, y, z + rz], [x, y, z - rz]], F = [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]];
  for (const f of F) { const ids = f.map(k => B.v(pts[k][0], pts[k][1], pts[k][2], 0.5, vtoY(pts[k][1]), [0, 0, 1])); B.tri(ids[0], ids[1], ids[2]); }
}

/** Empunhadura longa com trança helicoidal (relevo) e anéis. */
function grip(B) {
  const N = 30, S = 10, y0 = 0.04, y1 = 0.162, rings = [];
  for (let j = 0; j <= N; j++) { const k = j / N, y = y0 + (y1 - y0) * k, ring = [];
    for (let i = 0; i < S; i++) { const a = i / S * Math.PI * 2, wrap = 0.5 + 0.5 * Math.cos(a * 2 - k * 38), ring2 = (j === 0 || j === N) ? 1.35 : 1;
      const r = (0.0085 + 0.0022 * wrap) * ring2 * (1 + 0.18 * Math.sin(k * Math.PI)); ring.push(B.v(Math.cos(a) * r, y, Math.sin(a) * r, i / S, vtoY(y), [0.45 + 0.4 * wrap, 0.25 * (1 - wrap), 0])); }
    rings.push(ring); }
  for (let j = 0; j < N; j++) for (let i = 0; i < S; i++) B.quad(rings[j][i], rings[j][(i + 1) % S], rings[j + 1][(i + 1) % S], rings[j + 1][i]);
}

/** Bloco central da guarda (cruz espessa com bisel) e colar sob ela. */
function guardCore(B) {
  const ring = (y, hw, hz, col) => { const pts = [[-hw, 0], [-hw * 0.4, hz], [hw * 0.4, hz], [hw, 0], [hw * 0.4, -hz], [-hw * 0.4, -hz]]; return pts.map(([x, z]) => B.v(x, y, z, 0.5 + x * 4, vtoY(y), col)); };
  const Y = [-0.075, -0.04, -0.012, 0.01, 0.028, 0.045], W = [0.004, 0.026, 0.04, 0.036, 0.02, 0.011], Z = [0.006, 0.011, 0.014, 0.013, 0.011, 0.009]; /* placa em losango apontando para baixo */
  const R = Y.map((y, i) => ring(y, W[i], Z[i], [0.75, i === 2 || i === 3 ? 0.6 : 0.2, 0]));
  for (let j = 0; j < R.length - 1; j++) for (let i = 0; i < 6; i++) B.quad(R[j][i], R[j][(i + 1) % 6], R[j + 1][(i + 1) % 6], R[j + 1][i]);
  const b = B.v(0, Y[0], 0, 0.5, vtoY(Y[0]), [0.7, 0.2, 0]), t = B.v(0, Y[5], 0, 0.5, vtoY(Y[5]), [0.7, 0.2, 0]);
  for (let i = 0; i < 6; i++) { B.tri(R[0][(i + 1) % 6], R[0][i], b); B.tri(R[5][i], R[5][(i + 1) % 6], t); }
}

export function buildSwordData() {
  const B = makeBuilder();
  blade(B); grip(B); guardCore(B);
  const H = [0.9, 0.18, 0], E = [0.85, 0.3, 0];
  for (const s of [1, -1]) {
    // chifre principal da guarda: sai do centro na horizontal e a ponta sobe (como na referência)
    horn(B, arc([0.025 * s, 0.002, 0], [0.098 * s, -0.008, 0], [0.104 * s, 0.05, 0], 12), 0.013, 7, E);
    // lâmina-garra inferior: abre para fora e desce até a ponta afiada
    horn(B, arc([0.05 * s, -0.004, 0], [0.104 * s, -0.012, 0], [0.12 * s, -0.064, 0], 11), 0.011, 7, E);
    // garras internas menores que pendem da guarda
    horn(B, arc([0.026 * s, -0.016, 0], [0.062 * s, -0.026, 0], [0.058 * s, -0.058, 0], 8), 0.008, 6, H);
    // espinhos curtos que sobem ao lado da empunhadura
    horn(B, arc([0.018 * s, 0.02, 0], [0.04 * s, 0.032, 0], [0.034 * s, 0.058, 0], 6), 0.006, 5, H);
    // costelas em crescente "(" que flanqueiam a base da lâmina, abrindo para fora com a ponta para baixo
    for (let k = 0; k < 3; k++) { const y = -0.07 - k * 0.048, sz = 1 - k * 0.14;
      horn(B, arc([0.02 * s, y + 0.012, 0], [0.058 * s * sz, y - 0.008, 0], [0.034 * s * sz, y - 0.046 * sz, 0], 9), 0.0075 * sz, 6, E); }
    // coroa do pomo: garras curvas que sobem
    horn(B, arc([0.008 * s, 0.19, 0], [0.034 * s, 0.19, 0], [0.036 * s, 0.226, 0], 7), 0.0065, 5, H);
    horn(B, arc([0.006 * s, 0.18, 0], [0.026 * s, 0.168, 0], [0.03 * s, 0.185, 0], 5), 0.0045, 5, H);
  }
  for (const s of [1, -1]) { horn(B, arc([0, 0.19, 0.006 * s], [0, 0.2, 0.026 * s], [0, 0.222, 0.028 * s], 5), 0.0045, 5, H); horn(B, arc([0, 0.0, 0.012 * s], [0, 0.015, 0.032 * s], [0, 0.036, 0.034 * s], 5), 0.005, 5, H); }
  horn(B, [[0, 0.18, 0], [0, 0.205, 0], [0, 0.232, 0], [0, SWORD_DIMS.top, 0]], 0.009, 6, E);
  // rubis: guarda (grande), pomo, e dois pequenos na lâmina
  gem(B, 0, 0.0, 0.0145, 0.011, 0.02, 0.006); gem(B, 0, 0.0, -0.0145, 0.011, 0.02, 0.006);
  gem(B, 0, 0.172, 0.0, 0.009, 0.014, 0.009);
  gem(B, 0, -0.075, 0.012, 0.006, 0.012, 0.004); gem(B, 0, -0.075, -0.012, 0.006, 0.012, 0.004);
  const N = computeNormals(B.P, B.I);
  return { positions: new Float32Array(B.P), normals: N, uvs: new Float32Array(B.U), colors: new Float32Array(B.C), indices: B.P.length / 3 > 65535 ? new Uint32Array(B.I) : new Uint16Array(B.I) };
}

export function computeNormals(P, I) {
  const N = new Float32Array(P.length);
  for (let i = 0; i < I.length; i += 3) { const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const k of [a, b, c]) { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; } }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  return N;
}

/** GLB 2.0 mínimo (uma malha, um material) a partir de buildSwordData(). */
export function swordGLB(data = buildSwordData()) {
  const parts = [data.positions, data.normals, data.uvs, data.colors, data.indices], views = [], acc = []; let off = 0;
  const pad = n => (n + 3) & ~3; const bin = new Uint8Array(parts.reduce((s, p) => s + pad(p.byteLength), 0));
  parts.forEach((p, i) => { bin.set(new Uint8Array(p.buffer, p.byteOffset, p.byteLength), off); views.push({ buffer: 0, byteOffset: off, byteLength: p.byteLength, ...(i === 4 ? { target: 34963 } : { target: 34962 }) }); off += pad(p.byteLength); });
  const n = data.positions.length / 3, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const x = data.positions[i * 3 + k]; mn[k] = Math.min(mn[k], x); mx[k] = Math.max(mx[k], x); }
  acc.push({ bufferView: 0, componentType: 5126, count: n, type: 'VEC3', min: mn, max: mx }, { bufferView: 1, componentType: 5126, count: n, type: 'VEC3' }, { bufferView: 2, componentType: 5126, count: n, type: 'VEC2' }, { bufferView: 3, componentType: 5126, count: n, type: 'VEC3' },
    { bufferView: 4, componentType: data.indices instanceof Uint32Array ? 5125 : 5123, count: data.indices.length, type: 'SCALAR' });
  const json = { asset: { version: '2.0', generator: 'veraxion-sword-model3d.js ' + SWORD_MODEL_BUILD }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'EspadaVeraxion', mesh: 0 }],
    meshes: [{ name: 'EspadaVeraxion', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, COLOR_0: 3 }, indices: 4, material: 0 }] }],
    materials: [{ name: 'ObsidianaRubi', pbrMetallicRoughness: { baseColorFactor: [0.05, 0.03, 0.04, 1], metallicFactor: 0.9, roughnessFactor: 0.28 }, emissiveFactor: [0.6, 0.02, 0.03] }],
    accessors: acc, bufferViews: views, buffers: [{ byteLength: bin.byteLength }] };
  const enc = new TextEncoder().encode(JSON.stringify(json)), jl = pad(enc.length), total = 12 + 8 + jl + 8 + bin.byteLength, out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true);
  out.fill(0x20, 20, 20 + jl); out.set(enc, 20); dv.setUint32(20 + jl, bin.byteLength, true); dv.setUint32(24 + jl, 0x004E4942, true); out.set(bin, 28 + jl);
  return out;
}
