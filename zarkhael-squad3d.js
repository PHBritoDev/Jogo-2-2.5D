/**
 * MISSÃO 20/11 — ZAR'KHAEL, “O Carrasco do Juízo Eterno” (Bispo 3), no motor da esquadra com o corpo NOVO `NewBispo3.glb`
 * e a FOICE própria. Só no treino dos Bispos (BISHOP_DUEL_ONLY, padrão); ?bisposComPoderes=1 mantém o Bispo 3 clássico com
 * Hidra, Chamas da Lua Negra, Espada Circular e Seis Selos intactos.
 *
 * Asset real (inspeção do GLB): 1 malha skinned (31 084 tri), 83 ossos (com dedos médios), 3 texturas WebP e 15 clipes:
 * Running .63 · Walking 1.03 · Attack 2.80 · Axe_Spin_Attack 2.50 · Charged_Upward_Slash 3.17 · Dead 2.97 ·
 * Double_Combo_Attack 2.83 · Left_Slash 3.17 · Skill_02 1.30 · Skill_03 1.63 · Triple_Combo_Attack 4.33 ·
 * Unarmed_Vault .83 · Weapon_Combo 3.67 · Weapon_Combo_1 3.50 · Weapon_Combo_2 4.50. Sem idle/guarda/reação (poses
 * recortadas do próprio GLB). Medição do quadril: Skill_02 (“Habilidade 2”) é o ÚNICO giro com as DUAS mãos juntas
 * (95 % dos quadros a < 0,45 m) e gira 1,8 volta; Skill_03 gira 1,2 volta com uma mão só; Axe_Spin_Attack, 1 volta.
 * Nenhum clipe tem 3–5 voltas: a Espiral do Carrasco usa o trecho de UMA volta exata do quadril do Skill_02 (quadros
 * 4→23) em laço com ritmo crescente, mais a entrada e a saída do mesmo clipe → ~3,9 voltas reais com as duas mãos.
 */
import { registerKind, E1 } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';
import { vgAnchorRoot, vgAim } from './vorgazhek3d.js';

export const ZARKHAEL_SQUAD_BUILD = '332-carrasco-foice';
export const ZK_FILE = './NewBispo3.glb?v=mod332';
export const ZK_ROLES = Object.freeze({
  idle: 'ZK_idle', walk: 'Walking', run: 'Running', dash: 'Unarmed_Vault', attack: 'Double_Combo_Attack', attack2: 'Weapon_Combo',
  block: 'ZK_guard', hit: 'ZK_hit', cast: 'ZK_guard', death: 'Dead',
  zk_heavy: 'Attack', zk_double: 'Double_Combo_Attack', zk_left: 'Left_Slash', zk_combo: 'Weapon_Combo', zk_wheel: 'Weapon_Combo_1',
  zk_sentence: 'Weapon_Combo_2', zk_triple: 'Triple_Combo_Attack', zk_spinax: 'Axe_Spin_Attack', zk_vault: 'Unarmed_Vault',
  zk_spin_in: 'ZK_spin_in', zk_spin_loop: 'ZK_spin_loop', zk_spin_out: 'ZK_spin_out'
});
export const ZK_IN_PLACE = Object.freeze(['dash', 'attack', 'attack2', 'death', 'hit', 'zk_heavy', 'zk_double', 'zk_left', 'zk_combo', 'zk_wheel', 'zk_sentence', 'zk_triple', 'zk_spinax', 'zk_vault', 'zk_spin_in', 'zk_spin_loop', 'zk_spin_out']);
export const ZK_TIME = Object.freeze({ dash: { from: .02, speed: 1.25 } });

