/**
 * BISPO 4 (VÉRAXION) — SKILL 2: QUATRO VÓRTICES DO JUÍZO AZUL (lógica pura, determinística, sem WebGL).
 *
 *   aim       0–0,6     o bispo aponta a espada para o herói; aura ciano cresce (fica até o FIM do poder)
 *   draw      0,4–1,9   mandala horizontal desenhada sob p0 (posição do herói no INÍCIO; fica fixa no mundo)
 *   spawn     1,9–3,2   um tornado nasce em cada um dos quatro selos satélites (diagonais)
 *   approach  3,2–5,9   os quatro andam juntos, em arco, até perto de p0 (não seguem o herói); deixam fogo azul (7 s)
 *   merge     5,9–7,0   espiralam para o centro e se fundem num mega tornado ~3,5× maior (visual; hitbox limitado)
 *   mega      7,0–9,6   sucção forte com queda radial e teto; dash reduz a força
 *   implode   9,6–10,15 tudo é sugado para o núcleo e a coluna some
 *   silence   10,15–10,45 pausa quase vazia + micro-pulso de aviso no chão
 *   blast     10,45     UMA explosão azul (dano único, raio sinalizado)
 *   afterfire 10,45–14,55 campo de fogo azul residual; a aura some só no fim (14,95)
 * Riscos separados: sucção (não fere), contato com tornado (dano + queimadura), fogo (queimadura), explosão (dano único).
 * Queimadura: 3,7 s renovável, até 3 acúmulos (um novo acúmulo só a cada 0,9 s), um tick canônico a cada 0,95 s.
 */
export const VERAXION_CYCLONE_BUILD = '286-quatro-vortices-azuis';
export const CY = {
  aimEnd: .6, drawAt: .4, drawEnd: 1.9, spawnAt: 1.9, spawnStagger: .12, spawnDur: 1.0, spawnEnd: 3.2, approachAt: 3.2, approachEnd: 5.9, mergeEnd: 7.0, megaGrowAt: 6.0, megaGrowEnd: 7.2,
  megaEnd: 9.6, implodeEnd: 10.15, blastAt: 10.45, fireEnd: 14.35, end: 14.95,
  R: 12.5, satDist: 13.4, satR: 4.2, approachR: 3.2, edge: 2.2,
  tornR: 1.35, megaR: 2.9, heroR: .45, heroH: 1.8, tornH: 9, megaScale: 3.5,
  contactDmg: 4, megaDmg: 6, contactCd: .9, burnDur: 3.7, burnTick: .95, burnPerStack: 2, maxStacks: 3, stackWindow: .9,
  fireLife: 7, fireGap: .62, fireR: 1.05, afterFireR: 8.0, afterFireN: 24, afterLife: 4.1,
  blastR: 8.5, blastDmg: 20,
  pull: { infl: 12, max: 4.2, tangent: .32 }, megaPull: { infl: 24, max: 7.8, tangent: .22 }, dashMul: .18, pullCap: 7.8
};
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

/** centros dos quatro selos satélites (diagonais), dentro da arena */
export function satellites(p0, arena, T = CY) {
  return [0, 1, 2, 3].map(i => { const a = Math.PI / 4 + i * Math.PI / 2; let x = p0.x + Math.cos(a) * T.satDist, z = p0.z + Math.sin(a) * T.satDist;
    if (arena) { const dx = x - arena.x, dz = z - arena.z, d = Math.hypot(dx, dz), m = arena.r - T.edge; if (d > m) { /* puxa para dentro ao longo da diagonal até caber */ let k = 1; for (let s = 0; s < 40 && Math.hypot(p0.x + Math.cos(a) * T.satDist * k - arena.x, p0.z + Math.sin(a) * T.satDist * k - arena.z) > m; s++) k -= .025; x = p0.x + Math.cos(a) * T.satDist * Math.max(.35, k); z = p0.z + Math.sin(a) * T.satDist * Math.max(.35, k); } }
    return { i, x, z, a }; });
}

