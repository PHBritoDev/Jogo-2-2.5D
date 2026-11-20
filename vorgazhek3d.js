/**
 * MISSÃO 19/11 — VORGAZHEK (Bispo 2) no motor da esquadra, com o corpo NOVO `NewBispo2_Otimizado.glb`.
 *
 * Asset real (inspeção binária, ver docs/combate/MISSAO-VORGAZHEK-2026-11-19.md): 1 malha skinned (30 738 tri), 1 material
 * com 3 texturas JPEG, skin de 23 ossos (mesmos nomes do VHAZRAEL.glb, proporções e poses de repouso PRÓPRIAS), sem arma
 * na malha e 10 clipes: Running .63 · Walking 1.03 · Attack 2.80 · Basic_Jump 5.87 · Dead 2.97 · Double_Blade_Spin 5.67 ·
 * Double_Combo_Attack 2.83 · Jump_Over_Obstacle_2 .87 · Triple_Combo_Attack 4.33 · Weapon_Combo_2 4.50.
 * Não há idle, guarda nem reação: são POSES recortadas dos próprios clipes (nada retargetado de outro corpo).
 * Picos da mão direita medidos (velocidade do osso RightHand, 30 Hz) → janelas de dano no arco visível.
 *
 * Identidade: espadachim do vazio que governa DISTÂNCIA e TEMPO — Passo do Eclipse (1–3 dashes curtos até o flanco,
 * último em arco), Retirada do Crepúsculo (2–3 tempos de recuo/lateral contra quem encadeia dashes), Órbita do Vazio
 * (corta ENQUANTO recua ou avança), Investida Corrompida (corrida → estocada), Atravessamento Aéreo (salto → dash aéreo
 * lateral → pouso em corte), Guarda da Fenda (escudo/guarda temporizados com recarga) e Sentença de Dois Tempos.
 * No treino dos Bispos (BISHOP_DUEL_ONLY) nenhuma magia nasce: o kit fica vazio e os ganchos de reposicionar→conjurar
 * só disparam quando houver kit (?bisposComPoderes=1 mantém o Bispo 2 clássico com todos os poderes originais).
 */
import { registerKind, E1 } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';

export const VORGAZHEK_BUILD = '330-vazio-novo-rig';
export const VG_FILE = './NewBispo2_Otimizado.glb?v=mod330';
export const VG_ROLES = Object.freeze({
  idle: 'VG_idle', walk: 'Walking', run: 'Running', dash: 'Jump_Over_Obstacle_2', jump: 'Basic_Jump', attack: 'Double_Combo_Attack', attack2: 'Weapon_Combo_2',
  block: 'VG_guard', hit: 'VG_hit', cast: 'VG_guard', death: 'Dead',
  vg_double: 'Double_Combo_Attack', vg_triple: 'Triple_Combo_Attack', vg_heavy: 'Attack', vg_orbit: 'Weapon_Combo_2', vg_spin: 'Double_Blade_Spin'
});
export const VG_IN_PLACE = Object.freeze(['dash', 'jump', 'attack', 'attack2', 'death', 'hit', 'vg_double', 'vg_triple', 'vg_heavy', 'vg_orbit', 'vg_spin']);
export const VG_TIME = Object.freeze({ jump: { from: 1.45, speed: 1.3 }, dash: { from: .05, speed: 1.4 } });

/** Poses recortadas dos clipes do PRÓPRIO GLB (sem retarget): guarda = 1º quadro do Attack (lâmina erguida), reação = recuo do Double_Combo. */
export function vgSynthClips(T, clips) {
  const by = n => clips.find(c => c.name === n), out = [], sub = (src, name, a, b) => { const s = by(src); if (!s) return; const c = T.AnimationUtils.subclip(s, name, a, b, 30); out.push(c); };
  sub('Attack', 'VG_idle', 0, 6); sub('Attack', 'VG_guard', 6, 12); sub('Double_Combo_Attack', 'VG_hit', 44, 56);
  return out;
}

