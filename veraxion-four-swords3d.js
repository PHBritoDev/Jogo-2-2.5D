/**
 * BISPO 4 (VÉRAXION) — SKILL 1: QUATRO SENTENÇAS DO ABISMO (lógica pura, testável, sem WebGL).
 *
 * Linha do tempo (segundos reais, dt variável; todos os eventos por limiar de tempo, não por quadro):
 *   aura      0–0,7   aura preta-rubra cresce (e sobe ~35% até o lançamento)
 *   raise     0,6     o bispo levanta AS DUAS mãos (pose 'raise2')
 *   manifest  1,1–2,25 quatro espadas surgem atrás/acima do bispo, cada uma por uma fenda rúnica (escalonadas 0,08 s)
 *   lock      2,1     quatro destinos DIFERENTES travados em volta do herói (um perto, três em arco assimétrico)
 *   release   2,55    o bispo abaixa as duas mãos e AS QUATRO PARTEM NO MESMO INSTANTE ('release_all4' uma vez)
 *   voo       curva Bezier com aceleração inicial; a ponta segue a tangente; colisão VARRIDA lâmina × cápsula do herói
 *   cravada   a espada freia e crava no chão (ou junto do herói atingido) → SUCÇÃO de energia (0,34 s) → explosão
 *   explosão  uma por espada, no próprio ponto; dano de área separado do dano da espada; uma vez cada
 *   fim       dissipação; o bispo é solto 0,45 s depois do lançamento
 * Nunca empurra o herói (nenhum evento carrega impulso); cada espada acerta no máximo uma vez, cada explosão uma vez.
 */
export const VERAXION_SWORDS_BUILD = '285-quatro-sentencas';
export const VX = {
  auraIn: .7, raiseAt: .6, manifestAt: 1.1, manifestEnd: 2.25, manifestStagger: .08, lockAt: 2.1, releaseAt: 2.55, holdAfter: .45,
  sizeMul: 2.0, implode: .34, blastLife: 2.1, dissolve: .9,
  speed0: 7, accel: 46, vmax: 36, lead: .3, leadCap: 2.2,
  swordDmg: 12, blastDmg: 16, blastR: 3.0, heroR: .45, heroH: 1.75, bladeR: .24, minSep: 6.0, edge: 2.6, nearOff: 0,
  ringR: [6.0, 7.4]
};
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;

/** distância entre dois segmentos 3D (Ericson, Real-Time Collision Detection §5.1.9) */
export function segSegDist(p1, q1, p2, q2) {
  const d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]], d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]], r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s, t; if (a < 1e-9 && e < 1e-9) { s = t = 0; } else if (a < 1e-9) { s = 0; t = clamp01(f / e); } else { const c = dot(d1, r); if (e < 1e-9) { t = 0; s = clamp01(-c / a); } else { const b = dot(d1, d2), den = a * e - b * b; s = den > 1e-9 ? clamp01((b * f - c * e) / den) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp01(-c / a); } else if (t > 1) { t = 1; s = clamp01((b - c) / a); } } }
  const c1 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], c2 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}
const bez = (P, s) => { const u = 1 - s, a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s; return [0, 1, 2].map(k => a * P[0][k] + b * P[1][k] + c * P[2][k] + d * P[3][k]); };
const bezT = (P, s) => { const u = 1 - s; const t = [0, 1, 2].map(k => 3 * u * u * (P[1][k] - P[0][k]) + 6 * u * s * (P[2][k] - P[1][k]) + 3 * s * s * (P[3][k] - P[2][k])); const l = Math.hypot(...t) || 1; return t.map(x => x / l); };
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** posições de "coroa" atrás/acima do bispo (frame local: f = frente, r = direita). Alturas e profundidades distintas. */
export function swordHomes(boss, L) {
  const f = [Math.sin(boss.yaw), Math.cos(boss.yaw)], r = [f[1], -f[0]], H = boss.h;
  const slots = [{ lat: -1, back: 1.05, up: .95, lean: -.2 }, { lat: -.36, back: 1.6, up: 1.28, lean: -.06 }, { lat: .36, back: 1.6, up: 1.2, lean: .06 }, { lat: 1, back: 1.05, up: .88, lean: .2 }];
  return slots.map((s, i) => { const lat = s.lat * (L * .62 + H * .35), back = s.back * H * .7;
    const x = boss.x + r[0] * lat - f[0] * back, z = boss.z + r[1] * lat - f[1] * back, tipY = boss.y + H * s.up;
    return { i, x, z, tipY, lean: s.lean, lat: s.lat }; });
}

