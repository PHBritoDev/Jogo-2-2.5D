import {BOSS_MOVES,bossTravel,bossLift} from './boss-choreography3d.js';
/**
 * MOD 237 — Enemy1: esquadra simultânea, IA tática, três poderes sombrios e o Guardião do Portal.
 *
 * Lógica pura (sem Three.js), passo fixo de 120 Hz e aleatoriedade com semente: os mesmos comandos dão o mesmo combate
 * a 20 ou a 144 FPS. O jogo só lê o estado (posições, animação pedida, magias ativas) e desenha.
 *
 *  • Ator (Enemy1 comum ou Guardião): vida, postura, estamina, recargas, ação e intenção de movimento próprias.
 *  • Cérebro por utilidade + quadro-negro: decide a cada 0,3–0,45 s com histerese (não treme nem gira no lugar).
 *  • Estudo do alvo: memória curta (médias que decaem) do que o alvo FEZ — golpes, dashes, defesa, magias, distância.
 *    Nada de ler comando futuro: só reage ao que dá para ver (golpe começando, magia saindo, projétil vindo), com tempo
 *    de reação humano e chance de errar.
 *  • Diretor da esquadra: papéis (agressor, flanqueador, controle, distância), uma ficha de golpe e uma de magia por
 *    alvo, intervalo mínimo entre ataques do grupo, uma prisão de garras por alvo e um Juízo por vez.
 *  • Poderes: Garras do Abismo (área + imobilização curta; escapa com dash), Espiral Devoradora (projétil volumoso, um
 *    impacto), Juízo Violeta (orbe → coluna → esfera, dano por distância) e Contra-selo (magia que colide com magia).
 *  • Alvos genéricos (CombatTarget): herói ou NPC aliado. Nada aqui conhece "player".
 *
 * CombatTarget (o jogo atualiza a cada quadro): { id, team, x, y, z, vx, vz, radius, height, alive, priority,
 *   iframes, dashing, blocking, attacking, casting, ccResist }.
 * Magia externa (do herói/aliado), para colisão magia × magia: { id, team, x, y, z, dx, dz, speed, r, power,
 *   kill(), weaken(n) }.
 */
const TAU = Math.PI * 2, STEP = 1 / 120;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

/** Gerador com semente (mulberry32). */
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const COMMON = {
  hp: 180, radius: .42, height: 1.85, poise: 14, stamina: 100, leash: 34, sight: 26,
  speed: { walk: 1.65, run: 3.4, strafe: 1.3, back: 1.9, turn: 8 },
  melee: { max: 2.5, reach: 2.4, arc: .34, windup: .46, hits: [.46], dur: 1.02, dmg: 10, cd: 1.7, knock: .55 },
  dash: { speed: 8.5, time: .32, cd: 3.4 },
  block: { chance: .2, dur: .8, cd: 2.6, cost: 24, reduce: .7 },
  dodge: { chance: .24, cd: 3.4 },
  claws: { min: 2.4, max: 11, cast: .7, release: .5, cd: 10, r: 1.9, hands: 5, telegraph: .9, rise: .38, hold: .8, grabDmg: 9, endDmg: 4, lash: 5, lashT: 1.5, sink: .7, lead: .55 },
  spiral: { min: 3, max: 14, cast: 1.05, release: .86, cd: 7.5, speed: 11, r: .55, range: 19, dmg: 15, knock: 1.4, steer: 1.1, steerT: .35, burst: .8 },
  judgment: { min: 4.5, max: 17, cast: 1.4, release: .22, cd: 16, prep: 1.1, lock: .45, beam: .3, r: 2.6, dmg: 24, edge: 9, fade: 1.4, lead: .45, chase: 6 },
  counter: { chance: .16, cd: 11, cast: .3, speed: 16, r: .45, power: 14, life: 1.5 },
  decide: [.3, .45], gap: .85, cdMul: 1
};
const WARDEN = {
  ...COMMON, hp: 480, radius: .55, height: 2.25, poise: 32, leash: 40,
  speed: { walk: 1.75, run: 3.7, strafe: 1.45, back: 2.1, turn: 7 },
  melee: { max: 1.45, reach: 1.8, arc: -.05, windup: .5, hits: [.5, .92], dur: 1.6, dmg: 15, cd: 2.3, knock: 1 },
  block: { chance: .3, dur: .85, cd: 2.4, cost: 16, reduce: .75 },
  dodge: { chance: .3, cd: 3 },
  claws: { ...COMMON.claws, r: 2.6, hands: 7, hold: 1, grabDmg: 12, endDmg: 6, lash: 7, cd: 9 },
  spiral: { ...COMMON.spiral, r: .8, speed: 12, dmg: 21, knock: 2, cd: 6.5 },
  judgment: { ...COMMON.judgment, r: 3.4, dmg: 32, edge: 12, prep: 1.2, cd: 13 },
  counter: { ...COMMON.counter, chance: .42, cd: 7, power: 22, r: .6 },
  gap: .6, phase2: .5, boss: true, pref: [.95, 1.5], reap: 'claws', feint: 'spiral'
};
export const E1 = Object.freeze({ common: COMMON, warden: WARDEN, step: STEP, ccImmune: 3.5, escapeAfter: .3 });
/** MOD 238 — espécies e poderes registráveis: outra espécie (Enemy2) entra com tuning e kit próprios sem tocar no
    Enemy1. Um poder registrado traz score(sq,a,t,ctx) → utilidade (ou null), spawn(sq,a,t,opts), step(sq,s,dt),
    danger(s) → zona telegrafada e, se for projétil, clash: true (colide com magias externas como a espiral). */
export const KINDS = { common: COMMON, warden: WARDEN };
export const SKILLS = {};
export function registerKind(name, T) { KINDS[name] = T; return T; }
export function registerSkill(id, def) { SKILLS[id] = def; return def; }

/** Memória curta do que um alvo fez (taxas por segundo que decaem em ~6 s). */
export class TargetStudy {
  constructor() { this.melee = 0; this.dash = 0; this.block = 0; this.cast = 0; this.dist = 6; this.lastDash = -9; this.lastCast = -9; this.lastAttack = -9; }
  observe(kind, now) { if (kind in this) this[kind] += 1; if (kind === 'dash') this.lastDash = now; if (kind === 'cast') this.lastCast = now; if (kind === 'melee') this.lastAttack = now; }
  tick(dt, dist) { const k = Math.exp(-dt / 6); this.melee *= k; this.dash *= k; this.block *= k; this.cast *= k; if (Number.isFinite(dist)) this.dist += (dist - this.dist) * Math.min(1, dt * .5); }
  /** Taxas em eventos por segundo (a média decai com constante de 6 s). */
  get rates() { return { melee: this.melee / 6, dash: this.dash / 6, block: this.block / 6, cast: this.cast / 6, dist: this.dist }; }
}

const ROLES = ['aggressor', 'flanker', 'controller', 'ranged'];
const PREF = { aggressor: [1.6, 2.3], flanker: [1.8, 2.6], controller: [6, 9], ranged: [8, 11.5] };

