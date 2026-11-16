/**
 * Mod 321 — A JORNADA: de Eldória (Cidade 1) até a nova Cinzária (Cidade 2) e o vulcão. Regras PURAS (sem Three.js):
 * relevo, limites caminháveis, ponte do abismo, cone do vulcão, cidade modular, pontos seguros e marcos. A mesma fonte
 * alimenta a física do herói (altura/bloqueio), a malha em blocos (jornada-terrain3d.js) e os testes.
 *
 * Percurso (oeste de Eldória, saindo pela Garganta em x ≈ -70):
 *   1 Vale do Entardecer  x -112 … -620  campo aberto, rio raso, cachoeira na serra norte, flores e capim alto
 *   2 Subida da Serra     x -620 … -806  estrada em zigue-zague até ~62 m de altitude
 *   3 Ponte do Abismo     x -806 … -930  ponte estreita (124 m) sobre um abismo sem fundo visível
 *   4 Terras de Cinza     x -930 … -1205 rocha vulcânica e cinza, o vulcão crescendo no horizonte
 *   5 Cinzária            centro (-1262, -66)  cidade medieval habitável, praça térrea, bairros e ruas reais
 *   6 Sopé do vulcão      portão em (-1336, -66), dois guardas Enemy2 e a caverna (interior em volcano3d.js)
 * Nomes de lugares são provisórios: a narrativa nova do Ato II será escrita depois (ver docs/jornada/README.md).
 */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash2(ix, iz, seed) { let h = (ix * 374761393 + iz * 668265263 + seed * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x, z, seed = 1) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz), a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed); return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz; }
export function fbm2(x, z, oct = 4, seed = 3) { let s = 0, a = .5, n = 0, f = 1; for (let i = 0; i < oct; i++) { s += vnoise(x * f, z * f, seed + i * 13) * a; n += a; a *= .5; f *= 2.03; } return s / n; }
function ridge(x, z, oct = 4, seed = 9) { let s = 0, a = .5, n = 0, f = 1, w = 1; for (let i = 0; i < oct; i++) { let v = 1 - Math.abs(vnoise(x * f, z * f, seed + i * 31) * 2 - 1); v *= v * w; w = Math.min(1, v * 1.6); s += v * a; n += a; a *= .5; f *= 2.1; } return s / n; }

/** Projeção num segmento/polilinha: distância e parâmetro de comprimento (s, em metros). */
export function polyProject(x, z, pts, cum) {
  let best = Infinity, bs = 0, bi = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = L2 > 0 ? clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2, 0, 1) : 0;
    const ox = x - (a[0] + dx * t), oz = z - (a[1] + dz * t), d = ox * ox + oz * oz;
    if (d < best) { best = d; bi = i; bs = cum[i] + Math.sqrt(L2) * t; }
  }
  return { d: Math.sqrt(best), s: bs, i: bi };
}
const cumulative = pts => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; };

