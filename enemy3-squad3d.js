import { registerKind, registerSkill, E1, SKILLS } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';
/**
 * MOD 245 — Enemy3 ("Abissal") e Mini-chefe do Ato III (perfil miniboss3, rig Enemy4): espécie própria sobre a esquadra
 * da Mod 237 (mesmo diretor, fichas, estudo do alvo e passo fixo de 120 Hz). Lógica pura, sem Three.js.
 *
 *  • Tempestade de Nadir (nadir): o conjurador aponta o céu; um redemoinho cobre a arena (escurecimento LOCAL e
 *    reversível). Raios caem em vários pontos com separação mínima (amostragem tipo Poisson disk): sobre o alvo, à
 *    frente do movimento dele e ao redor. Cada raio tem marca no chão com o raio REAL da colisão e aviso sonoro antes;
 *    o número de marcas vivas tem teto e nunca se cobrem, então sempre sobra rota de fuga. Mini-chefe: mais denso e
 *    com um raio pesado por ciclo (marca maior e mais longa).
 *  • Barragem Abissal (barrage): fendas irregulares se abrem ATRÁS/ACIMA do conjurador. Em cada fenda uma espada
 *    nasce DENTRO dela, desliza ponta primeiro (recorte pelo plano da fenda no VFX), mira e dispara. Fila
 *    independente por fenda, nova espada depois de cada disparo, teto de espadas no ar e intervalo mínimo entre
 *    disparos. Trajetória real com varredura; erra → crava no chão. Mini-chefe: duas fileiras e um leque final com
 *    vãos entre as lâminas.
 *  • Singularidade Abissal (singularity): centelha na palma → cresce → sobe acima da cabeça → arremesso. Voa com giro e
 *    previsão limitados; detona NO PONTO EXATO ao tocar o alvo, o chão ou um obstáculo; ao expirar no ar desce e
 *    detona no chão. Domo hemisférico cresce por quadros-chave; dano pela fronteira real do domo, um por alvo.
 *    Mini-chefe: domo maior e atração gravitacional leve, sinalizada e escapável.
 *  • Conjuração canalizada (channel): atordoar ou matar o conjurador antes do disparo cancela a magia.
 *  • Mini-chefe (e3boss): katana com três combos autorais (Presa Carmim, Iaijutsu Abissal, Fúria do Dragão) com
 *    preparação/contato/recuperação próprios e dano só pela trajetória real da lâmina; fúria abaixo de 40%.
 */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const easeOut = k => { k = clamp(k, 0, 1); return 1 - (1 - k) ** 3; };

export const NADIR = { min: 0, max: 22, cast: 2.2, release: .35, cd: 24, anim: 'cast', channel: true, gather: 1.7, storm: 5.6, fade: 1.5, R: 34, height: 24,
  rate: 2.1, warn: .62, r: 1.15, dmg: 11, sep: 2.7, maxLive: 3, lead: .5, ring: [1.6, 5.2], grace: .85, scar: .55, heavyEvery: 0, heavy: { r: 2.1, warn: .95, dmg: 20 } };
export const BARRAGE = { min: 4.5, max: 20, cast: 4.2, release: .3, cd: 19, anim: 'cast', channel: true, n: 8, open: .75, volley: 2.9, close: .9, first: .45, again: .34, aim: .2,
  speed: 21, r: .24, len: 1.7, dmg: 7, gap: .22, maxFly: 4, lead: .28, spread: .45, life: 1.7, stick: 1.15, finale: 0 };
export const SINGULARITY = { min: 4, max: 19, cast: 2.25, release: .12, cd: 16, anim: 'cast', channel: true, form: .9, raise: .7, throw: .28,
  speed: 11.5, turn: .95, lead: .3, life: 2.8, r: .5, power: 22, R: 3.2, implode: .09, grow: .5, hold: .35, erode: .75, dmgCore: 24, dmg: 16, edge: 8, knock: 1.6, pull: 0, pullR: 0 };
export const RIFT = { len: 6, speed: 13, w: .75, dmg: 12, fade: .9 };

