/**
 * Eldória — geometria procedural das árvores tropicais (Mod 292).
 * Malhas 3D reais: troncos/galhos em tubo com transporte paralelo de referencial, sapopemas (raízes tabulares)
 * por modulação radial, raízes aéreas e cipós em catenária, copas em tufos de cartões com normais de volume
 * (elipsoide da copa + volume do tufo) e núcleo opaco por tufo para a copa não ficar "furada".
 * Nenhum cilindro/esfera solto: cada parte nasce do esqueleto (galho termina dentro do tufo que sustenta).
 * Puro JS (sem dependências), determinístico pela semente; usado por build-trees.mjs e pelos testes.
 */
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const srgbToLinear = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);

/** Atlas: folhas.png 2x2 células; cascas.png 4 colunas (u). Margem de 2 px contra sangramento no mipmap. */
export const LEAF_CELL = i => { const x = (i % 2) * .5, y = Math.floor(i / 2) * .5, m = 2 / 1024; return [x + m, y + m, x + .5 - m, y + .5 - m]; };
export const BARK_COL = i => [i * .25 + 1.5 / 512, (i + 1) * .25 - 1.5 / 512];

export class MeshBuilder {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.idx = []; }
  get count() { return this.pos.length / 3; }
  v(p, n, uv, c) { this.pos.push(p[0], p[1], p[2]); this.nrm.push(n[0], n[1], n[2]); this.uv.push(uv[0], uv[1]); this.col.push(c[0], c[1], c[2]); return this.count - 1; }
  tri(a, b, c) { this.idx.push(a, b, c); }
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  get triangles() { return this.idx.length / 3; }
  /** cores em sRGB (como pintadas) → linear (COLOR_0 do glTF é linear). */
  linearColors() { return this.col.map(srgbToLinear); }
  bounds() { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < this.pos.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], this.pos[i + k]); mx[k] = Math.max(mx[k], this.pos[i + k]); } return { min: mn, max: mx }; }
}

/** Tubo ao longo de pontos {p,r}; flare(t, ang) multiplica o raio (raízes/sapopemas); color(t, ang, p) em sRGB. */
export function tube(M, pts, { seg = 8, col = 0, vScale = .25, color, flare, cap = true, twist = 0 } = {}) {
  const n = pts.length, T = [];
  for (let i = 0; i < n; i++) T.push(norm(sub(pts[Math.min(n - 1, i + 1)].p, pts[Math.max(0, i - 1)].p)));
  let N = Math.abs(T[0][1]) < .95 ? norm(cross(T[0], [0, 1, 0])) : norm(cross(T[0], [1, 0, 0]));
  const [u0, u1] = BARK_COL(col), rings = [];
  let s = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) { s += len(sub(pts[i].p, pts[i - 1].p)); const b = cross(T[i - 1], T[i]), bl = len(b); if (bl > 1e-6) { const ax = mul(b, 1 / bl), ang = Math.acos(Math.max(-1, Math.min(1, dot(T[i - 1], T[i])))); N = rot(N, ax, ang); } }
    const B = cross(T[i], N), t = i / (n - 1), ring = [];
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * Math.PI * 2 + twist * t, ca = Math.cos(a), sa = Math.sin(a);
      const dir = add(mul(N, ca), mul(B, sa)), r = pts[i].r * (flare ? flare(t, a, s) : 1);
      const p = add(pts[i].p, mul(dir, r));
      ring.push(M.v(p, dir, [u0 + (u1 - u0) * (j / seg), s * vScale], color ? color(t, a, p) : [1, 1, 1]));
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) M.quad(rings[i][j], rings[i + 1][j], rings[i + 1][j + 1], rings[i][j + 1]);
  if (cap && pts[n - 1].r > .015) {
    const tip = add(pts[n - 1].p, mul(T[n - 1], pts[n - 1].r * .8)), c = color ? color(1, 0, tip) : [1, 1, 1];
    const k = M.v(tip, T[n - 1], [(u0 + u1) / 2, (s + pts[n - 1].r) * vScale], c);
    for (let j = 0; j < seg; j++) M.tri(rings[n - 1][j], rings[n - 1][j + 1], k);
  }
  return s;
}
function rot(v, axis, ang) { const c = Math.cos(ang), s = Math.sin(ang); return add(add(mul(v, c), mul(cross(axis, v), s)), mul(axis, dot(axis, v) * (1 - c))); }

/** Curva de Bézier quadrática amostrada com raio interpolado. */
export function bezierPath(a, ctrl, b, r0, r1, steps, wobble = 0, R = Math.random) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    let p = add(add(mul(a, u * u), mul(ctrl, 2 * u * t)), mul(b, t * t));
    if (wobble && i > 0 && i < steps) p = add(p, [(R() - .5) * wobble, (R() - .5) * wobble * .5, (R() - .5) * wobble]);
    out.push({ p, r: r0 + (r1 - r0) * Math.pow(t, .8) });
  }
  return out;
}

/** Normal "de volume": mistura a normal do elipsoide da copa com a do tufo (sombreamento macio e volumoso). */
function volumeNormal(p, crown, clump, k = .62) {
  const e = norm([(p[0] - crown.c[0]) / (crown.r[0] * crown.r[0]), (p[1] - crown.c[1]) / (crown.r[1] * crown.r[1]), (p[2] - crown.c[2]) / (crown.r[2] * crown.r[2])]);
  const l = norm(sub(p, clump.c));
  return norm(add(mul(e, k), mul(l, 1 - k)));
}

