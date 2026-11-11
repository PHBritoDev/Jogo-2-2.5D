/**
 * Mod 311 — Fronteira da serra, caverna, portal, escadaria e arena do deserto negro.
 * Layout PURO (sem Three/DOM): coordenadas, onde se pode andar, altura do piso e teto — a mesma fonte da verdade
 * para colisão, câmera, geração das malhas e testes. Malha e colisão saem das mesmas funções: nada de parede
 * invisível desalinhada nem rocha atravessável.
 *
 * Mundo (Eldória): a boca da caverna fica na encosta oeste do vale da serra, fundida no maciço da fronteira.
 * Zonas internas ficam longe do mundo (como as dimensões), cada uma com coordenadas locais pequenas (precisão).
 */

// ---------- ruído determinístico (sem Math.random: geometria e colisão idênticas em todo aparelho) ----------
export function hash2(i, j, s = 0) { let n = (i * 374761393 + j * 668265263 + s * 2246822519) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
export function vnoise(x, z, s = 0) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}
export function fbm(x, z, s = 0, oct = 3) { let v = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, z * f, s + i * 17); f *= 2.03; a *= .5; } return v / (1 - Math.pow(.5, oct)); }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)); return { d: Math.hypot(px - ax - dx * t, pz - az - dz * t), t }; }

// =============================================================================================================
// MUNDO — fronteira montanhosa e boca da caverna (encosta oeste do vale da serra)
// =============================================================================================================
/** Boca: fachada voltada para leste (+x), túnel entrando na montanha para oeste (−x). */
/* EntradaCavernaAto1.glb (medido por raios): vão interno x∈[-0,33;0,50], teto y≈-0,13, base y=-0,84, fachada em z=+0,92,
   túnel aberto atrás (z=-0,95). Na escala 9,5: túnel de 7,9 m de largura, 6,7 m de altura e 17,6 m de fundo. */