export class Enemy1Squad {
  /**
   * ground(x,z) altura; blocked(x,z) obstáculo; los(ax,az,bx,bz) linha de visão; hooks.damageTarget(id, dmg, info) →
   * 'hit' | 'blocked' | 'evaded' | 'immune'; hooks.event(tipo, dados).
   */
  constructor({ ground = () => 0, blocked = () => false, los = () => true, seed = 237, damageTarget = () => 'hit', event = () => {}, meleeTrace = () => false } = {}) {
    Object.assign(this, { ground, blocked, los, damageTarget, event, meleeTrace });
    this.rand = rng(seed); this.actors = []; this.spells = []; this.targets = []; this.foreign = []; this.studies = new Map();
    this.time = 0; this.acc = 0; this.nextId = 1; this.lastAttackAt = -9; this.judgmentUntil = -9; this.ccImmune = new Map(); this.roleT = 0; this.paused = false; this.seen = new Set();
  }
  /** spots: [{x, z, yaw?, kind?: 'common'|'warden', hp?}] */
  spawn(spots) {
    for (const s of spots) {
      const T = KINDS[s.kind] || COMMON, hp = s.hp || T.hp;
      this.actors.push({ id: 'e' + this.nextId++, kind: s.kind || 'common', T, x: s.x, z: s.z, y: this.ground(s.x, s.z), yaw: s.yaw || 0, vx: 0, vz: 0, kx: 0, kz: 0,
        hp, maxHp: hp, alive: true, deadT: 0, role: 'aggressor', targetId: null, targetT: 0, act: null, cds: {}, stamina: T.stamina, poise: T.poise, poiseT: 0,
        intent: { mode: 'hold', side: this.rand() < .5 ? -1 : 1, score: 0 }, decideT: .2 + this.rand() * .4, react: null, phase2: false, home: { x: s.x, z: s.z },
        anim: { role: 'idle', once: false, speed: 1, rev: 0 }, speed: 0, alert: .5 + this.rand() * .4, hitBy: null, cdMul: 1, cast: null });
    }
    this.assignRoles(true); return this.actors;
  }
  clear() { this.actors.length = 0; this.spells.length = 0; this.ccImmune.clear(); this.studies.clear(); this.acc = 0; }
  get alive() { return this.actors.filter(a => a.alive); }
  get done() { return this.actors.length > 0 && this.actors.every(a => !a.alive); }
  actor(id) { return this.actors.find(a => a.id === id) || null; }
  target(id) { return this.targets.find(t => t.id === id && t.alive) || null; }
  study(id) { let s = this.studies.get(id); if (!s) this.studies.set(id, s = new TargetStudy()); return s; }
  /** O jogo avisa o que um alvo fez: 'melee', 'dash', 'block', 'cast'. */
  observe(targetId, kind) { this.study(targetId).observe(kind, this.time); }
  setTargets(list) { this.targets = list || []; }
  setForeignSpells(list) { this.foreign = list || []; }
  /** Zonas de perigo telegrafadas (para NPCs aliados saírem delas). */
  dangerZones() {
    const out = [];
    for (const s of this.spells) {
      if (SKILLS[s.type]) { const z = SKILLS[s.type].danger && SKILLS[s.type].danger(this, s); if (z) out.push(...[].concat(z)); continue; }
      if (s.type === 'claws' && (s.phase === 'telegraph' || s.phase === 'rise' || s.phase === 'lash')) out.push({ x: s.x, z: s.z, r: s.r, until: s.phase === 'lash' ? s.T.lashT - s.t : s.T.telegraph + s.T.rise - s.t });
      if (s.type === 'judgment' && s.phase !== 'fade') out.push({ x: s.mx, z: s.mz, r: s.r, until: Math.max(0, s.T.prep + s.T.lock + s.T.beam - s.t) });
    }
    return out;
  }
  update(dt) {
    if (this.paused || !(dt > 0)) return;
    this.acc += Math.min(dt, .25);
    while (this.acc >= STEP - 1e-9) { this.acc -= STEP; this.step(STEP); }
    this.clashes(dt);
  }
  step(dt) {
    this.time += dt;
    for (const t of this.targets) if (t.alive) { let near = Infinity; for (const a of this.actors) if (a.alive) near = Math.min(near, Math.hypot(a.x - t.x, a.z - t.z)); this.study(t.id).tick(dt, near); }
    if ((this.roleT -= dt) <= 0) this.assignRoles(false);
    for (const a of this.actors) this.stepActor(a, dt);
    for (let i = this.spells.length - 1; i >= 0; i--) { const s = this.spells[i]; this.stepSpell(s, dt); if (s.dead) this.spells.splice(i, 1); }
    for (const [id, until] of this.ccImmune) if (until <= this.time) this.ccImmune.delete(id);
  }

  /* ---------------- diretor da esquadra ---------------- */
  assignRoles(initial) {
    this.roleT = 2.5; const live = this.alive; if (!live.length) return;
    const tgt = this.targets.find(t => t.alive);
    // O mais perto vira agressor; o Guardião sempre pressiona; os outros se espalham em papéis distintos.
    const order = live.slice().sort((a, b) => (a.T.boss ? -1 : 0) - (b.T.boss ? -1 : 0) || (tgt ? Math.hypot(a.x - tgt.x, a.z - tgt.z) - Math.hypot(b.x - tgt.x, b.z - tgt.z) : 0));
    order.forEach((a, i) => {
      let role = live.length === 1 ? 'aggressor' : ROLES[i % ROLES.length];
      if (!a.T.boss && a.hp < a.maxHp * .35 && live.length > 1) role = i % 2 ? 'ranged' : 'controller';
      if (initial || role !== a.role) { a.role = role; a.intent.score = 0; }
    });
  }
  /** Ficha de ataque: no máximo um golpe e uma magia por alvo ao mesmo tempo, com intervalo mínimo no grupo. */
  canAttack(a, kind, tid) {
    const gap = a.T.boss ? a.T.gap : a.T.gap * (this.alive.length > 2 ? 1.25 : 1);
    if (this.time - this.lastAttackAt < gap) return false;
    for (const o of this.actors) if (o !== a && o.alive && o.act && o.act.token === kind && o.act.tid === tid) return false;
    if (kind === 'spell') for (const s of this.spells) if (s.owner !== a.id && s.tid === tid && (s.type === 'spiral' || s.type === 'claws') && s.phase !== 'sink' && s.phase !== 'burst') return false;
    return true;
  }

