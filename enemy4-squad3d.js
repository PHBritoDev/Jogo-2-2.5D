import { registerKind, registerSkill, E1 } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';
/**
 * MOD 246 — Enemy4 (Ato IV, perfil demon4) e Mini-chefe Enemy4 (perfil miniboss4), MESMO GLB (Enemy4.glb), o chefe maior,
 * mais resistente e com a Espada-Mandíbula. Lógica pura sobre a esquadra da Mod 237 (120 Hz, semente). Distinto do
 * mini-chefe 3 (e3boss). Todas as áreas de perigo são fixadas no telegraph e nunca re-apontadas depois.
 *
 *  • Erupção do Santuário Carmim (sanctum): marcas escalonadas por ~4 s em volta/à frente do alvo (Poisson disk, teto de
 *    marcas vivas → sempre há corredor seguro); cada uma: aviso → carga → PILAR (dano pelo volume, uma vez) → dissipa.
 *  • Constelação da Ruína (constellation): esferas em coroa atrás/acima; preparação e disparo UM A UM, mira recalculada
 *    no instante do disparo e travada; varredura contra herói/chão/obstáculo; detona no primeiro impacto (cúpula).
 *  • Perfurador do Abismo (drill): modo frontal (rajada em linha) ou subterrâneo (marcas sob posições previstas, fixas);
 *    escolha pelo movimento lateral observado, com chance de errar; teto de acertos por conjuração.
 *  • Mini-chefe — Jaula das Correntes e Mandíbula Abissal (cage): quando o alvo foge, correntes cravam num anel PARCIAL
 *    (duas rotas de fuga), lentidão de até 1,2 s em quem é atingido; depois a mordida gigante telegrafada no ponto travado.
 */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const live = sq => sq.targets.filter(t => t.alive);
const lead = (t, k, cap) => ({ x: t.x + clamp((t.vx || 0) * k, -cap, cap), z: t.z + clamp((t.vz || 0) * k, -cap, cap) });
const anyActive = (sq, type) => sq.spells.some(s => s.type === type && !s.dead && s.phase !== 'fade');
const channeling = (sq, s) => { const o = sq.actor(s.owner); return !!(o && o.alive && o.act && o.act.type === 'cast' && o.act.spellId === s.id); };
const varied = (a, id) => a.lastSkill === id ? -.35 : 0;

export const SANCTUM = { min: 0, max: 18, cast: .95, release: .55, cd: 15, anim: 'cast', n: 12, dur: 4, warn: 1, charge: .3, pillar: .45, fade: .55, r: .95, dmg: 12, sep: 1.9, maxLive: 4, ring: [1.4, 5.4], lead: .4, grace: .8, H: 6 };
export const CONSTELLATION = { min: 4, max: 20, cast: 2.9, release: .3, cd: 14, anim: 'cast', channel: true, n: 7, prep: .7, cadence: .26, speed: 15, r: .38, life: 2.4, R: 1.7, dmg: 14, edge: 7, lead: .25, spread: 3.2 };
export const DRILL = { min: 3, max: 16, cast: 1.95, release: .35, cd: 12, anim: 'cast', channel: true, fire: 1.6, rate: 4, speed: 17, r: .32, life: 1.5, dmg: 6, maxHits: 3, warn: .65, active: .3, retract: .35, ur: .8, lead: .55 };
export const CAGE = { min: 4.5, max: 18, cast: 2.6, release: .4, cd: 17, anim: 'cast', channel: true, chains: 8, ring: 3.4, dive: .45, stagger: .07, chainR: .62, slow: 1.2, chainDmg: 5, biteAt: 1.1, warn: 1, snap: .14, biteR: 2.3, biteDmg: 24, fade: .8 };