const COMMON3 = {
  ...E1.common, hp: 250, radius: .45, height: 1.95, poise: 20, flinch: 10, sight: 30, leash: 40,
  speed: { walk: 1.75, run: 3.7, strafe: 1.55, back: 2.1, turn: 8.5 },
  // Enemy3.glb 'Attack' (2,8 s): o corte do braço acontece ~1,26 s no clipe → acelerado para casar com a janela.
  melee: { max: 2.5, reach: 2.45, arc: .32, windup: .5, hits: [.58], dur: 1.2, dmg: 10, cd: 1.9, knock: .6, animSpeed: 2.15 },
  dash: { speed: 8.8, time: .32, cd: 3 },
  block: { chance: .22, dur: .8, cd: 2.6, cost: 22, reduce: .7 },
  dodge: { chance: .3, cd: 3 },
  counter: { ...E1.common.counter, chance: 0, cd: 99 },
  decide: [.28, .42], gap: .85, spellGap: 3.6, maxBig: 2, kit: ['nadir', 'barrage', 'singularity'], interrupt: false,
  nadir: NADIR, barrage: BARRAGE, singularity: SINGULARITY
};
const BOSS3 = {
  ...COMMON3, hp: 700, radius: .6, height: 2.45, poise: 44, flinch: 99, boss: true, pref: [1.9, 2.6], phase2: .4, furyCd: .72, leash: 46,
  speed: { walk: 1.95, run: 4.2, strafe: 1.8, back: 2.4, turn: 8 },
  melee: { max: 2.55, reach: 2.7, arc: -.1, windup: .5, hits: [.5], dur: 1.3, dmg: 13, cd: 2.1, knock: 1 },
  block: { chance: .34, dur: .85, cd: 2.2, cost: 14, reduce: .78 },
  dodge: { chance: .36, cd: 2.5 },
  gap: .6, spellGap: 2.9,
  nadir: { ...NADIR, rate: 3, warn: .56, storm: 6.6, maxLive: 4, sep: 2.5, heavyEvery: 2.2, cd: 21 },
  barrage: { ...BARRAGE, n: 16, cast: 4.9, volley: 3.5, gap: .15, maxFly: 6, dmg: 9, speed: 23, finale: 5, cd: 17 },
  singularity: { ...SINGULARITY, form: 1, raise: .8, cast: 2.5, r: .7, power: 30, R: 4.4, speed: 12.5, dmgCore: 28, dmg: 20, edge: 10, pull: 1.15, pullR: 7, cd: 14 }
};
export const E3 = Object.freeze({ common: registerKind('e3', COMMON3), boss: registerKind('e3boss', BOSS3) });

/* ---------- Katana Dragão Carmim: três combos autorais (mesma infraestrutura nativa dos mini-chefes da Mod 244) ---------- */
BOSS_MOVES.e3boss = [
  // Presa Carmim: dois cortes diagonais em X, ombro e quadril preparam, passo curto entre os cortes
  { id: 'Katana_Presa', label: 'Presa Carmim', patterns: ['diagonal', 'reverse'], hits: [.56, 1.02], duration: 1.62, advance: .7 },
  // Iaijutsu Abissal: guarda baixa de saque (sem bainha no modelo), carga de 0,35 s, dash e corte horizontal com freio
  { id: 'Katana_Iai', label: 'Iaijutsu Abissal', patterns: ['dash'], hits: [.8], duration: 1.6, advance: 2.8, range: [2.2, 5], score: 1.05, cd: 6.5, iai: true },
  // Fúria do Dragão: preparação longa, salto com gravidade, corte vertical pesado → fissura e dragão de energia
  { id: 'Katana_Dragao', label: 'Fúria do Dragão', patterns: ['overhead'], hits: [1.16], duration: 2.25, advance: 1.5, jump: .95, after: 'rift', heavy: true }
];
for (const m of BOSS_MOVES.e3boss) { m.kind = 'e3boss'; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = m.heavy ? 1.35 : m.iai ? 1.15 : 1; }

const live = sq => sq.targets.filter(t => t.alive);
const lead = (t, k, cap = 3) => ({ x: t.x + clamp((t.vx || 0) * k, -cap, cap), z: t.z + clamp((t.vz || 0) * k, -cap, cap) });
const anyActive = (sq, type) => sq.spells.some(s => s.type === type && !s.dead && s.phase !== 'fade' && s.phase !== 'close');
/** A conjuração segue enquanto o conjurador está vivo e ainda canalizando ESTA magia (atordoado/morto → cancela). */
const channeling = (sq, s) => { const o = sq.actor(s.owner); return !!(o && o.alive && o.act && o.act.type === 'cast' && o.act.spellId === s.id); };
const varied = (a, id) => a.lastSkill === id ? -.35 : 0; // alterna pressão: o mesmo poder duas vezes seguidas pesa menos