/** Poses e trechos recortados do PRÓPRIO GLB (sem retarget). Raiz ancorada no neutro (o Double_Combo começa 1,08 m atrás). */
export function zkSynthClips(T, clips) {
  vgAnchorRoot(clips);
  const by = n => clips.find(c => c.name === n), ref = by('Attack')?.tracks.find(t => /hips[^.]*\.position$/i.test(t.name))?.values, out = [];
  const sub = (src, name, a, b) => { const s = by(src); if (!s) return; const c = T.AnimationUtils.subclip(s, name, a, b, 30);
    if (ref) for (const tr of c.tracks) if (/hips[^.]*\.position$/i.test(tr.name)) { const v = tr.values; for (let i = 0; i < v.length; i += 3) { v[i] = ref[0]; v[i + 2] = ref[2]; } }
    out.push(c); };
  sub('Attack', 'ZK_idle', 0, 8); sub('Attack', 'ZK_guard', 8, 14); sub('Double_Combo_Attack', 'ZK_hit', 52, 62);
  sub('Skill_02', 'ZK_spin_in', 0, 4); sub('Skill_02', 'ZK_spin_loop', 4, 23); sub('Skill_02', 'ZK_spin_out', 23, 39);
  return out;
}

/* Golpes nativos. hits = quadro em que a ponta da foice passa rápida na altura do corpo (traço medido no clipe, raiz
   ancorada, 30 Hz). A mira por corte (vgAim) gira o corpo para que esse ponto chegue no herói; aimMax limita o giro. */
export const ZK_MOVES = [
  { id: 'Ceifa_Dupla', clip: 'zk_double', label: 'Ceifa Dupla', hits: [1.17, 1.73], duration: 2.15, advance: 1.3, glide: true, weight: 1.2, opener: true, rate: 1.45 },
  { id: 'Corte_Sinistro', clip: 'zk_left', label: 'Corte Sinistro', hits: [1.2], duration: 1.75, advance: .6, weight: .9, rate: 1.4 },
  { id: 'Juizo_Descendente', clip: 'zk_heavy', label: 'Juízo Descendente', hits: [1.07], duration: 1.75, advance: .8, heavy: true, guardBreak: true, weight: .8, rate: 1.25, twoHands: true },
  { id: 'Ceifa_Tripla', clip: 'zk_combo', label: 'Ceifa Tripla', hits: [.53, 1.3, 2.03], duration: 2.45, advance: 1.1, glide: true, weight: .9, rate: 1.5 },
  { id: 'Roda_do_Carrasco', clip: 'zk_wheel', label: 'Roda do Carrasco', hits: [1.33, 2.43], duration: 2.8, advance: 1.7, glide: true, weight: .8, rate: 1.5, minPhase: 1 },
  { id: 'Sentenca_Ceifadora', clip: 'zk_sentence', label: 'Sentença Ceifadora', hits: [.9, 1.97, 3.0], duration: 3.35, advance: .8, weight: .9, rate: 1.55, minPhase: 1 },
  { id: 'Juizo_Triplo', clip: 'zk_triple', label: 'Juízo em Dois Tempos', hits: [1.6, 2.2], duration: 2.6, advance: 1.2, glide: true, weight: .8, rate: 1.5 },
  { id: 'Giro_Revés', clip: 'zk_spinax', label: 'Giro de Revés', hits: [.77], duration: 1.4, advance: .2, spin: true, weight: .5, rate: 1.3, aimMax: 3.2 },
  { id: 'Salto_Ceifador', clip: 'zk_vault', label: 'Salto Ceifador', hits: [.27], duration: .8, advance: 2.4, range: [2.8, 6.2], score: .9, cd: 5, fast: true, aim: true, rate: 1.1 }
];
BOSS_MOVES.zarkhael = ZK_MOVES.map(m => ({ ...m, patterns: ['diagonal'] }));
for (const m of BOSS_MOVES.zarkhael) { m.kind = 'zarkhael'; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = m.heavy ? 1.3 : m.fast ? .85 : m.hits.length > 2 ? .85 : 1; }

/** Empunhadura da foice (constante, medida no GLB): os dedos seguem +Y do osso RightHand; nos quadros a duas mãos a mão
    esquerda fica em +Z da direita (média 0,97 de alinhamento no Skill_02) → a haste corre em +Z da mão, cabeça além da mão
    esquerda (−Z enterrava a cabeça no chão em 6 de 7 clipes). A lâmina aponta para os dedos (+Y da mão). */