const COMMON4 = {
  ...E1.common, hp: 260, radius: .46, height: 2, poise: 22, flinch: 11, sight: 30, leash: 40,
  speed: { walk: 1.8, run: 3.9, strafe: 1.65, back: 2.2, turn: 9 },
  // Enemy4.glb 'Attack' (2,8 s), corte ~1,3 s no clipe → acelerado para casar com a janela de 0,6 s
  melee: { max: 2.6, reach: 2.5, arc: .3, windup: .5, hits: [.6], dur: 1.25, dmg: 11, cd: 1.8, knock: .6, animSpeed: 2.2 },
  dash: { speed: 9, time: .32, cd: 2.8 }, block: { chance: .24, dur: .8, cd: 2.4, cost: 22, reduce: .7 }, dodge: { chance: .34, cd: 2.8 },
  counter: { ...E1.common.counter, chance: 0, cd: 99 },
  decide: [.24, .36], gap: .8, spellGap: 3.2, maxBig: 2, kit: ['sanctum', 'constellation', 'drill'],
  sanctum: SANCTUM, constellation: CONSTELLATION, drill: DRILL
};
const BOSS4 = {
  ...COMMON4, hp: 760, radius: .62, height: 2.6, poise: 50, flinch: 99, boss: true, pref: [2, 2.9], phase2: .45, furyCd: .7, leash: 46,
  speed: { walk: 2, run: 4.3, strafe: 1.85, back: 2.4, turn: 8 },
  melee: { max: 2.9, reach: 3.1, arc: -.1, windup: .55, hits: [.55], dur: 1.4, dmg: 14, cd: 2.1, knock: 1.1 },
  block: { chance: .34, dur: .85, cd: 2.2, cost: 14, reduce: .78 }, dodge: { chance: .36, cd: 2.5 },
  gap: .6, spellGap: 2.6, kit: ['sanctum', 'constellation', 'drill', 'cage'],
  sanctum: { ...SANCTUM, n: 20, warn: .9, maxLive: 6, r: 1.1, dmg: 15, sep: 2.1, cd: 13 },
  constellation: { ...CONSTELLATION, n: 12, cast: 3.7, cadence: .22, r: .45, R: 2.1, dmg: 17, edge: 8, spread: 4.4, cd: 12 },
  drill: { ...DRILL, rate: 6, r: .4, dmg: 7, maxHits: 4, ur: .9, cd: 10 },
  cage: CAGE
};
export const E4 = Object.freeze({ common: registerKind('e4', COMMON4), boss: registerKind('e4boss', BOSS4) });

/* Espada-Mandíbula: golpes pesados nativos (assador de IK da Mod 244), contato só pela trajetória da lâmina. */
BOSS_MOVES.e4boss = [
  { id: 'Mandibula_Varredura', label: 'Varredura da Mandíbula', patterns: ['reverse', 'diagonal'], hits: [.62, 1.12], duration: 1.85, advance: .8, heavy: true },
  { id: 'Mandibula_Estocada', label: 'Estocada Voraz', patterns: ['thrust'], hits: [.72], duration: 1.5, advance: 2.3, range: [2.4, 4.8], score: 1, cd: 7 },
  { id: 'Mandibula_Queda', label: 'Queda da Mandíbula', patterns: ['overhead'], hits: [1.12], duration: 2.2, advance: 1.2, jump: .8, heavy: true }
];
for (const m of BOSS_MOVES.e4boss) { m.kind = 'e4boss'; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = m.jump ? 1.35 : m.range ? 1.15 : 1.05; }