/* ---------------- percurso e regiões ---------------- */
export const BRIDGE = Object.freeze({ x0: -806, x1: -930, z: -50, y: 62, half: 1.35, rail: 1.05, sag: 1.4 });
export const ABYSS = Object.freeze({ x0: -930, x1: -806, z0: -300, z1: 180, floor: -320, fogY: -34 });
export const CITY2 = Object.freeze({ x: -1262, z: -66, r: 64, y: 24 });
export const VOLCANO2 = Object.freeze({ x: -1528, z: -66, r: 206, h: 390, crater: 40, craterDepth: 60 });
export const GATE2 = Object.freeze({ x: -1327, z: -66, face: Math.PI / 2 });
export const GUARDS2 = Object.freeze([{ x: -1318.5, z: -62.6 }, { x: -1318.5, z: -69.4 }]);
export const WATERFALL = Object.freeze({ x: -432, z: 64, zTop: 108, w: 9 }); // cascata descendo a encosta da serra norte até o poço (z = 64)
/** Percurso principal (polilinha jogável) Eldória → portão do vulcão. */
export const ROUTE = Object.freeze([
  [-112, -62], [-150, -70], [-200, -58], [-260, -40], [-320, -62], [-380, -92], [-440, -80], [-500, -52], [-560, -64], [-612, -84],
  [-650, -78], [-688, -54], [-720, -30], [-748, -44], [-776, -60], [-800, -50], [BRIDGE.x0, BRIDGE.z],
  [BRIDGE.x1, BRIDGE.z], [-940, -50], [-984, -30], [-1032, -46], [-1080, -78], [-1130, -70], [-1172, -54], [-1206, -64],
  [CITY2.x, CITY2.z], [-1306, -66], [GATE2.x + 4, GATE2.z]
].map(p => Object.freeze(p)));
const ROUTE_CUM = cumulative(ROUTE);
export const ROUTE_LENGTH = ROUTE_CUM[ROUTE_CUM.length - 1];
/** Altitude do caminho por trecho (x crescente para oeste = valor menor). */
function routeY(x) {
  if (x > -612) return 1.2 + .8 * Math.sin(x * .011);                      // vale: ondulação suave
  if (x > BRIDGE.x0) return 1.2 + (BRIDGE.y - 1.2) * sstep(-612, BRIDGE.x0 + 6, x); // subida da serra
  if (x > BRIDGE.x1) return BRIDGE.y;                                        // ponte
  if (x > -1206) return BRIDGE.y + (CITY2.y - BRIDGE.y) * sstep(BRIDGE.x1, -1200, x); // terras de cinza descendo
  return CITY2.y;
}
const VALLEY = { cx: -366, cz: -52, hx: 262, hz: 116, round: 60 };
const ASH = { cx: -1070, cz: -56, hx: 128, hz: 84, round: 46 };
const APPROACH = { cx: -1312, cz: -66, hx: 22, hz: 20, round: 9 };
const ASCENT = ROUTE.slice(9, 17), CROSS = ROUTE.slice(16, 19), ASCENT_CUM = cumulative(ASCENT);
function rect(a, x, z) { const qx = Math.abs(x - a.cx) - (a.hx - a.round), qz = Math.abs(z - a.cz) - (a.hz - a.round); return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - a.round; }
const smin = (a, b, k) => { const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };

/** A jornada ocupa o oeste; o canto sudoeste (x > -240, z < -175) continua da Ascensão/Fronteira. */
export const JOURNEY_BOUNDS = Object.freeze({ x0: -1760, x1: -112, z0: -420, z1: 300 });
export function inJourney(x, z) { return x < JOURNEY_BOUNDS.x1 && x > JOURNEY_BOUNDS.x0 && z < JOURNEY_BOUNDS.z1 && z > JOURNEY_BOUNDS.z0 && (z > -175 || x < -240); }
/** Recortes que a malha antiga do mundo deve deixar para a malha em blocos da jornada. */
export const JOURNEY_HOLES = Object.freeze([{ x0: -4000, x1: -118, z0: -175, z1: 4000 }, { x0: -4000, x1: -240, z0: -4000, z1: -175 }]);
/** Borda recortada do abismo (paredes irregulares); as pontas da ponte ficam sempre em rocha firme. */
const abyssEdge = (z, side) => 9 * (fbm2(z * .045 + side * 17, side * 3.1, 3, 77) - .5) * sstep(6, 30, Math.abs(z - BRIDGE.z));
export function inAbyss(x, z) { return z > ABYSS.z0 && z < ABYSS.z1 && x < ABYSS.x1 + abyssEdge(z, 1) && x > ABYSS.x0 + abyssEdge(z, -1); }

