/**
 * BISPO 4 (VÉRAXION) — ULTIMATE "A QUEDA DO DEVORADOR LUNAR" (lógica pura, determinística, sem WebGL).
 * Relógio em segundos reais; cada evento sai uma vez, por limiar de tempo (igual a 10, 30 ou 60 FPS).
 *   boss      0–3,8    plano no VÉRAXION real: aura rubra cresce, X vermelho no olho
 *   cosmos    3,8–8,2  travelling pelo Sol e planetas; um rio de energia aponta para a Lua
 *   moon      8,2–12,2 Lua em crateras, Terra no céu, o Devorador se ergue
 *   mouth     12,2–17,2 a boca abre e o buraco negro nasce e cresce
 *   launch    17,2–20,8 arremesso e travessia Lua → Terra
 *   impact    20,8–24,8 sucção curta, pausa e UMA explosão em domo sobre a Terra
 *   return    24,8–26,0 a onda chega à arena; controle devolvido em 26,0
 *   strike    26,0–26,9 aviso no chão sob o herói; golpe CAPADO em 26,9 que o dash evita
 * O combate fica congelado durante o filme (nenhum segundo de jogo passa); a câmera do jogador é restaurada no fim.
 */
export const VERAXION_LUNAR_BUILD = '288-queda-do-devorador';
export const LU = { cosmos: 3.8, moon: 8.2, mouth: 12.2, launch: 17.2, impact: 20.8, silence: .25, ret: 24.8, control: 26.0, hit: 26.9, end: 27.4, dmg: 32, hitR: 4.2, skipTo: 24.8, triggerAt: .4 };
export function createLunarUltimate(opts = {}) {
  const T = { ...LU, ...(opts.T || {}) };
  const st = { t: 0, phase: 'idle', done: false, aborted: false, fired: {}, hitDone: false, strikeAt: null, skipped: false };
  const PH = [['boss', 0], ['cosmos', T.cosmos], ['moon', T.moon], ['mouth', T.mouth], ['launch', T.launch], ['impact', T.impact], ['return', T.ret], ['strike', T.control]];
  const api = {
    T, st, get done() { return st.done; }, get cinematic() { return !st.done && st.t < T.control; }, get holdBoss() { return !st.done; },
    start(hero) { Object.assign(st, { t: 0, phase: 'boss', done: false, aborted: false, fired: {}, hitDone: false, strikeAt: hero ? { x: hero.x, z: hero.z } : null, skipped: false }); return api; },
    skip() { if (st.done || st.t >= T.skipTo) return false; st.t = T.skipTo; st.skipped = true; for (const [n, a] of PH) if (a <= T.skipTo) st.fired[n] = true; st.phase = 'return'; return true; },
    abort() { if (!st.done) { st.aborted = true; st.done = true; st.phase = 'done'; } },
    /** ctx {hero:{x,z,iframes,alive}} → eventos. O aviso nasce sob o herói em 'control' e o golpe é um só. */
    step(dt, ctx) { const ev = []; if (st.done) return ev; const t0 = st.t; st.t += Math.min(dt, .1); const t = st.t, h = ctx.hero;
      for (const [n, a] of PH) if (!st.fired[n] && t >= a && (t0 < a || a === 0)) { st.fired[n] = true; st.phase = n; ev.push({ type: n, t }); }
      if (t >= T.control && !st.fired.warn) { st.fired.warn = true; st.strikeAt = { x: h.x, z: h.z }; ev.push({ type: 'warn', x: h.x, z: h.z, r: T.hitR, at: T.hit }); }
      if (t >= T.hit && !st.hitDone) { st.hitDone = true; const d = Math.hypot(h.x - st.strikeAt.x, h.z - st.strikeAt.z);
        if (h.alive !== false && d <= T.hitR) ev.push(h.iframes ? { type: 'dodge' } : { type: 'hit', dmg: T.dmg }); else ev.push({ type: 'miss' }); }
      if (t >= T.end) { st.done = true; st.phase = 'done'; ev.push({ type: 'end' }); }
      return ev; }
  };
  return api;
}
