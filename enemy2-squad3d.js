import { registerKind, registerSkill, E1, SKILLS } from './enemy1-squad3d.js';
/**
 * MOD 238 — Enemy2 ("Trindade"): espécie própria sobre a esquadra da Mod 237 (mesmo diretor, mesmas fichas e estudo
 * do alvo), com kit, ritmo e leitura de jogo diferentes do Enemy1. Lógica pura, 120 Hz, sem Three.js.
 *
 *  • Julgamento do Vórtice Abissal (vortex): portal horizontal ACIMA DA CABEÇA do Enemy2; dele sai UMA corrente contínua
 *    que faz TRÊS investidas sucessivas. Cada investida mira a posição prevista (limitada), avança com giro limitado,
 *    atravessa quem esquivou e só então se reorienta. Contato por varredura de cápsula, um dano por investida.
 *  • Trindade do Caos (trinity): EXATAMENTE três furacões nascem do chão; um pressiona a posição do alvo, os outros
 *    fecham os flancos esquerdo e direito, com velocidades próprias e separação mínima. Sucção leve e sinalizada,
 *    dano por contato com intervalo, nunca prende sem saída.
 *  • Colapso do Abismo (collapse): fissura no solo onde a fuga é provável → convergência com sucção leve → coluna que
 *    sobe → implode → onda de choque HORIZONTAL baixa, que pode ser saltada ou esquivada com dash.
 *  • Mini-chefe (e2boss): foice com fogo, combo de três cortes, finta, fúria aos 50% e a "Ceifa do Furacão": quando o
 *    combo acerta, um furacão sai da lâmina em linha reta (variação da Trindade, não um quarto poder).
 *
 * Alvos (CombatTarget) podem informar `air` (altura acima do chão) para o salto sobre a onda do Colapso.
 */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

const VORTEX = { min: 4, max: 18, cast: 1.15, release: .95, cd: 13, anim: 'attack', pose: 'channel', portal: 1.5, lift: 1.7, lunges: 3, aim: .42, speed: 15, turn: 1.5, lungeMax: 1.25, r: .7, dmg: 13, burst: .38, retract: .75, power: 18, lead: .35 };
const TRINITY = { min: 3.5, max: 15, cast: .95, release: .72, cd: 15, anim: 'attack', pose: 'slam', n: 3, rise: .9, hunt: 4.2, fade: .8, speeds: [3, 3.6, 3.6], core: .85, pullR: 3.6, pull: 1.1, dmg: 6, tick: .8, flank: 3.8, sep: 3.1 };
const COLLAPSE = { min: 3, max: 16, cast: 1, release: .62, cd: 12, anim: 'attack', pose: 'slam', r: 3.2, fissure: 1, gather: .7, erupt: .45, implode: .25, wave: .7, waveH: .45, waveW: .55, core: 14, waveDmg: 15, fade: 1.3, pull: .9, lead: .7 };
const COMMON2 = {
  ...E1.common, hp: 230, radius: .45, height: 1.9, poise: 18, flinch: 10, sight: 28, leash: 38,
  speed: { walk: 1.8, run: 3.8, strafe: 1.5, back: 2.2, turn: 9 },
  melee: { max: 2.6, reach: 2.5, arc: .3, windup: .38, hits: [.38, .72, 1.05], dur: 1.35, dmg: 8, cd: 2, knock: .5 },
  dash: { speed: 9, time: .3, cd: 2.8 },
  block: { chance: .26, dur: .75, cd: 2.4, cost: 22, reduce: .7 },
  dodge: { chance: .32, cd: 2.8 },
  counter: { ...E1.common.counter, chance: .22, cd: 9, power: 16 },
  decide: [.25, .38], gap: .8, kit: ['vortex', 'trinity', 'collapse'], interrupt: true,
  vortex: VORTEX, trinity: TRINITY, collapse: COLLAPSE
};
const BOSS2 = {
  ...COMMON2, hp: 620, radius: .6, height: 2.5, poise: 40, flinch: 99, boss: true, pref: [2.2, 3.2], phase2: .5, furyCd: .7, leash: 44,
  speed: { walk: 1.9, run: 4, strafe: 1.6, back: 2.3, turn: 8 },
  melee: { max: 3.5, reach: 3.4, arc: -.1, windup: .48, hits: [.46, .86, 1.24], dur: 1.75, dmg: 14, cd: 2.2, knock: 1.1 },
  block: { chance: .34, dur: .85, cd: 2.2, cost: 14, reduce: .78 },
  dodge: { chance: .34, cd: 2.6 },
  counter: { ...E1.common.counter, chance: .45, cd: 7, power: 24, r: .6 },
  gap: .6, reap: 'trinity', feint: 'collapse',
  vortex: { ...VORTEX, portal: 2.1, r: .95, dmg: 18, speed: 16.5, power: 26, cd: 11 },
  trinity: { ...TRINITY, core: 1.1, dmg: 8, speeds: [3.4, 4, 4], pullR: 4.2, cd: 13 },
  collapse: { ...COLLAPSE, r: 4.3, core: 18, waveDmg: 20, cd: 10 }
};
export const E2 = Object.freeze({ common: registerKind('e2', COMMON2), boss: registerKind('e2boss', BOSS2) });

