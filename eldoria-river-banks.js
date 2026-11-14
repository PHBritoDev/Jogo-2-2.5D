/**
 * Renascimento de Eldória — Fase 2: rio, margens e travessia (lógica pura, determinística, testável em Node).
 *
 * Antes, o leito era cavado em ~0,7 m de largura de barranco: o gramado chegava em degrau até a água e o rio lia-se
 * como um canal azul de largura constante. Aqui ficam as regras de forma:
 *
 *  - Margens erodidas: uma faixa de 2,6 a ~7 m da linha d'água vira barranco em rampa. Nas curvas, o lado interno
 *    vira praia de cascalho (rampa longa e baixa) e o externo fica com corte mais curto e íngreme. A largura varia
 *    por ruído ao longo do rio. O barranco só **desce** o terreno acima da água e nunca cria água nova.
 *  - Vau: um baixio de cascalho atravessa o rio a leste da ponte (o leito sobe até ~0,5 m de lâmina), com
 *    pedras-degrau e corredeira.
 *  - Planejamento das peças: pedras de margem (meio submersas na linha d'água), blocos grandes nas curvas externas,
 *    tufos de junco/taboa nos remansos e praias, e pedras-degrau no vau.
 * A ponte e as cabeceiras ficam intocadas, sem mexer no relevo num raio de 9 m.
 */
import { riverRibbon } from './eldoria-water.js';

export const RIVER_BANK = Object.freeze({ edge: 2.62, run: 3.1, runVar: 2.4, bridgeKeep: 9.5 });
export const FORD = Object.freeze({ x: 19, z: -13.2, halfLen: 4.6, fade: 3.2, bedDepth: .5, name: 'Vau das Pedras' });
export const FORD_TRAIL = Object.freeze({ id: 'vau', name: 'Caminho do Vau', width: 2.4, points: Object.freeze([[22, 14.6], [21, 6.5], [19.6, 0], [19, -6.8], [19, -17.5], [21.8, -21.5], [19.5, -26.5], [14, -30.5]]) });

const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
function vnoise1(t, seed) { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u; }

/**
 * Geometria de consulta do rio: centro denso (o mesmo Catmull-Rom da fita d'água), comprimento acumulado,
 * tangente e curvatura com sinal. `nearest(x,z)` devolve { d, s, side, curv } (side: +1/-1 = lado da margem).
 */