export function zkGrip(T) { return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), new T.Vector3(1, 0, 0))); }

/** Dash: início a início NUNCA abaixo de 0,5 s (regra do criador); o que muda é a intenção da sequência. */
export const ZK_DASH = Object.freeze({ speed: 13.5, time: .2, cd: .5, minStart: .5, budget: 4, window: 3, lockout: 1.2 });
/** ESPIRAL DO CARRASCO: prep a duas mãos → 3 voltas em laço com ritmo crescente → saída → lança a massa helicoidal. */
export const ZK_SPIRAL = Object.freeze({ gap: [3.5, 13], cd: 9.5, prep: .45, loops: [.85, 1.05, 1.3], loopDur: 19 / 30, outDur: 16 / 30, outSpeed: 1.2, release: .2, lockLead: .25,
  recover: .9, spinR: 2.35, spinDmg: 8, speed: 12.5, range: 18, radius: .95, dmg: 24, knock: 1.3, height: 1.15, spawn: 1.6 });

const clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrap = x => Math.atan2(Math.sin(x), Math.cos(x));
const ZK = {
  ...E1.common, hp: 2300, radius: .5, height: 2.15, poise: 70, flinch: 99, stamina: 160, sight: 40, leash: 60, boss: true, pref: [1.4, 2.4], phase2: .4, furyCd: .8, staggerArmor: 2,
  speed: { walk: 2.7, run: 6.0, strafe: 3, back: 3.4, turn: 10 },
  melee: { max: 2.9, reach: 2.8, arc: .1, windup: .45, hits: [.45], dur: 1, dmg: 13, cd: 1, knock: .8 },
  dash: ZK_DASH, block: { chance: .2, dur: .5, cd: 1.6, cost: 12, reduce: .75 }, dodge: { chance: .3, cd: ZK_DASH.cd },
  counter: { ...E1.common.counter, chance: 0, cd: 99 }, leap: null, shield: null,
  decide: [.14, .24], gap: .4, kit: [], interrupt: true, feint: null, maxBig: 1,
  brain: zkBrain, pickMove: zkPickMove, moveAim: vgAim
};
export const ZARK = Object.freeze({ boss: registerKind('zarkhael', ZK) });

export function zkPickMove(sq, a, t, pool) {
  if (!pool.length) return null; const recent = a.recentMoves || (a.recentMoves = []), st = sq.study(t.id).rates;
  const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz) || 1, front = (dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw)) / d, toward = -((t.vx || 0) * dx + (t.vz || 0) * dz) / d;
  let best = null, bs = -Infinity;
  for (const m of pool) { let w = m.weight || 1;
    if (recent.at(-1) === m.id) w -= 2; else if (recent.includes(m.id)) w -= .4;
    if (m.guardBreak && (t.blocking || st.block > .25)) w += 1.1;
    if (m.spin) w += front < -.2 ? 1.6 : -1.2; // revés só quando o herói está às costas
    if (m.advance > 1.2 && toward < -1) w += .7;
    if (m.hits.length > 2) w += .2 * (a.zkPhase || 0);
    w += (sq.rand() - .5) * .5; if (w > bs) { bs = w; best = m; } }
  recent.push(best.id); if (recent.length > 3) recent.shift(); return best;
}

export const zkPhaseOf = (hp, max) => { const k = hp / Math.max(1, max); return k > .7 ? 0 : k > .4 ? 1 : k > .15 ? 2 : 3; };
export const ZK_TACTICS = Object.freeze({ every: [.3, .55], chase: { gap: [2.8, 9], cd: 3.2 }, flank: { gap: [.6, 3.2], cd: 3 }, back: { cd: 3.4 }, spiral: ZK_SPIRAL.gap });