const live = sq => sq.targets.filter(t => t.alive);
const enemyOf = (sq, s) => live(sq);
const lead = (t, k) => ({ x: t.x + clamp((t.vx || 0) * k, -3.5, 3.5), z: t.z + clamp((t.vz || 0) * k, -3.5, 3.5) });
const anyActive = (sq, type) => sq.spells.some(s => s.type === type && s.phase !== 'fade' && s.phase !== 'retract');

/* ---------- Julgamento do Vórtice Abissal ---------- */
registerSkill('vortex', {
  clash: true,
  score(sq, a, t, c) {
    if (anyActive(sq, 'vortex') || !c.see) return null;
    return .5 + (c.R === 'flanker' || c.R === 'ranged' ? .35 : 0) + (c.st.dist > 6 ? .2 : 0) + (Math.hypot(t.vx || 0, t.vz || 0) > 3 ? .15 : 0) + (t.casting && c.d > 6 ? .3 : 0) + (a.phase2 ? .2 : 0);
  },
  spawn(sq, a, t) {
    const T = a.T.vortex, py = a.y + a.T.height + T.lift;
    const s = { id: sq.nextId++, type: 'vortex', owner: a.id, kind: a.kind, T, tid: t.id, px: a.x, py, pz: a.z, x: a.x, y: py - .4, z: a.z, dx: Math.sin(a.yaw), dz: Math.cos(a.yaw), dy: -.2,
      r: T.r, speed: 0, power: T.power, t: 0, phase: 'open', lunge: 0, hit: false, path: [], why: null, hits: 0 };
    sq.spells.push(s); sq.event('vortex', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, owner = sq.actor(s.owner), t = sq.target(s.tid) || live(sq)[0];
    if (owner && owner.alive) { s.px = owner.x; s.pz = owner.z; s.py = owner.y + owner.T.height + T.lift; } // o portal acompanha quem conjura
    const rec = () => { const p = s.path; if (!p.length || Math.hypot(p[p.length - 1].x - s.x, p[p.length - 1].y - s.y, p[p.length - 1].z - s.z) > .25) { p.push({ x: s.x, y: s.y, z: s.z }); if (p.length > 64) p.shift(); } };
    if (s.phase === 'open') { // o portal se abre; a ponta da corrente desce do centro dele
      s.x = s.px; s.z = s.pz; s.y = s.py - .3 - smooth(s.t / .35) * .5; if (s.t >= .35) { s.phase = 'aim'; s.t = 0; } rec(); return;
    }
    if (s.phase === 'aim') { // recua um pouco e se reorienta para a posição prevista (giro limitado)
      if (t) { const p = lead(t, T.lead * (s.lunge + 1) * .6), gy = (t.y || 0) + 1, want = Math.atan2(p.x - s.x, p.z - s.z), cur = Math.atan2(s.dx, s.dz), turn = clamp(wrap(want - cur), -4 * dt, 4 * dt);
        s.dx = Math.sin(cur + turn); s.dz = Math.cos(cur + turn); const hd = Math.hypot(p.x - s.x, p.z - s.z) || 1; s.dy = clamp((gy - s.y) / hd, -.6, .4); }
      s.x -= s.dx * dt * 1.2; s.z -= s.dz * dt * 1.2; s.speed = 0;
      if (s.t >= T.aim) { s.phase = 'fly'; s.t = 0; s.hit = false; s.missed = false; sq.event('vortexLunge', { spell: s, n: s.lunge + 1 }); }
      rec(); return;
    }
    if (s.phase === 'fly') {
      s.speed = Math.min(T.speed, s.speed + T.speed * dt * 5);
      if (t && !s.missed) { // persegue com giro limitado; depois de passar do alvo (esquiva), não corrige mais nesta investida
        const rx = t.x - s.x, rz = t.z - s.z, ahead = rx * s.dx + rz * s.dz;
        if (ahead < -.5) s.missed = true;
        else { const want = Math.atan2(rx, rz), cur = Math.atan2(s.dx, s.dz), turn = clamp(wrap(want - cur), -T.turn * dt, T.turn * dt); s.dx = Math.sin(cur + turn); s.dz = Math.cos(cur + turn); s.dy += (clamp(((t.y || 0) + 1 - s.y) / Math.max(1, Math.hypot(rx, rz)), -.6, .4) - s.dy) * Math.min(1, dt * 3); }
      }
      const ax = s.x, az = s.z, step = s.speed * dt; s.x += s.dx * step; s.y += s.dy * step; s.z += s.dz * step; rec();
      const g = sq.ground(s.x, s.z);
      for (const tg of enemyOf(sq, s)) {
        const ex = s.x - ax, ez = s.z - az, l2 = ex * ex + ez * ez || 1, u = clamp(((tg.x - ax) * ex + (tg.z - az) * ez) / l2, 0, 1), cx = ax + ex * u, cz = az + ez * u;
        if (Math.hypot(tg.x - cx, tg.z - cz) > tg.radius + s.r || s.y < (tg.y || 0) - .3 || s.y > (tg.y || 0) + (tg.height || 1.8) + s.r) continue;
        if (tg.iframes) { if (!s.missed) { s.missed = true; sq.event('evaded', { spell: s, target: tg.id }); } continue; }
        const res = sq.damageTarget(tg.id, Math.round(T.dmg), { kind: 'vortex', spell: s.id, x: ax, z: az, knock: 1.2 });
        s.hits++; return impact(sq, s, 'hit', tg.id, res);
      }
      if (s.y < g + .25) return impact(sq, s, 'ground');
      if (sq.blocked(s.x, s.z)) return impact(sq, s, 'wall');
      if (s.t >= T.lungeMax) { s.phase = s.lunge >= T.lunges - 1 ? 'retract' : 'aim'; s.t = 0; s.lunge++; }
      return;
    }
    if (s.phase === 'burst') { if (s.t >= T.burst) { s.lunge++; s.phase = s.lunge >= T.lunges ? 'retract' : 'aim'; s.t = 0; } return; }
    if (s.phase === 'retract') { // a corrente volta para o portal e ele se fecha
      const k = Math.min(1, dt * 5); s.x += (s.px - s.x) * k; s.y += (s.py - s.y) * k; s.z += (s.pz - s.z) * k; if (s.path.length) s.path.shift();
      if (s.t >= T.retract) s.dead = true;
    }
  },
  danger(sq, s) { return s.phase === 'aim' && sq.target(s.tid) ? { x: sq.target(s.tid).x, z: sq.target(s.tid).z, r: 1.6, until: s.T.aim - s.t + .4 } : null; }
});
function impact(sq, s, why, tid, res) { s.phase = 'burst'; s.t = 0; s.why = why; s.speed = 0; sq.event('vortexImpact', { spell: s, why, target: tid, result: res, n: s.lunge + 1 }); }

/* ---------- Trindade do Caos ---------- */
registerSkill('trinity', {
  score(sq, a, t, c) {
    if (anyActive(sq, 'trinity')) return null;
    return .5 + (c.R === 'controller' ? .4 : 0) + Math.min(.3, c.st.dash * .45) + (c.d > 5 && c.d < 11 ? .15 : 0) + (sq.alive.length > 1 ? .1 : 0);
  },
  canReap(sq, a) { return !sq.spells.some(s => s.type === 'trinity' && s.owner === a.id); },
  spawn(sq, a, t, opts = {}) {
    const T = a.T.trinity, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fx, list = [];
    if (opts.reap) { // Ceifa do Furacão: um furacão sai da lâmina em linha reta
      list.push({ x: a.x + fx * 1.4, z: a.z + fz * 1.4, role: 'line', speed: 6.5, dx: fx, dz: fz });
    } else {
      // nascem entre o conjurador e o alvo; um pressiona, dois fecham as saídas pelos lados
      const bx = a.x + fx * 2.2, bz = a.z + fz * 2.2;
      list.push({ x: bx, z: bz, role: 'press', speed: T.speeds[0] }, { x: bx - rx * 3, z: bz - rz * 3, role: 'left', speed: T.speeds[1] }, { x: bx + rx * 3, z: bz + rz * 3, role: 'right', speed: T.speeds[2] });
    }
    const s = { id: sq.nextId++, type: 'trinity', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, phase: 'rise', reap: !!opts.reap,
      storms: list.map((p, i) => ({ ...p, y: sq.ground(p.x, p.z), i, h: 0, hitAt: {}, wob: sq.rand() * 6.28 })) };
    sq.spells.push(s); sq.event('trinity', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, t = sq.target(s.tid), dur = s.reap ? 2.6 : T.hunt;
    if (s.phase === 'rise') { for (const h of s.storms) h.h = smooth(s.t / T.rise); if (s.t >= T.rise) { s.phase = 'hunt'; s.t = 0; } return; }
    if (s.phase === 'hunt') {
      for (const h of s.storms) {
        let wx = 0, wz = 0;
        if (h.role === 'line') { wx = h.dx; wz = h.dz; }
        else if (t) {
          const fx = t.x - h.x, fz = t.z - h.z, d = Math.hypot(fx, fz) || 1, ux = fx / d, uz = fz / d;
          // flancos: miram 3,6 m ao lado do alvo (perpendicular à linha conjurador→alvo) e vão fechando com o tempo
          const o = sq.actor(s.owner), ox = o ? t.x - o.x : ux, oz = o ? t.z - o.z : uz, ol = Math.hypot(ox, oz) || 1, px = oz / ol, pz = -ox / ol;
          const close = 1 - smooth(s.t / (dur * .9)), side = h.role === 'left' ? -1 : h.role === 'right' ? 1 : 0;
          const gx = t.x + px * side * T.flank * close, gz = t.z + pz * side * T.flank * close, gdx = gx - h.x, gdz = gz - h.z, gl = Math.hypot(gdx, gdz) || 1;
          wx = gdx / gl; wz = gdz / gl;
        }
        // separação entre os três (nunca se amontoam num ponto)
        for (const o of s.storms) if (o !== h) { const dx = h.x - o.x, dz = h.z - o.z, d = Math.hypot(dx, dz); if (d < T.sep && d > 1e-4) { wx += dx / d * (T.sep - d); wz += dz / d * (T.sep - d); } }
        h.wob += dt * 2.2; const l = Math.hypot(wx, wz) || 1, sp = h.speed * (1 + .15 * Math.sin(h.wob));
        const nx = h.x + wx / l * sp * dt + Math.cos(h.wob) * dt * .4, nz = h.z + wz / l * sp * dt + Math.sin(h.wob) * dt * .4;
        if (!sq.blocked(nx, h.z)) h.x = nx; if (!sq.blocked(h.x, nz)) h.z = nz; h.y = sq.ground(h.x, h.z);
        for (const tg of live(sq)) {
          if (Math.hypot(tg.x - h.x, tg.z - h.z) > tg.radius + T.core || (tg.air || 0) > 2.2) continue;
          if (tg.iframes || (h.hitAt[tg.id] || -9) > sq.time - T.tick) continue;
          h.hitAt[tg.id] = sq.time; sq.damageTarget(tg.id, T.dmg, { kind: 'trinity', spell: s.id, x: h.x, z: h.z, knock: .4 }); sq.event('trinityHit', { spell: s, target: tg.id, storm: h.i });
        }
      }
      if (s.t >= dur) { s.phase = 'fade'; s.t = 0; sq.event('trinityEnd', { spell: s }); }
      return;
    }
    if (s.phase === 'fade') { for (const h of s.storms) h.h = 1 - smooth(s.t / T.fade); if (s.t >= T.fade) s.dead = true; }
  },
  /** Sucção leve: no máximo ~1 m/s somando os três, para longe a força some (dá para sair andando). */
  pull(sq, s, tg) {
    if (s.phase !== 'hunt') return null; let vx = 0, vz = 0;
    for (const h of s.storms) { const dx = h.x - tg.x, dz = h.z - tg.z, d = Math.hypot(dx, dz); if (d < s.T.pullR && d > .3) { const k = s.T.pull * (1 - d / s.T.pullR); vx += dx / d * k; vz += dz / d * k; } }
    return { x: vx, z: vz };
  },
  danger(sq, s) { return s.phase === 'fade' ? null : s.storms.map(h => ({ x: h.x, z: h.z, r: s.T.core + .9, until: 1 })); }
});

/* ---------- Colapso do Abismo ---------- */
registerSkill('collapse', {
  score(sq, a, t, c) {
    if (anyActive(sq, 'collapse')) return null;
    return .46 + (c.R === 'controller' ? .3 : 0) + (anyActive(sq, 'trinity') ? .35 : 0) + (c.still ? .25 : 0) + Math.min(.2, c.st.block * .4) + (a.phase2 ? .2 : 0);
  },
  spawn(sq, a, t) {
    const T = a.T.collapse; let p = lead(t, T.lead);
    // pressão territorial: com furacões em campo, a fissura vai para o lado oposto a eles (a rota de fuga provável)
    const tr = sq.spells.find(s => s.type === 'trinity' && s.phase === 'hunt');
    if (tr) { let cx = 0, cz = 0; for (const h of tr.storms) { cx += h.x; cz += h.z; } cx /= tr.storms.length; cz /= tr.storms.length; const dx = t.x - cx, dz = t.z - cz, d = Math.hypot(dx, dz) || 1; p = { x: t.x + dx / d * 1.6, z: t.z + dz / d * 1.6 }; }
    if (sq.blocked(p.x, p.z)) p = { x: t.x, z: t.z };
    const s = { id: sq.nextId++, type: 'collapse', owner: a.id, kind: a.kind, T, tid: t.id, x: p.x, z: p.z, y: sq.ground(p.x, p.z), r: T.r, t: 0, phase: 'fissure', front: 0, col: 0, hit: new Set(), waveHit: new Set() };
    sq.spells.push(s); sq.event('collapse', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, next = (p, d) => { if (s.t >= d) { s.phase = p; s.t -= d; sq.event('collapse_' + p, { spell: s }); } };
    if (s.phase === 'fissure') next('gather', T.fissure);
    else if (s.phase === 'gather') next('erupt', T.gather);
    else if (s.phase === 'erupt') {
      s.col = smooth(s.t / T.erupt);
      // a coluna que sobe acerta só quem ficou no centro (núcleo)
      for (const tg of live(sq)) { if (s.hit.has(tg.id) || tg.iframes) continue; if (Math.hypot(tg.x - s.x, tg.z - s.z) <= s.r * .45 + tg.radius * .5) { s.hit.add(tg.id); sq.damageTarget(tg.id, T.core, { kind: 'collapse', spell: s.id, x: s.x, z: s.z, knock: .6 }); } }
      next('implode', T.erupt);
    } else if (s.phase === 'implode') { s.col = 1 - smooth(s.t / T.implode) * .7; next('wave', T.implode); }
    else if (s.phase === 'wave') {
      const prev = s.front; s.front = .6 + (s.r * 2.3 - .6) * Math.min(1, s.t / T.wave);
      // onda HORIZONTAL baixa: quem a frente cruza toma dano, salvo se estiver no ar acima dela ou com i-frames
      for (const tg of live(sq)) {
        if (s.waveHit.has(tg.id)) continue; const d = Math.hypot(tg.x - s.x, tg.z - s.z);
        if (d < prev - T.waveW - tg.radius || d > s.front + tg.radius) continue;
        if ((tg.air || 0) > T.waveH) { if (!s.jumped) { s.jumped = true; sq.event('jumpedWave', { spell: s, target: tg.id }); } continue; }
        if (tg.iframes) continue;
        s.waveHit.add(tg.id); sq.damageTarget(tg.id, T.waveDmg, { kind: 'collapseWave', spell: s.id, x: s.x, z: s.z, knock: 1.4 });
      }
      next('fade', T.wave);
    } else if (s.phase === 'fade' && s.t >= T.fade) s.dead = true;
  },
  pull(sq, s, tg) {
    if (s.phase !== 'gather' && s.phase !== 'fissure') return null; const dx = s.x - tg.x, dz = s.z - tg.z, d = Math.hypot(dx, dz);
    if (d > s.r * 1.6 || d < .4) return null; const k = s.T.pull * (s.phase === 'gather' ? 1 : .35) * (1 - d / (s.r * 1.6)); return { x: dx / d * k, z: dz / d * k };
  },
  danger(sq, s) { return s.phase === 'fade' ? null : { x: s.x, z: s.z, r: s.phase === 'wave' ? s.front + .6 : s.r + .5, until: 1 }; }
});

/** Soma das sucções sobre um alvo (com teto), para o jogo aplicar ao herói/NPC. */
export function pullOn(sq, tg, cap = 1.6) {
  let x = 0, z = 0;
  for (const s of sq.spells) { const def = PULLERS[s.type]; if (!def) continue; const p = def(sq, s, tg); if (p) { x += p.x; z += p.z; } }
  const l = Math.hypot(x, z); if (l > cap) { x *= cap / l; z *= cap / l; } return { x, z };
}
const PULLERS = { trinity: (sq, s, t) => SKILLS.trinity.pull(sq, s, t), collapse: (sq, s, t) => SKILLS.collapse.pull(sq, s, t) };