  /* ---------------- ator ---------------- */
  stepActor(a, dt) {
    if (!a.alive) { a.deadT += dt; return; }
    for (const k in a.cds) if ((a.cds[k] -= dt) <= 0) delete a.cds[k];
    a.stamina = Math.min(a.T.stamina, a.stamina + dt * 14); if ((a.poiseT -= dt) <= 0) a.poise = a.T.poise;
    if (a.alert > 0) a.alert -= dt;
    if(a.airY>0||a.airV>0){a.airV-=18*dt;a.airY=Math.max(0,a.airY+a.airV*dt);if(!a.airY)a.airV=0;}
    const tgt = this.pickTarget(a, dt);
    // reações rápidas (defesa, esquiva, contra-selo) agendadas com tempo de reação humano
    if (!a.react && !a.act && tgt) this.perceive(a, tgt);
    if (a.react && (a.react.t -= dt) <= 0) { const r = a.react; a.react = null; if (!a.act || a.act.type === 'move') this.startReaction(a, r, tgt); }
    if (a.act) this.stepAction(a, dt, tgt);
    else if ((a.decideT -= dt) <= 0) { a.decideT = a.T.decide[0] + this.rand() * (a.T.decide[1] - a.T.decide[0]); if (a.alert <= 0) this.decide(a, tgt); }
    this.locomote(a, dt, tgt);
  }
  pickTarget(a, dt) {
    a.targetT -= dt; let cur = a.targetId && this.target(a.targetId);
    if (cur && a.targetT > 0) return cur;
    let best = null, bs = -Infinity;
    for (const t of this.targets) {
      if (!t.alive) continue; const d = Math.hypot(t.x - a.x, t.z - a.z); if (d > a.T.sight * (t === cur ? 1.5 : 1)) continue;
      let s = (t.priority || 1) - d * .04 + (a.hitBy === t.id ? .35 : 0);
      if (t === cur) s += .25; // histerese: só troca se o outro alvo for claramente melhor
      for (const o of this.actors) if (o !== a && o.alive && o.targetId === t.id) s -= .06;
      if (s > bs) { bs = s; best = t; }
    }
    if (best && best !== cur) { a.targetId = best.id; a.targetT = 2.5; if (!cur) this.event('alert', { actor: a, target: best.id }); }
    else if (!best) { if (a.targetId) { const last = this.targets.find(t => t.id === a.targetId); if (last) a.lastSeen = { x: last.x, z: last.z }; } a.targetId = null; a.targetT = .5; }
    else a.targetT = .6;
    return best;
  }
  /** Só reage a sinais visíveis: golpe começando perto, magia/projétil vindo. Com chance de errar. */
  perceive(a, t) {
    const d = Math.hypot(t.x - a.x, t.z - a.z), st = this.study(t.id).rates;
    if (t.attacking && !a.sawAttack && d < 3.4 && !a.cds.guard) {
      a.sawAttack = true;
      const block = a.T.block.chance + Math.min(.22, st.melee * .12), dodge = a.T.dodge.chance;
      const r = this.rand();
      if (r < block && a.stamina > a.T.block.cost) a.react = { type: 'block', t: .14 + this.rand() * .14 };
      else if (r < block + dodge * .6 && !a.cds.dodge) a.react = { type: 'dodge', t: .16 + this.rand() * .16, from: t };
      return;
    }
    if (!t.attacking) a.sawAttack = false;
    for (const f of this.foreign) {
      const key = a.id + ':' + f.id; if (this.seen.has(key)) continue;
      const rx = a.x - f.x, rz = a.z - f.z, along = rx * f.dx + rz * f.dz; if (along <= 0) continue;
      const miss = Math.abs(rx * f.dz - rz * f.dx), tt = along / Math.max(.1, f.speed);
      if (miss > a.T.radius + f.r + .9 || tt > 1.25 || tt < .22) continue;
      if (this.seen.size > 400) this.seen.clear(); this.seen.add(key);
      const counter = this.forceCounter ? 1 : Math.min(.55, a.T.counter.chance * (1 + st.cast * 1.6) * (a.phase2 ? 1.3 : 1));
      const r = this.rand();
      if (!a.cds.counter && along > 3 && r < counter) a.react = { type: 'counter', t: .12 + this.rand() * .1, spell: f };
      else if (!a.cds.dodge && r < counter + a.T.dodge.chance) a.react = { type: 'dodge', t: .1 + this.rand() * .12, from: f, side: true };
      return;
    }
  }
  startReaction(a, r, tgt) {
    if (r.type === 'block') { this.begin(a, { type: 'block', dur: a.T.block.dur, anim: 'block', guard: true }); a.cds.guard = a.T.block.cd; this.event('guard', { actor: a }); }
    else if (r.type === 'dodge') {
      const src = r.from || tgt; if (!src) return; let dx = a.x - src.x, dz = a.z - src.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      if (r.side || this.rand() < .5) { const s = this.rand() < .5 ? 1 : -1; [dx, dz] = [dz * s, -dx * s]; if (r.side && src.dx !== undefined) { const ps = this.rand() < .5 ? 1 : -1; dx = src.dz * ps; dz = -src.dx * ps; } }
      this.begin(a, { type: 'dodge', dur: a.T.dash.time, anim: 'dash', dx, dz, iframes: true, face: false }); a.cds.dodge = a.T.dodge.cd; this.event('dodge', { actor: a });
    } else if (r.type === 'counter' && r.spell && r.spell.alive !== false) {
      this.begin(a, { type: 'counter', dur: a.T.counter.cast + .35, release: a.T.counter.cast, anim: 'cast', spell: r.spell, token: 'spell', tid: tgt && tgt.id });
      a.cds.counter = this.forceCounter ? 1 : a.T.counter.cd; this.event('counterCast', { actor: a });
    }
  }
  decide(a, t) {
    if (!t) { // perdeu o alvo: investiga o último ponto visto, volta ao território e patrulha
      const far = Math.hypot(a.x - a.home.x, a.z - a.home.z) > 2;
      if (a.lastSeen && Math.hypot(a.lastSeen.x - a.x, a.lastSeen.z - a.z) > 1 && Math.hypot(a.lastSeen.x - a.home.x, a.lastSeen.z - a.home.z) < a.T.leash) a.intent = { mode: 'investigate', side: a.intent.side, score: 0 };
      else { a.lastSeen = null; a.intent = { mode: far ? 'home' : 'patrol', side: a.intent.side, score: 0 }; if (!far && !a.patrol) a.patrol = { x: a.home.x + (this.rand() - .5) * 6, z: a.home.z + (this.rand() - .5) * 6 }; }
      return; }
    const d = Math.hypot(t.x - a.x, t.z - a.z), gap = d - t.radius - a.T.radius, st = this.study(t.id).rates, T = a.T, R = a.role;
    if (Math.hypot(t.x - a.home.x, t.z - a.home.z) > T.leash) { a.intent = { mode: 'home', side: a.intent.side, score: 0 }; return; }
    const see = this.los(a.x, a.z, t.x, t.z), opts = [], r = () => (this.rand() - .5) * .16;
    const recovering = !t.attacking && this.time - this.study(t.id).lastAttack < .9, still = Math.hypot(t.vx || 0, t.vz || 0) < 1;
    const justDashed = this.time - this.study(t.id).lastDash < 1.2;
    if (gap + T.radius <= T.melee.reach - .15 && !a.cds.melee && this.canAttack(a, 'melee', t.id))
      opts.push(['melee', .85 + (R === 'aggressor' || R === 'flanker' ? .3 : -.1) + (recovering ? .3 : 0) + (t.casting ? .25 : 0) - (t.blocking ? .35 : 0) + r()]);
    if (!T.kit && see && d >= T.claws.min && d <= T.claws.max && !a.cds.claws && !this.ccImmune.has(t.id) && !this.spells.some(s => s.type === 'claws' && s.tid === t.id) && this.canAttack(a, 'spell', t.id))
      opts.push(['claws', .55 + (R === 'controller' ? .4 : 0) + (still ? .2 : 0) + (justDashed ? .3 : 0) - Math.min(.3, st.dash * .5) + (t.blocking ? .2 : 0) + r()]);
    if (!T.kit && see && d >= T.spiral.min && d <= T.spiral.max && !a.cds.spiral && this.canAttack(a, 'spell', t.id))
      opts.push(['spiral', .5 + (R === 'ranged' ? .4 : 0) + (st.dist > 6 ? .2 : 0) + (t.blocking ? .3 : 0) + r()]);
    if (!T.kit && see && d >= T.judgment.min && d <= T.judgment.max && !a.cds.judgment && this.time >= this.judgmentUntil && this.canAttack(a, 'spell', t.id))
      opts.push(['judgment', .42 + (R === 'controller' ? .25 : 0) + (still ? .3 : 0) + (a.phase2 ? .25 : 0) + Math.min(.25, st.block * .4) + r()]);
    // pausa entre magias do mesmo inimigo e teto de poderes grandes ao mesmo tempo na esquadra (nada de spam)
    const bigLive = this.spells.filter(x => SKILLS[x.type] && x.phase !== 'fade' && x.phase !== 'retract'), mine = bigLive.some(x => x.owner === a.id);
    if (T.kit && !a.cds.spellGap && !mine && bigLive.length < (T.maxBig || 2)) for (const id of T.kit) { const S = SKILLS[id], ts = T[id]; if (!S || !ts || a.cds[id] || !(d >= ts.min && d <= ts.max) || !this.canAttack(a, 'spell', t.id)) continue;
      const u = S.score(this, a, t, { d, gap, see, st, still, justDashed, recovering, R }); if (u !== null && u !== undefined) opts.push([id, u + r()]); }
    // golpes nativos com faixa de distância própria (ex.: dash do Iaijutsu do mini-chefe Enemy3): escolha contextual
    const BM = BOSS_MOVES[a.kind];
    if (BM && see && !a.cds.melee && this.canAttack(a, 'melee', t.id)) for (const m of BM) if (m.range && gap >= m.range[0] && gap <= m.range[1] && !a.cds['mv_' + m.id])
      opts.push(['mv:' + m.id, (m.score || .9) + (recovering ? .3 : 0) + (justDashed ? .2 : 0) - (t.blocking ? .2 : 0) + r()]);
    // espécies que interrompem conjuração: avançam com dash e emendam o golpe (sinal visível: o alvo está conjurando)
    if (T.interrupt && t.casting && gap > T.melee.reach && gap < 8 && !a.cds.lunge && this.canAttack(a, 'melee', t.id)) opts.push(['lunge', 1 + r()]);
    const [lo, hi] = a.T.pref || PREF[R];
    let move = gap > hi + .4 ? (R === 'flanker' && gap < 9 ? 'flank' : 'approach') : gap < lo - .5 && (R === 'controller' || R === 'ranged') ? 'retreat' : 'strafe';
    if (a.hp < a.maxHp * .25 && !a.T.boss && this.alive.length > 1 && gap < 3.5) move = 'retreat';
    if ((R === 'aggressor' || R === 'flanker' || a.T.boss) && (T.boss ? gap + T.radius > T.melee.reach - .15 : gap > T.melee.max) && gap < hi + 3 && !opts.length) move = 'approach';
    opts.push([move, .35 + (move === a.intent.mode ? .15 : 0) + r()]);
    opts.sort((x, y) => y[1] - x[1]); const [pick] = opts[0];
    // Guardião: finta ocasional (começa o golpe, recua e lança a espiral)
    if (pick === 'melee' && a.T.feint && !a.cds[a.T.feint] && this.rand() < .12) { this.begin(a, { type: 'feint', dur: .62, anim: 'attack', token: 'melee', tid: t.id }); return; }
    if (pick === 'lunge') { const l = d || 1; a.cds.lunge = 4; this.begin(a, { type: 'dodge', dur: a.T.dash.time * 1.3, anim: 'dash', dx: (t.x - a.x) / l, dz: (t.z - a.z) / l, face: true, chain: 'melee', token: 'melee', tid: t.id }); this.event('lunge', { actor: a, target: t.id }); return; }
    if (pick.startsWith('mv:')) { const id = pick.slice(3), m = BM.find(x => x.id === id); this.startMelee(a, t, id); a.cds['mv_' + id] = (m.cd || 6) * a.cdMul; return; }
    if (pick === 'melee') this.startMelee(a, t);
    else if (pick === 'claws') this.startCast(a, t, 'claws');
    else if (pick === 'spiral') this.startCast(a, t, 'spiral');
    else if (pick === 'judgment' || SKILLS[pick]) this.startCast(a, t, pick);
    else { if (move !== a.intent.mode && this.rand() < .3) a.intent.side = -a.intent.side; a.intent.mode = move; a.intent.score = opts[0][1]; }
  }
  begin(a, act) {
    if (a.act && a.act.type === 'block') a.guard = false;
    a.act = { t: 0, ...act }; a.guard = !!act.guard; a.anim = { role: act.anim || 'idle', once: true, speed: act.animSpeed || 1, rev: a.anim.rev + 1 };
    if (act.token === 'melee' || act.token === 'spell') this.lastAttackAt = this.time;
  }
  startMelee(a, t, forcedMove) {
    if(BOSS_MOVES[a.kind]){
      const pool=BOSS_MOVES[a.kind],near=pool.filter(m=>!m.range),move=pool.find(m=>m.id===forcedMove)||near[(a.meleeCycle||0)%near.length];a.meleeCycle=(a.meleeCycle||0)+1;
      this.begin(a,{type:'melee',dur:move.duration,hits:move.hits,done:0,anim:move.id,token:'melee',tid:t.id,landed:false,move,contacts:new Set(),phase:'windup'});
      a.vx=a.vz=0;a.cds.melee=(move.duration+.45)*a.cdMul;this.event('windup',{actor:a,kind:move.id,at:move.open,label:move.label});return;
    }
    const M = a.T.melee, hits = a.phase2 && a.T.boss ? [...M.hits, M.hits[M.hits.length - 1] + .4] : M.hits;
    this.begin(a, { type: 'melee', dur: M.dur + (hits.length - M.hits.length) * .4, hits, done: 0, anim: 'attack', animSpeed: M.animSpeed, token: 'melee', tid: t.id, landed: false });
    a.cds.melee = M.cd * a.cdMul; this.event('windup', { actor: a, kind: 'melee', at: M.windup });
  }
  startCast(a, t, skill) {
    const S = a.T[skill];
    this.begin(a, { type: 'cast', skill, channel: !!S.channel, dur: S.cast + .3, release: S.release, anim: S.anim || (skill === 'judgment' ? 'cast' : skill === 'spiral' ? 'attack2' : 'cast'), token: 'spell', tid: t.id });
    a.cds[skill] = S.cd * a.cdMul; if (SKILLS[skill]) a.cds.spellGap = (a.T.spellGap || 2.5) * (a.phase2 ? .8 : 1); if (skill === 'judgment') this.judgmentUntil = this.time + S.prep + S.lock + S.beam + 3;
    this.event('cast', { actor: a, skill, target: t.id });
  }
  stepAction(a, dt, t) {
    const act = a.act, previous=act.t; act.t += dt;
    if (act.type === 'dodge') { const s = a.T.dash.speed * (1 - act.t / act.dur * .4); this.move(a, act.dx * s * dt, act.dz * s * dt); }
    if (act.face !== false && t && (act.type !== 'melee' || act.t < (act.move?.open||a.T.melee.windup) * .65)) this.face(a, t.x, t.z, dt);
    if(act.move){
      const m=act.move;act.phase=act.t<m.open?'windup':act.t<=m.close?'active':'recovery';
      const travel=bossTravel(m,act.t)-bossTravel(m,previous);this.move(a,Math.sin(a.yaw)*travel,Math.cos(a.yaw)*travel);a.y=this.ground(a.x,a.z)+bossLift(m,act.t);
      for(let n=0;n<m.hits.length;n++){
        const open=m.hits[n]-.10,close=m.hits[n]+.11;
        if(previous<=close&&act.t>=open&&!act.contacts.has(n)&&t&&this.los(a.x,a.z,t.x,t.z)&&this.meleeTrace(a,act,t,Math.max(previous,open),Math.min(act.t,close))){
          act.contacts.add(n);const result=this.damageTarget(t.id,Math.round(a.T.melee.dmg*m.damageScale),{kind:'melee',actor:a.id,x:a.x,z:a.z,knock:a.T.melee.knock,combo:n+1});
          if(result==='hit')act.landed=true;this.event('meleeHit',{actor:a,target:t.id,result,n:n+1});
        }
      }
      act.done=m.hits.filter(h=>act.t>h+.11).length;
      if(m.after&&!act.after&&act.t>=m.hits.at(-1)&&SKILLS[m.after]){act.after=true;SKILLS[m.after].spawn(this,a,t,{move:m,landed:act.landed});}
    }
    if (act.type === 'melee') {
      while (!act.move && act.done < act.hits.length && act.t >= act.hits[act.done]) {
        act.done++; if (!t) continue;
        const d = Math.hypot(t.x - a.x, t.z - a.z), fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), dot = d > 1e-4 ? ((t.x - a.x) * fx + (t.z - a.z) * fz) / d : 1;
        // dano só se a lâmina alcança: distância real até a borda do alvo, arco do golpe, altura e linha de visão
        if (d - t.radius <= a.T.melee.reach && dot >= a.T.melee.arc && Math.abs((t.y || 0) - a.y) < 1.3 && this.los(a.x, a.z, t.x, t.z)) {
          const res = this.damageTarget(t.id, a.T.melee.dmg, { kind: 'melee', actor: a.id, x: a.x, z: a.z, knock: a.T.melee.knock, combo: act.done });
          if (res === 'hit') act.landed = true; this.event('meleeHit', { actor: a, target: t.id, result: res, n: act.done });
        } else this.event('meleeMiss', { actor: a, n: act.done });
        if (act.done < act.hits.length) this.lastAttackAt = this.time;
      }
      // assinatura do Guardião: o último corte que acerta abre as Garras sob o alvo (telegraph curto, ainda dá para fugir)
      const reap = a.T.reap, RS = SKILLS[reap];
      if (a.T.boss && reap && act.landed && act.done === act.hits.length && !act.reap && t && !a.cds[reap] && (RS ? RS.canReap ? RS.canReap(this, a, t) : true : !this.ccImmune.has(t.id) && !this.spells.some(s => s.type === 'claws' && s.tid === t.id))) {
        act.reap = true; a.cds[reap] = a.T[reap].cd * a.cdMul; if (RS) RS.spawn(this, a, t, { reap: true }); else this.spawnClaws(a, t, .6); this.event('reap', { actor: a, target: t.id, skill: reap });
      }
    } else if (act.type === 'cast' && !act.released && act.t >= act.release) {
      act.released = true; if (t) { if (SKILLS[act.skill]) act.spellId = (SKILLS[act.skill].spawn(this, a, t) || {}).id; else this[act.skill === 'claws' ? 'spawnClaws' : act.skill === 'spiral' ? 'spawnSpiral' : 'spawnJudgment'](a, t); }
    } else if (act.type === 'counter' && !act.released && act.t >= act.release) { act.released = true; this.spawnCounter(a, act.spell); }
    else if (act.type === 'feint' && act.t >= act.dur) {
      a.act = null; const away = t ? Math.atan2(a.x - t.x, a.z - t.z) : a.yaw;
      this.begin(a, { type: 'dodge', dur: a.T.dash.time, anim: 'dash', dx: Math.sin(away), dz: Math.cos(away), iframes: true, face: false, then: a.T.feint || 'spiral' }); this.event('feint', { actor: a }); return;
    } else if (act.type === 'phase2' && act.t >= act.dur) this.event('phase2End', { actor: a });
    if (act.t >= act.dur) {
      const then = act.then; a.act = null; a.guard = false; a.decideT = Math.min(a.decideT, act.type === 'melee' ? .25 : .12);
      if (act.type === 'melee' || act.type === 'cast') a.recover = act.move ? .45 : .35;
      if (then && t && !a.cds[then] && a.T[then]) this.startCast(a, t, then);
      else if (act.chain === 'melee' && t && Math.hypot(t.x - a.x, t.z - a.z) - t.radius <= a.T.melee.reach) { a.cds.melee = 0; this.startMelee(a, t); }
    }
  }
  /** Intenção de movimento → velocidade, com separação entre aliados, desvio de obstáculos e sem colar no alvo. */
  locomote(a, dt, t) {
    let wx = 0, wz = 0, speed = 0; const act = a.act;
    if (a.recover > 0) a.recover -= dt;
    if (!act || act.type === 'block') {
      const m = a.intent.mode, S = a.T.speed;
      if (t && m !== 'home' && m !== 'hold') {
        const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, gap = d - t.radius - a.T.radius;
        const [lo, hi] = a.T.pref || PREF[a.role];
        if (m === 'approach') { const want = a.role === 'aggressor' || a.role === 'flanker' || a.T.boss ? a.T.melee.max * .7 : (lo + hi) / 2; if (gap > want) { wx = ux; wz = uz; speed = gap > 6 ? S.run : S.walk; } }
        else if (m === 'flank') { const s = a.intent.side, fx = -uz * s, fz = ux * s; wx = ux * .55 + fx * .85; wz = uz * .55 + fz * .85; speed = gap > 5 ? S.run : S.walk; }
        else if (m === 'retreat') { wx = -ux; wz = -uz; speed = S.back; if (gap > hi + 1) a.intent.mode = 'strafe'; }
        else if (m === 'strafe') { const s = a.intent.side, radial = gap > hi ? .5 : gap < lo ? -.5 : 0; wx = -uz * s + ux * radial; wz = ux * s + uz * radial; speed = S.strafe; }
        if (a.recover > 0) speed *= .35;
        if (act && act.type === 'block') speed = Math.min(speed, .6);
        // não entra no corpo do alvo
        const into = wx * ux + wz * uz; if (gap < .12 && into > 0) { wx -= ux * into; wz -= uz * into; }
        this.face(a, t.x, t.z, dt, speed > S.walk + .5 && m !== 'strafe' && m !== 'retreat' ? .6 : 1);
      } else if ((m === 'investigate' && a.lastSeen) || (m === 'patrol' && a.patrol)) { const p = m === 'patrol' ? a.patrol : a.lastSeen, dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz); if (d > .7) { wx = dx / d; wz = dz / d; speed = S.walk * (m === 'patrol' ? .6 : 1); this.face(a, p.x, p.z, dt); } else if (m === 'patrol') a.patrol = null; else a.lastSeen = null; }
      else if (m === 'home') { const dx = a.home.x - a.x, dz = a.home.z - a.z, d = Math.hypot(dx, dz); if (d > .8) { wx = dx / d; wz = dz / d; speed = S.walk; this.face(a, a.home.x, a.home.z, dt); } else a.intent.mode = 'hold'; }
    }
    // separação: ninguém empilha
    let sx = 0, sz = 0;
    for (const o of this.actors) { if (o === a || !o.alive) continue; const dx = a.x - o.x, dz = a.z - o.z, d = Math.hypot(dx, dz), min = a.T.radius + o.T.radius + .9; if (d < min && d > 1e-4) { const k = (min - d) / min; sx += dx / d * k * 2.2; sz += dz / d * k * 2.2; } }
    let vx = wx * speed + sx, vz = wz * speed + sz;
    if (act && act.type === 'dodge') vx = vz = 0;
    // desvio: se o caminho à frente está bloqueado, tenta ângulos alternados
    const sp = Math.hypot(vx, vz);
    if (sp > .05) {
      const look = Math.min(1.1, .35 + sp * .25); let ang = Math.atan2(vx, vz), ok = !this.blocked(a.x + Math.sin(ang) * look, a.z + Math.cos(ang) * look);
      for (let i = 1; !ok && i <= 4; i++) for (const sg of [a.intent.side, -a.intent.side]) { const t2 = ang + sg * i * .45; if (!this.blocked(a.x + Math.sin(t2) * look, a.z + Math.cos(t2) * look)) { ang = t2; ok = true; break; } }
      if (ok) { vx = Math.sin(ang) * sp; vz = Math.cos(ang) * sp; } else { vx = vz = 0; a.intent.side = -a.intent.side; }
    }
    // empurrão recebido
    if (Math.abs(a.kx) + Math.abs(a.kz) > .01) { vx += a.kx; vz += a.kz; const k = Math.exp(-dt * 7); a.kx *= k; a.kz *= k; }
    const k = 1 - Math.exp(-dt * 10); a.vx += (vx - a.vx) * k; a.vz += (vz - a.vz) * k;
    this.move(a, a.vx * dt, a.vz * dt);
    a.speed = Math.hypot(a.vx, a.vz);
    if (!a.act) {
      const fwd = a.vx * Math.sin(a.yaw) + a.vz * Math.cos(a.yaw), role = a.speed > 2.6 ? 'run' : a.speed > .3 ? 'walk' : 'idle';
      const sp2 = role === 'idle' ? 1 : (fwd < -.2 ? -1 : 1) * clamp(a.speed / (role === 'run' ? a.T.speed.run : a.T.speed.walk), .6, 1.25);
      if (a.anim.role !== role || a.anim.once) a.anim = { role, once: false, speed: sp2, rev: a.anim.rev + 1 }; else a.anim.speed = sp2;
    }
  }
  move(a, dx, dz) {
    const nx = a.x + dx, nz = a.z + dz, ok = (x, z) => !this.blocked(x, z) && !this.targets.some(t => t.alive && Math.hypot(x - t.x, z - t.z) < t.radius + a.T.radius + .05 && Math.hypot(a.x - t.x, a.z - t.z) >= Math.hypot(x - t.x, z - t.z));
    if (ok(nx, a.z)) a.x = nx; if (ok(a.x, nz)) a.z = nz; a.y = this.ground(a.x, a.z)+(a.act?.move?bossLift(a.act.move,a.act.t):(a.airY||0));
  }
  face(a, x, z, dt, w = 1) { const want = Math.atan2(x - a.x, z - a.z); a.yaw = wrap(a.yaw + wrap(want - a.yaw) * Math.min(1, dt * a.T.speed.turn * w)); }

  /* ---------------- dano recebido ---------------- */
  /** opts: { x, z (origem), kind: 'melee'|'spell'|'area', knock, crit }. Retorna o dano aplicado. */
  damageActor(id, amount, opts = {}) {
    const a = typeof id === 'string' ? this.actor(id) : id; if (!a || !a.alive || !(amount > 0)) return 0;
    if (a.act && a.act.iframes) { this.event('evade', { actor: a }); return 0; }
    let dmg = amount*(a.act?.move&&a.act.phase==='recovery'?1.15:1);dmg=Math.round(dmg); const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), ox = (opts.x ?? a.x) - a.x, oz = (opts.z ?? a.z) - a.z, ol = Math.hypot(ox, oz) || 1, front = (ox * fx + oz * fz) / ol > .25;
    if (a.guard && front && opts.kind !== 'area') {
      dmg = Math.max(1, Math.round(amount * (1 - a.T.block.reduce))); a.stamina -= a.T.block.cost * Math.max(.5, amount / 15);
      if (a.stamina <= 0) { a.stamina = 0; this.stagger(a, .9, true); this.event('guardBreak', { actor: a }); } else this.event('blocked', { actor: a, dmg });
    }
    a.hp = Math.max(0, a.hp - dmg); if (opts.by) a.hitBy = opts.by;
    if (opts.knock && !a.T.boss) { a.kx -= ox / ol * opts.knock * 4; a.kz -= oz / ol * opts.knock * 4; }
    if (a.hp === 0) { this.kill(a); return dmg; }
    if (a.T.boss && !a.phase2 && a.hp <= a.maxHp * a.T.phase2) { a.phase2 = true; a.cdMul = a.T.furyCd || .75; a.act = null; this.begin(a, { type: 'phase2', dur: 1.15, anim: 'block', armor: true }); this.event('phase2', { actor: a }); return dmg; }
    a.poise -= dmg; a.poiseT = 3;
    const armored = a.act && (a.act.armor || (a.T.boss && a.act.type === 'melee' && (a.act.move?a.act.phase==='active':a.act.done>0)));
    if (!armored && !a.guard && (a.poise <= 0 || (!a.T.boss && dmg >= (a.T.flinch || 8)))) { if (a.poise <= 0) a.poise = a.T.poise; this.stagger(a, a.T.boss ? .22 : .3, false); }
    return dmg;
  }
  stagger(a, dur, broken) {
    // golpe que ainda não soltou é interrompido; magia já lançada segue o curso dela
    if (a.act && a.act.type === 'cast' && a.act.released && !a.act.channel) return;
    a.act = null; a.guard = false; this.begin(a, { type: 'stagger', dur, anim: broken ? 'block' : 'hit', face: false }); a.cds.melee = Math.max(a.cds.melee || 0, .6);
  }
  kill(a) {
    a.alive = false; a.act = null; a.guard = false; a.vx = a.vz = 0; a.anim = { role: 'death', once: true, speed: 1, rev: a.anim.rev + 1 };
    for (const s of this.spells) if (s.owner === a.id && s.type === 'claws' && s.held) this.release(s, false);
    this.event('death', { actor: a }); this.assignRoles(false);
  }
  /** Dano em área (herói): atinge todos na área, uma vez cada, com queda por distância opcional. */
  areaDamage(x, z, r, amount, opts = {}) {
    let n = 0;
    for (const a of this.actors) { if (!a.alive) continue; const d = Math.hypot(a.x - x, a.z - z) - a.T.radius; if (d > r) continue; const k = opts.falloff ? 1 - .5 * clamp(d / r, 0, 1) : 1; if (this.damageActor(a, Math.round(amount * k), { ...opts, x, z, kind: opts.kind || 'area' }) > 0) n++; }
    return n;
  }

  /* ---------------- poderes ---------------- */
  lead(t, k) { return { x: t.x + clamp((t.vx || 0) * k, -3, 3), z: t.z + clamp((t.vz || 0) * k, -3, 3) }; }
  spawnClaws(a, t, telegraph) {
    const S = a.T.claws, p = this.lead(t, S.lead), hands = [];
    for (let i = 0; i < S.hands; i++) { const ang = i / S.hands * TAU + this.rand() * .5, dist = S.r * (.62 + this.rand() * .3); hands.push({ a: ang, d: dist, delay: this.rand() * .18 + (i % 2) * .06, s: .85 + this.rand() * .35, curl: this.rand() }); }
    const s = { id: this.nextId++, type: 'claws', owner: a.id, kind: a.kind, T: { ...S, telegraph: telegraph || S.telegraph }, tid: t.id, x: p.x, z: p.z, y: this.ground(p.x, p.z), r: S.r, hands, t: 0, phase: 'telegraph', held: null, lashed: new Set() };
    this.spells.push(s); this.event('claws', { spell: s, actor: a }); return s;
  }
  spawnSpiral(a, t) {
    const S = a.T.spiral, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
    const s = { id: this.nextId++, type: 'spiral', owner: a.id, kind: a.kind, T: S, tid: t.id, x: a.x + fx * (a.T.radius + .55), y: a.y + a.T.height * .62, z: a.z + fz * (a.T.radius + .55), dx: fx, dz: fz, speed: S.speed, r: S.r, power: S.dmg, traveled: 0, t: 0, phase: 'fly', spin: 0 };
    this.spells.push(s); this.event('spiral', { spell: s, actor: a }); return s;
  }
  spawnJudgment(a, t) {
    const S = a.T.judgment, p = this.lead(t, S.lead);
    const s = { id: this.nextId++, type: 'judgment', owner: a.id, kind: a.kind, T: S, tid: t.id, mx: p.x, mz: p.z, my: this.ground(p.x, p.z), r: S.r, t: 0, phase: 'prep',
      ox: a.x, oy: a.y + a.T.height + .9, oz: a.z, from: { x: a.x, y: a.y + a.T.height + .9, z: a.z }, beamY: 0, hits: [] };
    this.spells.push(s); this.event('judgment', { spell: s, actor: a }); return s;
  }
  spawnCounter(a, f) {
    const S = a.T.counter, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
    const s = { id: this.nextId++, type: 'counter', owner: a.id, kind: a.kind, T: S, x: a.x + fx * .7, y: a.y + a.T.height * .62, z: a.z + fz * .7, dx: fx, dz: fz, speed: S.speed, r: S.r, power: S.power, t: 0, phase: 'fly', against: f, tid: null };
    this.spells.push(s); this.event('counter', { spell: s, actor: a }); return s;
  }
  enemyTargets() { return this.targets.filter(t => t.alive); }
  stepSpell(s, dt) {
    s.t += dt;
    if (SKILLS[s.type]) return SKILLS[s.type].step(this, s, dt);
    if (s.type === 'claws') return this.stepClaws(s, dt);
    if (s.type === 'judgment') return this.stepJudgment(s, dt);
    return this.stepBolt(s, dt);
  }
  stepClaws(s, dt) {
    const T = s.T;
    if (s.phase === 'telegraph' && s.t >= T.telegraph) { s.phase = 'rise'; s.t -= T.telegraph; this.event('clawsRise', { spell: s }); }
    if (s.phase === 'rise' && s.t >= T.rise) {
      s.t -= T.rise;
      // fecham as mãos: quem está dentro e não esquivou é preso (um só); os demais levam o arranhão
      const inside = this.enemyTargets().filter(t => Math.hypot(t.x - s.x, t.z - s.z) <= s.r + t.radius * .5).sort((a, b) => (a.id === s.tid ? -1 : 0) - (b.id === s.tid ? -1 : 0));
      for (const t of inside) {
        if (t.iframes) { this.event('evaded', { spell: s, target: t.id }); continue; }
        const busy = this.spells.some(o => o !== s && o.type === 'claws' && o.held && o.held.id === t.id);
        if (!s.held && !busy && !this.ccImmune.has(t.id)) {
          const res = this.damageTarget(t.id, T.grabDmg, { kind: 'claws', spell: s.id, x: s.x, z: s.z, hold: true });
          if (res === 'hit' || res === 'blocked') { s.held = { id: t.id, t: 0, dur: T.hold * (1 - clamp(t.ccResist || 0, 0, .8)), ax: t.x + (s.x - t.x) * .35, az: t.z + (s.z - t.z) * .35 }; this.event('grab', { spell: s, target: t.id, dur: s.held.dur }); }
        } else if (!s.lashed.has(t.id)) { s.lashed.add(t.id); this.damageTarget(t.id, T.lash, { kind: 'claws', spell: s.id, x: s.x, z: s.z }); }
      }
      s.phase = s.held ? 'grab' : 'lash';
    }
    if (s.phase === 'grab') { s.held.t += dt; if (!this.target(s.held.id)) this.release(s, false); else if (s.held.t >= s.held.dur) this.release(s, true); }
    else if (s.phase === 'lash') {
      for (const t of this.enemyTargets()) if (!t.iframes && !s.lashed.has(t.id) && Math.hypot(t.x - s.x, t.z - s.z) <= s.r * .95) { s.lashed.add(t.id); this.damageTarget(t.id, T.lash, { kind: 'claws', spell: s.id, x: s.x, z: s.z }); }
      if (s.t >= T.lashT) { s.phase = 'sink'; s.t = 0; }
    } else if (s.phase === 'sink' && s.t >= T.sink) s.dead = true;
  }
  release(s, finish) {
    if (!s.held) return; const id = s.held.id;
    if (finish) this.damageTarget(id, s.T.endDmg, { kind: 'claws', spell: s.id, x: s.x, z: s.z });
    this.ccImmune.set(id, this.time + E1.ccImmune); this.event('release', { spell: s, target: id, escaped: !finish });
    s.held = null; s.phase = 'sink'; s.t = 0;
  }
  /** Dash no tempo certo solta das garras (depois de 0,3 s preso). Retorna true se escapou. */
  breakFree(targetId) {
    const s = this.spells.find(o => o.type === 'claws' && o.held && o.held.id === targetId);
    if (!s || s.held.t < E1.escapeAfter) return false; this.release(s, false); return true;
  }
  heldBy(targetId) { const s = this.spells.find(o => o.type === 'claws' && o.held && o.held.id === targetId); return s ? s.held : null; }
  stepJudgment(s, dt) {
    const T = s.T, t = this.target(s.tid);
    if (s.phase === 'prep') {
      // a marca acompanha a previsão só na preparação, com velocidade limitada; depois trava para dar esquiva
      if (t) { const p = this.lead(t, T.lead), dx = p.x - s.mx, dz = p.z - s.mz, d = Math.hypot(dx, dz), m = Math.min(d, T.chase * dt); if (d > 1e-4) { s.mx += dx / d * m; s.mz += dz / d * m; } s.my = this.ground(s.mx, s.mz); }
      const k = smooth(s.t / T.prep); s.ox = s.from.x + (s.mx - s.from.x) * k; s.oz = s.from.z + (s.mz - s.from.z) * k; s.oy = s.from.y + (s.my + 7.2 - s.from.y) * k;
      if (s.t >= T.prep) { s.phase = 'lock'; s.t -= T.prep; this.event('judgmentLock', { spell: s }); }
    } else if (s.phase === 'lock' && s.t >= T.lock) { s.phase = 'beam'; s.t -= T.lock; this.event('judgmentBeam', { spell: s }); }
    else if (s.phase === 'beam') {
      s.beamY = s.oy + (s.my - s.oy) * smooth(s.t / T.beam);
      if (s.t >= T.beam) {
        s.phase = 'blast'; s.t -= T.beam;
        for (const t2 of this.enemyTargets()) {
          const d = Math.hypot(t2.x - s.mx, t2.z - s.mz) - t2.radius * .5; if (d > s.r) continue;
          if (t2.iframes) { this.event('evaded', { spell: s, target: t2.id }); continue; }
          const dmg = Math.round(T.edge + (T.dmg - T.edge) * (1 - clamp(d / s.r, 0, 1)));
          s.hits.push(t2.id); this.damageTarget(t2.id, dmg, { kind: 'judgment', spell: s.id, x: s.mx, z: s.mz, knock: 1.2 });
        }
        this.event('judgmentBlast', { spell: s });
      }
    } else if (s.phase === 'blast' && s.t >= .35) { s.phase = 'fade'; s.t = 0; }
    else if (s.phase === 'fade' && s.t >= T.fade) s.dead = true;
  }
  /** Espiral e Contra-selo: viajam de verdade, colidem com alvos, obstáculos e terreno. */
  stepBolt(s, dt) {
    if (s.phase === 'burst') { if (s.t >= (s.T.burst || .55)) s.dead = true; return; }
    if (s.type === 'spiral') {
      const t = this.target(s.tid);
      if (t && s.t < s.T.steerT) { // correção curta no começo, nunca perseguição impossível
        const want = Math.atan2(t.x - s.x, t.z - s.z), cur = Math.atan2(s.dx, s.dz), turn = clamp(wrap(want - cur), -s.T.steer * dt, s.T.steer * dt);
        s.dx = Math.sin(cur + turn); s.dz = Math.cos(cur + turn);
      }
    } else if (s.type === 'counter') {
      const f = s.against; if (f && f.alive !== false && s.homing !== false) { const want = Math.atan2(f.x - s.x, f.z - s.z), cur = Math.atan2(s.dx, s.dz), turn = clamp(wrap(want - cur), -6 * dt, 6 * dt); s.dx = Math.sin(cur + turn); s.dz = Math.cos(cur + turn); }
      if (s.t >= s.T.life) { this.burst(s, 'fizzle'); return; }
    }
    s.spin += dt * (s.type === 'spiral' ? 9 : 14);
    const ax = s.x, az = s.z, stp = s.speed * dt; s.x += s.dx * stp; s.z += s.dz * stp; s.traveled += stp || 0;
    const g = this.ground(s.x, s.z); if (s.y < g + .5) s.y += (g + .5 - s.y) * Math.min(1, dt * 6);
    // varredura contra cada alvo (cápsula vertical) no plano: um impacto autoritativo, nunca um por fita visual
    for (const t of (s.type === 'counter' && !s.won ? [] : this.enemyTargets())) {
      const ex = s.x - ax, ez = s.z - az, l2 = ex * ex + ez * ez || 1, u = clamp(((t.x - ax) * ex + (t.z - az) * ez) / l2, 0, 1), cx = ax + ex * u, cz = az + ez * u;
      if (Math.hypot(t.x - cx, t.z - cz) > t.radius + s.r || s.y < (t.y || 0) - .2 || s.y > (t.y || 0) + (t.height || 1.8) + s.r) continue;
      if (t.iframes) { if (!s.evaded) { s.evaded = true; this.event('evaded', { spell: s, target: t.id }); } continue; }
      s.x = cx; s.z = cz;
      const res = this.damageTarget(t.id, Math.round(s.power), { kind: s.type, spell: s.id, x: ax, z: az, knock: s.T.knock || .8, guardBreak: s.type === 'spiral' });
      this.burst(s, 'hit', t.id, res); return;
    }
    if (this.blocked(s.x, s.z) || s.y < g - .1) { this.burst(s, 'wall'); return; }
    if (s.type === 'spiral' && s.traveled >= s.T.range) this.burst(s, 'fizzle');
  }
  burst(s, why, tid, res) { s.phase = 'burst'; s.t = 0; s.why = why; this.event('burst', { spell: s, why, target: tid, result: res }); }
  /** Magia × magia: espiral ou contra-selo contra magias externas (do herói/aliado). Potência decide quem vence. */
  clashes(dt) {
    for (const s of this.spells) {
      if (s.phase !== 'fly' || (s.type !== 'spiral' && s.type !== 'counter' && !(SKILLS[s.type] && SKILLS[s.type].clash))) continue;
      for (const f of this.foreign) {
        if (f.alive === false || !(f.power > 0)) continue;
        const tol = (s.speed + (f.speed || 0)) * dt * .5, d = Math.hypot(f.x - s.x, (f.y ?? s.y) - s.y, f.z - s.z);
        if (d > s.r + (f.r || .4) + tol) continue;
        const diff = s.power - f.power, x = (s.x + f.x) / 2, y = (s.y + (f.y ?? s.y)) / 2, z = (s.z + f.z) / 2;
        if (Math.abs(diff) <= 4) { f.alive = false; f.kill && f.kill(); this.burst(s, 'clash'); this.event('clash', { x, y, z, outcome: 'neutral', spell: s, foreign: f.id }); }
        else if (diff > 0) { f.alive = false; f.kill && f.kill(); s.power = diff; if (s.type === 'counter') { s.won = true; s.homing = false; s.t = Math.min(s.t, s.T.life - .8); } this.event('clash', { x, y, z, outcome: 'enemy', spell: s, foreign: f.id }); }
        else { f.power = -diff; f.weaken && f.weaken(s.power); this.burst(s, 'clash'); this.event('clash', { x, y, z, outcome: 'foreign', spell: s, foreign: f.id }); }
        break;
      }
    }
  }
  /** Estado resumido (laboratório, testes e HUD). */
  snapshot() {
    return { time: +this.time.toFixed(3), actors: this.actors.map(a => ({ id: a.id, kind: a.kind, role: a.role, hp: a.hp, alive: a.alive, x: +a.x.toFixed(2), z: +a.z.toFixed(2), act: a.act && (a.act.skill || a.act.type), intent: a.intent.mode, target: a.targetId, phase2: a.phase2 })),
      spells: this.spells.map(s => ({ id: s.id, type: s.type, phase: s.phase, owner: s.owner, held: s.held ? s.held.id : null })) };
  }
}