/** quatro destinos travados: um perto do alvo, três em arco assimétrico; separados, dentro da arena, fora de obstáculos. */
export function pickTargets(aim, boss, arena, seed, opts = {}) {
  const T = { ...VX, ...opts }, rnd = (k => () => { k = (k * 16807) % 2147483647; return k / 2147483647; })(Math.max(1, Math.floor(seed * 1e6) % 2147483646 + 1));
  const dirB = Math.atan2(aim.x - boss.x, aim.z - boss.z), blocked = opts.blocked || (() => false);
  const inArena = (x, z) => !arena || Math.hypot(x - arena.x, z - arena.z) <= arena.r - T.edge;
  const clampA = (x, z) => { if (!arena) return [x, z]; const dx = x - arena.x, dz = z - arena.z, d = Math.hypot(dx, dz), m = arena.r - T.edge; return d <= m ? [x, z] : [arena.x + dx / d * m, arena.z + dz / d * m]; };
  const out = []; const near = clampA(aim.x - Math.sin(dirB) * T.nearOff, aim.z - Math.cos(dirB) * T.nearOff); out.push({ x: near[0], z: near[1] });
  const base = [1.3 + rnd() * .3, -1.75 - rnd() * .35, .25 + rnd() * .3]; /* esquerda, direita-trás e além do herói (triângulo assimétrico) */
  for (let k = 0; k < 3; k++) {
    let best = null;
    for (let tr = 0; tr < 24 && !best; tr++) { const a = dirB + base[k] + (tr ? (tr % 2 ? 1 : -1) * Math.ceil(tr / 2) * .22 : 0), rr = lerp(T.ringR[0], T.ringR[1], (k * .37 + rnd() * .5) % 1);
      let [x, z] = clampA(aim.x + Math.sin(a) * rr, aim.z + Math.cos(a) * rr);
      if (!inArena(x, z) && arena) continue; if (blocked(x, z)) continue;
      if (out.every(o => Math.hypot(o.x - x, o.z - z) >= T.minSep) && Math.hypot(x - boss.x, z - boss.z) > 3) best = { x, z }; }
    if (!best) { /* fallback determinístico: espiral em volta do alvo até achar espaço */
      for (let tr = 0; tr < 64 && !best; tr++) { const a = dirB + k * 2.1 + tr * .61, rr = T.minSep + (tr % 4) * .8; const [x, z] = clampA(aim.x + Math.sin(a) * rr, aim.z + Math.cos(a) * rr); if (!blocked(x, z) && out.every(o => Math.hypot(o.x - x, o.z - z) >= T.minSep * .92)) best = { x, z }; } }
    out.push(best || { x: aim.x + Math.sin(dirB + k * 2) * T.minSep, z: aim.z + Math.cos(dirB + k * 2) * T.minSep });
  }
  return out;
}