export function createBlueCyclone(opts = {}) {
  const T = { ...CY, ...(opts.T || {}) }, ground = opts.ground || (() => 0), dmgMul = opts.dmgMul || 1, blocked = opts.blocked || (() => false);
  const st = { phase: 'idle', t: 0, p0: null, sats: [], torn: [], mega: { scale: 0, alpha: 0, spin: 0 }, fires: [], burn: null, lastTouch: -9, lastStack: -9, blastDone: false, done: false, aborted: false, aura: 0, trauma: 0, kickT: 99, fid: 0, implode: 0, draw: 0 };
  const api = {
    T, st, get done() { return st.done; },
    get holdBoss() { return !st.done && st.phase !== 'idle' && !st.aborted; },
    /** boss {x,y,z,yaw}, hero {x,z}, arena {x,z,r} */
    start(boss, hero, arena) {
      const p0 = { x: hero.x, z: hero.z, y: ground(hero.x, hero.z) };
      Object.assign(st, { phase: 'aim', t: 0, p0, boss: { ...boss }, arena: arena || null, mega: { scale: 0, alpha: 0, spin: 0 }, fires: [], burn: null, lastTouch: -9, lastStack: -9, blastDone: false, done: false, aborted: false, aura: 0, trauma: 0, kickT: 99, fid: 0, implode: 0, draw: 0 });
      st.sats = satellites(p0, st.arena, T);
      st.torn = st.sats.map(s => ({ id: 'veraxion-vortice-' + s.i, i: s.i, x: s.x, z: s.z, y: ground(s.x, s.z), grow: 0, alpha: 0, scale: 1, lastFire: null, a0: s.a, r0: Math.hypot(s.x - p0.x, s.z - p0.z) }));
      return api;
    },
    abort() { if (st.done || st.phase === 'idle') return; st.aborted = true; st.burn = null; },
    /** força de sucção (velocidade m/s) no ponto; nunca soma os quatro, teto global; dash reduz */
    pullAt(x, z, dashing) {
      if (st.done || st.aborted || st.phase === 'idle') return null; let best = null, bm = 0; const P = T.pull;
      for (const o of st.torn) { const k = o.grow * o.alpha; if (k < .3) continue; const dx = o.x - x, dz = o.z - z, d = Math.hypot(dx, dz); if (d >= P.infl || d < 1e-3) continue;
        const m = P.max * k * Math.pow(1 - d / P.infl, 1.2); if (m > bm) { bm = m; best = [dx / d * m + (-dz / d) * m * P.tangent, dz / d * m + (dx / d) * m * P.tangent]; } }
      const M = st.mega, MP = T.megaPull; if (M.alpha > .05 && st.implode < 1) { const dx = st.p0.x - x, dz = st.p0.z - z, d = Math.hypot(dx, dz), k = M.alpha * clamp01(M.scale / T.megaScale) * (1 - st.implode);
        if (d < MP.infl && d > 1e-3) { const m = MP.max * k * Math.pow(1 - d / MP.infl, 1.55); if (m > bm) { bm = m; best = [dx / d * m + (-dz / d) * m * MP.tangent, dz / d * m + (dx / d) * m * MP.tangent]; } } }
      if (!best) return null; const l = Math.hypot(best[0], best[1]), cap = Math.min(T.pullCap, l) / (l || 1), dm = dashing ? T.dashMul : 1;
      return { x: best[0] * cap * dm, z: best[1] * cap * dm, mag: Math.min(T.pullCap, l) * dm };
    },
    /** ctx {hero:{x,y,z,iframes,alive}} → eventos (nenhum com empurrão) */
    step(dt, ctx) {
      const ev = []; if (st.done || st.phase === 'idle') return ev; const h = ctx.hero, t0 = st.t; st.t += dt; const t = st.t, cross = a => t0 < a && t >= a, p0 = st.p0;
      st.trauma = Math.max(0, st.trauma - dt / .7); st.kickT += dt;
      if (t0 === 0) ev.push({ type: 'aim' });
      st.aura = st.aborted ? Math.max(0, st.aura - dt * 2) : sm(t / T.aimEnd) * (1.15 + .1 * sm((t - T.approachAt) / 3)) * (1 - sm((t - T.fireEnd) / (T.end - T.fireEnd)));
      st.draw = sm((t - T.drawAt) / (T.drawEnd - T.drawAt));
      if (!st.aborted) {
        if (cross(T.drawAt)) { st.phase = 'draw'; ev.push({ type: 'draw', x: p0.x, y: p0.y, z: p0.z, r: T.R }); }
        if (cross(T.drawEnd)) ev.push({ type: 'drawn' });
        for (const o of st.torn) { const a = T.spawnAt + o.i * T.spawnStagger; if (cross(a)) { ev.push({ type: 'spawn', i: o.i, id: o.id, x: o.x, z: o.z }); if (o.i === 0) st.phase = 'spawn'; } o.grow = sm((t - a) / T.spawnDur); }
        if (cross(T.approachAt)) { st.phase = 'approach'; ev.push({ type: 'approach' }); }
        if (cross(T.approachEnd)) { st.phase = 'merge'; ev.push({ type: 'merge' }); st.trauma = Math.min(1, st.trauma + .25); st.kickT = 0; }
        if (cross(T.mergeEnd)) { st.phase = 'mega'; ev.push({ type: 'mega' }); }
        if (cross(T.megaEnd)) { st.phase = 'implode'; ev.push({ type: 'implode', x: p0.x, z: p0.z }); }
        if (cross(T.implodeEnd)) { st.phase = 'silence'; ev.push({ type: 'silence' }); }
        if (cross(T.blastAt)) { st.phase = 'afterfire'; st.trauma = 1; st.kickT = 0; ev.push({ type: 'blast', x: p0.x, y: p0.y, z: p0.z, r: T.blastR });
          if (!st.blastDone) { st.blastDone = true; const dh = Math.hypot(h.x - p0.x, h.z - p0.z), hy = (h.y ?? p0.y) - p0.y;
            if (h.alive !== false && dh <= T.blastR + T.heroR && hy < 6 && hy > -2) { if (h.iframes) ev.push({ type: 'blast_dodge' }); else ev.push({ type: 'blast_hit', dmg: Math.round(T.blastDmg * dmgMul) }); } }
          for (let k = 0; k < T.afterFireN; k++) { const a = k * 2.39996, r = T.afterFireR * Math.sqrt((k + .5) / T.afterFireN); const x = p0.x + Math.cos(a) * r, z = p0.z + Math.sin(a) * r; if (!blocked(x, z)) st.fires.push({ id: ++st.fid, x, z, y: ground(x, z), born: t, life: T.afterLife, r: T.fireR * 1.25, big: true }); }
          ev.push({ type: 'afterfire' }); }
        // posições dos tornados (centro p0 fixo no mundo)
        for (const o of st.torn) { let r = o.r0, a = o.a0, sc = 1, al = o.grow;
          if (t > T.approachAt) { const k = clamp01((t - T.approachAt) / (T.approachEnd - T.approachAt)), u = Math.pow(k, 1.55); r = o.r0 + (T.approachR - o.r0) * u; a = o.a0 + .85 * u; }
          if (t > T.approachEnd) { const k = clamp01((t - T.approachEnd) / (T.mergeEnd - T.approachEnd)), u = sm(k); r = T.approachR * (1 - u); a = o.a0 + .85 + 3.2 * u; sc = 1 - .55 * u; al = 1 - sm((k - .45) / .55); }
          o.x = p0.x + Math.cos(a) * r; o.z = p0.z + Math.sin(a) * r; o.y = ground(o.x, o.z); o.scale = sc; o.alpha = t > T.mergeEnd ? 0 : al;
          if (t > T.approachAt && o.alpha > .2 && (!o.lastFire || Math.hypot(o.x - o.lastFire[0], o.z - o.lastFire[1]) >= T.fireGap)) { o.lastFire = [o.x, o.z]; if (!blocked(o.x, o.z)) { st.fires.push({ id: ++st.fid, x: o.x, z: o.z, y: o.y, born: t, life: T.fireLife, r: T.fireR, big: false, src: o.i }); ev.push({ type: 'fire', i: o.i }); } } }
        const M = st.mega; M.scale = 1 + (T.megaScale - 1) * sm((t - T.megaGrowAt) / (T.megaGrowEnd - T.megaGrowAt)); M.alpha = sm((t - T.megaGrowAt) / .6) * (t < T.megaEnd ? 1 : 1 - sm((t - T.megaEnd) / (T.implodeEnd - T.megaEnd)));
        st.implode = sm((t - T.megaEnd) / (T.implodeEnd - T.megaEnd)); M.spin += dt * (2 + 4 * sm((t - T.mergeEnd) / 2.6));
        if (t > T.megaEnd - .4 && t < T.blastAt) st.trauma = Math.max(st.trauma, .12);
      }
      // fogo: perde dano no mesmo instante em que some
      for (let i = st.fires.length - 1; i >= 0; i--) if (t - st.fires[i].born > st.fires[i].life) st.fires.splice(i, 1);
      // contato: tornado (dano + queimadura) e fogo (queimadura). Um dano de contato por alvo a cada 0,9 s.
      if (!st.aborted && h.alive !== false) {
        const hy = (h.y ?? 0); let touchDmg = 0, burnSrc = false;
        for (const o of st.torn) { if (o.alpha * o.grow < .5) continue; const d = Math.hypot(h.x - o.x, h.z - o.z); if (d <= T.tornR * o.scale + T.heroR && hy - o.y < T.tornH * .8 && hy - o.y > -1) { touchDmg = Math.max(touchDmg, T.contactDmg); burnSrc = true; } }
        const M = st.mega; if (M.alpha > .5 && st.implode < .6) { const d = Math.hypot(h.x - p0.x, h.z - p0.z); if (d <= T.megaR * Math.min(1, M.scale / T.megaScale) + T.heroR && hy - p0.y < T.tornH * 2) { touchDmg = Math.max(touchDmg, T.megaDmg); burnSrc = true; } }
        for (const f of st.fires) { if (Math.hypot(h.x - f.x, h.z - f.z) <= f.r + T.heroR && hy - f.y < 1.6) { burnSrc = true; break; } }
        if (touchDmg && t - st.lastTouch >= T.contactCd && !h.iframes) { st.lastTouch = t; ev.push({ type: 'touch', dmg: Math.round(touchDmg * dmgMul) }); }
        if (burnSrc && !h.iframes) { if (!st.burn) { st.burn = { stacks: 1, left: T.burnDur, tickT: 0 }; st.lastStack = t; ev.push({ type: 'burn', stacks: 1, res: 'start' }); }
          else { st.burn.left = T.burnDur; if (t - st.lastStack >= T.stackWindow && st.burn.stacks < T.maxStacks) { st.burn.stacks++; st.lastStack = t; ev.push({ type: 'burn', stacks: st.burn.stacks, res: 'stack' }); } } }
      }
      const b = st.burn; if (b) { b.left -= dt; b.tickT += dt; if (b.tickT >= T.burnTick) { b.tickT -= T.burnTick; ev.push({ type: 'tick', dmg: Math.round(T.burnPerStack * b.stacks * dmgMul), stacks: b.stacks }); } if (b.left <= 0) { st.burn = null; ev.push({ type: 'burn_end' }); } }
      if (!st.done && (t >= T.end || (st.aborted && st.aura <= .01))) { st.done = true; st.phase = 'done'; st.fires.length = 0; st.burn = null; ev.push({ type: 'end', aborted: st.aborted }); }
      return ev;
    }
  };
  return api;
}
