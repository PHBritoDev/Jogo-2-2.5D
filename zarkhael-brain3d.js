/**
 * IA do Bispo 3 (ZAR'KHAEL) — escolha de golpe por UTILIDADE (pesquisa: Infinite Axis Utility System / "dual utility").
 * Cada golpe recebe considerações normalizadas em [0,1] que se MULTIPLICAM (alcance por tabela de distância, recarga,
 * repetição, comportamento do herói, vida dos dois lados); depois só entram na escolha as opções da faixa de cima
 * (≥ 80% da melhor) e o sorteio é ponderado pela nota — ameaçador sem ser previsível nem "spam".
 * Também diz a INTENÇÃO de posicionamento: abrir distância antes do grande ritual quando o herói cola nele.
 */
export const ZK_RANGES = { hydra_judgment: [6, 10, 18, 24], line: [4, 6, 11, 13], orbs: [5, 7, 13, 16], cone: [0, 0, 3.6, 4.5] };
const clamp01 = x => Math.max(0, Math.min(1, x));
/** trapézio: 0 fora de [a,d], 1 entre [b,c] */
export function rangeScore(type, dist) { const r = ZK_RANGES[type]; if (!r) return dist <= 16 && dist >= 3 ? .6 : 0; const [a, b, c, d] = r; if (dist < a || dist > d) return 0; if (dist < b) return clamp01((dist - a) / Math.max(1e-6, b - a)); if (dist > c) return clamp01((d - dist) / Math.max(1e-6, d - c)); return 1; }

/** ctx: {dist, cds, last, hpFrac, heroHpFrac, heroDashing, heroAttacking, heroSpeed}. Devolve {move, scores, intent}. */
export function chooseZarkhaelMove(kit, ctx, rand = Math.random) {
  const moves = [...kit.skills, kit.sword].filter(m => m && !m.disabled), scores = [];
  for (const m of moves) {
    if (ctx.cds && ctx.cds[m.id] > 0) { scores.push([m, 0]); continue; }
    let s = rangeScore(m.type, ctx.dist) * (m.type === 'hydra_judgment' ? 1.3 : m.type === 'cone' ? 1.1 : 1);
    if (ctx.last === m.id) s *= .35; /* não repete o mesmo golpe em seguida */
    if (m.type === 'hydra_judgment') { if (ctx.heroDashing) s *= .45; /* espera o herói gastar o dash */ if (ctx.heroAttacking && ctx.dist < 4) s *= .3; if (ctx.hpFrac < .5) s *= 1.25; /* desespero: o ritual vem mais */ }
    if (m.type === 'cone' && ctx.heroAttacking) s *= 1.4; /* pune quem vem trocar golpe */
    if (ctx.heroHpFrac < .35 && (m.type === 'cone' || m.type === 'line')) s *= 1.2; /* fecha a luta com golpes rápidos */
    if ((ctx.heroSpeed || 0) > 5 && (m.type === 'orbs' || m.type === 'line')) s *= 1.15; /* herói correndo: projéteis/linha */
    scores.push([m, s]);
  }
  const best = Math.max(0, ...scores.map(x => x[1])); let move = null;
  if (best > .05) { const band = scores.filter(x => x[1] >= best * .8); const tot = band.reduce((a, x) => a + x[1], 0); let r = rand() * tot; for (const [m, s] of band) { r -= s; if (r <= 0) { move = m; break; } } if (!move) move = band[band.length - 1][0]; }
  const hy = moves.find(m => m.type === 'hydra_judgment'), hyCd = hy && ctx.cds ? (ctx.cds[hy.id] || 0) : 0;
  const intent = hy && hyCd <= 1.5 && ctx.dist < 5.5 && !(ctx.heroHpFrac < .3) ? 'kite' : null; /* abre espaço antes do ritual */
  return { move, scores, intent };
}