export function createFourSwords(opts = {}) {
  const T = { ...VX, ...(opts.T || {}) }, ground = opts.ground || (() => 0), dmgMul = opts.dmgMul || 1;
  const st = { phase: 'idle', t: 0, swords: [], targets: null, released: -1, done: false, aborted: false, aura: 0, trauma: 0, kickT: 99, L: 4, seed: opts.seed ?? .4137, boss: null, arena: null, releaseEv: 0 };
  const api = {
    T, st, get done() { return st.done; },
    get holdBoss() { return !st.done && st.phase !== 'idle' && !st.aborted && (st.released < 0 || st.t < st.released + T.holdAfter); },
    /** boss {x,y,z,yaw,h(altura visual real)}, arena {x,z,r} */
    start(boss, arena) {
      st.boss = { ...boss }; st.arena = arena || null; st.L = boss.h * T.sizeMul;
      const homes = swordHomes(st.boss, st.L);
      Object.assign(st, { phase: 'aura', t: 0, targets: null, released: -1, done: false, aborted: false, aura: 0, trauma: 0, kickT: 99, releaseEv: 0 });
      st.swords = homes.map(h => ({ id: 'veraxion-sentenca-' + h.i, i: h.i, home: h, state: 'hidden', reveal: 0, tip: [h.x, h.tipY, h.z], dir: [Math.sin(h.lean) * Math.cos(boss.yaw), -Math.cos(h.lean), -Math.sin(h.lean) * Math.sin(boss.yaw)], path: null, ft: 0, d: 0, len: 0, hit: false, stuckAt: null, it: 0, bt: 0, blastDone: false, kind: null }));
      for (const s of st.swords) s.dir = norm([s.home.lean * Math.cos(boss.yaw) * .6, -1, -s.home.lean * Math.sin(boss.yaw) * .6]); /* penduradas de ponta para baixo, inclinadas para fora */
      return api;
    },
    abort() { if (st.done || st.phase === 'idle') return; st.aborted = true; for (const s of st.swords) if (s.state !== 'blast' && s.state !== 'gone') s.state = 'gone'; },
    /** pose de uma espada para o VFX: ponta, direção, comprimento */
    pose(s) { return { tip: s.tip, dir: s.dir, L: st.L }; },
    /** ctx {hero:{x,y,z,vx,vz,iframes,alive}}. Eventos sem impulso: nunca há knockback. */
    step(dt, ctx) {
      const ev = []; if (st.done || st.phase === 'idle') return ev; const h = ctx.hero, t0 = st.t; st.t += dt; const t = st.t, cross = a => t0 < a && t >= a;
      st.trauma = Math.max(0, st.trauma - dt / .6); st.kickT += dt;
      if (t0 === 0) ev.push({ type: 'aura' });
      st.aura = st.aborted ? Math.max(0, st.aura - dt * 2) : st.released < 0 ? sm(t / T.auraIn) * (1 + .35 * sm((t - T.auraIn) / (T.releaseAt - T.auraIn))) : 1.35 * (1 - .6 * sm((t - st.released) / .9));
      if (!st.aborted) {
        if (cross(T.raiseAt)) { st.phase = 'raise'; ev.push({ type: 'raise' }); }
        for (const s of st.swords) { const a = T.manifestAt + s.i * T.manifestStagger, b = T.manifestEnd;
          if (cross(a)) { s.state = 'manifest'; ev.push({ type: 'manifest', i: s.i }); if (s.i === 0) st.phase = 'manifest'; }
          if (s.state === 'manifest' || s.state === 'aim') s.reveal = sm((t - a) / (b - a)); }
        if (cross(T.lockAt)) { const sp = Math.hypot(h.vx || 0, h.vz || 0), lead = Math.min(T.leadCap, sp * T.lead), aim = { x: h.x + (sp > .1 ? (h.vx / sp) * lead : 0), z: h.z + (sp > .1 ? (h.vz / sp) * lead : 0) };
          st.targets = pickTargets(aim, st.boss, st.arena, st.seed, { blocked: opts.blocked }).map((p, k) => ({ x: p.x, z: p.z, y: ground(p.x, p.z), i: k }));
          st.phase = 'lock'; ev.push({ type: 'lock', targets: st.targets.map(p => [p.x, p.y, p.z]) });
          /* espadas giram para apontar o destino (a mais próxima do herói pega o destino perto) */
          const order = [...st.swords].sort((a, b) => Math.hypot(a.home.x - aim.x, a.home.z - aim.z) - Math.hypot(b.home.x - aim.x, b.home.z - aim.z));
          const used = new Set(); order.forEach(s => { let bi = -1, bd = 1e9; st.targets.forEach((p, k) => { if (used.has(k)) return; const d = Math.hypot(p.x - s.home.x, p.z - s.home.z) + (k === 0 && s !== order[0] ? 1e6 : 0); if (d < bd) { bd = d; bi = k; } }); used.add(bi); s.target = st.targets[bi]; s.state = 'aim'; s.aimFrom = s.dir.slice(); }); }
        if (st.phase === 'lock') for (const s of st.swords) if (s.target) { const k = sm((t - T.lockAt) / (T.releaseAt - T.lockAt - .05)), want = norm([s.target.x - s.tip[0], s.target.y - s.tip[1] + st.L * .1, s.target.z - s.tip[2]]); s.dir = norm(s.aimFrom.map((x, q) => lerp(x, want[q], k * .55))); } /* inclina metade para o destino: aponta sem virar de ponta para a câmera */
        if (cross(T.releaseAt)) { st.released = t; st.phase = 'flight'; st.releaseEv++;
          for (const s of st.swords) { const P0 = s.tip.slice(), P3 = [s.target.x, s.target.y - st.L * .1, s.target.z], D = Math.hypot(P3[0] - P0[0], P3[1] - P0[1], P3[2] - P0[2]);
            const hz = norm([P3[0] - P0[0], 0, P3[2] - P0[2]]), fin = norm([hz[0] * .7, -1, hz[2] * .7]);
            s.path = [P0, P0.map((x, q) => x + s.dir[q] * D * .34 + (q === 1 ? D * .06 : 0)), P3.map((x, q) => x - fin[q] * D * .3), P3];
            let l = 0, pr = P0; for (let k = 1; k <= 24; k++) { const p = bez(s.path, k / 24); l += Math.hypot(p[0] - pr[0], p[1] - pr[1], p[2] - pr[2]); pr = p; } s.len = l; s.state = 'fly'; s.ft = 0; s.d = 0; ev.push({ type: 'release', i: s.i, t }); }
          ev.push({ type: 'release_all4', t, ids: st.swords.map(s => s.id) }); st.trauma = Math.min(1, st.trauma + .25); st.kickT = 0; }
      }
      // voo, colisão varrida, cravar, sucção e explosão
      const hb = [h.x, (h.y ?? ground(h.x, h.z)) + .15, h.z], ht = [h.x, (h.y ?? ground(h.x, h.z)) + T.heroH, h.z], bladeL = st.L * .74;
      for (const s of st.swords) {
        if (s.state === 'fly') { const d0 = s.d; s.ft += dt; const tt = s.ft; s.d = Math.min(s.len, T.speed0 * tt + .5 * T.accel * tt * tt, s.len); if (T.speed0 + T.accel * tt > T.vmax) { const tc = (T.vmax - T.speed0) / T.accel, dc = T.speed0 * tc + .5 * T.accel * tc * tc; s.d = Math.min(s.len, dc + T.vmax * (tt - tc)); }
          /* amostras numa grade FIXA de comprimento de arco (0,2 m): o resultado não depende do FPS */
          const grid = []; for (let g = Math.floor(d0 / .2 + 1e-9) * .2 + .2; g < s.d - 1e-9; g += .2) grid.push(g); grid.push(s.d); let stop = null;
          for (let k = 0; k < grid.length && !stop; k++) { const sd = grid[k], sp = clamp01(sd / s.len), tip = bez(s.path, sp), dir = bezT(s.path, Math.min(.999, sp));
            s.tip = tip; s.dir = dir;
            if (!s.hit && !h.iframes && h.alive !== false) { const back = [tip[0] - dir[0] * bladeL, tip[1] - dir[1] * bladeL, tip[2] - dir[2] * bladeL]; if (segSegDist(tip, back, hb, ht) <= T.heroR + T.bladeR) { s.hit = true; stop = 'hero'; } }
            if (!stop && (sp >= 1 || tip[1] <= ground(tip[0], tip[2]) - st.L * .1)) stop = 'ground'; }
          if (stop) { let x = s.tip[0], z = s.tip[2]; if (stop === 'hero') { /* crava logo depois do herói, seguindo a direção (sem empurrar) */ const dy = Math.max(.01, -s.dir[1]), down = (s.tip[1] - ground(x, z)) / dy; x += s.dir[0] * down; z += s.dir[2] * down; ev.push({ type: 'sword_hit', i: s.i, id: s.id, dmg: Math.round(T.swordDmg * dmgMul) }); }
            const y = ground(x, z); s.stuckAt = [x, y, z]; s.tip = [x, y - st.L * .1, z]; s.state = 'stuck'; s.it = 0; s.kind = stop; st.trauma = Math.min(1, st.trauma + .3); st.kickT = 0;
            ev.push({ type: 'stuck', i: s.i, id: s.id, kind: stop, x, y, z }); ev.push({ type: 'implode', i: s.i, id: s.id, x, y, z }); } }
        else if (s.state === 'stuck') { s.it += dt; if (s.it >= T.implode) { s.state = 'blast'; s.bt = 0; const [x, y, z] = s.stuckAt; st.trauma = Math.min(1, st.trauma + (st.swords.some(o => o !== s && o.state === 'blast') ? .35 : .8)); st.kickT = 0;
            ev.push({ type: 'explode', i: s.i, id: s.id, x, y, z, r: T.blastR, first: !st.swords.some(o => o !== s && (o.state === 'blast' || o.state === 'gone')) });
            if (!s.blastDone) { s.blastDone = true; const dh = Math.hypot(h.x - x, h.z - z), hy = (h.y ?? y) - y;
              if (h.alive !== false && dh <= T.blastR + T.heroR && hy < 4.5 && hy > -2) { if (h.iframes) ev.push({ type: 'blast_dodge', i: s.i }); else ev.push({ type: 'blast_hit', i: s.i, id: s.id, dmg: Math.round(T.blastDmg * dmgMul) }); } } } }
        else if (s.state === 'blast') { s.bt += dt; if (s.bt >= T.blastLife) { s.state = 'gone'; } }
      }
      if (st.phase === 'flight' && st.swords.every(s => s.state !== 'fly' && s.state !== 'aim')) { st.phase = 'detonate'; }
      if (st.phase === 'detonate' && st.swords.every(s => s.state === 'blast' || s.state === 'gone')) { st.phase = 'dissipate'; ev.push({ type: 'dissipate' }); }
      const fin = st.swords.every(s => s.state === 'gone' || s.state === 'hidden');
      if (!st.done && ((st.released >= 0 && fin) || (st.aborted && st.swords.every(s => s.state === 'gone') && st.aura <= .01))) { st.done = true; st.phase = 'done'; ev.push({ type: 'end', aborted: st.aborted }); }
      return ev;
    }
  };
  return api;
}