/* ---------- Skill 1 — Tempestade de Nadir ---------- */
registerSkill('nadir', {
  score(sq, a, t, c) {
    if (anyActive(sq, 'nadir')) return null;
    return .5 + (c.R === 'controller' ? .35 : 0) + (c.still ? .15 : .2) + Math.min(.3, c.st.dash * .4) + (sq.alive.length > 1 ? .1 : 0) + (a.phase2 ? .25 : 0) + varied(a, 'nadir');
  },
  spawn(sq, a, t) {
    const T = a.T.nadir; a.lastSkill = 'nadir';
    const s = { id: sq.nextId++, type: 'nadir', owner: a.id, kind: a.kind, T, tid: t.id, cx: a.x, cz: a.z, cy: sq.ground(a.x, a.z), R: T.R, t: 0, phase: 'gather', dim: 0,
      bolts: [], acc: 0, heavyAcc: 0, grace: -9, n: 0, struck: 0 };
    sq.spells.push(s); sq.event('nadir', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, owner = sq.actor(s.owner), t = sq.target(s.tid) || live(sq)[0];
    for (let i = s.bolts.length - 1; i >= 0; i--) stepBolt(sq, s, s.bolts[i], dt, i);
    if (!owner || !owner.alive) { if (s.phase !== 'fade') { s.phase = 'fade'; s.t = 0; sq.event('nadirEnd', { spell: s, why: 'owner' }); } }
    if (s.phase === 'gather') {
      s.dim = smooth(s.t / T.gather);
      if (!channeling(sq, s) && s.t < T.gather - .05) { s.phase = 'fade'; s.t = 0; s.cancel = true; sq.event('nadirEnd', { spell: s, why: 'interrupt' }); return; }
      if (s.t >= T.gather) { s.phase = 'storm'; s.t = 0; sq.event('nadirStorm', { spell: s }); }
      return;
    }
    if (s.phase === 'storm') {
      s.dim = 1;
      // densidade cai se outros poderes grandes estão no campo (não sobrepor ataques impossíveis)
      const others = sq.spells.some(o => o !== s && (o.type === 'barrage' || o.type === 'singularity') && o.phase !== 'close' && o.phase !== 'fade');
      s.acc += dt * T.rate * (others ? .55 : 1); if (T.heavyEvery) s.heavyAcc += dt;
      while (s.acc >= 1) { s.acc -= 1; if (t) placeBolt(sq, s, t, false); }
      if (T.heavyEvery && s.heavyAcc >= T.heavyEvery && t) { s.heavyAcc = 0; placeBolt(sq, s, t, true); }
      if (s.t >= T.storm) { s.phase = 'fade'; s.t = 0; sq.event('nadirEnd', { spell: s, why: 'done' }); }
      return;
    }
    if (s.phase === 'fade') { s.dim = Math.min(s.dim, 1 - smooth(s.t / T.fade)); if (s.t >= T.fade && !s.bolts.length) s.dead = true; }
  },
  danger(sq, s) { return s.bolts.filter(b => b.phase === 'warn').map(b => ({ x: b.x, z: b.z, r: b.r + .6, until: b.warn - b.t })); }
});
/** Escolhe o ponto do raio: sobre o alvo, à frente dele ou ao redor; separação mínima entre marcas e teto de marcas. */
function placeBolt(sq, s, t, heavy) {
  const T = s.T, warnLive = s.bolts.filter(b => b.phase === 'warn');
  if (!heavy && warnLive.length >= T.maxLive) return null;
  const onTarget = warnLive.some(b => b.aim), now = sq.time, cands = [];
  // no máximo UMA marca sobre/à frente do alvo por vez, e nunca logo depois de ele levar um raio (janela de respiro)
  if (!onTarget && now - s.grace > T.grace) {
    const p = lead(t, T.lead, 2.6); cands.push({ x: p.x + (sq.rand() - .5) * .8, z: p.z + (sq.rand() - .5) * .8, aim: true });
    if (sq.rand() < .5) cands.unshift({ x: t.x + (sq.rand() - .5) * .5, z: t.z + (sq.rand() - .5) * .5, aim: true });
  }
  for (let i = 0; i < 6; i++) { const a = sq.rand() * Math.PI * 2, d = T.ring[0] + sq.rand() * (T.ring[1] - T.ring[0]); cands.push({ x: t.x + Math.sin(a) * d, z: t.z + Math.cos(a) * d, aim: false }); }
  const r = heavy ? T.heavy.r : T.r;
  for (const c of cands) {
    if (Math.hypot(c.x - s.cx, c.z - s.cz) > s.R * .85 || sq.blocked(c.x, c.z)) continue;
    if (s.bolts.some(b => b.phase !== 'gone' && Math.hypot(b.x - c.x, b.z - c.z) < Math.max(T.sep, b.r + r + .5))) continue; // Poisson disk
    const b = { id: ++s.n, x: c.x, z: c.z, y: sq.ground(c.x, c.z), r, warn: heavy ? T.heavy.warn : T.warn, dmg: heavy ? T.heavy.dmg : T.dmg, heavy, aim: c.aim && !heavy, t: 0, phase: 'warn', seed: sq.rand() * 1000 };
    s.bolts.push(b); sq.event('nadirWarn', { spell: s, bolt: b }); return b;
  }
  return null;
}
function stepBolt(sq, s, b, dt, i) {
  b.t += dt;
  if (b.phase === 'warn' && b.t >= b.warn) {
    b.phase = 'strike'; b.t = 0; s.struck++;
    for (const tg of live(sq)) {
      if (Math.hypot(tg.x - b.x, tg.z - b.z) > b.r + tg.radius * .5 || (tg.air || 0) > 3.5) continue; // contato só no volume indicado
      if (tg.iframes) { sq.event('evaded', { spell: s, target: tg.id }); continue; }
      const res = sq.damageTarget(tg.id, b.dmg, { kind: b.heavy ? 'nadirHeavy' : 'nadir', spell: s.id, x: b.x, z: b.z, knock: b.heavy ? 1 : .45 });
      if (tg.id === s.tid) s.grace = sq.time; b.hitTarget = tg.id; void res;
    }
    sq.event('nadirStrike', { spell: s, bolt: b });
  } else if (b.phase === 'strike' && b.t >= .12) { b.phase = 'scar'; b.t = 0; }
  else if (b.phase === 'scar' && b.t >= s.T.scar) s.bolts.splice(i, 1);
}

/* ---------- Skill 2 — Barragem Abissal ---------- */
registerSkill('barrage', {
  score(sq, a, t, c) {
    if (anyActive(sq, 'barrage') || !c.see) return null;
    return .5 + (c.R === 'ranged' || c.R === 'flanker' ? .35 : 0) + (c.d > 7 ? .2 : 0) + (t.blocking ? .2 : 0) + (c.recovering ? .15 : 0) + varied(a, 'barrage');
  },
  spawn(sq, a, t) {
    const T = a.T.barrage, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fx, gy = a.y, portals = [];
    a.lastSkill = 'barrage';
    const put = (side, up, back, tilt, row) => portals.push({ x: a.x + rx * side - fx * back, y: gy + up, z: a.z + rz * side - fz * back, tilt, row, open: 0, i: portals.length,
      state: 'wait', e: 0, t: -(portals.length % 4) * .09 - sq.rand() * .12, shots: 0, sx: 0, sy: 0, sz: 0 });
    if (a.kind === 'e3boss') { // fileira alta em arco + duas asas baixas: formação de comando, não só "mais espadas"
      const hi = Math.round(T.n * .62), lo = T.n - hi;
      for (let i = 0; i < hi; i++) { const u = hi > 1 ? i / (hi - 1) * 2 - 1 : 0; put(u * 6.2, 4.1 + (1 - u * u) * 2.6 + sq.rand() * .6, 1.8 + (1 - Math.abs(u)) * 1.2, (sq.rand() - .5) * .7 + u * .35, 0); }
      for (let i = 0; i < lo; i++) { const sd = i % 2 ? 1 : -1, k = Math.floor(i / 2), m = Math.ceil(lo / 2); put(sd * (2.6 + k / Math.max(1, m - 1) * 2.6), 1.9 + k * .45 + sq.rand() * .3, .6 + k * .3, sd * (.5 + sq.rand() * .3), 1); }
    } else for (let i = 0; i < T.n; i++) { const u = T.n > 1 ? i / (T.n - 1) * 2 - 1 : 0; put(u * 4.4, 2.7 + (1 - u * u) * 2.3 + sq.rand() * .6, 1.2 + (1 - Math.abs(u)) * 1, (sq.rand() - .5) * .8 + u * .4, 0); }
    const s = { id: sq.nextId++, type: 'barrage', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, phase: 'open', portals, swords: [], lastShot: -9, sn: 0, fired: 0, fan: 0 };
    sq.spells.push(s); sq.event('barrage', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, t = sq.target(s.tid) || live(sq)[0];
    for (let i = s.swords.length - 1; i >= 0; i--) stepSword(sq, s, s.swords[i], dt, i);
    const alive = channeling(sq, s);
    if (s.phase === 'open') {
      for (const p of s.portals) p.open = smooth((s.t - Math.max(0, -p.t)) / (T.open * .8));
      if (!alive && s.t > .05) return closeBarrage(sq, s, 'interrupt');
      if (s.t >= T.open) { s.phase = 'volley'; s.t = 0; for (const p of s.portals) { p.open = 1; p.state = 'emerge'; p.e = 0; } }
      return;
    }
    if (s.phase === 'volley') {
      if (!alive) return closeBarrage(sq, s, 'interrupt');
      const flying = s.swords.filter(w => w.phase === 'fly').length, finale = T.finale && s.t >= T.volley - .7;
      for (const p of s.portals) {
        p.t += dt;
        if (p.state === 'emerge') { p.e = Math.min(1, p.e + dt / (p.shots ? T.again : T.first)); if (p.e >= 1) { p.state = 'aim'; p.at = 0; } }
        else if (p.state === 'aim') { p.at += dt; if (t) aimPortal(sq, s, p, t, dt); if (p.at >= T.aim) p.state = 'ready'; }
        else if (p.state === 'ready' && t) aimPortal(sq, s, p, t, dt);
      }
      // disparos: intervalo mínimo e teto de espadas no ar; a fila mais antiga primeiro (alternância lenta/rápida natural)
      if (t && !finale && flying < T.maxFly && sq.time - s.lastShot >= T.gap) {
        let best = null; for (const p of s.portals) if (p.state === 'ready' && (!best || p.t > best.t)) best = p;
        if (best) fireSword(sq, s, best, t, 0);
      }
      if (finale && t && !s.fan) { // leque final do mini-chefe: as prontas saem juntas em direções espaçadas, com vãos
        s.fan = 1; const ready = s.portals.filter(p => p.state === 'ready' || p.state === 'aim').slice(0, T.finale);
        ready.forEach((p, i) => fireSword(sq, s, p, t, (i - (ready.length - 1) / 2) * 1.9)); sq.event('barrageFan', { spell: s, n: ready.length });
      }
      if (s.t >= T.volley) return closeBarrage(sq, s, 'done');
      return;
    }
    if (s.phase === 'close') {
      for (const p of s.portals) p.open = 1 - smooth(s.t / T.close);
      if (s.t >= T.close && !s.swords.length) s.dead = true;
    }
  },
  danger(sq, s) { const t = sq.target(s.tid); return s.phase === 'volley' && t ? { x: t.x, z: t.z, r: 1.4, until: .6 } : null; }
});
function closeBarrage(sq, s, why) {
  s.phase = 'close'; s.t = 0; s.why = why;
  // espadas ainda dentro das fendas recolhem com elas (nada fica pendurado no ar)
  for (const p of s.portals) { if (p.state !== 'empty') p.state = 'retract'; }
  sq.event('barrageEnd', { spell: s, why });
}
/** Mira com giro limitado da ponta da espada, ainda presa à fenda (previsão moderada com teto). */
function aimPortal(sq, s, p, t, dt) {
  const q = lead(t, s.T.lead, 2.2), tx = q.x - p.x, ty = (t.y || 0) + 1 - p.y, tz = q.z - p.z, l = Math.hypot(tx, ty, tz) || 1;
  if (!p.dx) { const o = sq.actor(s.owner), fx = o ? Math.sin(o.yaw) : 0, fz = o ? Math.cos(o.yaw) : 1; p.dx = fx; p.dy = -.15; p.dz = fz; }
  const k = Math.min(1, dt * 7); p.dx += (tx / l - p.dx) * k; p.dy += (ty / l - p.dy) * k; p.dz += (tz / l - p.dz) * k; const m = Math.hypot(p.dx, p.dy, p.dz) || 1; p.dx /= m; p.dy /= m; p.dz /= m;
}
function fireSword(sq, s, p, t, fanOffset) {
  const T = s.T, q = lead(t, T.lead, 2.2), rx = (sq.rand() - .5) * 2 * T.spread, rz = (sq.rand() - .5) * 2 * T.spread;
  // leque: desloca o ponto de mira perpendicular à linha fenda→alvo, deixando vãos regulares entre as lâminas
  const lx = q.x - p.x, lz = q.z - p.z, ll = Math.hypot(lx, lz) || 1, px = -lz / ll, pz = lx / ll;
  const gx = q.x + rx + px * fanOffset, gz = q.z + rz + pz * fanOffset, gy = (t.y || 0) + .9, dx = gx - p.x, dy = gy - p.y, dz = gz - p.z, l = Math.hypot(dx, dy, dz) || 1;
  const w = { id: ++s.sn, portal: p.i, x: p.x + dx / l * T.len, y: p.y + dy / l * T.len, z: p.z + dz / l * T.len, dx: dx / l, dy: dy / l, dz: dz / l, t: 0, phase: 'fly', hit: false, why: null };
  s.swords.push(w); p.state = 'emerge'; p.e = 0; p.shots++; p.t = 0; p.dx = 0; s.lastShot = sq.time; s.fired++;
  sq.event('barrageShot', { spell: s, sword: w, portal: p });
}
function stepSword(sq, s, w, dt, i) {
  const T = s.T; w.t += dt;
  if (w.phase === 'fly') {
    const ax = w.x, ay = w.y, az = w.z, st = T.speed * dt; w.x += w.dx * st; w.y += w.dy * st; w.z += w.dz * st;
    for (const tg of live(sq)) { // varredura: segmento da ponta contra a cápsula vertical do alvo
      const ex = w.x - ax, ez = w.z - az, l2 = ex * ex + ez * ez || 1, u = clamp(((tg.x - ax) * ex + (tg.z - az) * ez) / l2, 0, 1), cx = ax + ex * u, cz = az + ez * u, cy = ay + (w.y - ay) * u;
      if (Math.hypot(tg.x - cx, tg.z - cz) > tg.radius + T.r || cy < (tg.y || 0) - .1 || cy > (tg.y || 0) + (tg.height || 1.8) + .1) continue;
      if (tg.iframes) { if (!w.evaded) { w.evaded = true; sq.event('evaded', { spell: s, target: tg.id }); } continue; }
      w.x = cx; w.y = cy; w.z = cz; w.phase = 'hit'; w.t = 0; w.hit = tg.id;
      const res = sq.damageTarget(tg.id, T.dmg, { kind: 'barrage', spell: s.id, x: ax, z: az, knock: .55 });
      sq.event('swordHit', { spell: s, sword: w, target: tg.id, result: res }); return;
    }
    const g = sq.ground(w.x, w.z);
    if (w.y <= g + .05) { w.y = g; w.phase = 'stuck'; w.t = 0; w.why = 'ground'; sq.event('swordStick', { spell: s, sword: w }); return; }
    if (sq.blocked(w.x, w.z)) { w.phase = 'stuck'; w.t = 0; w.why = 'wall'; sq.event('swordStick', { spell: s, sword: w }); return; }
    if (w.t >= T.life) { w.phase = 'gone'; w.t = 0; }
    return;
  }
  if (w.phase === 'hit' && w.t >= .1) { w.phase = 'gone'; w.t = 0; }
  else if (w.phase === 'stuck' && w.t >= T.stick) { w.phase = 'gone'; w.t = 0; }
  else if (w.phase === 'gone' && w.t >= .25) s.swords.splice(i, 1);
}

/* ---------- Skill 3 — Singularidade Abissal ---------- */
registerSkill('singularity', {
  clash: true,
  score(sq, a, t, c) {
    if (anyActive(sq, 'singularity') || !c.see) return null;
    return .48 + (c.R === 'ranged' || c.R === 'controller' ? .3 : 0) + (c.still ? .3 : 0) + (c.justDashed ? .25 : 0) + (t.casting ? .2 : 0) + (a.phase2 ? .2 : 0) + varied(a, 'singularity');
  },
  spawn(sq, a, t) {
    const T = a.T.singularity, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw); a.lastSkill = 'singularity';
    const s = { id: sq.nextId++, type: 'singularity', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, phase: 'form', grow: 0,
      x: a.x + fx * .55, y: a.y + a.T.height * .62, z: a.z + fz * .55, dx: fx, dy: 0, dz: fz, speed: 0, r: T.r * .15, power: T.power, traveled: 0, hit: new Set(), dome: 0, why: null };
    sq.spells.push(s); sq.event('singularity', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, o = sq.actor(s.owner), t = sq.target(s.tid) || live(sq)[0];
    if (s.phase === 'form' || s.phase === 'raise' || s.phase === 'throw') {
      if (!channeling(sq, s)) { s.phase = 'fizzle'; s.t = 0; sq.event('singularityFizzle', { spell: s }); return; }
      const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw);
      if (s.phase === 'form') { // centelha na palma, na frente do peito, crescendo sem parar
        s.grow = Math.pow(clamp(s.t / T.form, 0, 1), 1.7) * .7; // centelha minúscula que cresce sem parar s.x = o.x + fx * .6; s.z = o.z + fz * .6; s.y = o.y + o.T.height * .62;
        if (s.t >= T.form) { s.phase = 'raise'; s.t = 0; sq.event('singularityRaise', { spell: s }); }
      } else if (s.phase === 'raise') { // o braço sobe e a singularidade vai para cima da cabeça
        const k = smooth(s.t / T.raise); s.grow = .7 + .3 * k; s.x = o.x + fx * (.6 - .45 * k); s.z = o.z + fz * (.6 - .45 * k); s.y = o.y + o.T.height * (.62 + .58 * k);
        if (s.t >= T.raise) { s.phase = 'throw'; s.t = 0; }
      } else { // postura de arremesso: recua um pouco atrás da cabeça e solta no quadro certo
        const k = smooth(s.t / T.throw); s.x = o.x + fx * (.15 - .25 * k); s.z = o.z + fz * (.15 - .25 * k); s.y = o.y + o.T.height * (1.2 + .06 * k);
        if (s.t >= T.throw) launch(sq, s, o, t);
      }
      s.r = T.r * (.15 + .85 * s.grow); return;
    }
    if (s.phase === 'fizzle') { s.grow = Math.max(0, s.grow - dt * 3); if (s.t >= .45) s.dead = true; return; }
    if (s.phase === 'fly' || s.phase === 'fall') {
      if (s.phase === 'fly') {
        s.speed = Math.min(T.speed, s.speed + T.speed * dt * 4);
        if (t && !s.passed) { // giro limitado; passou do alvo (esquiva) → não corrige mais
          const rx = t.x - s.x, rz = t.z - s.z, ahead = rx * s.dx + rz * s.dz; if (ahead < -.4) s.passed = true;
          else { const want = Math.atan2(rx, rz), cur = Math.atan2(s.dx, s.dz), turn = clamp(wrap(want - cur), -T.turn * dt, T.turn * dt), h = Math.hypot(s.dx, s.dz) || 1; s.dx = Math.sin(cur + turn) * h; s.dz = Math.cos(cur + turn) * h;
            const want_y = clamp(((t.y || 0) + 1 - s.y) / Math.max(1, Math.hypot(rx, rz)), -.7, .35); s.dy += (want_y - s.dy) * Math.min(1, dt * 2.2); }
        }
        if (s.t >= T.life || s.traveled > T.speed * T.life) { s.phase = 'fall'; s.t = 0; sq.event('singularityFall', { spell: s }); }
      } else { s.dy = Math.max(-1.6, s.dy - dt * 2.6); s.speed = Math.max(4, s.speed - dt * 6); }
      const ax = s.x, ay = s.y, az = s.z, st = s.speed * dt; s.x += s.dx * st; s.y += s.dy * st; s.z += s.dz * st; s.traveled += st;
      for (const tg of live(sq)) {
        const ex = s.x - ax, ez = s.z - az, l2 = ex * ex + ez * ez || 1, u = clamp(((tg.x - ax) * ex + (tg.z - az) * ez) / l2, 0, 1), cx = ax + ex * u, cz = az + ez * u, cy = ay + (s.y - ay) * u;
        if (Math.hypot(tg.x - cx, tg.z - cz) > tg.radius + s.r || cy < (tg.y || 0) - s.r || cy > (tg.y || 0) + (tg.height || 1.8) + s.r) continue;
        if (tg.iframes) { if (!s.evaded) { s.evaded = true; sq.event('evaded', { spell: s, target: tg.id }); } continue; }
        s.x = cx; s.y = cy; s.z = cz; s.hit.add(tg.id);
        sq.damageTarget(tg.id, T.dmgCore, { kind: 'singularity', spell: s.id, x: ax, z: az, knock: T.knock });
        return detonate(sq, s, 'hit', tg.id);
      }
      const g = sq.ground(s.x, s.z); if (s.y - g < s.r * .55) { s.y = g; return detonate(sq, s, 'ground'); }
      if (sq.blocked(s.x, s.z)) { s.x = ax; s.z = az; return detonate(sq, s, 'wall'); }
      return;
    }
    if (s.phase === 'implode') { if (s.t >= T.implode) { s.phase = 'dome'; s.t = 0; sq.event('singularityDome', { spell: s }); } return; }
    if (s.phase === 'dome') {
      const g = T.grow, prev = s.dome; s.dome = T.R * (s.t < g * .35 ? easeOut(s.t / (g * .35)) * .86 : .86 + .14 * smooth((s.t - g * .35) / (g * .65)));
      // dano pela fronteira real do domo (hemisfério): cada alvo uma vez; i-frames atravessam
      for (const tg of live(sq)) {
        if (s.hit.has(tg.id)) continue; const d = Math.hypot(tg.x - s.x, tg.z - s.z) - tg.radius * .6; if (d > s.dome) continue;
        const h = Math.sqrt(Math.max(0, s.dome * s.dome - Math.max(0, d) ** 2)); if ((tg.y || 0) - s.y > h) continue;
        if (tg.iframes) continue; s.hit.add(tg.id);
        const k = clamp(Math.max(0, d) / T.R, 0, 1), dmg = Math.round(T.dmg - (T.dmg - T.edge) * k);
        sq.damageTarget(tg.id, dmg, { kind: 'singularityDome', spell: s.id, x: s.x, z: s.z, knock: T.knock * (1 - k * .5) });
      }
      void prev; if (s.t >= g + T.hold) { s.phase = 'erode'; s.t = 0; }
      return;
    }
    if (s.phase === 'erode' && s.t >= T.erode) s.dead = true;
  },
  /** Mini-chefe: atração leve enquanto a singularidade se aproxima e na implosão (com teto, sinalizada no VFX). */
  pull(sq, s, tg) {
    const T = s.T; if (!T.pull || !(s.phase === 'fly' || s.phase === 'implode' || (s.phase === 'dome' && s.t < T.grow * .3))) return null;
    const dx = s.x - tg.x, dz = s.z - tg.z, d = Math.hypot(dx, dz); if (d > T.pullR || d < .5) return null;
    const k = T.pull * (1 - d / T.pullR) * (s.phase === 'fly' ? .6 : 1); return { x: dx / d * k, z: dz / d * k };
  },
  danger(sq, s) { return (s.phase === 'fly' || s.phase === 'fall' || s.phase === 'dome') ? { x: s.x, z: s.z, r: s.T.R + .5, until: 1 } : null; }
});
function launch(sq, s, o, t) {
  const T = s.T, p = t ? lead(t, T.lead, 2.4) : { x: s.x + s.dx * 10, z: s.z + s.dz * 10 }, gy = t ? (t.y || 0) + 1 : s.y, dx = p.x - s.x, dz = p.z - s.z, h = Math.hypot(dx, dz) || 1;
  s.dx = dx / h; s.dz = dz / h; s.dy = clamp((gy - s.y) / h, -.7, .2); const m = Math.hypot(s.dx, s.dy, s.dz); s.dx /= m; s.dy /= m; s.dz /= m;
  s.phase = 'fly'; s.t = 0; s.speed = T.speed * .35; s.r = T.r; s.grow = 1; sq.event('singularityLaunch', { spell: s, actor: o });
}
function detonate(sq, s, why, tid) { s.phase = 'implode'; s.t = 0; s.why = why; s.speed = 0; s.y = Math.max(s.y, sq.ground(s.x, s.z)); sq.event('singularityImpact', { spell: s, why, target: tid }); }

/* ---------- Fissura da Fúria do Dragão (sai do corte vertical, em linha, um dano por alvo) ---------- */
registerSkill('rift', {
  score() { return null; },
  spawn(sq, a, t) {
    const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), x = a.x + fx * 1.6, z = a.z + fz * 1.6;
    const s = { id: sq.nextId++, type: 'rift', owner: a.id, kind: a.kind, T: RIFT, tid: t && t.id, x0: x, z0: z, dx: fx, dz: fz, y: sq.ground(x, z), front: 0, t: 0, phase: 'run', hit: new Set(), stop: RIFT.len };
    for (let d = .5; d <= RIFT.len; d += .5) if (sq.blocked(x + fx * d, z + fz * d)) { s.stop = d - .25; break; } // não atravessa parede
    sq.spells.push(s); sq.event('rift', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    if (s.phase === 'run') {
      const prev = s.front; s.front = Math.min(s.stop, s.front + RIFT.speed * dt);
      for (const tg of live(sq)) {
        if (s.hit.has(tg.id) || tg.iframes || (tg.air || 0) > .6) continue; const rx = tg.x - s.x0, rz = tg.z - s.z0, along = rx * s.dx + rz * s.dz, side = Math.abs(rx * s.dz - rz * s.dx);
        if (along < prev - .3 || along > s.front + tg.radius || side > RIFT.w + tg.radius) continue;
        s.hit.add(tg.id); sq.damageTarget(tg.id, RIFT.dmg, { kind: 'rift', spell: s.id, x: s.x0, z: s.z0, knock: .9 });
      }
      if (s.front >= s.stop) { s.phase = 'fade'; s.t = 0; }
    } else if (s.phase === 'fade' && s.t >= RIFT.fade) s.dead = true;
  },
  danger(sq, s) { return s.phase === 'run' ? { x: s.x0 + s.dx * s.front, z: s.z0 + s.dz * s.front, r: 1.2, until: .4 } : null; }
});

/** Nível de escurecimento local da arena (0..1) pedido pelas tempestades ativas — o jogo aplica e restaura. */
export function stormDim(sq) { let k = 0; if (sq) for (const s of sq.spells) if (s.type === 'nadir' || s.type === 'throne' || s.type === 'orbital') k = Math.max(k, s.dim || 0); return k; }
export { SKILLS };
