/**
 * MOD 190 — Corações (proposta inicial do roteiro, para ajuste em playtests).
 * Dez corações; perde-se um ao cair diante de um Bispo ou em evento de alto risco; regenera um a cada
 * três minutos. Sem corações, a exploração e os inimigos comuns continuam liberados — só os Bispos exigem
 * ao menos um. Regras puras (testes em hearts3d.test.mjs).
 */
export const HEARTS = { max: 10, regenMs: 180000 };

export function normalizeHearts(raw, now = Date.now()) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const hearts = Math.max(0, Math.min(HEARTS.max, Math.floor(Number(r.hearts)))); 
  return tickHearts({ hearts: Number.isFinite(hearts) ? hearts : HEARTS.max, since: Number(r.since) || now, explained: !!r.explained }, now);
}

/** Aplica a regeneração acumulada (inclusive com o jogo fechado). */
export function tickHearts(state, now = Date.now()) {
  if (state.hearts >= HEARTS.max) return { ...state, hearts: HEARTS.max, since: now };
  // Se o relógio voltou ou o save veio do futuro, reinicie a contagem sem premiar tempo negativo.
  const safeSince = Number.isFinite(state.since) && state.since >= 0 ? Math.min(state.since, now) : now;
  const current = safeSince === state.since ? state : { ...state, since: safeSince };
  const gained = Math.floor(Math.max(0, now - safeSince) / HEARTS.regenMs);
  if (!gained) return current;
  const hearts = Math.min(HEARTS.max, current.hearts + gained);
  return { ...current, hearts, since: hearts >= HEARTS.max ? now : safeSince + gained * HEARTS.regenMs };
}

export function loseHeart(state, now = Date.now()) {
  const s = tickHearts(state, now);
  const full = s.hearts >= HEARTS.max;
  return { ...s, hearts: Math.max(0, s.hearts - 1), since: full ? now : s.since };
}

export function msToNextHeart(state, now = Date.now()) {
  if (state.hearts >= HEARTS.max) return 0;
  const since = Number.isFinite(state.since) && state.since >= 0 ? Math.min(state.since, now) : now;
  return Math.max(0, HEARTS.regenMs - Math.max(0, now - since));
}

export function canChallengeBishop(state) { return state.hearts >= 1; }

export function formatTimer(ms) {
  const s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}
