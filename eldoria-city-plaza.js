/**
 * Renascimento de Eldória — Fase 2: chegada e praça (plano puro, determinístico, testável em Node).
 *
 * Antes: a cidade inteira estava no mesmo nível (altura 0). Trilhas de terra cruzavam o gramado entre casas
 * soltas, e a "praça" era só o encontro das trilhas. Aqui fica o desenho urbano:
 *  - Praça calçada: contorno orgânico em volta do poço, com fonte seca, bancas e banco dentro. Lajes assentadas
 *    em fiadas e meio-fio de pedra, aberto onde chegam as ruas.
 *  - Rua da Entrada: calçada de pedra (paralelepípedo) que vai do largo da Clareira do Tronco até a praça.
 *  - Adro da Árvore: terraço de pedra de 0,6 m ao norte da praça, a caminho da árvore colossal. Tem escadaria larga
 *    vinda da praça, escada estreita para a rua norte e parapeito baixo. Dá nível à cidade sem mexer no terreno,
 *    porque tudo o que já existe (casas, bancas, NPCs, tochas, banco) continua no chão de antes.
 *  - Pobreza contada pelas pessoas e pelos recursos, não por casas em ruína:
 *    - fila de baldes vazios na fonte seca;
 *    - mesa de ração com dois sacos e caixotes vazios;
 *    - edital de tributo pregado no quadro da entrada;
 *    - canteiros com mudas secas;
 *    - lampiões apagados de dia.
 * Nada aqui muda coordenadas de narrativa, NPCs, lojas, gatilhos ou save.
 */
import { ELDORIA_CENTER } from './act1-world-layout.js';

export const PLAZA = Object.freeze({ x: -14.2, z: -42.8, rx: 9.6, rz: 8.8, kerb: .26, kerbH: .09 });
/** Aberturas no meio-fio (ângulo = atan2(dz,dx) a partir do centro da praça; meia-largura angular). */
export const PLAZA_OPENINGS = Object.freeze([
  { id: 'entrada', a: .9, half: .3 },
  { id: 'leste', a: .19, half: .26 },
  { id: 'adro', a: -1.41, half: .42 },
  { id: 'sudoeste', a: -2.52, half: .26 },
  { id: 'oeste', a: 2.79, half: .26 },
]);
/** Rua da Entrada calçada (mundo): do largo depois da Clareira do Tronco até a borda da praça. */
export const ENTRY_STREET = Object.freeze({ width: 3.3, points: Object.freeze([[-1.6, -30.2], [-3.8, -31.8], [-8.2, -35.2], [-10.6, -38.6]]) });
/** Adro da Árvore: terraço de pedra (mundo). y = altura do piso acima do chão (o chão da cidade é plano). */
export const TERRACE = Object.freeze({ x: -12.8, z: -54.1, hx: 3, hz: 2.5, y: .6, front: { w: 4.4, d: 1.8 }, back: { w: 2.4, d: 1.6 } });

const TAU = Math.PI * 2;
export function angleIn(a, c, h) { let d = ((a - c) % TAU + TAU * 1.5) % TAU - Math.PI; return Math.abs(d) <= h; }
/** Raio relativo da borda (1 = elipse base) com ondulação suave, para o contorno não parecer compasso. */
export function plazaEdge(theta) { return 1 + .045 * Math.sin(theta * 3 + 1.1) + .03 * Math.sin(theta * 5 - .4); }
/** Coordenadas polares normalizadas (rho = 1 na elipse base). */
export function plazaPolar(x, z) { const u = (x - PLAZA.x) / PLAZA.rx, v = (z - PLAZA.z) / PLAZA.rz; return { rho: Math.hypot(u, v), theta: Math.atan2(v, u) }; }
/** Dentro da praça (pad em metros, aproximado). */
export function insidePlaza(x, z, pad = 0) { const p = plazaPolar(x, z); return p.rho <= plazaEdge(p.theta) + pad / ((PLAZA.rx + PLAZA.rz) / 2); }
export function plazaPoint(theta, k = 1) { const r = plazaEdge(theta) * k; return [PLAZA.x + Math.cos(theta) * PLAZA.rx * r, PLAZA.z + Math.sin(theta) * PLAZA.rz * r]; }
export function openingAt(theta) { return PLAZA_OPENINGS.find(o => angleIn(theta, o.a, o.half)) || null; }