/* Golpes nativos (hits = picos medidos da mão; rate = cadência própria; advance negativo = corta recuando) */
export const VG_MOVES = [
  { id: 'Eclipse_Duplo', clip: 'vg_double', label: 'Sentença de Dois Tempos', hits: [.63, 1.2], duration: 1.7, advance: 1.3, glide: true, weight: 1.2, opener: true, rate: 1.45 },
  { id: 'Orbita_Recuo', clip: 'vg_orbit', label: 'Órbita do Vazio', hits: [1.0, 1.97], duration: 2.45, advance: -1.6, glide: true, retreatCut: true, weight: .9, rate: 1.5 },
  { id: 'Orbita_Avanco', clip: 'vg_orbit', label: 'Órbita do Vazio — avanço', hits: [1.97, 3.0], duration: 3.35, advance: 1.9, glide: true, minPhase: 1, weight: .8, rate: 1.55 },
  { id: 'Fenda_Queda', clip: 'vg_heavy', label: 'Queda da Fenda', hits: [1.07], duration: 1.72, advance: .7, heavy: true, guardBreak: true, weight: .7, rate: 1.25, arc: true },
  { id: 'Giro_Eclipse', clip: 'vg_spin', label: 'Giro do Eclipse', hits: [.9, 1.5], duration: 2.0, advance: .3, spin: true, weight: .6, rate: 1.35 },
  { id: 'Sentenca_Tripla', clip: 'vg_triple', label: 'Sentença Tripla do Vazio', hits: [.77, 1.5, 2.33], duration: 2.8, advance: 1.5, glide: true, minPhase: 1, weight: 1, rate: 1.55, arc: true },
  { id: 'Investida_Corrompida', clip: 'dash', label: 'Investida Corrompida', hits: [.62], duration: .87, advance: 3, range: [2.6, 6.2], score: .9, cd: 5, fast: true, aim: true, rate: 1.2 }
];
BOSS_MOVES.vorgazhek = VG_MOVES.map(m => ({ ...m, patterns: ['diagonal'] }));
for (const m of BOSS_MOVES.vorgazhek) { m.kind = 'vorgazhek'; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = m.heavy ? 1.3 : m.fast ? .85 : m.hits.length > 2 ? .85 : 1; }

/** Guarda da Fenda: escudo próprio (vidro de vazio índigo com fissuras ciano) — curto, recarga real, rompe com golpe pesado. */
export const VG_SHIELD = Object.freeze({ id: 'vorgazhek', duration: 1.6, cooldown: 7.5, durability: 110, mitigation: .72, drain: 1, areaDrain: .5, areaTick: .3, breakAt: 36, radiusK: .6, skin: 'fenda',
  colors: { core: 0x05061a, edge: 0x5fe8ff, glow: 0x2a1a7a, crack: 0xe8fbff } });
/** Dash curto e rápido; o que muda é a SEQUÊNCIA (1–3 passos com objetivo), não a recarga. */
export const VG_DASH = Object.freeze({ speed: 15, time: .17, cd: .35, budget: 5, window: 3, lockout: 1.2, gap: .07 });
/** Salto com dash aéreo lateral (não é o salto alto do VHAZRAEL): baixo, curvo, pousa cortando. */
export const VG_LEAP = Object.freeze({ min: 3, max: 8, crouch: .14, v1: 6.2, v2: 4.6, second: .3, dash: .22, dashSpeed: 14, fall: -16, maxAir: 1.2, gravity: 20, strike: { r: 2, dmg: 14, arc: -.2 }, recover: .4, cd: 6.5, role: 'jump', from: 1.45, speed: 1.3 });

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const VG = {
  ...E1.common, hp: 2200, radius: .5, height: 2.15, poise: 64, flinch: 99, stamina: 150, sight: 40, leash: 60, boss: true, pref: [1.3, 2.2], phase2: .4, furyCd: .8, staggerArmor: 2,
  speed: { walk: 2.9, run: 6.2, strafe: 3.1, back: 3.6, turn: 11 },
  melee: { max: 2.7, reach: 2.6, arc: .1, windup: .4, hits: [.4], dur: 1, dmg: 12, cd: 1, knock: .7 },
  dash: VG_DASH, block: { chance: .22, dur: .45, cd: 1.4, cost: 12, reduce: .78 }, dodge: { chance: .34, cd: VG_DASH.cd },
  counter: { ...E1.common.counter, chance: 0, cd: 99 }, leap: VG_LEAP, shield: VG_SHIELD,
  shieldAI: { react: .16, chanceVsCast: .45, chanceVsMelee: .3, minGap: .8, maxGap: 9, gap: 2.2 },
  decide: [.14, .24], gap: .38, kit: [], interrupt: true, feint: null, maxBig: 1,
  brain: vorgBrain, pickMove: vorgPickMove
};
export const VORG = Object.freeze({ boss: registerKind('vorgazhek', VG) });

