/**
 * MOD 190 — Corações (proposta inicial do roteiro, para ajuste em playtests).
 * Dez corações; perde-se um ao cair diante de um Bispo ou em evento de alto risco; regenera um a cada
 * três minutos. Sem corações, a exploração e os inimigos comuns continuam liberados — só os Bispos exigem
 * ao menos um. Regras puras (testes em hearts3d.test.mjs).
 */
export const HEARTS = { max: 10, regenMs: 180000 };

export function normalizeHearts(raw, now = Date.now()) {
  const r = raw && typeof raw === 'object' ? raw : {};
  // Null/vazio em saves antigos não representa uma escolha explícita de zero corações.
  const numericSave = typeof r.hearts === 'number'
    || (typeof r.hearts === 'string' && r.hearts.trim().length > 0);
  const parsedHearts = numericSave ? Number(r.hearts) : NaN;
  const rawHearts = Number.isFinite(parsedHearts) ? parsedHearts : NaN;
  const hearts = Math.max(0, Math.min(HEARTS.max, Math.floor(rawHearts))); 
  // Zero é timestamp válido: não confundir com campo ausente ao carregar um save antigo.
  const hasSince = typeof r.since === 'number' || (typeof r.since === 'string' && r.since.trim() !== '');
  const parsedSince = hasSince ? Number(r.since) : NaN;
  return tickHearts({ hearts: Number.isFinite(hearts) ? hearts : HEARTS.max, since: Number.isFinite(parsedSince) ? parsedSince : now, explained: !!r.explained }, now);
}

/** Aplica a regeneração acumulada (inclusive com o jogo fechado). */
export function tickHearts(state, now = Date.now()) {
  // Chamadores legados podem entregar estado ausente; restaurar com segurança.
  if (!state || typeof state !== 'object') return { hearts: HEARTS.max, since: now };
  // Estado em memória também pode ser alterado por integrações antigas sem passar pelo carregador.
  // Evite propagar NaN/Infinity ao HUD, às regras de Bispos ou à persistência.
  // Null, string vazia e tipos não numéricos não são zero explícito.
  const hasNumericHearts = typeof state.hearts === 'number'
    || (typeof state.hearts === 'string' && state.hearts.trim().length > 0);
  const rawHearts = hasNumericHearts ? Number(state.hearts) : NaN;
  const normalizedHearts = Number.isFinite(rawHearts) ? Math.max(0, Math.min(HEARTS.max, Math.floor(rawHearts))) : HEARTS.max;
  state = normalizedHearts === state.hearts ? state : { ...state, hearts: normalizedHearts };
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
  // O HUD pode consultar o estado bruto antes de tickHearts: use o mesmo fallback
  // de corações inválidos, sem mostrar um timer para uma barra restaurada como cheia.
  const value = state?.hearts;
  const numeric = typeof value === 'number' || (typeof value === 'string' && value.trim().length > 0);
  const parsed = numeric ? Number(value) : NaN;
  const hearts = Number.isFinite(parsed) ? Math.max(0, Math.min(HEARTS.max, Math.floor(parsed))) : HEARTS.max;
  if (hearts >= HEARTS.max) return 0;
  const since = Number.isFinite(state.since) && state.since >= 0 ? Math.min(state.since, now) : now;
  return Math.max(0, HEARTS.regenMs - Math.max(0, now - since));
}

export function canChallengeBishop(state) {
  // A validação do desafio também deve falhar fechada se uma integração passar estado bruto.
  return Number.isInteger(state?.hearts) && state.hearts >= 1 && state.hearts <= HEARTS.max;
}

export function formatTimer(ms) {
  // Um relógio inválido não pode vazar NaN/Infinity ou tempo negativo ao HUD.
  const safeMs = typeof ms === 'number' && Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const s = Math.ceil(safeMs / 1000), m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}
