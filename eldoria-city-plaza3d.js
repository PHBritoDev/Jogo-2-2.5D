/**
 * Renascimento de Eldória — Fase 2: chegada e praça (apresentação THREE). O desenho fica em eldoria-city-plaza.js.
 * Custo: lajes (praça + topo do adro + pisos dos degraus) numa malha; meio-fio, laterais do adro, parapeito e
 * adereços noutra; rua de pedra numa terceira; vidros dos lampiões numa quarta. Duas texturas de canvas
 * (512 e 256 px), geradas uma vez.
 */
import { PLAZA, ENTRY_STREET, TERRACE, plazaPoint, openingAt, insidePlaza, terraceParts, plazaProps, registerTerraceWalk, TERRACE_PARAPET } from './eldoria-city-plaza.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/** Lajes em fiadas desencontradas (pedra clara e quente, juntas escuras, manchas de uso). */
export function flagstoneTexture(THREE, size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = rng(9127);
  g.fillStyle = '#4a443c'; g.fillRect(0, 0, size, size);
  const rows = 6, rh = size / rows;
  for (let j = 0; j < rows; j++) { let x = -r() * 60;
    while (x < size) { const w = 58 + r() * 70, t = .82 + r() * .22, hue = r();
      const R = Math.round((150 + hue * 18) * t), G = Math.round((140 + hue * 10) * t), B = Math.round((120 - hue * 8) * t);
      g.fillStyle = `rgb(${R},${G},${B})`; const pad = 2.5 + r() * 1.5; g.fillRect(x + pad, j * rh + pad, w - pad * 2, rh - pad * 2);
      for (let k = 0; k < 26; k++) { g.fillStyle = `rgba(${r() < .5 ? '40,36,30' : '235,228,210'},${.05 + r() * .08})`; g.fillRect(x + pad + r() * (w - 8), j * rh + pad + r() * (rh - 8), 2 + r() * 6, 2 + r() * 5); }
      x += w; }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/** Paralelepípedos arredondados (rua). */
export function cobbleTexture(THREE, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = rng(3311);
  g.fillStyle = '#3b3631'; g.fillRect(0, 0, size, size);
  const n = 8, cell = size / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const off = (j % 2) * cell * .5, cx = i * cell + off + cell / 2 + (r() - .5) * 4, cy = j * cell + cell / 2 + (r() - .5) * 4, t = .78 + r() * .3;
    const R = Math.round(158 * t), G = Math.round(148 * t), B = Math.round(130 * t), rad = cell * (.4 + r() * .06);
    for (const dx of [-size, 0, size]) { const gr = g.createRadialGradient(cx + dx - rad * .3, cy - rad * .3, rad * .1, cx + dx, cy, rad);
      gr.addColorStop(0, `rgb(${R + 26},${G + 24},${B + 20})`); gr.addColorStop(1, `rgb(${R - 22},${G - 22},${B - 20})`); g.fillStyle = gr;
      g.beginPath(); g.ellipse(cx + dx, cy, rad * (1 + r() * .12), rad * .92, r() * 3, 0, Math.PI * 2); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** Acumulador de triângulos com cor por vértice (e UV de mundo opcional). */
export function builder(withUv = false) {
  const pos = [], col = [], uv = [];
  const api = {
    tri(a, b, c, ca, cb = ca, cc = ca) { pos.push(...a, ...b, ...c); col.push(...ca, ...cb, ...cc); if (withUv) uv.push(a[0] * .42, a[2] * .42, b[0] * .42, b[2] * .42, c[0] * .42, c[2] * .42); },
    quad(a, b, c, d, ca, cb = ca, cc = cb, cd = ca) { api.tri(a, b, c, ca, cb, cc); api.tri(a, c, d, ca, cc, cd); },
    /** Caixa orientada (centro, meias-medidas, rotação Y) com cor por face (topo mais claro, base mais escura). */
    box(cx, cy, cz, hx, hy, hz, rot, color, top = 1.08, side = .92) {
      const c = Math.cos(rot), s = Math.sin(rot), P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
      const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), P(-hx, hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), P(-hx, hy, hz)];
      const T = color.map(k => Math.min(1, k * top)), S = color.map(k => k * side), D = color.map(k => k * .7);
      api.quad(v[4], v[7], v[6], v[5], T); api.quad(v[0], v[1], v[2], v[3], D);
      api.quad(v[3], v[2], v[6], v[7], S); api.quad(v[1], v[0], v[4], v[5], S); api.quad(v[2], v[1], v[5], v[6], color); api.quad(v[0], v[3], v[7], v[4], color);
    },
    geometry(THREE) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      if (withUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
    },
    get count() { return pos.length / 9; },
  };
  return api;
}

export const WOOD = [.34, .23, .15], WOOD_D = [.22, .15, .09], STONE = [.5, .47, .42], STONE_D = [.37, .35, .32], BURLAP = [.55, .45, .3], IRON = [.16, .15, .15], PAPER = [.86, .82, .7], SOIL = [.22, .16, .11], DRY = [.52, .44, .26];

export function addProp(b, p, ground) {
  const y0 = (p.y !== undefined ? p.y : 0) + ground(p.x, p.z), r = p.rot || 0, c = Math.cos(r), s = Math.sin(r), L = (lx, lz) => [p.x + lx * c + lz * s, p.z - lx * s + lz * c];
  if (p.kind === 'bucket') { // balde vazio (aduelas, aro de ferro, fundo escuro à vista)
    const n = 10, rr = .17, h = .3, tip = p.tip ? 1 : 0;
    for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, sh = i % 2 ? WOOD : WOOD.map(k => k * .86);
      const P = (a, y, k = 1) => { const lx = Math.cos(a) * rr * k, ly = y, lz = Math.sin(a) * rr * k; return tip ? [p.x + (ly - .17) * c + lz * s, y0 + .17 + lx, p.z - (ly - .17) * s + lz * c] : [p.x + lx * c + lz * s, y0 + ly, p.z - lx * s + lz * c]; };
      b.quad(P(a0, 0, .88), P(a1, 0, .88), P(a1, h), P(a0, h), sh); b.quad(P(a0, h * .82), P(a1, h * .82), P(a1, h * .88), P(a0, h * .88), IRON);
      b.tri(P(0, .02, 0), P(a1, .02, .86), P(a0, .02, .86), [.08, .06, .05]); }
  } else if (p.kind === 'rationTable') {
    b.box(p.x, y0 + .74, p.z, .8, .03, .36, r, WOOD); for (const [lx, lz] of [[-.68, -.28], [.68, -.28], [-.68, .28], [.68, .28]]) { const [x, z] = L(lx, lz); b.box(x, y0 + .36, z, .035, .36, .035, r, WOOD_D); }
    { const [x, z] = L(.45, .1); b.box(x, y0 + .79, z, .16, .02, .12, r + .2, [.5, .2, .14]); const [x2, z2] = L(.45, .1); b.box(x2, y0 + .805, z2, .15, .004, .11, r + .2, PAPER); }
  } else if (p.kind === 'sack') { const k = p.small ? .7 : 1;
    b.box(p.x, y0 + .14 * k, p.z, .2 * k, .14 * k, .15 * k, r, BURLAP, 1.1, .85); b.box(p.x, y0 + .3 * k, p.z, .08 * k, .04 * k, .07 * k, r, BURLAP.map(v => v * .8));
  } else if (p.kind === 'crate') { const h = .2, w = .25; // caixote vazio: 4 paredes e o fundo
    b.box(p.x, y0 + .02, p.z, w, .02, w, r, WOOD_D); for (const [lx, lz, hx, hz] of [[0, w, w, .02], [0, -w, w, .02], [w, 0, .02, w], [-w, 0, .02, w]]) { const [x, z] = L(lx, lz); for (let k = 0; k < 3; k++) b.box(x, y0 + .07 + k * .135, z, hx, .055, hz, r, (k % 2 ? WOOD : WOOD_D).map(v => v * .95), 1, .85); } // tábuas com fresta
  } else if (p.kind === 'board') { // quadro de editais: dois postes, tábua, folhas e o selo do tributo
    for (const lx of [-.62, .62]) { const [x, z] = L(lx, 0); b.box(x, y0 + 1.05, z, .06, 1.05, .06, r, WOOD_D); }
    { const [x, z] = L(0, 0); b.box(x, y0 + 1.45, z, .7, .42, .035, r, WOOD); b.box(x, y0 + 1.94, z, .78, .05, .09, r, WOOD_D); }
    for (const [lx, ly, hw, hh, sealed] of [[-.32, 1.5, .2, .27, 1], [.18, 1.42, .22, .3, 0], [.45, 1.6, .12, .14, 0]]) { const [x, z] = L(lx, .045); b.box(x, y0 + ly, z, hw, hh, .006, r, PAPER, 1, 1); if (sealed) { const [sx, sz] = L(lx, .055); b.box(sx, y0 + ly - hh * .7, sz, .04, .04, .006, r, [.55, .08, .06], 1, 1); } }
  } else if (p.kind === 'planter') {
    b.box(p.x, y0 + .2, p.z, .36, .2, .36, r, WOOD_D); b.box(p.x, y0 + .385, p.z, .32, .02, .32, r, SOIL, 1, 1);
    for (const [lx, lz, h, lean] of [[-.12, .08, .42, .2], [.1, -.06, .3, -.3], [.02, .14, .2, .5]]) { const [x, z] = L(lx, lz); b.box(x, y0 + .4 + h / 2, z, .012, h / 2, .012, r + lean, DRY, 1, 1); }
  } else if (p.kind === 'bench') {
    b.box(p.x, y0 + .43, p.z, .75, .045, .2, r, STONE); for (const lx of [-.55, .55]) { const [x, z] = L(lx, 0); b.box(x, y0 + .2, z, .1, .2, .17, r, STONE_D); }
  } else if (p.kind === 'lamp') {
    b.box(p.x, y0 + 1.3, p.z, .07, 1.3, .07, r, WOOD_D); { const [x, z] = L(.28, 0); b.box(x, y0 + 2.5, z, .3, .035, .035, r, WOOD_D); }
    { const [x, z] = L(.5, 0); b.box(x, y0 + 2.43, z, .02, .05, .02, r, IRON); b.box(x, y0 + 2.2, z, .13, .02, .13, r, IRON); b.box(x, y0 + 1.98, z, .11, .02, .11, r, IRON); }
  }
}

export function buildCityPlaza(THREE, { scene, ground, walk = null, obstacles = null, lowSpec = false }) {
  const group = new THREE.Group(); group.name = 'praca-eldoria-renascimento'; scene.add(group);
  const flag = flagstoneTexture(THREE, lowSpec ? 256 : 512), cob = cobbleTexture(THREE, lowSpec ? 128 : 256);
  const pave = builder(true), stone = builder(false), street = [], glass = [];
  const lift = .065, Y = (x, z) => ground(x, z) + lift; // acima das trilhas de terra (+0,045)
  // 1) praça: malha polar até a borda ondulada; borda e entorno do poço mais gastos e escuros
  const S = lowSpec ? 48 : 72, RINGS = [0, .14, .3, .46, .62, .76, .88, .96, 1];
  const ring = (k, i) => { const th = i / S * Math.PI * 2, [x, z] = plazaPoint(th, k); return [x, Y(x, z), z]; };
  const shade = (k, i) => { const th = i / S * Math.PI * 2, w = Math.sin(th * 7 + k * 5) * .03, e = Math.max(0, (k - .82) / .18); return [.97 - e * .2 + w, .96 - e * .21 + w, .94 - e * .22 + w]; };
  for (let r = 0; r < RINGS.length - 1; r++) for (let i = 0; i < S; i++) {
    const k0 = RINGS[r], k1 = RINGS[r + 1];
    if (r === 0) pave.tri(ring(0, 0), ring(k1, i + 1), ring(k1, i), shade(0, i), shade(k1, i + 1), shade(k1, i));
    else pave.quad(ring(k0, i), ring(k0, i + 1), ring(k1, i + 1), ring(k1, i), shade(k0, i), shade(k0, i + 1), shade(k1, i + 1), shade(k1, i));
  }
  // 2) meio-fio em blocos (aberto nas ruas)
  const KS = lowSpec ? 120 : 168, kerbOut = PLAZA.kerb / ((PLAZA.rx + PLAZA.rz) / 2);
  for (let i = 0; i < KS; i++) {
    const t0 = i / KS * Math.PI * 2, t1 = (i + 1) / KS * Math.PI * 2; if (openingAt((t0 + t1) / 2)) continue;
    const [ax, az] = plazaPoint(t0, 1), [bx, bz] = plazaPoint(t1, 1), [cx, cz] = plazaPoint(t1, 1 + kerbOut), [dx, dz] = plazaPoint(t0, 1 + kerbOut);
    const h = PLAZA.kerbH, ya = Y(ax, az), yb = Y(bx, bz), shadeK = .9 + ((i * 7) % 5) * .035, C = STONE_D.map(v => v * shadeK * 1.05), joint = i % 2 === 0 ? .82 : 1;
    stone.quad([ax, ya + h, az], [bx, yb + h, bz], [cx, Y(cx, cz) + h, cz], [dx, Y(dx, dz) + h, dz], C.map(v => v * joint)); // topo
    stone.quad([dx, Y(dx, dz) + h, dz], [cx, Y(cx, cz) + h, cz], [cx, Y(cx, cz) - .12, cz], [dx, Y(dx, dz) - .12, dz], C.map(v => v * .8)); // face externa
    stone.quad([bx, yb + h, bz], [ax, ya + h, az], [ax, ya, az], [bx, yb, bz], C.map(v => v * .72)); // face interna
  }
  // 3) Rua da Entrada em pedra, cortada na borda da praça
  { const P = ENTRY_STREET.points, pts = []; for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / .6);
      for (let k = 0; k < n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; if (insidePlaza(x, z, .15)) break; pts.push([x, z]); } if (pts.length && insidePlaza(...pts[pts.length - 1], .2)) break; }
    pts.push(P[P.length - 1].slice()); while (pts.length > 2 && insidePlaza(...pts[pts.length - 1], -.25)) pts.pop();
    const W = ENTRY_STREET.width / 2, across = [-1, -.82, -.4, 0, .4, .82, 1]; let along = 0;
    const pos = [], col = [], uv = [], idx = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
      if (i) along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      for (const k of across) { const x = pts[i][0] + nx * W * k, z = pts[i][1] + nz * W * k, edge = Math.abs(k) > .9, gutter = Math.abs(k) > .7 && !edge;
        pos.push(x, Y(x, z) + (edge ? .045 : gutter ? .005 : .02), z); const v = edge ? 1.1 : gutter ? .74 : .95 + Math.sin(along * 1.3 + k * 3) * .04; col.push(v, v * .98, v * .95); uv.push(along / 1.1, (k * W) / 1.1); } }
    const m = across.length; for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, b, c, b, d, c); } // normal para cima
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: cob, vertexColors: true, roughness: .93, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); mesh.name = 'praca-rua-entrada'; mesh.receiveShadow = true; group.add(mesh); street.push(mesh); }
  // 4) Adro da Árvore: pódio de pedra, escadarias, parapeito; piso em laje
  const T = TERRACE, parts = terraceParts(T), g0 = ground(T.x, T.z), top = g0 + T.y;
  { const x0 = T.x - T.hx, x1 = T.x + T.hx, z0 = T.z - T.hz, z1 = T.z + T.hz;
    pave.quad([x0, top + .005, z0], [x1, top + .005, z0], [x1, top + .005, z1], [x0, top + .005, z1], [.95, .93, .9]);
    // laterais em fiadas (cada fiada um tom)
    const courses = 3, ch = T.y / courses;
    for (let k = 0; k < courses; k++) { const ya = g0 + k * ch - (k ? 0 : .1), yb = g0 + (k + 1) * ch, C = STONE.map(v => v * (.86 + (k % 2) * .08));
      stone.quad([x0, ya, z1], [x1, ya, z1], [x1, yb, z1], [x0, yb, z1], C); stone.quad([x1, ya, z0], [x0, ya, z0], [x0, yb, z0], [x1, yb, z0], C);
      stone.quad([x1, ya, z1], [x1, ya, z0], [x1, yb, z0], [x1, yb, z1], C.map(v => v * .9)); stone.quad([x0, ya, z0], [x0, ya, z1], [x0, yb, z1], [x0, yb, z0], C.map(v => v * .9)); }
    stone.box(T.x, top + .02, z1 - .03, T.hx + .06, .03, .06, 0, STONE.map(v => v * 1.08)); // cimalha da frente
    // parapeito: laterais inteiras, fundo com a abertura da escada estreita, cantos da frente
    const ph = TERRACE_PARAPET.h, pw = TERRACE_PARAPET.w, bw = T.back.w / 2 + .05, fw = T.front.w / 2 + .05;
    for (const [cx, cz, hx, hz] of [[x0 + pw, T.z, pw, T.hz], [x1 - pw, T.z, pw, T.hz], [(x0 + T.x - bw) / 2, z0 + pw, (T.x - bw - x0) / 2, pw], [(x1 + T.x + bw) / 2, z0 + pw, (x1 - T.x - bw) / 2, pw], [(x0 + T.x - fw) / 2, z1 - pw, (T.x - fw - x0) / 2, pw], [(x1 + T.x + fw) / 2, z1 - pw, (x1 - T.x - fw) / 2, pw]])
      stone.box(cx, top + ph / 2, cz, hx, ph / 2, hz, 0, STONE.map(v => v * .96));
    // degraus (visual; o caminhável é a rampa contínua sob eles)
    for (const st of [parts.front, parts.back]) { const dx = st.b[0] - st.a[0], dz = st.b[1] - st.a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
      for (let i = 0; i < st.steps; i++) { const hi = st.yb > st.ya ? g0 + T.y * (i + 1) / st.steps : g0 + T.y * (st.steps - i) / st.steps;
        const c0 = (i + .5) / st.steps, cx = st.a[0] + ux * L * c0, cz = st.a[1] + uz * L * c0, hd = L / st.steps / 2 + .01, yb = g0 - .05;
        stone.box(cx, (hi + yb) / 2, cz, st.w / 2, (hi - yb) / 2 - .01, hd, Math.atan2(ux, uz), STONE.map(v => v * (.9 + (i % 2) * .05)));
        pave.quad([cx - st.w / 2, hi + .004, cz - hd * uz - 0], [cx + st.w / 2, hi + .004, cz - hd * uz], [cx + st.w / 2, hi + .004, cz + hd * uz], [cx - st.w / 2, hi + .004, cz + hd * uz], [.9, .88, .85]); } }
    // caminhável: piso, escadas (rampa sob os degraus) e paredes
    if (walk) registerTerraceWalk(walk, g0);
  }
  // 5) adereços (uma malha) + vidro dos lampiões (outra, acende à noite)
  const props = plazaProps();
  for (const p of props) { addProp(stone, p, ground); if (p.kind === 'lamp') { const c = Math.cos(p.rot), s = Math.sin(p.rot); glass.push([p.x + .5 * c, ground(p.x, p.z) + 2.09, p.z - .5 * s]); } }
  if (obstacles) for (const p of props) {
    if (p.kind === 'rationTable') obstacles.push({ x: p.x, z: p.z, shape: 'box', halfX: .85, halfZ: .42, height: .8, plaza: true });
    else if (p.kind === 'board') obstacles.push({ x: p.x, z: p.z, shape: 'circle', radius: .45, height: 2, plaza: true });
    else if (p.kind === 'lamp') obstacles.push({ x: p.x, z: p.z, shape: 'circle', radius: .16, height: 2.6, plaza: true });
  }
  const paveMesh = new THREE.Mesh(pave.geometry(THREE), new THREE.MeshStandardMaterial({ map: flag, vertexColors: true, roughness: .9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); paveMesh.name = 'praca-lajes'; paveMesh.receiveShadow = true; group.add(paveMesh);
  const stoneMesh = new THREE.Mesh(stone.geometry(THREE), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, metalness: 0 })); stoneMesh.name = 'praca-pedra-adro-aderecos'; stoneMesh.castShadow = !lowSpec; stoneMesh.receiveShadow = true; group.add(stoneMesh);
  const gb = builder(false); for (const [x, y, z] of glass) gb.box(x, y, z, .1, .1, .1, 0, [1, 1, 1], 1, 1);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, emissive: 0xffb45a, emissiveIntensity: 0, roughness: .4 });
  const glassMesh = new THREE.Mesh(gb.geometry(THREE), glassMat); glassMesh.name = 'praca-lampioes'; group.add(glassMesh);
  return {
    group, stats: { paveTris: pave.count, stoneTris: stone.count, props: props.length, lamps: glass.length },
    // contrato de torchSets: update(t, night) — acende os lampiões à noite (apagados de dia: o óleo é caro)
    holders: [], lights: [], update(t, night = 0) { glassMat.emissiveIntensity = Math.max(0, night - .25) * 1.6 * (.94 + .06 * Math.sin(t * 7)); },
  };
}