/* ---------------- sequências de dash com objetivo (início a início ≥ 0,5 s) ---------------- */
function dashReady(sq, a) { return sq.time - (a.zkLastDash ?? -9) >= ZK_DASH.minStart; }
function stepChain(sq, a, t, dt) {
  const c = a.zkChain; if (!c || !c.steps.length || a.act) return false;
  a.decideT = Math.max(a.decideT || 0, .15); a.react = null;
  if (!dashReady(sq, a)) return true;
  const s = c.steps.shift(), d = Math.hypot(t.x - a.x, t.z - a.z) || 1, ux = (t.x - a.x) / d, uz = (t.z - a.z) / d;
  const dir = side => { let dx = s.f * ux + side * uz, dz = s.f * uz - side * ux; const l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  const reach = ZK_DASH.speed * ZK_DASH.time * (s.len || 1), free = ([x, z]) => !sq.blocked(a.x + x * reach, a.z + z * reach) && !sq.blocked(a.x + x * reach * .5, a.z + z * reach * .5);
  let [dx, dz] = dir(s.s); if (!free([dx, dz]) && s.s) [dx, dz] = dir(-s.s);
  if (!free([dx, dz])) { c.steps.length = 0; c.cut = true; }
  else { const along = dx * (t.x - a.x) + dz * (t.z - a.z), perp = Math.abs(dx * (t.z - a.z) - dz * (t.x - a.x)), room = (t.radius || .4) + a.T.radius + .4;
    const len = along > 0 && perp < room ? clamp((along - room) / reach, .2, s.len || 1) : (s.len || 1), last = !c.steps.length;
    sq.begin(a, { type: 'dodge', dur: ZK_DASH.time * len, anim: 'dash', animFrom: ZK_TIME.dash.from, animSpeed: ZK_TIME.dash.speed, dx, dz, iframes: !!s.iframes, face: !!s.face, chain: last && c.then === 'melee' ? 'melee' : undefined, token: last && c.then === 'melee' ? 'melee' : undefined, tid: t.id, goal: c.goal + ':' + (c.n - c.steps.length) });
    c.done = (c.done || 0) + 1; }
  if (!c.steps.length) { const then = c.then; a.zkChain = null; const S = a.zkStats; S.seq[Math.min(3, c.done || 0)]++; sq.event('zkChainEnd', { actor: a, goal: c.goal, n: c.n, done: c.done || 0, cut: !!c.cut });
    if (then === 'spiral' && !a.cds.zkSpiral && sq.canAttack(a, 'melee', t.id)) a.zkSpiralNext = true; }
  return true;
}
function chain(sq, a, goal, steps, then) { a.zkChain = { goal, steps, n: steps.length, then }; sq.event('zkChain', { actor: a, goal, n: steps.length }); }

/* ---------------- Espiral do Carrasco ---------------- */
export function zkStartSpiral(sq, a, t) {
  zkInit(a); const S = ZK_SPIRAL; a.cds.zkSpiral = S.cd * a.cdMul; a.cds.melee = Math.max(a.cds.melee || 0, 1); a.zkChain = null;
  const total = S.prep + S.loops.reduce((s, k) => s + S.loopDur / k, 0) + S.outDur / S.outSpeed + S.recover;
  sq.begin(a, { type: 'zkSpiral', dur: total, anim: 'zk_spin_in', animSpeed: (4 / 30) / S.prep, token: 'melee', tid: t.id, face: true, phase: 'prep', loop: -1, glow: 0, armor: false, spinHit: new Set() });
  sq.event('zkSpiral', { actor: a, phase: 'prep' }); a.zkStats.spiral++;
}
function stepSpiral(sq, a, t, dt) {
  const S = ZK_SPIRAL, act = a.act; let k = act.t - S.prep;
  if (act.phase === 'prep') { act.glow = clamp(act.t / S.prep, 0, 1) * .3; if (k < 0) return;
    act.phase = 'spin'; act.loop = 0; act.loopT = 0; act.face = false; act.armor = true; a.anim = { role: 'zk_spin_loop', once: true, speed: S.loops[0], rev: a.anim.rev + 1 }; sq.event('zkSpiral', { actor: a, phase: 'spin', loop: 0 }); return; }
  if (act.phase === 'spin') { act.loopT += dt; const L = S.loopDur / S.loops[act.loop]; act.glow = .3 + .7 * (act.loop + act.loopT / L) / S.loops.length;
    if (t) { const want = Math.atan2(t.x - a.x, t.z - a.z); a.yaw = wrap(a.yaw + clamp(wrap(want - a.yaw), -2.2 * dt, 2.2 * dt)); } // o corpo deriva devagar para o alvo durante as voltas (não segue colado)
    if (t && !act.spinHit.has(act.loop) && act.loopT >= L * .5) { act.spinHit.add(act.loop); const d = Math.hypot(t.x - a.x, t.z - a.z) - (t.radius || .4);
      if (d <= S.spinR && Math.abs((t.y || 0) - a.y) < 1.6 && sq.los(a.x, a.z, t.x, t.z)) { const r = sq.damageTarget(t.id, S.spinDmg, { kind: 'melee', actor: a.id, x: a.x, z: a.z, knock: .5, combo: act.loop + 1 }); sq.event('meleeHit', { actor: a, target: t.id, result: r, n: act.loop + 1, move: 'espiral-giro' }); } }
    if (act.loopT >= L) { act.loop++; act.loopT = 0;
      if (act.loop < S.loops.length) { a.anim = { role: 'zk_spin_loop', once: true, speed: S.loops[act.loop], rev: a.anim.rev + 1 }; sq.event('zkSpiral', { actor: a, phase: 'spin', loop: act.loop }); }
      else { act.phase = 'out'; act.outT = 0; a.anim = { role: 'zk_spin_out', once: true, speed: S.outSpeed, rev: a.anim.rev + 1 }; sq.event('zkSpiral', { actor: a, phase: 'out' }); } }
    return; }
  if (act.phase === 'out') { act.outT += dt; act.glow = 1;
    if (!act.locked && t && act.outT >= S.release - S.lockLead) { act.locked = true; act.dir = Math.atan2(t.x - a.x, t.z - a.z); act.aimAt = { x: t.x, z: t.z }; a.yaw = act.dir; sq.event('zkSpiral', { actor: a, phase: 'lock', dir: act.dir }); }
    if (!act.released && act.outT >= S.release) { act.released = true; const dir = act.dir ?? a.yaw, fx = Math.sin(dir), fz = Math.cos(dir);
      const bolt = { id: ++sq._zkBolt || (sq._zkBolt = 1), owner: a.id, x: a.x + fx * S.spawn, y: a.y + S.height, z: a.z + fz * S.spawn, dx: fx, dz: fz, travel: 0, alive: true, hit: false, age: 0, tid: t && t.id };
      (a.zkBolts || (a.zkBolts = [])).push(bolt); sq.event('zkSpiral', { actor: a, phase: 'release', bolt }); act.glow = .2; }
    if (act.outT >= S.outDur / S.outSpeed) { act.phase = 'recover'; act.armor = false; act.glow = 0; a.anim = { role: 'idle', once: false, speed: 1, rev: a.anim.rev + 1 }; }
    return; }
}
/** Massa helicoidal: viaja em linha reta na direção travada (sem perseguir), colide por cápsula com o herói, para em terreno. */
function stepBolts(sq, a, dt) {
  const S = ZK_SPIRAL, list = a.zkBolts; if (!list || !list.length) return;
  for (const b of list) { if (!b.alive) continue; b.age += dt; const st = S.speed * dt; b.x += b.dx * st; b.z += b.dz * st; b.travel += st;
    if (sq.blocked(b.x, b.z)) { b.alive = false; sq.event('zkSpiral', { actor: a, phase: 'impact', bolt: b, wall: true }); continue; }
    for (const t of sq.enemyTargets()) { if (b.hit) break; const d = Math.hypot(t.x - b.x, t.z - b.z); if (d > S.radius + (t.radius || .4) || Math.abs((t.y || 0) + (t.height || 1.8) * .5 - b.y) > 1.6) continue;
      if (t.iframes) { if (!b.evaded) { b.evaded = true; sq.event('evaded', { spell: { type: 'zkSpiral' }, target: t.id }); a.zkStats.boltEvade++; } continue; }
      b.hit = true; b.alive = false; const r = sq.damageTarget(t.id, S.dmg, { kind: 'spell', actor: a.id, x: b.x, z: b.z, knock: S.knock, combo: 1 }); a.zkStats.boltHit++;
      sq.event('meleeHit', { actor: a, target: t.id, result: r, n: 1, move: 'espiral' }); sq.event('zkSpiral', { actor: a, phase: 'impact', bolt: b, target: t.id }); }
    if (b.alive && b.travel >= S.range) { b.alive = false; a.zkStats.boltMiss++; sq.event('zkSpiral', { actor: a, phase: 'impact', bolt: b, fade: true }); } }
  if (list.length > 4) a.zkBolts = list.filter(b => b.alive);
}

/* ---------------- cérebro ---------------- */
function zkInit(a) { if (a.zkStats) return; a.zkStats = { dash: 0, chains: {}, spiral: 0, combos: 0, boltHit: 0, boltMiss: 0, boltEvade: 0, seq: { 0: 0, 1: 0, 2: 0, 3: 0 }, groups: { 1: 0, 2: 0, 3: 0, 4: 0 }, minDashGap: 9 }; a.vgStats = a.zkStats; }
export function zkBrain(sq, a, dt, t) {
  if (!a.ownT) { a.T = { ...a.T, block: { ...a.T.block }, dodge: { ...a.T.dodge } }; a.ownT = true; } zkInit(a);
  stepBolts(sq, a, dt);
  const ph = zkPhaseOf(a.hp, a.maxHp); if (ph !== a.zkPhase) { const was = a.zkPhase; a.zkPhase = ph; a.vzPhase = ph; if (was !== undefined) sq.event('zkPhase', { actor: a, phase: ph }); }
  a.cdMul = Math.min(a.cdMul || 1, [1, .93, .84, .75][ph]);
  const S = a.zkStats;
  if (a.act && a.act !== a._zkAct) { a._zkAct = a.act;
    if (a.act.type === 'dodge') { S.dash++; const gap = sq.time - (a.zkLastDash ?? -9); S.minDashGap = Math.min(S.minDashGap, +gap.toFixed(3)); a.zkLastDash = sq.time; (a.zkDashAt || (a.zkDashAt = [])).push(sq.time);
      if (gap < ZK_DASH.time + .62) { a._zkRun++; S.groups[Math.min(4, a._zkRun - 1)]--; } else a._zkRun = 1; S.groups[Math.min(4, a._zkRun)]++; a.cds.dodge = Math.max(a.cds.dodge || 0, ZK_DASH.minStart); }
    if (a.act.type === 'melee') S.combos++; }
  a.zkDashAt = (a.zkDashAt || []).filter(x => sq.time - x < ZK_DASH.window); if (a.zkDashAt.length >= ZK_DASH.budget) { a.cds.dodge = Math.max(a.cds.dodge || 0, ZK_DASH.lockout); a.cds.zkChain = Math.max(a.cds.zkChain || 0, ZK_DASH.lockout); }
  if (a.act && a.act.type === 'zkSpiral') { stepSpiral(sq, a, t, dt); return; }
  if (!t || a.pendingDeath || a.alert > 0) return;
  const st = sq.study(t.id), k = Math.exp(-dt / 6); a.zkHeroDash = (a.zkHeroDash || 0) * k + (t.dashing && !a.zkSawDash ? 1 : 0); a.zkSawDash = !!t.dashing;
  a.zkPress = (a.zkPress || 0) * k + (t.attacking && Math.hypot(t.x - a.x, t.z - a.z) < 3.2 ? dt : 0);
  if (stepChain(sq, a, t, dt)) return;
  if (a.zkSpiralNext && !a.act) { a.zkSpiralNext = false; zkStartSpiral(sq, a, t); return; }
  if (a.act || a.react) return;
  if ((a.zkTacT = (a.zkTacT ?? .3) - dt) > 0) return; a.zkTacT = ZK_TACTICS.every[0] + sq.rand() * (ZK_TACTICS.every[1] - ZK_TACTICS.every[0]);
  const T = ZK_TACTICS, d = Math.hypot(t.x - a.x, t.z - a.z) || 1, gap = d - (t.radius || .4) - a.T.radius, see = sq.los(a.x, a.z, t.x, t.z), canMelee = sq.canAttack(a, 'melee', t.id);
  const toward = -((t.vx || 0) * (t.x - a.x) + (t.vz || 0) * (t.z - a.z)) / d, flee = toward < -2.5, chainOk = !a.cds.zkChain && !a.cds.dodge && dashReady(sq, a), opts = [], side = sq.rand() < .5 ? 1 : -1;
  // Perseguição: herói longe ou fugindo → 1–2 passos à frente em diagonal e corte (ou laço na Espiral se ainda longe)
  if (chainOk && see && canMelee && !a.cds.zkChase && gap >= T.chase.gap[0] && gap <= T.chase.gap[1]) opts.push(['perseguir', .34 + (flee ? .3 : 0) + (a.zkHeroDash > 1 ? .15 : 0) + ph * .04]);
  // Flanco: herói perto parado/defendendo → passo lateral e corte pelo lado
  if (chainOk && canMelee && !a.cds.zkFlank && gap >= T.flank.gap[0] && gap <= T.flank.gap[1] && (t.blocking || Math.hypot(t.vx || 0, t.vz || 0) < 1.2)) opts.push(['flanco', .26 + (t.blocking ? .3 : 0)]);
  // Recuo: pressão colada ou dashes repetidos do herói → afasta e, se abrir distância, prepara a Espiral (anti-recuo)
  if (chainOk && !a.cds.zkBack && gap < 2.4 && (a.zkPress > .8 || a.zkHeroDash > 1.4 || t.attacking)) opts.push(['recuo', .28 + Math.min(.35, a.zkPress * .2) + (a.zkHeroDash > 1.8 ? .2 : 0)]);
  // Espiral do Carrasco: média/longa distância, herói visível; mais provável contra quem foge ou abusa de dash
  if (!a.cds.zkSpiral && see && canMelee && gap >= T.spiral[0] && gap <= T.spiral[1]) opts.push(['espiral', .3 + (flee ? .2 : 0) + (a.zkHeroDash > 1.2 ? .15 : 0) + ph * .05]);
  if (!opts.length) return;
  const top = Math.max(...opts.map(o => o[1])); if (sq.rand() > Math.min(.85, top)) return;
  let roll = sq.rand() * opts.reduce((x, o) => x + o[1], 0), goal = opts[0][0]; for (const o of opts) { roll -= o[1]; if (roll <= 0) { goal = o[0]; break; } }
  sq.event('zkTactic', { actor: a, goal, gap: +gap.toFixed(2) }); S.chains[goal] = (S.chains[goal] || 0) + 1;
  if (goal === 'perseguir') { a.cds.zkChase = T.chase.cd * a.cdMul; const n = gap > 5.5 || flee ? 2 : 1, steps = [];
    for (let i = 0; i < n; i++) steps.push({ f: .9, s: side * (i % 2 ? -.35 : .35), len: 1, face: true });
    chain(sq, a, 'perseguir', steps, gap > 8.5 && !a.cds.zkSpiral ? 'spiral' : 'melee'); return; }
  if (goal === 'flanco') { a.cds.zkFlank = T.flank.cd * a.cdMul; chain(sq, a, 'flanco', [{ f: .25, s: side, len: .8, face: true, iframes: true }], 'melee'); return; }
  if (goal === 'recuo') { a.cds.zkBack = T.back.cd * a.cdMul; const steps = [{ f: -.95, s: side * .3, len: 1, face: true, iframes: true }]; if (sq.rand() < .5) steps.push({ f: -.4, s: -side * .9, len: .9, face: true });
    chain(sq, a, 'recuo', steps, !a.cds.zkSpiral && sq.rand() < .55 ? 'spiral' : undefined); return; }
  if (goal === 'espiral') { zkStartSpiral(sq, a, t); return; }
}