/** Escolha do golpe: não repete, guarda → pesado, herói de lado → giro, herói avançando colado → Órbita recuando. */
export function vorgPickMove(sq, a, t, pool) {
  if (!pool.length) return null; const recent = a.recentMoves || (a.recentMoves = []), st = sq.study(t.id).rates;
  const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz) || 1, front = (dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw)) / d, toward = -((t.vx || 0) * dx + (t.vz || 0) * dz) / d;
  let best = null, bs = -Infinity;
  for (const m of pool) {
    let w = m.weight || 1;
    if (recent.at(-1) === m.id) w -= 2; else if (recent.includes(m.id)) w -= .4;
    if (m.guardBreak && (t.blocking || st.block > .25)) w += 1.1;
    if (m.spin && front < .35) w += 1.2;
    if (m.retreatCut && (toward > 1.2 || t.attacking)) w += 1;
    if (m.advance > 1.5 && toward < -1) w += .7; // herói recuando → persegue cortando
    if (m.hits.length > 2) w += .2 * (a.vgPhase || 0);
    w += (sq.rand() - .5) * .5; if (w > bs) { bs = w; best = m; }
  }
  recent.push(best.id); if (recent.length > 3) recent.shift(); return best;
}

/* ---------------- cérebro: fase, orçamento de dash, sequências de dash e táticas ---------------- */
export const VG_TACTICS = Object.freeze({ every: [.3, .5],
  eclipse: { gap: [2, 8], cd: 3.4 }, twilight: { cd: 3.2 }, aerial: { gap: [2.5, 7.5], cd: 6.5 }, charge: { gap: [5.5, 12], cd: 6, run: .55 }, fissure: { cd: 2.2 } });
export const vgPhaseOf = (hp, max) => { const k = hp / Math.max(1, max); return k > .7 ? 0 : k > .4 ? 1 : k > .15 ? 2 : 3; };

/** Executa a sequência de dashes (cada passo com direção recalculada ao começar; para se o terreno bloquear). */
function vgStepChain(sq, a, t, dt) {
  const c = a.vgChain; if (!c || !c.steps.length || a.act) return false;
  if ((c.wait -= dt) > 0) return true; // pequeno respiro entre passos
  const s = c.steps.shift(), d = Math.hypot(t.x - a.x, t.z - a.z) || 1, ux = (t.x - a.x) / d, uz = (t.z - a.z) / d;
  let dx = s.f * ux + s.s * uz, dz = s.f * uz - s.s * ux; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const reach = VG_DASH.speed * VG_DASH.time * (s.len || 1);
  if (sq.blocked(a.x + dx * reach, a.z + dz * reach)) { c.steps.length = 0; } // terreno não livre: encerra a sequência sem atravessar
  else {
    // nunca entra no corpo do herói: o passo para antes da cápsula
    const along = dx * (t.x - a.x) + dz * (t.z - a.z), perp = Math.abs(dx * (t.z - a.z) - dz * (t.x - a.x)), room = (t.radius || .4) + a.T.radius + .35;
    const len = along > 0 && perp < room ? clamp((along - room) / reach, .25, s.len || 1) : (s.len || 1);
    const last = !c.steps.length;
    sq.begin(a, { type: 'dodge', dur: VG_DASH.time * len, anim: 'dash', dx, dz, iframes: !!s.iframes, face: !!s.face, chain: last && c.then === 'melee' ? 'melee' : undefined, token: last && c.then === 'melee' ? 'melee' : undefined, tid: t.id, goal: c.goal + ':' + (c.n - c.steps.length) });
    a.vgDashes = (a.vgDashes || 0) + 1; c.wait = VG_DASH.gap;
  }
  if (!c.steps.length) { const then = c.then; a.vgChain = null; if (then === 'leap' && sq.canAttack(a, 'melee', t.id)) a.vgLeapNext = true; }
  return true;
}
function chain(sq, a, goal, steps, then) { a.vgChain = { goal, steps, n: steps.length, then, wait: 0 }; sq.event('vgChain', { actor: a, goal, n: steps.length }); }