export const CAVE_MOUTH = Object.freeze({ x: -72.6, z: -236, floor: .55, drop: .9, width: 6.4, depth: 16.5, enterDepth: .62, scale: 9.5, glb: { front: .917, lateral: .085, base: -.84 } });
/** Trilha do vale até a boca (aproximação gradual pela encosta). */
export const CAVE_TRAIL = Object.freeze([[-34, -226], [-44, -229.5], [-54, -233.5], [-62, -235.6], [-70, -236]]);
/** Pé da muralha montanhosa (oeste do vale da serra → fundo norte). Termina enterrada em encostas íngremes de cada lado. */
const FRONTIER_KNOTS = [[-140, -183], [-110, -187], [-88, -191], [-77, -199], [-73, -212], [-73.8, -224], [-72.6, -236], [-72.4, -248], [-74.5, -259], [-80, -267.5], [-66, -272.5], [-50, -275], [-36, -278], [-20, -275], [-6, -273], [8, -274.5], [22, -283], [36, -297], [50, -318]];
function catmull(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
/** Linha densa (≈1,5 m) com irregularidade natural determinística — a malha da rocha nasce exatamente sobre ela. */
export const FRONTIER_LINE = Object.freeze(catmull(FRONTIER_KNOTS, 1.5).map(([x, z], i, a) => {
  const m = CAVE_MOUTH, nearMouth = Math.hypot(x - m.x, z - m.z) < 16;
  const j = a[Math.min(a.length - 1, i + 1)], k = a[Math.max(0, i - 1)], tx = j[0] - k[0], tz = j[1] - k[1], L = Math.hypot(tx, tz) || 1;
  const off = nearMouth ? 0 : (fbm(x * .07, z * .07, 803, 3) - .5) * 2.4;
  return [x + tz / L * off, z - tx / L * off];
}));
/** Polígono fechado da massa rochosa (linha + fundo distante). */
const FRONTIER_POLY = FRONTIER_LINE.concat([[70, -460], [-220, -460], [-220, -183]]);
const FB = { x0: -221, x1: 71, z0: -461, z1: -182 };
export function insidePoly(x, z) {
  let c = false;
  for (let i = 0, j = FRONTIER_POLY.length - 1; i < FRONTIER_POLY.length; j = i++) {
    const [xi, zi] = FRONTIER_POLY[i], [xj, zj] = FRONTIER_POLY[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
/* Grade de aceleração (4 m): célula longe da linha = resposta pronta; perto = só os segmentos vizinhos. */
const CELL = 4, GX = Math.ceil((FB.x1 - FB.x0) / CELL), GZ = Math.ceil((FB.z1 - FB.z0) / CELL);
let grid = null;
function buildGrid() {
  const segs = FRONTIER_LINE.length - 1, near = Array.from({ length: GX * GZ }, () => null), state = new Uint8Array(GX * GZ);
  const reach = CELL * .75 + 3;
  for (let i = 0; i < segs; i++) {
    const a = FRONTIER_LINE[i], b = FRONTIER_LINE[i + 1];
    const cx0 = Math.floor((Math.min(a[0], b[0]) - reach - FB.x0) / CELL), cx1 = Math.floor((Math.max(a[0], b[0]) + reach - FB.x0) / CELL);
    const cz0 = Math.floor((Math.min(a[1], b[1]) - reach - FB.z0) / CELL), cz1 = Math.floor((Math.max(a[1], b[1]) + reach - FB.z0) / CELL);
    for (let gx = Math.max(0, cx0); gx <= Math.min(GX - 1, cx1); gx++) for (let gz = Math.max(0, cz0); gz <= Math.min(GZ - 1, cz1); gz++) { const k = gx + gz * GX; (near[k] || (near[k] = [])).push(i); }
  }
  for (let k = 0; k < GX * GZ; k++) state[k] = near[k] ? 2 : 0;
  const rows = Array.from({ length: GZ }, () => []);
  for (let i = 0, j = FRONTIER_POLY.length - 1; i < FRONTIER_POLY.length; j = i++) {
    const za = Math.min(FRONTIER_POLY[i][1], FRONTIER_POLY[j][1]), zb = Math.max(FRONTIER_POLY[i][1], FRONTIER_POLY[j][1]);
    for (let r = Math.max(0, Math.floor((za - FB.z0) / CELL)); r <= Math.min(GZ - 1, Math.floor((zb - FB.z0) / CELL)); r++) rows[r].push(j, i);
  }
  grid = { near, state, rows };
}
function insideFast(x, z) {
  const row = grid.rows[Math.floor((z - FB.z0) / CELL)]; let c = false;
  for (let q = 0; q < row.length; q += 2) { const [xj, zj] = FRONTIER_POLY[row[q]], [xi, zi] = FRONTIER_POLY[row[q + 1]]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; }
  return c;
}
/** Distância assinada ao pé da muralha (negativa = dentro da rocha); ±99 longe dela. */
export function frontierSigned(x, z) {
  if (x <= FB.x0 || x >= FB.x1 || z <= FB.z0 || z >= FB.z1) return 99;
  if (!grid) buildGrid();
  const k = Math.floor((x - FB.x0) / CELL) + Math.floor((z - FB.z0) / CELL) * GX, st = grid.state[k];
  if (st !== 2) return insideFast(x, z) ? -99 : 99;
  let best = 1e9;
  for (const i of grid.near[k]) { const a = FRONTIER_LINE[i], b = FRONTIER_LINE[i + 1], d = segDist(x, z, a[0], a[1], b[0], b[1]).d; if (d < best) best = d; }
  return insideFast(x, z) ? -best : best;
}
export function frontierDistance(x, z) { return Math.abs(frontierSigned(x, z)); }
/** Dentro da rocha (sem folga)? */
export function insideFrontierRock(x, z) { return frontierSigned(x, z) < 0; }
/** Túnel da boca (no mundo): corredor caminhável dentro da massa rochosa. */
export function inMouthTunnel(x, z, pad = 0) {
  const m = CAVE_MOUTH; return x <= m.x + 2.5 + pad && x >= m.x - m.depth - pad && Math.abs(z - m.z) <= m.width / 2 + pad;
}
/** Colisão real do maciço: rocha + 0,55 m de folga (o corpo do herói encosta na pedra, não entra nela); o túnel é livre. */
export const FRONTIER_PAD = .55;
export function frontierBlocked(x, z) {
  if (x <= FB.x0 || x >= FB.x1 || z >= FB.z1 || z <= FB.z0) return false;
  if (inMouthTunnel(x, z)) return false;
  return frontierSigned(x, z) < FRONTIER_PAD;
}
/** Profundidade no túnel (0 na fachada, 1 no fundo) — o gatilho só dispara quando o herói avança de verdade. */
export function mouthDepth(x) { const m = CAVE_MOUTH; return Math.max(0, Math.min(1, (m.x - x) / m.depth)); }
/** Piso do túnel: plano, levemente descendente para dentro. */
export function mouthTunnelFloor(x) { const m = CAVE_MOUTH; return m.floor - mouthDepth(x) * m.drop; }
/** Rebaixo do relevo na boca e no túnel (peso 0..1) e altura-alvo — o terreno vira rampa até a fachada. */
export function mouthCarve(x, z) {
  const m = CAVE_MOUTH, dz = Math.abs(z - m.z);
  const wz = smooth(m.width / 2 + 5, m.width / 2 + 1.2, dz), wx = smooth(m.x + 9, m.x + 1.5, x) * smooth(m.x - m.depth - 6, m.x - m.depth + 1, x);
  return { w: wz * wx, y: x > m.x ? m.floor : mouthTunnelFloor(x) };
}

// =============================================================================================================
// ZONAS INTERNAS
// =============================================================================================================
export const ZONES = Object.freeze({
  cave: { x: -3600, z: 0, y: 0 },
  ascent: { x: -4400, z: 0, y: 0 },
});

// ---------- CAVERNA ----------
/** Formas (coordenadas locais; -z = mais fundo). r = raio; floor = piso; ceil = altura do teto acima do piso. */
export const CAVE = Object.freeze({
  spawn: { x: 0, z: 2, yaw: Math.PI },          // virado para -z (para dentro)
  exitZ: 9,                                       // voltar além daqui = sair para o mundo
  chambers: [
    { id: 'salao', x: 0, z: -58, r: 27, floor: -6, ceil: 40, wob: 4.2, s: 11 },       // grande gruta vertical (ref. 2)
    { id: 'gruta', x: -42, z: -62, r: 17, floor: -7.6, ceil: 17, wob: 3.2, s: 12 },  // gruta verde-azulada com poças (ref. 3)
    { id: 'portal', x: -4, z: -132, r: 20, floor: -1.6, ceil: 30, wob: 3, s: 13 },   // câmara do portal
    { id: 'eco', x: 34, z: -100, r: 10, floor: -4.4, ceil: 14, wob: 2.4, s: 14 },    // nicho lateral (expansão futura)
  ],
  corridors: [
    { id: 'entrada', a: [0, 10], b: [0, -32], r: 4.5, fa: 0, fb: -6, ceil: 9.2 },
    { id: 'ligacao-gruta', a: [-20, -60], b: [-29, -61], r: 3.9, fa: -6, fb: -7.6, ceil: 8.2 },
    { id: 'norte', a: [0, -84], b: [-3, -113], r: 4.1, fa: -6, fb: -1.6, ceil: 9.2 },
    { id: 'eco', a: [18, -76], b: [30, -94], r: 3.6, fa: -6, fb: -4.4, ceil: 8.0 },
    // ramificações seladas por desabamento (expansão futura): caminhável só até o entulho
    { id: 'leste-selado', a: [24, -50], b: [38, -44], r: 2.9, fa: -6, fb: -5, ceil: 6.5, sealed: true },
    { id: 'noroeste-selado', a: [-20, -126], b: [-34, -118], r: 2.5, fa: -1.6, fb: -1.2, ceil: 6, sealed: true },
  ],
  /** abismo no salão (não caminhável) atravessado por uma ponte natural de pedra */
  chasm: { x: 1, z: -60, rx: 14.5, rz: 8.6 },
  bridge: { a: [0, -48.5], b: [0, -71.5], r: 1.75, y: -6 },
  pools: [{ x: -46, z: -57, r: 4.6 }, { x: -37, z: -68.5, r: 3.1 }, { x: -48.5, z: -68, r: 2.2 }],
  pillars: [{ x: -16, z: -44, r: 2.3 }, { x: 17, z: -72, r: 2.7 }, { x: -15, z: -76, r: 1.9 }, { x: 15, z: -43, r: 2 }, { x: -2, z: -118, r: 1.2 }, { x: -14, z: -138, r: 1.8 }, { x: 7, z: -139, r: 1.7 }],
  rubble: [{ x: 37, z: -44.5, r: 3.4 }, { x: -33, z: -118.5, r: 3 }],
  portal: { x: -4, z: -144, r: 3.1, h: 3.9 },
});

/** Raio efetivo da câmara com contorno orgânico (colisão = contorno da malha). */
function chamberR(c, x, z) { const a = Math.atan2(z - c.z, x - c.x); return c.r + c.wob * (fbm(Math.cos(a) * 2.2 + c.s, Math.sin(a) * 2.2, c.s, 3) - .5) * 2; }
function corridorR(k, t, x, z) { return k.r + .55 * (fbm(x * .18, z * .18, 33, 2) - .5) * 2 - (k.sealed ? smooth(.72, 1, t) * 1.2 : 0); }
/** Campo do VOLUME da caverna: >0 dentro do espaço vazio (inclui abismo, poças e pilares), 0 no contorno da rocha. */
export function caveField(x, z) {
  let f = -1e9;
  for (const c of CAVE.chambers) f = Math.max(f, chamberR(c, x, z) - Math.hypot(x - c.x, z - c.z));
  for (const k of CAVE.corridors) { const s = segDist(x, z, k.a[0], k.a[1], k.b[0], k.b[1]); f = Math.max(f, corridorR(k, s.t, x, z) - s.d); }
  return f;
}
export function inChasm(x, z, pad = 0) { const c = CAVE.chasm, w = .9 * (fbm(x * .2, z * .2, 41, 2) - .5); return ((x - c.x) / (c.rx + pad + w)) ** 2 + ((z - c.z) / (c.rz + pad + w)) ** 2 < 1; }
export function onBridge(x, z) { const b = CAVE.bridge; return segDist(x, z, b.a[0], b.a[1], b.b[0], b.b[1]).d < b.r; }
/** Zona sem piso: bordas atravessáveis; a queda é resolvida pela física vertical do jogador. */
export function caveHazard(x, z) { return caveField(x, z) > .45 && inChasm(x, z) && !onBridge(x, z); }
/** Onde o herói pode pisar. */
export function caveWalk(x, z) {
  if (caveField(x, z) < .45) return false;
  if (inChasm(x, z) && !onBridge(x, z)) return false;
  for (const p of CAVE.pools) if (Math.hypot(x - p.x, z - p.z) < p.r + .35) return false;
  for (const p of CAVE.pillars) if (Math.hypot(x - p.x, z - p.z) < p.r + .35) return false;
  for (const p of CAVE.rubble) if (Math.hypot(x - p.x, z - p.z) < p.r) return false;
  const P = CAVE.portal; if (Math.abs(z - P.z) < .5 && Math.abs(x - P.x) > P.r - .2 && Math.abs(x - P.x) < P.r + 1.4) return false; // aro do portal é sólido
  return true;
}
/** Piso: média ponderada das formas que contêm o ponto (junções suaves, sem degraus falsos). */
export function caveFloor(x, z) {
  if (onBridge(x, z) && inChasm(x, z, 1)) return CAVE.bridge.y + .25 * Math.cos((segDist(x, z, CAVE.bridge.a[0], CAVE.bridge.a[1], CAVE.bridge.b[0], CAVE.bridge.b[1]).t - .5) * Math.PI) - .2;
  let sw = 0, sy = 0;
  for (const c of CAVE.chambers) { const d = Math.hypot(x - c.x, z - c.z), w = smooth(-2, 4, chamberR(c, x, z) - d); if (w > 0) { const terr = c.id === 'salao' ? .45 * Math.sin(d * .22) * smooth(14, 22, d) : c.id === 'portal' ? .55 * smooth(9, 6, Math.hypot(x - CAVE.portal.x, z - CAVE.portal.z - 2)) : 0; sw += w; sy += w * (c.floor + terr); } }
  for (const k of CAVE.corridors) { const s = segDist(x, z, k.a[0], k.a[1], k.b[0], k.b[1]), w = smooth(-2, 3, corridorR(k, s.t, x, z) - s.d); if (w > 0) { sw += w * 1.4; sy += w * 1.4 * (k.fa + (k.fb - k.fa) * s.t); } }
  const base = sw > 0 ? sy / sw : -6;
  return base + .22 * (fbm(x * .35, z * .35, 51, 2) - .5);
}
/** Teto (altura acima do piso) — abóbadas altas nas câmaras, baixas nos corredores. */
export function caveCeil(x, z) {
  let h = 4;
  for (const c of CAVE.chambers) { const d = Math.hypot(x - c.x, z - c.z), R = chamberR(c, x, z); if (d < R + 2) { const k = Math.max(0, 1 - (d / (R + 2)) ** 2); h = Math.max(h, 5 + (c.ceil - 5) * Math.sqrt(k)); } }
  for (const k of CAVE.corridors) { const s = segDist(x, z, k.a[0], k.a[1], k.b[0], k.b[1]); if (s.d < k.r + 1.5) h = Math.max(h, k.ceil * (1 - .25 * (s.d / (k.r + 1.5)) ** 2)); }
  return h + 1.6 * (fbm(x * .12, z * .12, 61, 2) - .5);
}
/** Cruzou o plano do portal (de fora para dentro, indo para -z, dentro do aro)? */
export function crossedCavePortal(prev, now) { const P = CAVE.portal; return prev.z > P.z && now.z <= P.z && Math.abs(now.x - P.x) < P.r - .25; }

// ---------- ESCADARIA + ILHA + ARENA (uma só zona contínua: sobe-se a pé até a ilha) ----------
export const ASCENT = Object.freeze({
  spawn: { x: 0, z: -3, yaw: Math.PI },
  returnZ: 6.5,                  // atravessar o portal de volta (para +z) → caverna
  flights: 6, flightLen: 54, landing: 7, tread: .36, riser: .18, width: 4.4, landingWidth: 6.2,
  island: { r: 70, cxOffset: 0, overlap: 8 },
});
export function ascentRise() { return ASCENT.flightLen / ASCENT.tread * ASCENT.riser; }   // altura de cada lance
export function ascentStairsEnd() { return 4 + ASCENT.flights * (ASCENT.flightLen + ASCENT.landing); }  // distância (−z) até a ilha
export function ascentTopY() { return ASCENT.flights * ascentRise(); }
export function islandCenter() { return { x: 0, z: -(ascentStairsEnd() + ASCENT.island.r - ASCENT.island.overlap) }; }
/** Formações da arena (colisão real). Composição: anel externo de arcos/agulhas, centro aberto. */
export const ARENA_ROCKS = Object.freeze([
  { kind: 'arco', a: -2.35, d: 50, s: 1.25, rot: .5 }, { kind: 'arco', a: .25, d: 54, s: 1.05, rot: -.9 }, { kind: 'arco', a: 1.75, d: 47, s: .95, rot: 2.1 },
  { kind: 'agulha', a: -1.65, d: 41, s: 1.1 }, { kind: 'agulha', a: -.9, d: 57, s: 1.45 }, { kind: 'agulha', a: .95, d: 44, s: .9 }, { kind: 'agulha', a: 2.55, d: 55, s: 1.3 }, { kind: 'agulha', a: 3.1, d: 39, s: .8 },
  { kind: 'bloco', a: -.35, d: 37, s: 1 }, { kind: 'bloco', a: 1.35, d: 58, s: 1.2 }, { kind: 'bloco', a: -2.9, d: 45, s: .9 },
]);
export function arenaRockAt(r) { const c = islandCenter(); return { x: c.x + Math.sin(r.a) * r.d, z: c.z + Math.cos(r.a) * r.d }; }
/** Pés das formações (onde a rocha toca o chão). Arco: dois pés; agulha/bloco: um. */
export function arenaRockFeet(r) {
  const p = arenaRockAt(r);
  if (r.kind === 'arco') { const half = 7.5 * r.s, cx = Math.cos(r.rot), sz = Math.sin(r.rot); return [{ x: p.x + cx * half, z: p.z + sz * half, r: 2.2 * r.s }, { x: p.x - cx * half, z: p.z - sz * half, r: 2.2 * r.s }]; }
  return [{ x: p.x, z: p.z, r: (r.kind === 'agulha' ? 2.6 : 3.4) * r.s }];
}
function islandR(x, z) { const c = islandCenter(), a = Math.atan2(z - c.z, x - c.x); return ASCENT.island.r - 4 + 3.5 * (fbm(Math.cos(a) * 2 + 5, Math.sin(a) * 2, 71, 3) - .5) * 2; }
export function onIsland(x, z, pad = 0) { const c = islandCenter(); return Math.hypot(x - c.x, z - c.z) < islandR(x, z) + pad; }
/** Escadaria: em qual lance/patamar está (s = distância para −z a partir do patamar da base).
 *  Piso por degrau: a pisada fica exatamente no topo de cada degrau; só no focinho (primeiros 30% do piso) a altura
 *  sobe suavemente para o degrau seguinte — o pé nunca afunda nem flutua visivelmente, e a câmera não treme. */
export function stairsInfo(x, z) {
  const s = -z - 4; if (s < 0) return { kind: 'base', y: 0 };
  const per = ASCENT.flightLen + ASCENT.landing, k = Math.floor(s / per), u = s - k * per, rise = ascentRise(), N = Math.round(ASCENT.flightLen / ASCENT.tread);
  if (k >= ASCENT.flights) return { kind: 'topo', y: ASCENT.flights * rise };
  if (u < ASCENT.flightLen) { const step = Math.min(N - 1, Math.floor(u / ASCENT.tread)), uu = u - step * ASCENT.tread; return { kind: 'lance', k, step, y: k * rise + (step + smooth(0, ASCENT.tread * .3, uu)) * ASCENT.riser }; }
  return { kind: 'patamar', k, y: (k + 1) * rise };
}
/** Portal de volta (base): aro sólido; atravessar o disco para +z leva à caverna. */
export const ASCENT_PORTAL = Object.freeze({ x: 0, z: 6.5, r: 3.1, h: 3.9 });
export function ascentWalk(x, z) {
  if (onIsland(x, z)) {
    for (const r of ARENA_ROCKS) for (const f of arenaRockFeet(r)) if (Math.hypot(x - f.x, z - f.z) < f.r) return false;
    return true;
  }
  const P = ASCENT_PORTAL;
  if (z > -4) { // patamar da base com o portal de volta
    if (z > P.z + 2.2 || Math.abs(x) > 6.2) return false;
    if (Math.abs(z - P.z) < .5 && Math.abs(x - P.x) > P.r - .2 && Math.abs(x - P.x) < P.r + 1.4) return false;
    return true;
  }
  const info = stairsInfo(x, z);
  if (info.kind === 'topo') return Math.abs(x) < ASCENT.width / 2;   // último trecho até a borda da ilha
  return Math.abs(x) < (info.kind === 'patamar' ? ASCENT.landingWidth : ASCENT.width) / 2 - .3;
}
/** O vazio fora da escada/ilha não tem parede de colisão: sair da plataforma provoca queda. */
export function ascentHazard(x, z) {
  if (onIsland(x, z)) return false;
  const c = islandCenter();
  if (Math.hypot(x - c.x, z - c.z) < ASCENT.island.r + 14 && !onIsland(x, z)) return true;
  if (z <= -4 && z >= -ascentStairsEnd() - 4) return Math.abs(x) >= ASCENT.width / 2 - .28;
  return z > -4 && z < 9 && Math.abs(x) >= 6.2;
}
export function ascentFloor(x, z) {
  if (onIsland(x, z, -.5)) return ascentTopY() + islandRelief(x, z);
  if (z > -4) return 0;
  return stairsInfo(x, z).y;
}
/** Microrrelevo da areia negra (ondulações de vento suaves; ±0,2 m — caminhável sem degraus falsos). */
export function islandRelief(x, z) { return .32 * (fbm(x * .07, z * .07, 81, 3) - .5) + .07 * Math.sin(x * .55 + z * .2 + 2 * fbm(x * .02, z * .02, 82, 2)); }
export function crossedAscentPortal(prev, now) { const P = ASCENT_PORTAL; return prev.z < P.z && now.z >= P.z && Math.abs(now.x - P.x) < P.r - .25; }
/** Fração da subida (0 base … 1 topo) — dirige a revelação da ilha e a transição de luz. */
export function ascentProgress(y) { return Math.max(0, Math.min(1, y / ascentTopY())); }