/** Retângulos do terraço e das escadas (para o caminhável e para a malha). */
export function terraceParts(T = TERRACE) {
  const top = { cx: T.x, cz: T.z, hx: T.hx, hz: T.hz, y: T.y };
  const front = { a: [T.x, T.z + T.hz + T.front.d], b: [T.x, T.z + T.hz], w: T.front.w, ya: 0, yb: T.y, steps: 4 };
  const back = { a: [T.x, T.z - T.hz], b: [T.x, T.z - T.hz - T.back.d], w: T.back.w, ya: T.y, yb: 0, steps: 4 };
  return { top, front, back };
}

export const TERRACE_PARAPET = Object.freeze({ h: .42, w: .16 });
/**
 * Registra o adro no caminhável do jogador (eldoria-walkable.js): piso, escadarias (rampa contínua sob os
 * degraus), pódio que não se atravessa pela lateral e parapeito que não deixa cair pelas bordas altas.
 */
export function registerTerraceWalk(walk, g0 = 0, T = TERRACE) {
  const parts = terraceParts(T), top = g0 + T.y, x0 = T.x - T.hx, x1 = T.x + T.hx, z0 = T.z - T.hz, z1 = T.z + T.hz;
  walk.addRect(T.x, T.z, T.hx, T.hz, top, 'adro-arvore');
  walk.addSpan(parts.front.a, parts.front.b, parts.front.w, g0, top, 'adro-escadaria', true);
  walk.addSpan(parts.back.a, parts.back.b, parts.back.w, top, g0, 'adro-escada-norte', true);
  const lo = g0 - .2, pb = top + TERRACE_PARAPET.h + .1;
  for (const [a, b] of [[[x0, z0], [x0, z1]], [[x1, z0], [x1, z1]]]) { walk.addWall(a, b, lo, top, 'adro-podio'); walk.addWall(a, b, top, pb, 'adro-parapeito'); }
  for (const z of [z1, z0]) { const half = (z === z1 ? T.front.w : T.back.w) / 2;
    for (const [a, b] of [[[x0, z], [T.x - half, z]], [[T.x + half, z], [x1, z]]]) { walk.addWall(a, b, lo, top, 'adro-podio'); walk.addWall(a, b, top, pb, 'adro-parapeito'); } }
  return parts;
}

/**
 * Peças fixas compostas à mão (mundo). Cada uma com função; nada é espalhado ao acaso.
 * kind: bucket | rationTable | sack | crate | board | planter | lamp | bench
 */
export function plazaProps() {
  const F = { x: ELDORIA_CENTER.x - 7.5, z: ELDORIA_CENTER.z + 7.5 }; // fonte seca
  const P = [];
  // fila de baldes vazios, da fonte para o centro da praça (alguém ainda espera a água)
  for (let i = 0; i < 5; i++) P.push({ kind: 'bucket', x: F.x + 2.1 + i * .62, z: F.z - 1.2 - i * .34, rot: i * 1.7, tip: i === 3 });
  // mesa de ração do conselho: dois sacos, caixotes vazios e o livro de contas
  P.push({ kind: 'rationTable', x: -8.6, z: -46.6, rot: -.35 });
  P.push({ kind: 'sack', x: -8.95, z: -46.45, rot: .2, y: .78 }, { kind: 'sack', x: -8.2, z: -46.85, rot: 1.1, y: .78, small: true });
  P.push({ kind: 'crate', x: -7.6, z: -45.6, rot: .3, empty: true }, { kind: 'crate', x: -7.3, z: -46.5, rot: -.2, empty: true }, { kind: 'crate', x: -7.45, z: -46.05, rot: .1, empty: true, y: .5 });
  // edital do tributo pregado no quadro da entrada da praça
  P.push({ kind: 'board', x: -7.5, z: -39.3, rot: Math.atan2(-2.4, 1.7) }); // ao lado da boca da rua, de frente para quem chega
  // canteiros do adro com mudas secas (água falta até para as plantas)
  for (const [dx, dz] of [[-2.55, 2.05], [2.55, 2.05], [-2.55, -2.05], [2.55, -2.05]]) P.push({ kind: 'planter', x: TERRACE.x + dx, z: TERRACE.z + dz, y: TERRACE.y, rot: 0 });
  // bancos de pedra no adro, de frente para a praça
  P.push({ kind: 'bench', x: TERRACE.x - 1.5, z: TERRACE.z - .9, y: TERRACE.y, rot: 0 }, { kind: 'bench', x: TERRACE.x + 1.5, z: TERRACE.z - .9, y: TERRACE.y, rot: 0 });
  // lampiões na borda da praça (apagados de dia, acesos à noite pelo ciclo)
  for (const th of [.55, 1.25, -.55, -2.25, 2.1, -2.95]) { const [x, z] = plazaPoint(th, 1.02); P.push({ kind: 'lamp', x, z, rot: th }); }
  return P;
}