/** Distância assinada ao limite caminhável (negativa dentro). O abismo é "aberto" de propósito: cair é possível. */
export function journeyBoundary(x, z) {
  let d = rect(VALLEY, x, z);
  d = smin(d, polyProject(x, z, ASCENT, ASCENT_CUM).d - 8.5, 6);
  d = smin(d, rect(ASH, x, z), 14);
  d = smin(d, Math.hypot(x - CITY2.x, z - CITY2.z) - CITY2.r, 12);
  d = smin(d, rect(APPROACH, x, z), 8);
  d = Math.min(d, polyProject(x, z, CROSS, cumulative(CROSS)).d - 7); // pontas firmes da ponte
  if (inAbyss(x, z)) d = Math.min(d, -1);
  return d + (fbm2(x * .03, z * .03, 2, 41) - .5) * 6;
}
function mountains(x, z, d) {
  const s = d + 6; if (s <= 0) return 0;
  const massif = .6 + .9 * fbm2(x * .006 + 7, z * .006 - 3, 3, 11), r = ridge(x * .0095, z * .0095, 4, 23);
  return 6 * sstep(0, 12, s) + Math.max(0, s - 10) * .25 + 70 * massif * sstep(4, 110, s) * (.35 + r * 1.05) + 48 * sstep(110, 300, s) * ridge(x * .004 + 3, z * .004 + 5, 3, 51);
}
export function volcanoHeight(x, z) {
  const V = VOLCANO2, r = Math.hypot(x - V.x, z - V.z); if (r >= V.r * 1.12) return 0;
  const a = Math.atan2(z - V.z, x - V.x), lobe = 1 + .06 * Math.sin(a * 3 + 1.3) + .04 * Math.sin(a * 7), k = Math.min(1, r / (V.r * lobe));
  let h = V.h * Math.pow(1 - k, 1.6) * (1 + .03 * Math.sin(a * 23 + r * .05)) - Math.max(0, .9 - k) * 6 * Math.pow(Math.abs(Math.sin(a * 11 + r * .02)), 8); // ravinas de escoamento
  if (r < V.crater) { const rim = V.h * Math.pow(1 - V.crater / V.r, 1.6); h = rim - V.craterDepth * (1 - (r / V.crater) ** 2); }
  return Math.max(0, h);
}
/** Relevo da jornada. Retorna null fora da região (o mundo antigo responde). */
export function journeyHeight(x, z) {
  if (!inJourney(x, z)) return null;
  if (inAbyss(x, z)) { const e = Math.min(x - ABYSS.x0 - abyssEdge(z, -1), ABYSS.x1 + abyssEdge(z, 1) - x); return ABYSS.floor + 160 * (1 - sstep(0, 14, e)) - 40 * fbm2(x * .08, z * .08, 2, 5); } // paredes quase verticais e irregulares
  const q = polyProject(x, z, ROUTE, ROUTE_CUM), py = routeY(clamp(x, -1400, -112));
  const d = journeyBoundary(x, z);
  const roll = x > -612 ? (fbm2(x * .022 + 5, z * .022 - 2, 3, 7) - .5) * 4.2 * sstep(4, 18, q.d) : (fbm2(x * .03, z * .03, 3, 17) - .5) * 2.2 * sstep(4, 14, q.d);
  const city = Math.hypot(x - CITY2.x, z - CITY2.z) < CITY2.r + 6 ? sstep(CITY2.r + 6, CITY2.r - 8, Math.hypot(x - CITY2.x, z - CITY2.z)) : 0;
  const vr = Math.hypot(x - VOLCANO2.x, z - VOLCANO2.z); // planície de cinza em volta do cone; as serras voltam longe dele
  let h = py + roll * (1 - city) + mountains(x, z, d) * sstep(VOLCANO2.r * 1.05, VOLCANO2.r * 1.75, vr);
  // o rio do vale: leito raso (≤ 0,7 m de água) que nasce na cachoeira e corre para leste
  const rv = polyProject(x, z, RIVER2, RIVER2_CUM).d; if (rv < 7) h -= 1.1 * sstep(7, 2.5, rv);
  return h + volcanoHeight(x, z);
}
export const RIVER2 = Object.freeze([[WATERFALL.x, WATERFALL.z - 4], [-424, 40], [-398, 14], [-352, 4], [-300, 12], [-240, 6], [-190, 24], [-150, 46], [-122, 52]].map(p => Object.freeze(p)));
const RIVER2_CUM = cumulative(RIVER2);
export function riverDepth(x, z) { const d = polyProject(x, z, RIVER2, RIVER2_CUM).d; return d < 5.5 ? .7 * sstep(5.5, 2.5, d) : 0; }