/* ---------- Skill 1 — Erupção do Santuário Carmim ---------- */
registerSkill('sanctum', {
  score(sq, a, t, c) { if (anyActive(sq, 'sanctum')) return null; return .52 + (c.R === 'controller' ? .35 : 0) + (c.still ? .2 : .1) + Math.min(.3, c.st.dash * .4) + (a.phase2 ? .2 : 0) + varied(a, 'sanctum'); },
  spawn(sq, a, t) {
    const T = a.T.sanctum; a.lastSkill = 'sanctum';
    const s = { id: sq.nextId++, type: 'sanctum', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, phase: 'run', marks: [], placed: 0, mn: 0, lastAim: -9, cx: a.x, cz: a.z };
    sq.spells.push(s); sq.event('sanctum', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, t = sq.target(s.tid) || live(sq)[0];
    for (let i = s.marks.length - 1; i >= 0; i--) stepMark(sq, s, s.marks[i], dt, i);
    if (s.phase === 'run') {
      const per = T.dur / T.n; while (s.placed < T.n && s.t >= s.placed * per) { s.placed++; if (t) placeMark(sq, s, t); }
      if (s.placed >= T.n) s.phase = 'fade';
    } else if (!s.marks.length) s.dead = true;
  },
  danger(sq, s) { return s.marks.filter(m => m.phase === 'warn' || m.phase === 'charge').map(m => ({ x: m.x, z: m.z, r: m.r + .5, until: m.warn + m.charge - m.t })); }
});
function placeMark(sq, s, t) {
  const T = s.T, hot = s.marks.filter(m => m.phase !== 'fade');
  if (hot.length >= T.maxLive) return null;
  const cands = [], p = lead(t, T.lead, 2.5);
  if (sq.time - s.lastAim > T.grace && !hot.some(m => m.aim)) cands.push({ x: p.x + (sq.rand() - .5) * .7, z: p.z + (sq.rand() - .5) * .7, aim: true });
  for (let i = 0; i < 7; i++) { const a = sq.rand() * Math.PI * 2, d = T.ring[0] + sq.rand() * (T.ring[1] - T.ring[0]); cands.push({ x: p.x + Math.sin(a) * d, z: p.z + Math.cos(a) * d }); }
  for (const c of cands) {
    if (sq.blocked(c.x, c.z) || hot.some(m => Math.hypot(m.x - c.x, m.z - c.z) < T.sep)) continue;
    const m = { id: ++s.mn, x: c.x, z: c.z, y: sq.ground(c.x, c.z), r: T.r, warn: T.warn, charge: T.charge, t: 0, phase: 'warn', aim: !!c.aim, seed: sq.rand() * 100, hit: new Set() };
    if (m.aim) s.lastAim = sq.time; s.marks.push(m); sq.event('sanctumMark', { spell: s, mark: m }); return m;
  }
  return null;
}
function stepMark(sq, s, m, dt, i) {
  const T = s.T; m.t += dt;
  if (m.phase === 'warn' && m.t >= m.warn) { m.phase = 'charge'; m.t = 0; }
  else if (m.phase === 'charge' && m.t >= m.charge) { m.phase = 'pillar'; m.t = 0; sq.event('sanctumPillar', { spell: s, mark: m }); }
  else if (m.phase === 'pillar') {
    for (const tg of live(sq)) { // dano pelo volume do pilar (cilindro), uma vez por pilar e alvo
      if (m.hit.has(tg.id) || Math.hypot(tg.x - m.x, tg.z - m.z) > m.r + tg.radius * .5 || (tg.y || 0) - m.y > T.H) continue;
      if (tg.iframes) continue; m.hit.add(tg.id); sq.damageTarget(tg.id, T.dmg, { kind: 'sanctum', spell: s.id, x: m.x, z: m.z, knock: .7 });
    }
    if (m.t >= T.pillar) { m.phase = 'fade'; m.t = 0; }
  } else if (m.phase === 'fade' && m.t >= T.fade) s.marks.splice(i, 1);
}

/* ---------- Skill 2 — Constelação da Ruína ---------- */
registerSkill('constellation', {
  clash: false,
  score(sq, a, t, c) { if (anyActive(sq, 'constellation') || !c.see) return null; return .5 + (c.R === 'ranged' || c.R === 'flanker' ? .35 : 0) + (c.d > 7 ? .2 : 0) + (c.still ? .2 : 0) + varied(a, 'constellation'); },
  spawn(sq, a, t) {
    const T = a.T.constellation, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fx; a.lastSkill = 'constellation';
    const orbs = []; for (let i = 0; i < T.n; i++) { const u = T.n > 1 ? i / (T.n - 1) * 2 - 1 : 0, ring = a.kind === 'e4boss' && i % 2 ? .75 : 1;
      orbs.push({ i, x: a.x + rx * u * T.spread * ring - fx * (.8 + (1 - ring) * 1.2), y: a.y + 3 + (1 - u * u) * 1.7 * ring + (1 - ring) * 1.1, z: a.z + rz * u * T.spread * ring - fz * (.8 + (1 - ring) * 1.2), state: 'hold', g: 0, dx: 0, dy: 0, dz: 0, t: 0, why: null, seed: sq.rand() * 100 }); }
    // ordem de disparo: do centro para as pontas, alternando os lados
    const order = orbs.map(o => o.i).sort((p, q) => Math.abs(p - (T.n - 1) / 2) - Math.abs(q - (T.n - 1) / 2) || p - q);
    const s = { id: sq.nextId++, type: 'constellation', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, phase: 'prep', orbs, order, fired: 0, hit: new Set() };
    sq.spells.push(s); sq.event('constellation', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, t = sq.target(s.tid) || live(sq)[0], alive = channeling(sq, s);
    for (const o of s.orbs) stepOrb(sq, s, o, dt);
    if (s.phase === 'prep') { for (const o of s.orbs) o.g = smooth(s.t / T.prep); if (!alive && s.t > .05) return collapse(sq, s); if (s.t >= T.prep) { s.phase = 'fire'; s.t = 0; } return; }
    if (s.phase === 'fire') {
      if (!alive) return collapse(sq, s);
      while (s.fired < s.orbs.length && s.t >= s.fired * T.cadence) { const o = s.orbs[s.order[s.fired++]]; if (t) fireOrb(sq, s, o, t); else o.state = 'gone'; }
      if (s.fired >= s.orbs.length) s.phase = 'wait';
      return;
    }
    if (s.orbs.every(o => o.state === 'gone')) s.dead = true;
  },
  danger(sq, s) { return s.orbs.filter(o => o.state === 'boom' && o.t < .1).map(o => ({ x: o.x, z: o.z, r: s.T.R + .5, until: .2 })); }
});
function collapse(sq, s) { s.phase = 'wait'; for (const o of s.orbs) if (o.state === 'hold') { o.state = 'fizzle'; o.t = 0; } sq.event('constellationEnd', { spell: s, why: 'interrupt' }); }
function fireOrb(sq, s, o, t) {
  const T = s.T, p = lead(t, T.lead, 2), gy = (t.y || 0) + .9, dx = p.x - o.x, dy = gy - o.y, dz = p.z - o.z, l = Math.hypot(dx, dy, dz) || 1;
  o.dx = dx / l; o.dy = dy / l; o.dz = dz / l; o.state = 'fly'; o.t = 0; sq.event('orbShot', { spell: s, orb: o }); // direção travada no disparo
}
function stepOrb(sq, s, o, dt) {
  const T = s.T; o.t += dt;
  if (o.state === 'fly') {
    const ax = o.x, ay = o.y, az = o.z, st = T.speed * dt; o.x += o.dx * st; o.y += o.dy * st; o.z += o.dz * st;
    for (const tg of live(sq)) {
      const ex = o.x - ax, ez = o.z - az, l2 = ex * ex + ez * ez || 1, u = clamp(((tg.x - ax) * ex + (tg.z - az) * ez) / l2, 0, 1), cx = ax + ex * u, cz = az + ez * u, cy = ay + (o.y - ay) * u;
      if (Math.hypot(tg.x - cx, tg.z - cz) > tg.radius + T.r || cy < (tg.y || 0) - T.r || cy > (tg.y || 0) + (tg.height || 1.8) + T.r) continue;
      if (tg.iframes) { if (!o.evaded) { o.evaded = true; sq.event('evaded', { spell: s, target: tg.id }); } continue; }
      o.x = cx; o.y = cy; o.z = cz; return boom(sq, s, o, 'hit');
    }
    const g = sq.ground(o.x, o.z); if (o.y - g < T.r * .6) { o.y = g + .1; return boom(sq, s, o, 'ground'); }
    if (sq.blocked(o.x, o.z)) { o.x = ax; o.z = az; return boom(sq, s, o, 'wall'); }
    if (o.t >= T.life) { o.state = 'fizzle'; o.t = 0; }
  } else if (o.state === 'boom' && o.t >= .75) { o.state = 'gone'; o.t = 0; }
  else if (o.state === 'fizzle' && o.t >= .35) o.state = 'gone';
}
function boom(sq, s, o, why) {
  const T = s.T; o.state = 'boom'; o.t = 0; o.why = why;
  for (const tg of live(sq)) { // cúpula: uma vez por esfera e alvo, queda pela distância
    const d = Math.hypot(tg.x - o.x, tg.z - o.z) - tg.radius * .5; if (d > T.R || Math.abs((tg.y || 0) + .9 - o.y) > T.R + .9 || tg.iframes) continue;
    const k = clamp(Math.max(0, d) / T.R, 0, 1); sq.damageTarget(tg.id, Math.round(T.dmg - (T.dmg - T.edge) * k), { kind: 'constellation', spell: s.id, x: o.x, z: o.z, knock: .8 });
  }
  sq.event('orbBoom', { spell: s, orb: o, why });
}

/* ---------- Skill 3 — Perfurador do Abismo ---------- */
registerSkill('drill', {
  score(sq, a, t, c) { if (anyActive(sq, 'drill') || !c.see) return null; return .5 + (c.R === 'aggressor' || c.R === 'flanker' ? .25 : 0) + (c.recovering ? .25 : 0) + (c.justDashed ? .2 : 0) + varied(a, 'drill'); },
  spawn(sq, a, t) {
    const T = a.T.drill; a.lastSkill = 'drill';
    // modo pela leitura do movimento OBSERVADO (sem ler comando): alvo cruzando de lado → subterrâneo; senão, frontal
    const dx = t.x - a.x, dz = t.z - a.z, l = Math.hypot(dx, dz) || 1, lat = Math.abs(((t.vx || 0) * dz - (t.vz || 0) * dx) / l);
    const mode = (lat > 2.2 ? sq.rand() < .75 : sq.rand() < .25) ? 'under' : 'front';
    const s = { id: sq.nextId++, type: 'drill', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, phase: 'fire', mode, shots: 0, drills: [], hits: 0, dn: 0 };
    sq.spells.push(s); sq.event('drill', { spell: s, actor: a, mode }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, t = sq.target(s.tid) || live(sq)[0], o = sq.actor(s.owner);
    for (let i = s.drills.length - 1; i >= 0; i--) stepDrill(sq, s, s.drills[i], dt, i);
    if (s.phase === 'fire') {
      if (!channeling(sq, s)) { s.phase = 'wait'; sq.event('drillEnd', { spell: s, why: 'interrupt' }); return; }
      while (s.shots < Math.floor(T.fire * T.rate) && s.t >= s.shots / T.rate) { s.shots++; if (t && o) spawnDrill(sq, s, o, t); }
      if (s.t >= T.fire) s.phase = 'wait';
      return;
    }
    if (!s.drills.length) s.dead = true;
  },
  danger(sq, s) { return s.drills.filter(d => d.under && d.phase === 'warn').map(d => ({ x: d.x, z: d.z, r: s.T.ur + .5, until: s.T.warn - d.t })); }
});
function spawnDrill(sq, s, o, t) {
  const T = s.T;
  if (s.mode === 'front') { const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw), x = o.x + fx * (o.T.radius + .6), z = o.z + fz * (o.T.radius + .6), y = o.y + o.T.height * .55, p = lead(t, .2, 1.5), dx = p.x - x, dy = (t.y || 0) + .9 - y, dz = p.z - z, l = Math.hypot(dx, dy, dz) || 1;
    s.drills.push({ id: ++s.dn, under: false, x, y, z, dx: dx / l, dy: dy / l, dz: dz / l, t: 0, phase: 'fly' }); sq.event('drillShot', { spell: s }); }
  else { const p = lead(t, T.lead, 3), x = p.x + (sq.rand() - .5) * .6, z = p.z + (sq.rand() - .5) * .6; if (sq.blocked(x, z)) return;
    s.drills.push({ id: ++s.dn, under: true, x, z, y: sq.ground(x, z), t: 0, phase: 'warn', hit: false }); sq.event('drillMark', { spell: s }); }
}
function stepDrill(sq, s, d, dt, i) {
  const T = s.T; d.t += dt;
  if (d.under) {
    if (d.phase === 'warn' && d.t >= T.warn) { d.phase = 'active'; d.t = 0; sq.event('drillErupt', { spell: s, drill: d }); }
    else if (d.phase === 'active') {
      for (const tg of live(sq)) { if (d.hit || s.hits >= T.maxHits || tg.iframes || (tg.air || 0) > 2.5 || Math.hypot(tg.x - d.x, tg.z - d.z) > T.ur + tg.radius * .5) continue;
        d.hit = true; s.hits++; sq.damageTarget(tg.id, T.dmg, { kind: 'drill', spell: s.id, x: d.x, z: d.z, knock: .5 }); }
      if (d.t >= T.active) { d.phase = 'retract'; d.t = 0; }
    } else if (d.phase === 'retract' && d.t >= T.retract) s.drills.splice(i, 1);
    return;
  }
  if (d.phase === 'fly') {
    const ax = d.x, ay = d.y, az = d.z, st = T.speed * dt; d.x += d.dx * st; d.y += d.dy * st; d.z += d.dz * st;
    for (const tg of live(sq)) {
      const ex = d.x - ax, ez = d.z - az, l2 = ex * ex + ez * ez || 1, u = clamp(((tg.x - ax) * ex + (tg.z - az) * ez) / l2, 0, 1), cx = ax + ex * u, cz = az + ez * u, cy = ay + (d.y - ay) * u;
      if (Math.hypot(tg.x - cx, tg.z - cz) > tg.radius + T.r || cy < (tg.y || 0) - .2 || cy > (tg.y || 0) + (tg.height || 1.8) + .2) continue;
      if (tg.iframes) continue; d.x = cx; d.y = cy; d.z = cz; d.phase = 'burst'; d.t = 0;
      if (s.hits < T.maxHits) { s.hits++; sq.damageTarget(tg.id, T.dmg, { kind: 'drill', spell: s.id, x: ax, z: az, knock: .45 }); }
      sq.event('drillHit', { spell: s, drill: d, why: 'hit' }); return;
    }
    const g = sq.ground(d.x, d.z); if (d.y < g + .1 || sq.blocked(d.x, d.z)) { d.y = Math.max(d.y, g); d.phase = 'burst'; d.t = 0; sq.event('drillHit', { spell: s, drill: d, why: 'ground' }); return; }
    if (d.t >= T.life) { d.phase = 'burst'; d.t = 0; }
  } else if (d.phase === 'burst' && d.t >= .3) s.drills.splice(i, 1);
}

/* ---------- Skill 4 (mini-chefe) — Jaula das Correntes e Mandíbula Abissal ---------- */
registerSkill('cage', {
  score(sq, a, t, c) {
    if (anyActive(sq, 'cage') || !c.see) return null; const dx = t.x - a.x, dz = t.z - a.z, l = Math.hypot(dx, dz) || 1, away = ((t.vx || 0) * dx + (t.vz || 0) * dz) / l;
    return away > 1 || c.d > 7 ? .95 + (a.phase2 ? .2 : 0) + varied(a, 'cage') : null; // quando o alvo foge ou se afasta demais
  },
  spawn(sq, a, t) {
    const T = a.T.cage, p = lead(t, .35, 2), gapA = sq.rand() * Math.PI * 2, gapB = gapA + Math.PI * (.8 + sq.rand() * .4), chains = [];
    a.lastSkill = 'cage'; const half = .62, arcs = [[gapA, gapB], [gapB, gapA + Math.PI * 2]];
    // duas rotas de fuga SEMPRE abertas (setores de ±0,62 rad nos dois vãos); as correntes se dividem pelos dois arcos
    arcs.forEach(([a0, a1], arc) => { const n = arc ? T.chains - Math.ceil(T.chains / 2) : Math.ceil(T.chains / 2), lo = a0 + half, hi = a1 - half;
      for (let q = 0; q < n; q++) { const ang = lo + (hi - lo) * (n > 1 ? q / (n - 1) : .5), x = p.x + Math.sin(ang) * T.ring, z = p.z + Math.cos(ang) * T.ring; chains.push({ i: chains.length, ang, x, z, y: sq.ground(x, z), delay: chains.length * T.stagger, k: 0, landed: false }); } });
    const s = { id: sq.nextId++, type: 'cage', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, phase: 'chains', cx: p.x, cz: p.z, gaps: [gapA, gapB], chains, slowed: new Set(), bx: 0, bz: 0, bitten: new Set(), ox: a.x, oy: a.y + a.T.height * .8, oz: a.z };
    sq.spells.push(s); sq.event('cage', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, o = sq.actor(s.owner), t = sq.target(s.tid) || live(sq)[0];
    if (o) { s.ox = o.x; s.oy = o.y + o.T.height * .8; s.oz = o.z; }
    for (const c of s.chains) { const k = clamp((s.t - c.delay) / T.dive, 0, 1); c.k = k;
      if (k >= 1 && !c.landed) { c.landed = true; sq.event('chainLand', { spell: s, chain: c });
        for (const tg of live(sq)) if (!s.slowed.has(tg.id) && !tg.iframes && Math.hypot(tg.x - c.x, tg.z - c.z) < T.chainR + tg.radius) { s.slowed.add(tg.id); sq.damageTarget(tg.id, T.chainDmg, { kind: 'cageChain', spell: s.id, x: c.x, z: c.z, slow: T.slow }); } } }
    if (s.phase === 'chains') {
      if (!channeling(sq, s)) { s.phase = 'fade'; s.t = 0; sq.event('cageEnd', { spell: s, why: 'interrupt' }); return; }
      if (s.t >= T.biteAt) { const p = t ? lead(t, .3, 1.5) : { x: s.cx, z: s.cz }; s.bx = p.x; s.bz = p.z; s.by = sq.ground(p.x, p.z); s.phase = 'bite'; s.bt = 0; sq.event('biteWarn', { spell: s }); } // ponto TRAVADO
      return;
    }
    if (s.phase === 'bite') {
      s.bt += dt;
      if (!s.snapped && s.bt >= T.warn) { s.snapped = true; sq.event('biteSnap', { spell: s }); if (o && o.alive) { o.airV = 5.2; o.airY = Math.max(o.airY || 0, .01); }
        for (const tg of live(sq)) { if (s.bitten.has(tg.id) || tg.iframes || (tg.air || 0) > 2.2 || Math.hypot(tg.x - s.bx, tg.z - s.bz) > T.biteR + tg.radius * .5) continue; s.bitten.add(tg.id); sq.damageTarget(tg.id, T.biteDmg, { kind: 'bite', spell: s.id, x: s.bx, z: s.bz, knock: 1.4 }); } }
      if (s.bt >= T.warn + T.snap + .2) { s.phase = 'fade'; s.t = 0; }
      return;
    }
    if (s.phase === 'fade' && s.t >= T.fade) s.dead = true;
  },
  danger(sq, s) { return s.phase === 'bite' && !s.snapped ? { x: s.bx, z: s.bz, r: s.T.biteR + .6, until: s.T.warn - s.bt } : null; }
});