export function createRiverQuery(points, { width = 3.33, level = -.5 } = {}) {
  const r = riverRibbon(points, { width, level }), C = r.centerline, S = [0];
  for (let i = 1; i < C.length; i++) S.push(S[i - 1] + Math.hypot(C[i].x - C[i - 1].x, C[i].z - C[i - 1].z));
  const T = C.map((p, i) => { const a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)], L = Math.hypot(b.x - a.x, b.z - a.z) || 1; return { x: (b.x - a.x) / L, z: (b.z - a.z) / L }; });
  const K = C.map((p, i) => { const a = T[Math.max(0, i - 3)], b = T[Math.min(C.length - 1, i + 3)]; return a.x * b.z - a.z * b.x; }); // >0 curva à esquerda
  // grade espacial grossa para a busca do ponto mais próximo
  const cell = 8, grid = new Map(), key = (gx, gz) => (gx + 4096) * 8192 + gz + 4096;
  C.forEach((p, i) => { const k = key(Math.floor(p.x / cell), Math.floor(p.z / cell)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  // caixa do rio + 12 m: tudo fora sai na hora (a altura do terreno é consultada a cada quadro)
  const pad = 12, xMin = Math.min(...C.map(p => p.x)) - pad, xMax = Math.max(...C.map(p => p.x)) + pad, zMin = Math.min(...C.map(p => p.z)) - pad, zMax = Math.max(...C.map(p => p.z)) + pad;
  function nearest(x, z) {
    if (x < xMin || x > xMax || z < zMin || z > zMax) return null;
    const gx = Math.floor(x / cell), gz = Math.floor(z / cell); let best = 1e9, bi = -1;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = grid.get(key(gx + a, gz + b)); if (!l) continue; for (const i of l) { const d = (C[i].x - x) ** 2 + (C[i].z - z) ** 2; if (d < best) { best = d; bi = i; } } }
    if (bi < 0 || best > 144) return null;
    const t = T[bi], dx = x - C[bi].x, dz = z - C[bi].z, side = Math.sign(-t.z * dx + t.x * dz) || 1;
    return { d: Math.sqrt(best), s: S[bi], i: bi, side, curv: K[bi], tx: t.x, tz: t.z };
  }
  return { centerline: C, lengths: S, tangents: T, curvature: K, nearest, length: S[S.length - 1], level, xMin, xMax, zMin, zMax };
}

/** Lado interno da curva (praia de cascalho) = mesmo lado para onde o rio curva. */
export function innerBend(q) { return q.curv * q.side > .015; }

/** Largura da rampa do barranco neste ponto (m): varia ao longo do rio; maior na praia interna e menor no corte externo. */
export function bankRun(q) {
  const base = RIVER_BANK.run + (vnoise1(q.s / 11, 5) - .5) * RIVER_BANK.runVar, k = Math.min(1, Math.abs(q.curv) * 9);
  return Math.max(1.4, innerBend(q) ? base + 2.6 * k : base - 1.3 * k);
}

/** Máscara do vau (0..1) ao longo do rio, em torno do ponto mais próximo de FORD. */
export function fordMask(q, fordS) {
  const ds = Math.abs(q.s - fordS);
  if (ds > FORD.halfLen + FORD.fade) return 0;
  return ds < FORD.halfLen ? 1 : 1 - (ds - FORD.halfLen) / FORD.fade;
}

/**
 * Altura nova do terreno. `h0` = altura original; nunca cria água nova: só baixa o que está acima da linha d'água
 * (barranco) e só levanta o que está abaixo dela (vau).
 */
export function shapeBankHeight(h0, x, z, river, { fordS, bridge } = {}) {
  const q = river.nearest(x, z); if (!q || q.d > 12) return h0;
  if (bridge && Math.hypot(x - bridge.x, z - bridge.z) < RIVER_BANK.bridgeKeep) return h0;
  const ends = endFade(q, river); if (ends <= 0) return h0;
  let h = h0;
  const lv = river.level;
  // barranco em rampa (acima da água)
  if (q.d > RIVER_BANK.edge - .25 && h0 > lv) {
    const run = bankRun(q), u = (q.d - RIVER_BANK.edge) / run;
    if (u < 1) { const k = Math.max(0, u), e = k * k * (3 - 2 * k), shelf = innerBend(q) ? .07 : .16, target = lv + shelf + (h0 - lv - shelf) * e;
      if (target < h) h = target; }
  }
  // vau: o leito sobe até ~bedDepth de lâmina, com ondulação do cascalho
  if (fordS !== undefined) {
    const f = fordMask(q, fordS);
    if (f > 0 && q.d < 4.2) { const bed = lv - FORD.bedDepth + (hash(Math.floor(x * 2), Math.floor(z * 2)) - .5) * .06, w = f * (1 - Math.max(0, (q.d - 3.2) / 1));
      if (bed > h) h = h + (bed - h) * Math.max(0, Math.min(1, w)); }
  }
  return h0 + (h - h0) * ends;
}

/** Cabeceira (pé da cachoeira) e foz ficam como estão: o efeito some nos primeiros 14–20 m e nos últimos 6–12 m. */
export function endFade(q, river) { return Math.max(0, Math.min(1, (q.s - 14) / 6, (river.length - 6 - q.s) / 6)); }

/** Plano das peças das margens. Devolve { stones, boulders, reeds, steps } com posições finais em x,z. */
export function planRiverBanks(river, { fordS, bridge, height, avoid = () => false, seed = 4413, lowSpec = false } = {}) {
  const stones = [], boulders = [], reeds = [], steps = [];
  let s0 = seed >>> 0; const rnd = () => { s0 = (s0 * 1664525 + 1013904223) >>> 0; return s0 / 4294967296; };
  const C = river.centerline, S = river.lengths, at = i => C[Math.max(0, Math.min(C.length - 1, i))];
  const nearBridge = (x, z, r) => bridge && Math.hypot(x - bridge.x, z - bridge.z) < RIVER_BANK.bridgeKeep + r;
  const pointAt = (i, side, d) => { const t = river.tangents[i], p = at(i); return { x: p.x - t.z * side * d, z: p.z + t.x * side * d }; };
  for (let i = 2; i < C.length - 2; i++) {
    const q = { s: S[i], curv: river.curvature[i] }; if (endFade(q, river) < 1) continue;
    for (const side of [-1, 1]) {
      const qq = { ...q, side }, inner = innerBend(qq), f = fordS !== undefined ? fordMask({ s: S[i] }, fordS) : 0;
      // pedras de margem: na linha d'água, mais densas no corte externo
      if (rnd() < (inner ? .1 : .26) * (lowSpec ? .7 : 1)) {
        const d = RIVER_BANK.edge - .2 + rnd() * .9, p = pointAt(i, side, d);
        if (!nearBridge(p.x, p.z, 1) && !avoid(p.x, p.z, .8) && f < .5) stones.push({ x: p.x, z: p.z, r: .32 + rnd() * .5, sy: .55 + rnd() * .35, rot: rnd() * 6.28, v: Math.floor(rnd() * 3) });
      }
      // blocos grandes no corte externo das curvas fortes
      if (!inner && Math.abs(q.curv) > .03 && rnd() < .05) {
        const d = RIVER_BANK.edge + .6 + rnd() * 1.4, p = pointAt(i, side, d);
        if (!nearBridge(p.x, p.z, 3) && !avoid(p.x, p.z, 1.8) && !boulders.some(b => Math.hypot(b.x - p.x, b.z - p.z) < 9)) boulders.push({ x: p.x, z: p.z, s: 1.4 + rnd() * 1.1, rot: rnd() * 6.28 });
      }
      // juncos/taboas: remansos e praias internas, beira do vau
      const want = (inner ? .32 : .09) + f * .4;
      if (rnd() < want * (lowSpec ? .65 : 1)) {
        const d = RIVER_BANK.edge - .45 + rnd() * 1.3, p = pointAt(i, side, d);
        if (!nearBridge(p.x, p.z, 1.5) && !avoid(p.x, p.z, .6) && !(f > .6 && d < RIVER_BANK.edge + .6)) reeds.push({ x: p.x, z: p.z, s: .75 + rnd() * .55, rot: rnd() * 6.28, cat: rnd() < .45 });
      }
    }
  }
  // pedras-degrau atravessando o vau (topo ~0,16 m acima da lâmina, uma passada ~1,05 m entre centros)
  if (fordS !== undefined) {
    let fi = 0; for (let i = 0; i < S.length; i++) if (Math.abs(S[i] - fordS) < Math.abs(S[fi] - fordS)) fi = i;
    const t = river.tangents[fi]; for (let j = 0; j < 6; j++) { const k = j - 2.5, p = pointAt(fi, 1, k * 1.05), a = (j % 2 ? .16 : -.16) + (hash(j, 7) - .5) * .1; steps.push({ x: p.x + t.x * a, z: p.z + t.z * a, r: .5 + hash(j, 11) * .1, rot: hash(j, 13) * 6.28 }); }
  }
  return { stones, boulders, reeds, steps };
}

/** Comprimento ao longo do rio do ponto mais próximo do vau. */
export function fordAlong(river) { const q = river.nearest(FORD.x, FORD.z); return q ? q.s : undefined; }

/**
 * Embrulha height/waterDepth do terreno. A lâmina d'água do rio é `nível - chão`, então basta descontar a mudança
 * de altura feita aqui (barranco rebaixado continua seco; vau fica raso). Lagos e canais longe do rio não mudam.
 */
export function wrapTerrainForBanks(terrain, river, opts = {}) {
  const h0 = terrain.height, w0 = terrain.waterDepth;
  terrain.height = (x, z) => { const h = h0(x, z); return shapeBankHeight(h, x, z, river, opts); };
  terrain.waterDepth = (x, z) => { const w = w0(x, z); if (w <= -98) return w; const h = h0(x, z); return w - (shapeBankHeight(h, x, z, river, opts) - h); };
  return terrain;
}