export function vorgBrain(sq, a, dt, t) {
  if (!a.ownT) { a.T = { ...a.T, block: { ...a.T.block }, dodge: { ...a.T.dodge } }; a.ownT = true; a.vgStats = { dash: 0, chains: {}, shield: 0, leap: 0, combos: 0 }; }
  const ph = vgPhaseOf(a.hp, a.maxHp); if (ph !== a.vgPhase) { const was = a.vgPhase; a.vgPhase = ph; a.vzPhase = ph; if (was !== undefined) sq.event('vgPhase', { actor: a, phase: ph }); }
  a.cdMul = Math.min(a.cdMul || 1, [1, .92, .82, .72][ph]);
  // orçamento de dash (contado pelos atos de dash iniciados)
  const S = a.vgStats; if (a.act && a.act !== a._vgAct) { a._vgAct = a.act; if (a.act.type === 'dodge') { S.dash++; (a.vgDashAt || (a.vgDashAt = [])).push(sq.time); } if (a.act.type === 'leap') S.leap++; if (a.act.type === 'melee') S.combos++; }
  a.vgDashAt = (a.vgDashAt || []).filter(x => sq.time - x < VG_DASH.window); if (a.vgDashAt.length >= VG_DASH.budget) { a.cds.dodge = Math.max(a.cds.dodge || 0, VG_DASH.lockout); a.cds.vgChain = Math.max(a.cds.vgChain || 0, VG_DASH.lockout); }
  if (!t || a.pendingDeath || a.alert > 0) return;
  // estilo observado do herói (decai em ~6 s)
  const st = sq.study(t.id), k = Math.exp(-dt / 6); a.vgHeroDash = (a.vgHeroDash || 0) * k + (t.dashing && !a.vgSawDash ? 1 : 0); a.vgSawDash = !!t.dashing;
  a.vgPress = (a.vgPress || 0) * k + (t.attacking && Math.hypot(t.x - a.x, t.z - a.z) < 3.2 ? dt : 0);
  if (a.act && a.act.type === 'run') { vorgStepRun(sq, a, t, dt); return; }
  if (a.vgRun && !a.act) { a.vgRun = false; if (sq.canAttack(a, 'melee', t.id)) { a.cds.melee = 0; sq.startMelee(a, t, 'Investida_Corrompida'); if (a.act) a.act.goal = 'investida'; } return; }
  if (a.vgRiposte && !a.act) { a.vgRiposte = false; if (sq.canAttack(a, 'melee', t.id)) { a.cds.melee = 0; sq.startMelee(a, t, 'Orbita_Recuo'); if (a.act) a.act.goal = 'fenda-resposta'; sq.event('vzRiposte', { actor: a }); } return; }
  if (vgStepChain(sq, a, t, dt)) return;
  if (a.vgLeapNext && !a.act) { a.vgLeapNext = false; if (!a.cds.leap) { sq.startLeap(a, t); return; } }
  if (a.act || a.react) return;
  if ((a.vgTacT = (a.vgTacT ?? .3) - dt) > 0) return; a.vgTacT = VG_TACTICS.every[0] + sq.rand() * (VG_TACTICS.every[1] - VG_TACTICS.every[0]);
  const T = VG_TACTICS, d = Math.hypot(t.x - a.x, t.z - a.z) || 1, gap = d - (t.radius || .4) - a.T.radius, see = sq.los(a.x, a.z, t.x, t.z), canMelee = sq.canAttack(a, 'melee', t.id);
  const chainOk = !a.cds.vgChain && !a.cds.dodge && !a.airY, P = ph, opts = [], side = sq.rand() < .5 ? 1 : -1, recovering = !t.attacking && sq.time - st.lastAttack < .9 && sq.time - st.lastAttack > .15;
  // Passo do Eclipse: 1–3 dashes curtos até o flanco; o último em arco, entrando no corte
  if (chainOk && see && canMelee && !a.cds.vgEclipse && gap >= T.eclipse.gap[0] && gap <= T.eclipse.gap[1]) opts.push(['eclipse', .38 + P * .06 + (recovering ? .25 : 0) + (a.vgHeroDash > 1.2 ? .2 : 0)]);
  // Retirada do Crepúsculo: herói encadeando dashes/pressão colada → 2–3 tempos de recuo/lateral e punição
  if (chainOk && !a.cds.vgTwilight && gap < 2.6 && (a.vgHeroDash > .9 || a.vgPress > .8 || t.attacking)) opts.push(['crepusculo', .3 + Math.min(.4, a.vgPress * .2) + (a.vgHeroDash > 1.5 ? .2 : 0)]);
  // Atravessamento Aéreo: salto → dash aéreo lateral → pouso cortando
  if (!a.cds.leap && !a.cds.vgAerial && see && canMelee && gap >= T.aerial.gap[0] && gap <= T.aerial.gap[1]) opts.push(['aereo', .22 + P * .05]);
  // Investida Corrompida: corrida intencional → estocada (de longe)
  if (!a.cds.vgCharge && see && canMelee && gap >= T.charge.gap[0] && gap <= T.charge.gap[1]) opts.push(['investida', .3 + (st.dist > 6 ? .15 : 0)]);
  // Guarda da Fenda: pressão frontal → guarda curta (ou escudo) e devolve com a Órbita recuando
  if (!a.cds.vgFissure && !a.cds.guard && gap < 1.8 && t.attacking) opts.push(['fenda', .26 + (a.hp < a.maxHp * .5 ? .1 : 0)]);
  if (!opts.length) return;
  const top = Math.max(...opts.map(o => o[1])); if (sq.rand() > Math.min(.85, top)) return;
  let roll = sq.rand() * opts.reduce((x, o) => x + o[1], 0), goal = opts[0][0]; for (const o of opts) { roll -= o[1]; if (roll <= 0) { goal = o[0]; break; } }
  sq.event('vzTactic', { actor: a, goal, gap: +gap.toFixed(2) }); (S.chains[goal] = (S.chains[goal] || 0) + 1);
  if (goal === 'eclipse') { a.cds.vgEclipse = T.eclipse.cd * a.cdMul; a.cds.vgChain = .3; const n = gap > 5 ? (sq.rand() < .25 ? 3 : 2) : (sq.rand() < .6 ? 1 : 2), steps = [];
    for (let i = 0; i < n - 1; i++) steps.push({ f: .85, s: side * (i % 2 ? -.45 : .45), len: 1, face: true });
    steps.push({ f: .55, s: side * .85, len: .9, face: false, iframes: true }); chain(sq, a, 'eclipse', steps, 'melee'); return; }
  if (goal === 'crepusculo') { a.cds.vgTwilight = T.twilight.cd * a.cdMul; a.cds.vgChain = .3; const n = sq.rand() < .35 ? 3 : 2, steps = [{ f: -.9, s: side * .35, len: 1, iframes: true, face: true }, { f: -.25, s: side * .95, len: .9, face: true }];
    if (n === 3) steps.push({ f: .6, s: -side * .7, len: .8, face: true }); chain(sq, a, 'crepusculo', steps, n === 3 ? 'melee' : undefined); return; }
  if (goal === 'aereo') { a.cds.vgAerial = T.aerial.cd * a.cdMul; chain(sq, a, 'aereo', [{ f: .2, s: side, len: .7, face: true }], 'leap'); return; }
  if (goal === 'investida') { a.cds.vgCharge = T.charge.cd * a.cdMul; a.vgRun = true; sq.begin(a, { type: 'run', dur: T.charge.run, anim: 'run', face: true, goal: 'investida' }); return; }
  if (goal === 'fenda') { a.cds.vgFissure = T.fissure.cd * a.cdMul; if (a.shield && a.shield.canActivate(sq.time) && sq.rand() < .55) { a.react = { type: 'shield', t: .1 }; S.shield++; }
    else { sq.begin(a, { type: 'block', dur: a.T.block.dur, anim: 'block', guard: true, goal: 'fenda' }); a.cds.guard = a.T.block.cd; a.vgRiposte = true; sq.event('guard', { actor: a }); } return; }
}
/** Corrida da Investida: o motor só vê um ato 'run' — o corpo corre na direção do alvo (velocidade de corrida). */
export function vorgStepRun(sq, a, t, dt) {
  if (!a.act || a.act.type !== 'run' || !t) return;
  const d = Math.hypot(t.x - a.x, t.z - a.z) || 1, room = d - (t.radius || .4) - a.T.radius - 2.2; if (room <= 0) { a.act.t = a.act.dur; return; }
  const s = Math.min(room, a.T.speed.run * dt); sq.move(a, (t.x - a.x) / d * s, (t.z - a.z) / d * s);
}