/** Cartões de folhagem num tufo (célula do atlas), com núcleo opaco (icosaedro) por baixo. */
export function clumpCards(M, clump, crown, { cards = 20, size = 1.15, cell = 0, tint = [1, 1, 1], core = 1, R, upBias = .35, flat = 0 }) {
  const [a0, b0, a1, b1] = LEAF_CELL(cell);
  const shade = p => {
    const h = Math.max(0, Math.min(1, (p[1] - (crown.c[1] - crown.r[1])) / (2 * crown.r[1])));
    const out = Math.max(0, dot(norm(sub(p, crown.c)), norm(sub(clump.c, crown.c))));
    const ao = .62 + .3 * h + .14 * out;
    const w = clump.warm || 0; return [Math.min(1.1, tint[0] * ao * clump.v * (1 + .12 * w)), Math.min(1.1, tint[1] * ao * clump.v * (1 + .04 * w)), Math.min(1.1, tint[2] * ao * clump.v * (1 - .18 * w))];
  };
  if (core) {
    // núcleo: icosaedro subdividido uma vez, achatado, UV no miolo opaco da célula
    const ico = icosphere(core), cu = [(a0 + a1) / 2, (b0 + b1) / 2];
    const base = M.count, rr = clump.r * .7;
    for (const q of ico.v) {
      const p = add(clump.c, [q[0] * rr, q[1] * rr * (.8 - flat * .3), q[2] * rr]);
      const c = shade(p); M.v(p, volumeNormal(p, crown, clump), cu, [c[0] * .8, c[1] * .8, c[2] * .8]);
    }
    for (const f of ico.f) M.tri(base + f[0], base + f[1], base + f[2]);
  }
  const outward = norm(add(sub(clump.c, crown.c), [0, crown.r[1] * upBias, 0]));
  for (let i = 0; i < cards; i++) {
    // direção: hemisfério voltado para fora/para cima do tufo
    let d = norm([R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]);
    if (dot(d, outward) < -.2) d = norm(add(d, mul(outward, 1.4)));
    d = norm([d[0], d[1] * (1 - flat * .6) + flat * .5, d[2]]);
    const c = add(clump.c, [d[0] * clump.r * (.42 + R() * .5), d[1] * clump.r * (.42 + R() * .5) * (1 - flat * .4), d[2] * clump.r * (.42 + R() * .5)]);
    const s = clump.r * size * (.85 + R() * .35);
    const nrm = norm(add(d, [(R() - .5) * .5, (R() - .5) * .5, (R() - .5) * .5]));
    let t1 = Math.abs(nrm[1]) < .9 ? norm(cross(nrm, [0, 1, 0])) : norm(cross(nrm, [1, 0, 0]));
    t1 = rot(t1, nrm, R() * Math.PI * 2); const t2 = cross(nrm, t1);
    const flip = R() < .5, corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const ids = corners.map(([x, y]) => {
      const p = add(c, add(mul(t1, x * s * .5), mul(t2, y * s * .5)));
      const u = flip ? (x < 0 ? a1 : a0) : (x < 0 ? a0 : a1), v = y < 0 ? b1 : b0;
      return M.v(p, volumeNormal(p, crown, clump), [u, v], shade(p));
    });
    M.quad(ids[0], ids[1], ids[2], ids[3]);
  }
}

let icoCache = new Map();
export function icosphere(detail) {
  if (icoCache.has(detail)) return icoCache.get(detail);
  const t = (1 + Math.sqrt(5)) / 2;
  let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let d = 0; d < detail; d++) {
    const mid = new Map(), m = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (!mid.has(k)) { v.push(norm(lerp3(v[a], v[b], .5))); mid.set(k, v.length - 1); } return mid.get(k); };
    const nf = []; for (const [a, b, c] of f) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); } f = nf;
  }
  const out = { v, f }; icoCache.set(detail, out); return out;
}

/** Fronde de palmeira: fita dobrada em V (3 vértices na seção) arqueando para fora e para baixo. */
export function frond(M, base, dirH, { length = 4, width = 1.5, arch = 1.2, droop = 2.2, segs = 7, cell = 2, tint = [1, 1, 1], R }) {
  const [a0, b0, a1, b1] = LEAF_CELL(cell), side = norm(cross(dirH, [0, 1, 0]));
  let prev = null;
  for (let i = 0; i <= segs; i++) {
    const s = i / segs, w = width * (.25 + Math.sin(Math.PI * Math.min(1, s * 1.15)) * .75) * .5;
    const c = add(base, add(mul(dirH, length * s), [0, arch * s - droop * s * s, 0]));
    const tang = norm(add(mul(dirH, length), [0, arch - 2 * droop * s, 0])), up = norm(cross(side, tang));
    const fold = w * .28, v = b1 - (b1 - b0) * s, ao = .62 + .38 * s;
    const col = [tint[0] * ao, tint[1] * ao, tint[2] * ao];
    const L = M.v(add(c, add(mul(side, -w), mul(up, -fold))), norm(add(up, mul(side, -.4))), [a0, v], col);
    const C = M.v(c, up, [(a0 + a1) / 2, v], col);
    const Rr = M.v(add(c, add(mul(side, w), mul(up, -fold))), norm(add(up, mul(side, .4))), [a1, v], col);
    if (prev) { M.quad(prev[0], L, C, prev[1]); M.quad(prev[1], C, Rr, prev[2]); }
    prev = [L, C, Rr];
  }
}