/** Ponte do abismo: chão do tabuleiro (com leve barriga) e corrimãos. */
export function bridgeDeck(x, z) {
  const B = BRIDGE; if (x > B.x0 + .5 || x < B.x1 - .5 || Math.abs(z - B.z) > B.half + .6) return null;
  const t = (B.x0 - x) / (B.x0 - B.x1), y = B.y - B.sag * Math.sin(Math.PI * clamp(t, 0, 1));
  return { y, t, edge: Math.abs(z - B.z) > B.half };
}
/** Bloqueios próprios da jornada: encostas íngremes (além de 7 m da borda) e corrimãos para quem anda no tabuleiro. */
export function journeyBlocked(x, z, y = 0) {
  if (!inJourney(x, z)) return false;
  const deck = bridgeDeck(x, z); if (deck) return deck.edge && y < deck.y + .7; // pulando por cima do corrimão, cai
  if (inAbyss(x, z)) return false;
  if (Math.hypot(x - VOLCANO2.x, z - VOLCANO2.z) < VOLCANO2.r - 26) return true; // o cone não é escalável
  return journeyBoundary(x, z) > 7;
}

/* ---------------- Cinzária: cidade modular ---------------- */
/** Casas: [x, z, largura, fundo, andares, rotação (rad), bairro]. Bairros: praça, oficinas (sul), mercado (norte), alto (oeste). */
export function cinzariaLayout() {
  const C = CITY2, out = [], seed = { s: 7703 }, rnd = () => (seed.s = (seed.s * 16807) % 2147483647) / 2147483647;
  const ring = (r, n, a0, a1, w, d, floors, district) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i + .5) / n, x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r; out.push([+x.toFixed(2), +z.toFixed(2), +(w + rnd() * 1.6).toFixed(2), +(d + rnd() * 1.2).toFixed(2), floors + (rnd() < .4 ? 1 : 0), +Math.atan2(-Math.cos(a), -Math.sin(a)).toFixed(3), district]); } };
  const ring2 = (r, n, a0, a1, w, d, floors, district) => { const all = []; const save = out.length; ring(r, n, a0, a1, w, d, floors, district); for (const h of out.splice(save)) { const a = Math.atan2(h[1] - C.z, h[0] - C.x); if (Math.abs(Math.sin(a)) < .975) all.push(h); } out.push(...all); }; // ruas radiais norte/sul livres
  ring2(19, 5, .55, 2.6, 6.2, 6, 2, 'praca'); ring2(19, 5, 3.7, 5.75, 6.2, 6, 2, 'praca');          // a praça térrea (abertura leste para a estrada e oeste para o vulcão)
  ring2(33, 10, .35, 2.75, 5.6, 6, 1, 'mercado'); ring2(33, 10, 3.55, 5.95, 5.6, 6, 1, 'oficinas');   // segundo anel
  ring2(47, 13, .4, 2.7, 6.4, 7, 2, 'alto'); ring2(47, 13, 3.6, 5.9, 6, 6.4, 1, 'oficinas');         // terceiro anel
  return out.filter(([x, z]) => Math.abs(z - C.z) > 5.2 || Math.abs(x - C.x) < 8); // rua principal leste-oeste sempre livre
}
/** Bancas, fonte, poços e postes: ruas e praças com vida (posições sólidas, colisão simples). */
export const CITY_PROPS = Object.freeze({
  fountain: { x: CITY2.x, z: CITY2.z, r: 3.2 },
  stalls: [[.75, 10.5], [2.35, 10.5], [3.95, 10.5], [5.45, 10.5]].map(([a, r]) => Object.freeze([+(CITY2.x + Math.cos(a) * r).toFixed(2), +(CITY2.z + Math.sin(a) * r).toFixed(2), +Math.atan2(-Math.cos(a), -Math.sin(a)).toFixed(3)])),
  lamps: [[-1248, -62], [-1248, -70], [-1276, -62], [-1276, -70], [-1229, -62], [-1229, -70], [-1295, -62], [-1295, -70], [-1262, -52], [-1262, -80]].map(p => Object.freeze(p)),
  tower: { x: +(CITY2.x + Math.cos(1.15) * 12.5).toFixed(2), z: +(CITY2.z + Math.sin(1.15) * 12.5).toFixed(2), w: 4, h: 17 },
  wall: { r: 62 }
});
/** Rotas dos moradores (praça, ruas e oficinas). */
const polar = (r, a) => Object.freeze([+(CITY2.x + Math.cos(a) * r).toFixed(2), +(CITY2.z + Math.sin(a) * r).toFixed(2)]);
export const CITY_ROUTES2 = Object.freeze([
  [polar(26, -.5), polar(26, .45)], [polar(11, .7), polar(11, 2.4), polar(11, 3.9), polar(11, 5.5)], [polar(26, 1.25), polar(26, 2.1)],
  [polar(40, 2.75), polar(40, 3.5)], [[-1240, -66], [-1214, -66]].map(p => Object.freeze(p)), [[-1288, -66], [-1306, -66]].map(p => Object.freeze(p)),
  [polar(10, 4.712), polar(28, 4.712)], [polar(9, 1.571)]
].map(r => Object.freeze(r)));

