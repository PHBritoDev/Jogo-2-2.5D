/** Mod 216: a pista fica além da floresta, no fim da trilha da encosta. */
export const MASSACRE_SPOT={x:49,z:-139};
export const SEWER_DOOR={x:73,z:-170,yaw:-.64};
export const SEWER_TRAIL=[[15,-99],[27,-115],[39,-130],[49,-139],[59,-150],[68,-162],[72,-168]];
/* Mod 311 — o vale da serra virou a fronteira montanhosa com a boca da caverna (direção do criador): as gaiolas e os
   Seguidores (Demônio 1) foram para bem longe dela, numa clareira fechada da mata densa a leste da vila, ao fim de uma
   trilha própria que sai do caminho do Vale do Altar. Mesmos deslocamentos relativos de antes (gatilhos/ritual iguais). */
export const CAGE_CLEARING={x:66,z:-70};
export const JOURNEY_ENEMIES=[{x:66,z:-63.5},{x:66,z:-73.5},{x:71,z:-66.5}];
/** Trilha da mata: do caminho do altar até a clareira das gaiolas, serpenteando entre as copas. */
export const CAGE_TRAIL=[[44,-33],[51,-38],[57,-46],[64,-50],[69,-56],[67,-62]];

/* Mod 291 — Prólogo longe de Eldória (roteiro v1, P0/P1). A queda acontece num prado aberto ao sul do vale,
   separado da cidade por uma serra; a estrada de Teren atravessa a garganta e encontra a trilha antiga no
   entroncamento (o antigo ponto de despertar). Coordenadas compartilhadas por mundo, gatilhos e testes. */
export const PROLOGUE_MEADOW = { cx: 60, cz: 152, hx: 40, hz: 32, round: 26, wobble: 5, tint: [[.37, .5, .21], [.5, .62, .27]], tintStrength: .72 };
export const FALL_SPOT = { x: 54, z: 160 };
export const ROAD_JUNCTION = { x: 52, z: 10 };
export const TEREN_ROAD = [[54, 156], [58, 140], [66, 120], [76, 98], [71, 76], [58, 56], [53, 34], [52, 10]];
/** Continuação da viagem de carroça pelas trilhas existentes até a entrada de Eldória. */
/** Mod 292: a carroça para no largo ANTES da ponte (estreita, de pedestres): o jogador atravessa a pé e entra pela ponte. */
export const CART_ROUTE = TEREN_ROAD.concat([[40, 14], [24, 16], [10, 15], [0, 14], [0, 4], [.2, -1.2]]);
export const TEREN_STOP = { x: 59.5, z: 136 };
export const BROKEN_WHEEL = { x: 62.4, z: 128.5 };
export const BANDIT_AMBUSH = { x: 73.6, z: 90 };
export const ELDORIA_DROP = { x: .2, z: -1.2 };
export const ROAD_TERRAIN_PATCH = { x0: 18, x1: 118, z0: 40, z1: 204 };
/** Bandidos humanos famintos (sem magia): fecham a estrada à frente e atrás da carroça. */
export const ROAD_BANDITS = [{ x: 75.2, z: 85.6 }, { x: 72.2, z: 84.8 }, { x: 77.4, z: 93.8 }, { x: 70.2, z: 94.6 }];

export function insideMeadow(x, z, pad = 0) {
  const m = PROLOGUE_MEADOW, qx = Math.abs(x - m.cx) / (m.hx + pad), qz = Math.abs(z - m.cz) / (m.hz + pad);
  return qx * qx + qz * qz < 1;
}
/** Comprimento de uma polilinha (para medir a viagem em testes e no HUD). */
export function polylineLength(points) {
  let L = 0; for (let i = 1; i < points.length; i++) L += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]); return L;
}
/** Ponto à distância s ao longo da polilinha, com a direção do trecho. */
export function pointAlong(points, s) {
  let left = Math.max(0, s);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= len || i === points.length - 1) { const k = len > 0 ? Math.min(1, left / len) : 0; return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), done: left >= len && i === points.length - 1 }; }
    left -= len;
  }
  const p = points[points.length - 1]; return { x: p[0], z: p[1], yaw: 0, done: true };
}
/** Distância de um ponto ao longo da rota mais próxima (projeção), para retomar a viagem. */
export function nearestAlong(points, x, z) {
  let best = Infinity, at = 0, acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const t = len > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (len * len))) : 0;
    const d = Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)); if (d < best) { best = d; at = acc + len * t; }
    acc += len;
  }
  return { s: at, d: best };
}

/* Mod 291/292 — Eldória: centro, rio e ponte (roteiro v1: "a cidade aparece entre árvores gigantes, com telhados
   inclinados, pontes e água corrente"). Mod 292: o rio desce do contraforte leste e corre AO SUL da cidade até a
   garganta oeste; quem chega da floresta (sul) tem de atravessar a ponte de pedra — a entrada da cidade. */
export const ELDORIA_CENTER = { x: -12.2, z: -44.5 };
export const RIVER_POINTS = [[88, -9], [74, -8.5], [60, -10.5], [46, -12.5], [32, -13.6], [18, -13.2], [7, -12.4], [-.4, -12.3], [-8, -12.9], [-18, -14.6], [-29, -15.6], [-40, -14.4], [-52, -11.8], [-64, -9.8], [-76, -10], [-88, -11]];
export const RIVER = { width: 3.4, depth: 1.75, level: -.5, flow: 1.15 };
export const BRIDGE = { x: -.4, z: -12.3, axisX: -.02, axisZ: -.9998, halfLength: 6.2, halfWidth: 1.9, rise: 1.05 };
/** Altura do tabuleiro da ponte (0 nas cabeceiras, arco suave no meio); null fora da ponte. */
export function bridgeDeck(x, z, b = BRIDGE) {
  const dx = x - b.x, dz = z - b.z, along = dx * b.axisX + dz * b.axisZ, side = dx * b.axisZ - dz * b.axisX;
  if (Math.abs(along) > b.halfLength || Math.abs(side) > b.halfWidth) return null;
  const t = along / b.halfLength; return { y: b.rise * (1 - t * t) + .08, along, side, edge: Math.abs(side) > b.halfWidth - .32 };
}