/* ---------------- pontos seguros, marcos e mapa ---------------- */
export const SAFE_SPOTS = Object.freeze({
  eldoria: { x: -4.6, z: -33.5, yaw: Math.PI, name: 'Eldória' },
  cinzaria: { x: -1222, z: -66, yaw: -Math.PI / 2, name: 'Cinzária' }
});
/** Checkpoints de queda/respawn ao longo do percurso (o mais próximo já alcançado vale). */
export const CHECKPOINTS = Object.freeze([
  { id: 'vale', x: -150, z: -70 }, { id: 'serra', x: -650, z: -78 }, { id: 'ponte-leste', x: -797, z: -50 },
  { id: 'ponte-oeste', x: -940, z: -50 }, { id: 'cinzas', x: -1080, z: -78 }, { id: 'cinzaria', x: -1222, z: -66 }
]);
export const JOURNEY_POIS = Object.freeze([
  { id: 'vale', name: 'Vale do Entardecer', x: -300, z: -52, kind: 'clearing', revealRadius: 60 },
  { id: 'cachoeira', name: 'Cachoeira da Serra', x: WATERFALL.x, z: WATERFALL.z - 10, kind: 'water', revealRadius: 40 },
  { id: 'mirante', name: 'Mirante da Serra', x: -748, z: -44, kind: 'clearing', revealRadius: 30 },
  { id: 'ponte-abismo', name: 'Ponte do Abismo', x: -868, z: BRIDGE.z, kind: 'danger', revealRadius: 40 },
  { id: 'cinzas', name: 'Terras de Cinza', x: -1060, z: -56, kind: 'danger', revealRadius: 60 },
  { id: 'cinzaria', name: 'Cinzária', x: CITY2.x, z: CITY2.z, kind: 'village', revealRadius: 50 },
  { id: 'vulcao', name: 'Entrada do Vulcão', x: GATE2.x, z: GATE2.z, kind: 'danger', revealRadius: 34 }
]);
/** Desvios exploratórios reservados para histórias futuras (sem conteúdo canônico ainda). */
export const RESERVED_SITES = Object.freeze([
  { id: 'vale-ruina', x: -262, z: 18, note: 'ruína baixa entre flores (reservado)' }, { id: 'vale-pedras', x: -520, z: -142, note: 'círculo de pedras (reservado)' },
  { id: 'serra-gruta', x: -700, z: -16, note: 'abrigo na rocha do mirante (reservado)' }, { id: 'cinzas-forja', x: -1004, z: 2, note: 'forja abandonada (reservado)' },
  { id: 'cinzas-ossada', x: -1150, z: -128, note: 'ossada de criatura petrificada (reservado)' }
]);
