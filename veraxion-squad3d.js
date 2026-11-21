/**
 * MISSÃO 20/11 — VÉRAXION (Bispo 4) no motor da esquadra com o corpo NOVO `NewBispo4.glb` e DUAS ESPADAS (uma por mão).
 * Campanha e TESTAR usam sempre este caminho (nenhuma magia/ultimate antiga é reativada por parâmetro ou save).
 *
 * Asset real (inspeção do GLB): 1 malha skinned (30 838 tri), 36 ossos (com dedos médios), 3 texturas WebP, 15 clipes:
 * Running .63 · Walking 1.03 · Charged_Upward_Slash 3.17 · Dead 2.97 · Double_Blade_Spin 5.67 (1,1 volta) ·
 * Double_Combo_Attack 2.83 (quadril começa 1,08 m ATRÁS) · Idle_14 7.50 (pausa e arremesso com a esquerda em 4,80 s) ·
 * Jump_Over_Obstacle_2 .87 (avanço 3,1 m) · Left_Slash 3.17 · Spartan_Kick 1.40 (pé direito no peito em .53 s) ·
 * Triple_Combo_Attack 4.33 · Walk_Backward_with_Sword 1.33 (recua 1,08 m) · Weapon_Combo 3.67 · Weapon_Combo_1 3.50 (1 volta) ·
 * Weapon_Combo_2 4.50. Sem idle/guarda/reação próprios: recortes do próprio GLB. A mão direita domina os clipes; a esquerda
 * golpeia de verdade em Weapon_Combo_1 (1,67 s), Double_Blade_Spin (1,37 s), Weapon_Combo (2,00 s) e Jump_Over (0,80 s).
 *
 * Identidade: A “Rosário Carmesim” (direita) SENTENCIA com precisão; B “Abismo Voraz” (esquerda) DEVORA. Seis famílias de
 * combo + Guarda das Lâminas (aparo cruzado) + dash cortante (início a início ≥ 0,6 s) + duas técnicas:
 *  1. Arremesso Voraz → teleporte (pose do Idle_14, espada B desacopla e voa; acerto → atrás do herói; erro → ao fim do voo);
 *  2. Corte Ascendente Carregado (clipe original) → lâmina de corte em meia-lua que viaja em linha travada.
 */
import { registerKind, E1 } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';
import { vgAim } from './vorgazhek3d.js';

export const VERAXION_SQUAD_BUILD = '333-duas-espadas';
export const VX_FILE = './NewBispo4.glb?v=mod333';
export const VX_ROLES = Object.freeze({
  idle: 'VX_idle', walk: 'Walking', run: 'Running', dash: 'Jump_Over_Obstacle_2', attack: 'Double_Combo_Attack', attack2: 'Left_Slash',
  block: 'VX_guard', hit: 'VX_hit', cast: 'VX_guard', death: 'Dead', back: 'Walk_Backward_with_Sword',
  vx_double: 'Double_Combo_Attack', vx_left: 'Left_Slash', vx_wc: 'Weapon_Combo', vx_wc1: 'Weapon_Combo_1', vx_spin: 'Double_Blade_Spin', vx_cross: 'VX_cross',
  vx_kick: 'Spartan_Kick', vx_up: 'Charged_Upward_Slash', vx_throw: 'VX_throw', vx_lunge: 'Jump_Over_Obstacle_2'
});
export const VX_IN_PLACE = Object.freeze(['dash', 'attack', 'attack2', 'death', 'hit', 'back', 'vx_double', 'vx_left', 'vx_wc', 'vx_wc1', 'vx_spin', 'vx_cross', 'vx_kick', 'vx_up', 'vx_throw', 'vx_lunge']);
export const VX_TIME = Object.freeze({ dash: { from: .05, speed: 1.4 } });

const VX_ROOTED = new WeakSet();
/** Sem clipe 'Attack' neste GLB: a âncora da raiz é o quadril do Idle_14 (o Double_Combo começa 1,08 m atrás). */
export function vxAnchorRoot(clips) {
  const ref = clips.find(c => c.name === 'Idle_14')?.tracks.find(t => /hips[^.]*\.position$/i.test(t.name)); if (!ref) return 0; const ax = ref.values[0], az = ref.values[2]; let n = 0;
  for (const c of clips) { if (VX_ROOTED.has(c)) continue; VX_ROOTED.add(c); const tr = c.tracks.find(t => /hips[^.]*\.position$/i.test(t.name)); if (!tr) continue; const v = tr.values, dx = ax - v[0], dz = az - v[2]; if (Math.abs(dx) + Math.abs(dz) < 1e-4) continue; for (let i = 0; i < v.length; i += 3) { v[i] += dx; v[i + 2] += dz; } n++; }
  return n;
}
export function vxSynthClips(T, clips) {
  vxAnchorRoot(clips);
  const by = n => clips.find(c => c.name === n), ref = by('Idle_14')?.tracks.find(t => /hips[^.]*\.position$/i.test(t.name))?.values, out = [];
  const sub = (src, name, a, b) => { const s = by(src); if (!s) return; const c = T.AnimationUtils.subclip(s, name, a, b, 30);
    if (ref) for (const tr of c.tracks) if (/hips[^.]*\.position$/i.test(tr.name)) { const v = tr.values; for (let i = 0; i < v.length; i += 3) { v[i] = ref[0]; v[i + 2] = ref[2]; } }
    VX_ROOTED.add(c); out.push(c); };
  sub('Idle_14', 'VX_idle', 0, 96); sub('Spartan_Kick', 'VX_guard', 8, 12); sub('Double_Combo_Attack', 'VX_hit', 52, 62);
  sub('Double_Blade_Spin', 'VX_cross', 30, 66); sub('Idle_14', 'VX_throw', 129, 156);
  return out;
}

/* Golpes: hits = quadro em que a ponta da espada indicada (hands: R=A Rosário, L=B Abismo) passa rápida pelo corpo. */
export const VX_MOVES = [
  { id: 'Sentenca_Rubra', clip: 'vx_double', label: 'Sentença Rubra', hits: [.67, 1.2], hands: ['R', 'R'], duration: 1.7, advance: 1.3, glide: true, weight: 1, opener: true, rate: 1.45 },
  { id: 'Pendulo_Sangrento', clip: 'vx_wc1', label: 'Pêndulo Sangrento', hits: [.72, 1.67], hands: ['R', 'L'], duration: 2.05, advance: 1.4, glide: true, weight: 1.2, rate: 1.45 },
  { id: 'Mandibula_em_Cruz', clip: 'vx_cross', label: 'Mandíbula em Cruz', hits: [.37, .7], hands: ['L', 'R'], duration: 1.2, advance: .5, cross: true, weight: 1, rate: 1.25 },
  { id: 'Rosa_de_Espinhos', clip: 'vx_wc', label: 'Rosa de Espinhos', hits: [1.33, 2.0, 2.4], hands: ['R', 'L', 'R'], duration: 2.75, advance: 1.1, glide: true, weight: .9, rate: 1.5 },
  { id: 'Estocada_Gemea', clip: 'vx_lunge', label: 'Passo do Carrasco', hits: [.7, .8], hands: ['R', 'L'], duration: .87, advance: 2.6, range: [2.6, 5.5], cd: 4, fast: true, aim: true, rate: 1.05 },
  { id: 'Chute_de_Ruptura', clip: 'vx_kick', label: 'Chute de Ruptura', hits: [.53], hands: ['K'], duration: 1.1, advance: .25, kick: true, range: [0, 1.2], cd: 5, rate: 1.15 },
  { id: 'Eclipse_Geminado', clip: 'vx_spin', label: 'Eclipse Geminado', hits: [.83, 1.37, 1.7], hands: ['R', 'L', 'R'], duration: 2.3, advance: .5, heavy: true, guardBreak: true, spin: true, weight: .8, rate: 1.3, minPhase: 1, aimMax: 2.2 },
  { id: 'Corte_Gemeo', clip: 'vx_left', label: 'Corte Gêmeo', hits: [.9, 1.32], hands: ['R', 'R'], duration: 1.8, advance: .6, weight: .8, rate: 1.4 }
];
BOSS_MOVES.veraxion = VX_MOVES.map(m => ({ ...m, patterns: ['diagonal'] }));
for (const m of BOSS_MOVES.veraxion) { m.kind = 'veraxion'; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = m.heavy ? 1.25 : m.cross ? .75 : m.kick ? .7 : m.fast ? .85 : m.hits.length > 2 ? .85 : 1; }

/** Empunhadura (as duas mãos, medida no GLB): dedos em +Y do osso; lâmina sai do punho por +Z (único eixo que não
    enterra a espada esquerda em nenhum clipe e deixa a direita à frente nos golpes); gume para os dedos. */
export function vxGrip(T) { return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), new T.Vector3(1, 0, 0))); }
/** Traço de dano das DUAS lâminas (ou do pé no chute) amostrado do MESMO clipe (30 Hz, espaço do ator). aimAz/aimR por golpe
    medem a cabeça da espada (ou o pé) que de fato golpeia — usado pela mira por corte. */
export function vxMoveClips(T, model, clone, clipFor, moves, grip, edgesR, edgesL) {
  const rig = clone(model); rig.position.set(0, model.position.y, 0); rig.rotation.set(0, 0, 0); rig.scale.copy(model.scale);
  const mixer = new T.AnimationMixer(rig), bone = {}; rig.traverse(o => { if (o.isBone) bone[o.name] = o; });
  const out = {}, p = new T.Vector3(), q = new T.Quaternion(), v = new T.Vector3(), w = new T.Vector3(), SR = edgesR.map(e => e.map(x => new T.Vector3(...x))), SL = edgesL.map(e => e.map(x => new T.Vector3(...x)));
  const seg = (hand, list) => { hand.getWorldPosition(p); hand.getWorldQuaternion(q).multiply(grip); return list.map(sg => sg.map(x => v.copy(x).applyQuaternion(q).add(p).toArray())); };
  for (const m of moves) {
    const src = clipFor(m.clip); if (!src || !bone.RightHand) continue;
    const clip = src.clone(); clip.name = m.id; const frames = [], N = Math.ceil(m.duration * 30), D = Math.min(m.duration, clip.duration - 1e-3), az = [], rr = [];
    mixer.stopAllAction(); mixer.clipAction(clip).play();
    const at = t => { mixer.setTime(t); rig.updateMatrixWorld(true); };
    for (let i = 0; i <= N; i++) { at(D * i / N);
      if (m.kick) { bone.RightLowerLeg.getWorldPosition(p); bone.RightToes.getWorldPosition(w); frames.push([[p.toArray(), w.toArray()]]); }
      else frames.push(seg(bone.RightHand, SR).concat(seg(bone.LeftHand, SL))); }
    m.hits.forEach((h, k) => { at(Math.min(D, h)); const hand = (m.hands || [])[k];
      if (hand === 'K') bone.RightToes.getWorldPosition(v); else { const b = hand === 'L' ? bone.LeftHand : bone.RightHand; b.getWorldPosition(p); b.getWorldQuaternion(q).multiply(grip); v.set(0, .7, 0).applyQuaternion(q).add(p); }
      az.push(+Math.atan2(v.x, v.z).toFixed(3)); rr.push(+Math.hypot(v.x, v.z).toFixed(2)); });
    // 21/11: faixa angular REAL varrida pela lâmina na janela de contato (h−0,10…h+0,11) — a mira só gira o necessário para
    // o herói cair dentro do arco (o 2º/3º corte de outra mão não depende mais de um único azimute instantâneo)
    const lo = [], hi = [];
    m.hits.forEach((h, k) => { const hand = (m.hands || [])[k]; let mn = Infinity, mx = -Infinity, ref = null;
      for (let s = 0; s <= 8; s++) { at(Math.min(D, Math.max(0, h - .1 + .21 * s / 8)));
        for (const f of hand === 'K' ? [1] : [.4, .75, 1.05]) { if (hand === 'K') bone.RightToes.getWorldPosition(v); else { const b = hand === 'L' ? bone.LeftHand : bone.RightHand; b.getWorldPosition(p); b.getWorldQuaternion(q).multiply(grip); v.set(0, f, 0).applyQuaternion(q).add(p); }
          const z = Math.atan2(v.x, v.z); if (ref === null) ref = z; const rel = ref + Math.atan2(Math.sin(z - ref), Math.cos(z - ref)); mn = Math.min(mn, rel); mx = Math.max(mx, rel); } }
      lo.push(+mn.toFixed(3)); hi.push(+mx.toFixed(3)); });
    clip.combatTrace = { duration: m.duration, frames, aimAz: az, aimR: rr, aimLo: lo, aimHi: hi }; out[m.id] = clip; m.aimAz = az; m.aimR = rr; m.aimLo = lo; m.aimHi = hi;
  }
  mixer.stopAllAction(); mixer.uncacheRoot(rig); return out;
}

export const VX_DASH = Object.freeze({ speed: 14, time: .2, cd: .6, minStart: .6, budget: 4, window: 3, lockout: 1.2 });
export const VX_THROW = Object.freeze({ gap: [3.2, 11], cd: 10, pose: .5, speed: 16, range: 11.5, radius: .55, dmg: 18, beat: .22, behind: 2.3, ret: .35, recover: .55 });
/** 21/11 — Florescer Abissal (substitui o Corte Ascendente reprovado; mesmo clipe Charged_Upward_Slash): carga de energia
    entre as DUAS espadas → pulso → 14 arcos-lâmina curvos irradiam do centro em ondas escalonadas (fase ≥ 2: segunda onda
    defasada). Cada arco tem frente de onda varrida e largura tangencial própria: 1 acerto por alvo por onda, para em parede,
    dash com i-frames atravessa e o vão entre arcos é seguro. */
export const VX_BLOOM = Object.freeze({ gap: [0, 9], cd: 11, release: 1.03, lock: .7, dur: 1.75, arcs: 14, range: 15, speed: 15.5, decel: .55,
  halfW: .62, life: 1.25, wave2: .4, stagger: .045, dmg: 20, height: 3 });
export const VX_UP = VX_BLOOM; // compatibilidade com o QA/ADM antigo ('up')
export const VX_FLOW = Object.freeze({ breathEvery: 3, gapCut: .12 });
export const VX_GUARD = Object.freeze({ dur: .55, cd: 3.6, counter: .7 });

const clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrap = x => Math.atan2(Math.sin(x), Math.cos(x));
/** Mira por golpe com a FAIXA varrida pela lâmina (aimLo/aimHi): gira só o necessário para o herói ficar dentro do arco,
    trava 0,12 s (tempo do clipe) antes do contato e nunca persegue dentro da janela. Registra acerto/erro por janela. */
export const VX_AIM = Object.freeze({ lock: .12, turn: 10, between: 9, margin: .12 });
export function vxAim(sq, a, act, t, dt) {
  const m = act.move; if (!m) return; if (!m.aimLo) return vgAim(sq, a, act, t, dt); const S = a.vgStats;
  for (let n = 0; n < m.hits.length; n++) { const h = m.hits[n];
    if (act.t >= h - .1 && !(act.vgOpen || (act.vgOpen = new Set())).has(n)) { act.vgOpen.add(n); if (t) { const d = Math.hypot(t.x - a.x, t.z - a.z), rel = wrap(Math.atan2(t.x - a.x, t.z - a.z) - a.yaw), lo = m.aimLo[n], hi = m.aimHi[n], e = rel < lo ? rel - lo : rel > hi ? rel - hi : 0; act.vgErr = act.vgErr || []; act.vgErr[n] = [+(e * 57.3).toFixed(1), +d.toFixed(2)]; } }
    if (act.t > h + .11 && !(act.vgShut || (act.vgShut = new Set())).has(n)) { act.vgShut.add(n); if (!act.contacts.has(n)) { const e = act.vgErr?.[n] || [0, 0], why = !t ? 'sem-alvo' : t.iframes ? 'esquiva' : !sq.los(a.x, a.z, t.x, t.z) ? 'obstaculo' : e[1] - (t.radius || .4) > 3.2 ? 'longe' : Math.abs(e[0]) > 25 ? 'angulo' : 'fora-do-arco';
        if (S) { S.miss = (S.miss || 0) + 1; (S.why || (S.why = {}))[why] = (S.why[why] || 0) + 1; } sq.event('meleeMiss', { actor: a, n: n + 1, move: m.id, why, err: e[0], dist: e[1] }); } else if (S) S.hit = (S.hit || 0) + 1;
      if (S) { const L = S.aim || (S.aim = []); if (L.length < 240) L.push([m.id, n + 1, ...(act.vgErr?.[n] || [0, 0]), act.contacts.has(n) ? 1 : 0, +sq.time.toFixed(2)]); } } }
  if (!t) return; const n = m.hits.findIndex(h => act.t < h + .11); if (n < 0) return; const h = m.hits[n]; if (act.t >= h - VX_AIM.lock) return;
  if (m.aimR) { const d = Math.hypot(t.x - a.x, t.z - a.z), want = (m.aimR[n] || 1.3) + (t.radius || .4) * .6, room = d - (t.radius || .4) - a.T.radius - .05, used = act.vgWarp || 0, W = a.T.aimWarp;
    if (d > want && room > 0 && used < W.warp) { const st = Math.min(d - want, room, W.warpSpeed * dt, W.warp - used); sq.move(a, (t.x - a.x) / d * st, (t.z - a.z) / d * st); act.vgWarp = used + st; } }
  // alvo: o azimute da cabeça da lâmina no quadro do contato (aimAz); aceita a folga da faixa varrida (aimLo/aimHi) para não girar à toa
  const lo = m.aimLo[n], hi = m.aimHi[n], az = clamp(m.aimAz[n], lo, hi), slack = Math.min(VX_AIM.margin, Math.max(0, Math.min(az - lo, hi - az) - .05)), rel = wrap(Math.atan2(t.x - a.x, t.z - a.z) - a.yaw - az);
  const need = rel > slack ? rel - slack : rel < -slack ? rel + slack : 0, k = (n === 0 ? VX_AIM.turn : VX_AIM.between) * dt; a.yaw = wrap(a.yaw + clamp(need, -k, k));
}
const VX = {
  ...E1.common, hp: 2400, radius: .5, height: 2.2, poise: 72, flinch: 99, stamina: 170, sight: 40, leash: 60, boss: true, pref: [1.4, 2.4], phase2: .35, furyCd: .82, staggerArmor: 2,
  speed: { walk: 2.8, run: 6.2, strafe: 3.2, back: 2.2, turn: 10 },
  melee: { max: 2.8, reach: 2.6, arc: .1, windup: .4, hits: [.4], dur: 1, dmg: 12, cd: 1, knock: .45 }, aimWarp: { warp: 2, warpSpeed: 7 },
  dash: VX_DASH, block: { chance: .18, dur: VX_GUARD.dur, cd: VX_GUARD.cd, cost: 14, reduce: .85 }, dodge: { chance: .28, cd: VX_DASH.cd },
  counter: { ...E1.common.counter, chance: 0, cd: 99 }, leap: null, shield: null,
  decide: [.14, .24], gap: .38, kit: [], interrupt: true, feint: null, maxBig: 1,
  brain: vxBrain, pickMove: vxPickMove, moveAim: vxAim
};
export const VERAX = Object.freeze({ boss: registerKind('veraxion', VX) });

export function vxPickMove(sq, a, t, pool) {
  if (!pool.length) return null; const recent = a.vxMoveHistory || (a.vxMoveHistory = []), st = sq.study(t.id).rates;
  // A mesma animação não pode reiniciar indefinidamente: considera também golpes FORÇADOS pelo cérebro,
  // não só os selecionados por esta função. Mantém a exceção quando só existe um golpe elegível.
  const last = recent.at(-1), choices = pool.length > 1 ? pool.filter(m => m.id !== last) : pool;
  const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz) || 1, gap = d - (t.radius || .4) - a.T.radius, front = (dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw)) / d;
  let best = null, bs = -Infinity;
  for (const m of choices) { let w = m.weight || 1;
    if (recent.at(-1) === m.id) w -= 2; else if (recent.includes(m.id)) w -= .5;
    if (m.guardBreak && (t.blocking || st.block > .25)) w += 1.1;
    if (m.spin) w += front < 0 ? 1 : -.3;
    if (m.cross && a.vxCounter) w += 2.5; // contragolpe depois do aparo
    if (m.hits.length > 2) w += .25 * (a.vxPhase || 0);
    w += (sq.rand() - .5) * .5; if (w > bs) { bs = w; best = m; } }
  a.vxCounter = false; return best; // histórico atualizado na entrada real do golpe, inclusive os forçados
}
export const vxPhaseOf = (hp, max) => { const k = hp / Math.max(1, max); return k > .7 ? 0 : k > .4 ? 1 : k > .15 ? 2 : 3; };
export const VX_TACTICS = Object.freeze({ every: [.3, .55], chase: { gap: [3, 9], cd: 3 }, flank: { gap: [.8, 3], cd: 3.2 }, passo: { gap: [1.2, 4.5], cd: 6 }, kick: { cd: 5 }, guard: { cd: VX_GUARD.cd } });

function dashReady(sq, a) { return sq.time - (a.vxLastDash ?? -9) >= VX_DASH.minStart; }
function stepChain(sq, a, t) {
  const c = a.vxChain; if (!c || !c.steps.length || a.act) return false;
  a.decideT = Math.max(a.decideT || 0, .15); a.react = null; if (!dashReady(sq, a)) return true;
  const s = c.steps.shift(), d = Math.hypot(t.x - a.x, t.z - a.z) || 1, ux = (t.x - a.x) / d, uz = (t.z - a.z) / d;
  const dir = side => { let dx = s.f * ux + side * uz, dz = s.f * uz - side * ux; const l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  const reach = VX_DASH.speed * VX_DASH.time * (s.len || 1), free = ([x, z]) => !sq.blocked(a.x + x * reach, a.z + z * reach) && !sq.blocked(a.x + x * reach * .5, a.z + z * reach * .5);
  let [dx, dz] = dir(s.s); if (!free([dx, dz]) && s.s) [dx, dz] = dir(-s.s);
  if (!free([dx, dz])) { c.steps.length = 0; c.cut = true; }
  else { const along = dx * (t.x - a.x) + dz * (t.z - a.z), perp = Math.abs(dx * (t.z - a.z) - dz * (t.x - a.x)), room = (t.radius || .4) + a.T.radius + .4;
    const len = along > 0 && perp < room ? clamp((along - room) / reach, .2, s.len || 1) : (s.len || 1), last = !c.steps.length;
    sq.begin(a, { type: 'dodge', dur: VX_DASH.time * len, anim: 'dash', animFrom: VX_TIME.dash.from, animSpeed: VX_TIME.dash.speed, dx, dz, iframes: !!s.iframes, face: !!s.face, chain: last && c.then === 'melee' ? 'melee' : undefined, token: last && c.then === 'melee' ? 'melee' : undefined, tid: t.id, goal: c.goal + ':' + (c.n - c.steps.length) });
    c.done = (c.done || 0) + 1; }
  if (!c.steps.length) { const then = c.then; a.vxChain = null; sq.event('vxChainEnd', { actor: a, goal: c.goal, done: c.done || 0 });
    if (typeof then === 'string' && then.startsWith('mv:') && sq.canAttack(a, 'melee', t.id)) { a.cds.melee = 0; sq.startMelee(a, t, then.slice(3)); } }
  return true;
}
function chain(sq, a, goal, steps, then) { a.vxChain = { goal, steps, n: steps.length, then }; sq.event('vxChain', { actor: a, goal, n: steps.length }); }
function vxInit(a) { if (a.vxStats) return; a.vxSinceBreath = 0; a.vxStats = { dash: 0, chains: {}, combos: 0, guard: 0, parry: 0, kick: 0, back: 0, throwHit: 0, throwMiss: 0, throwEvade: 0, tp: 0, upHit: 0, upMiss: 0, upEvade: 0, minDashGap: 9 }; a.vgStats = a.vxStats; }

/* ---------- técnica 1: Arremesso Voraz → teleporte ---------- */
export function vxStartThrow(sq, a, t) {
  vxInit(a); const S = VX_THROW; a.cds.vxThrow = S.cd * a.cdMul; a.vxLastThrow = a.vxLastTech = sq.time; a.cds.melee = Math.max(a.cds.melee || 0, 1); a.vxChain = null;
  sq.begin(a, { type: 'vxThrow', dur: 4, anim: 'vx_throw', token: 'melee', tid: t.id, face: true, phase: 'pose', glow: 0 });
  sq.event('vxThrow', { actor: a, phase: 'pose' }); a.vxStats.throws = (a.vxStats.throws || 0) + 1;
}
function freeNear(sq, x, z, fx, fz) { // ponto navegável mais próximo (encolhe ao longo de fx,fz e tenta os lados)
  for (const k of [1, .8, .6, .4, .2, 0]) for (const s of [0, .6, -.6]) { const px = x - fx * (1 - k) * 2 + fz * s, pz = z - fz * (1 - k) * 2 - fx * s; if (!sq.blocked(px, pz)) return { x: px, z: pz }; }
  return null;
}
function stepThrow(sq, a, t, dt) {
  const S = VX_THROW, act = a.act;
  if (act.phase === 'pose') { act.glow = clamp(act.t / S.pose, 0, 1); if (act.t < S.pose) return;
    act.face = false; const dx = t ? t.x - a.x : Math.sin(a.yaw), dz = t ? t.z - a.z : Math.cos(a.yaw), l = Math.hypot(dx, dz) || 1; a.yaw = Math.atan2(dx, dz);
    act.sword = { x: a.x + dx / l * .8, y: a.y + 1.3, z: a.z + dz / l * .8, dx: dx / l, dz: dz / l, travel: 0, spin: 0, alive: true, hit: false };
    a.vxThrown = act.sword; act.phase = 'fly'; sq.event('vxThrow', { actor: a, phase: 'release', sword: act.sword }); return; }
  if (act.phase === 'fly') { const s = act.sword, st = S.speed * dt; s.x += s.dx * st; s.z += s.dz * st; s.travel += st; s.spin += dt * 22;
    let end = null;
    if (sq.blocked(s.x, s.z)) end = 'wall';
    for (const tg of sq.enemyTargets()) { if (end) break; const d = Math.hypot(tg.x - s.x, tg.z - s.z); if (d > S.radius + (tg.radius || .4) || Math.abs((tg.y || 0) + (tg.height || 1.8) * .5 - s.y) > 1.3) continue;
      if (tg.iframes) { if (!s.evaded) { s.evaded = true; a.vxStats.throwEvade++; sq.event('evaded', { spell: { type: 'vxThrow' }, target: tg.id }); } continue; }
      const r = sq.damageTarget(tg.id, S.dmg, { kind: 'spell', actor: a.id, x: s.x, z: s.z, knock: .8, combo: 1 }); s.hit = true; act.victim = tg; a.vxStats.throwHit++; end = 'hit';
      sq.event('meleeHit', { actor: a, target: tg.id, result: r, n: 1, move: 'arremesso' }); }
    if (!end && s.travel >= S.range) end = 'range';
    if (end) { s.alive = false; act.end = end; if (end !== 'hit') a.vxStats.throwMiss++; act.phase = 'beat'; act.beatT = 0; sq.event('vxThrow', { actor: a, phase: 'impact', sword: s, end }); }
    return; }
  if (act.phase === 'beat') { act.beatT += dt; if (act.beatT < S.beat) return;
    const s = act.sword; let to = null;
    if (act.end === 'hit' && act.victim) { const v = act.victim, bx = v.x - a.x, bz = v.z - a.z, l = Math.hypot(bx, bz) || 1; to = freeNear(sq, v.x + bx / l * S.behind, v.z + bz / l * S.behind, bx / l, bz / l); }
    else to = freeNear(sq, s.x - s.dx * .6, s.z - s.dz * .6, s.dx, s.dz);
    const from = { x: a.x, z: a.z };
    if (to) { a.x = to.x; a.z = to.z; a.y = sq.ground(a.x, a.z); a.vxStats.tp++; }
    const tg = act.victim || t; if (tg) a.yaw = Math.atan2(tg.x - a.x, tg.z - a.z);
    act.phase = 'return'; act.retT = 0; a.vxThrown = null; sq.event('vxThrow', { actor: a, phase: 'teleport', from, to: to || from, end: act.end });
    a.anim = { role: 'block', once: true, speed: 1, rev: a.anim.rev + 1 }; return; }
  if (act.phase === 'return') { act.retT += dt; act.glow = Math.max(0, 1 - act.retT / S.ret); if (act.retT >= S.ret + S.recover) act.t = act.dur; return; } // janela de reação: nada de golpe automático nas costas
}
/* ---------- técnica 2: Florescer Abissal (radial) ---------- */
export function vxStartBloom(sq, a, t) {
  vxInit(a); a.cds.vxUp = VX_BLOOM.cd * a.cdMul; a.cds.melee = Math.max(a.cds.melee || 0, 1); a.vxChain = null; a.vxLastTech = sq.time;
  sq.begin(a, { type: 'vxUp', dur: VX_BLOOM.dur, anim: 'vx_up', token: 'melee', tid: t && t.id, face: true, glow: 0 });
  sq.event('vxBloom', { actor: a, phase: 'charge' }); a.vxStats.ups = (a.vxStats.ups || 0) + 1;
}
export const vxStartUpslash = vxStartBloom;
function spawnWave(sq, a, w, delay) { const B = VX_BLOOM, base = a.yaw + (w ? Math.PI / B.arcs : 0) + sq.rand() * .2 - .1, ox = a.x, oz = a.z;
  const wave = { id: (sq._vxWave = (sq._vxWave || 0) + 1), ox, oz, oy: a.y, hit: new Set(), arcs: [] };
  for (let i = 0; i < B.arcs; i++) { const th = base + i * Math.PI * 2 / B.arcs + (sq.rand() - .5) * .12;
    wave.arcs.push({ th, r: .3, pr: 0, age: -delay - (i % 3) * B.stagger, alive: true, big: i === 0 || i === B.arcs / 2, curl: (sq.rand() - .5) * 2, h: B.height * (.78 + sq.rand() * .4), wall: false }); }
  (a.vxBloom || (a.vxBloom = [])).push(wave); return wave; }
function stepBloomCast(sq, a, t, dt) {
  const B = VX_BLOOM, act = a.act; act.glow = clamp(act.t / B.release, 0, 1);
  if (!act.locked && act.t >= B.lock) { act.locked = true; act.face = false; if (t) a.yaw = Math.atan2(t.x - a.x, t.z - a.z); sq.event('vxBloom', { actor: a, phase: 'lock' }); }
  if (!act.released && act.t >= B.release) { act.released = true; act.glow = .25; spawnWave(sq, a, 0, 0); if ((a.vxPhase || 0) >= 2) spawnWave(sq, a, 1, B.wave2);
    sq.event('vxBloom', { actor: a, phase: 'release', waves: a.vxBloom }); }
}
/** Frente de onda de cada arco: r cresce com desaceleração; contato = cruzou o raio do alvo neste quadro E o alvo está dentro
    da largura tangencial do arco. Parede encerra o arco (não atravessa). Um acerto por alvo por onda. */
function stepBloomArcs(sq, a, dt) {
  const B = VX_BLOOM, L = a.vxBloom; if (!L || !L.length) return;
  for (const w of L) { let live = 0;
    for (const c of w.arcs) { if (!c.alive) continue; c.age += dt; if (c.age < 0) { live++; continue; }
      const u = clamp(c.r / B.range, 0, 1), v = B.speed * (1 - B.decel * u); c.pr = c.on ? c.r : 0; c.on = true; c.r += v * dt; // 1º passo varre desde o centro (herói colado também é atingido)
      const fx = w.ox + Math.sin(c.th) * c.r, fz = w.oz + Math.cos(c.th) * c.r;
      if (sq.blocked(fx, fz)) { c.alive = false; c.wall = true; a.vxStats.bloomWall = (a.vxStats.bloomWall || 0) + 1; sq.event('vxBloom', { actor: a, phase: 'wall', arc: c, x: fx, z: fz }); continue; }
      if (c.r >= B.range || c.age > B.life) { c.alive = false; a.vxStats.bloomEnd = (a.vxStats.bloomEnd || 0) + 1; continue; } live++;
      for (const tg of sq.enemyTargets()) { if (!tg.alive || w.hit.has(tg.id)) continue; const dx = tg.x - w.ox, dz = tg.z - w.oz, d = Math.hypot(dx, dz), R = tg.radius || .4;
        if (!(c.pr <= d + R * .5 && c.r >= d - R)) continue; const tang = Math.abs(wrap(Math.atan2(dx, dz) - c.th)) * d; if (tang > B.halfW + R) continue;
        if (!sq.los(w.ox, w.oz, tg.x, tg.z)) continue; w.hit.add(tg.id);
        if (tg.iframes) { a.vxStats.upEvade++; sq.event('evaded', { spell: { type: 'vxBloom' }, target: tg.id }); continue; }
        const r = sq.damageTarget(tg.id, B.dmg, { kind: 'spell', actor: a.id, x: w.ox, z: w.oz, knock: .9, combo: 1 }); a.vxStats.upHit++;
        sq.event('meleeHit', { actor: a, target: tg.id, result: r, n: 1, move: 'florescer' }); sq.event('vxBloom', { actor: a, phase: 'hit', arc: c, target: tg.id, x: tg.x, z: tg.z }); } }
    w.done = !live; }
  if (L.every(w => w.done)) { for (const w of L) if (!w.hit.size) a.vxStats.upMiss++; a.vxBloom = []; sq.event('vxBloom', { actor: a, phase: 'end' }); }
}
/** Cancelamento (morte, dimensão, interrupção): descarta projéteis e devolve a espada à mão. */
export function vxCancel(sq, a) { if (a.vxThrown) { a.vxThrown.alive = false; a.vxThrown = null; } if (a.vxBloom) for (const w of a.vxBloom) for (const c of w.arcs) c.alive = false; a.vxBloom = []; a.vxChain = null; }

/* ---------- cérebro ---------- */
export function vxBrain(sq, a, dt, t) {
  if (!a.ownT) { a.T = { ...a.T, block: { ...a.T.block }, dodge: { ...a.T.dodge } }; a.ownT = true; } vxInit(a);
  stepBloomArcs(sq, a, dt);
  if (a.vxThrown && !(a.act && a.act.type === 'vxThrow')) { a.vxThrown.alive = false; a.vxThrown = null; sq.event('vxThrow', { actor: a, phase: 'cancel' }); } // interrompido: a espada volta
  const ph = vxPhaseOf(a.hp, a.maxHp); if (ph !== a.vxPhase) { a.vxPhase = ph; a.vzPhase = ph; }
  a.cdMul = Math.min(a.cdMul || 1, [1, .94, .86, .78][ph]);
  const S = a.vxStats;
  if (a.act && a.act !== a._vxAct) { a._vxAct = a.act;
    if (a.act.type === 'dodge') { S.dash++; const g = sq.time - (a.vxLastDash ?? -9); S.minDashGap = Math.min(S.minDashGap, +g.toFixed(3)); a.vxLastDash = sq.time; (a.vxDashAt || (a.vxDashAt = [])).push(sq.time); a.cds.dodge = Math.max(a.cds.dodge || 0, VX_DASH.minStart); }
    if (a.act.type === 'melee') {
      S.combos++; if (a.act.move?.kick) S.kick++;
      const id = a.act.move?.id; if (id) {
        const h = a.vxMoveHistory || (a.vxMoveHistory = []);
        h.push(id); if (h.length > 4) h.shift();
        a.vxLastMoveAt = sq.time;
      }
      // 21/11: sem a pausa morta genérica (0,85 s) do motor — o respiro do VÉRAXION é uma AÇÃO legível (recuo, guarda ou arremesso)
      const m = a.act.move; if (m) a.cds.melee = Math.min(a.cds.melee || 0, (m.duration / (m.rate || 1) + VX_FLOW.gapCut) * a.cdMul);
    }
    if (a.act.type === 'block') { S.guard++; a.vxGuardHp = a.hp; } }
  if (a.act && a.act.type === 'block' && a.hp < (a.vxGuardHp ?? a.hp) && !a.act.parried) { a.act.parried = true; S.parry++; a.vxCounter = true; a.act.t = Math.max(a.act.t, a.act.dur - .05); sq.event('vxParry', { actor: a }); } // aparou: contragolpe curto
  a.vxDashAt = (a.vxDashAt || []).filter(x => sq.time - x < VX_DASH.window); if (a.vxDashAt.length >= VX_DASH.budget) { a.cds.dodge = Math.max(a.cds.dodge || 0, VX_DASH.lockout); a.cds.vxChain = Math.max(a.cds.vxChain || 0, VX_DASH.lockout); }
  if (a.act && a.act.type === 'vxThrow') { stepThrow(sq, a, t, dt); return; }
  if (a.act && a.act.type === 'vxUp') { stepBloomCast(sq, a, t, dt); return; }
  if (a.act && a.act.type === 'vxBack') { if (t) { const d = Math.hypot(t.x - a.x, t.z - a.z) || 1, s = a.T.speed.back * dt; if (!sq.blocked(a.x - (t.x - a.x) / d * s * 3, a.z - (t.z - a.z) / d * s * 3)) sq.move(a, -(t.x - a.x) / d * s, -(t.z - a.z) / d * s); } return; }
  if (!t || a.pendingDeath || a.alert > 0) { a._vxPrev = a.act && a.act.type; return; }
  const ended = a._vxPrev === 'melee' && !a.act; a._vxPrev = a.act && a.act.type;
  if (ended && !a.vxCounter && ++a.vxSinceBreath >= VX_FLOW.breathEvery + (sq.rand() < .5 ? 1 : 0)) { a.vxSinceBreath = 0; // respiro sinalizado
    const room = !sq.blocked(a.x - Math.sin(a.yaw) * 1.4, a.z - Math.cos(a.yaw) * 1.4), r = sq.rand();
    if (room && !a.cds.vxThrow && r < .42) { S.back++; sq.begin(a, { type: 'vxBack', dur: 1.15, anim: 'back', face: true, goal: 'respiro' }); a.vxAfterBack = true; a.vxAfterBackThrow = true; S.chains.respiro = (S.chains.respiro || 0) + 1; return; }
    if (!a.cds.vxUp && r < .72 && sq.los(a.x, a.z, t.x, t.z)) { S.chains.ascendente = (S.chains.ascendente || 0) + 1; vxStartBloom(sq, a, t); return; }
    if (!a.cds.guard && r < .88) { sq.begin(a, { type: 'block', dur: VX_GUARD.dur, anim: 'block', guard: true, goal: 'guarda' }); a.cds.guard = VX_GUARD.cd * a.cdMul; sq.event('guard', { actor: a }); S.chains.guarda = (S.chains.guarda || 0) + 1; return; }
    if (room) { S.back++; sq.begin(a, { type: 'vxBack', dur: .7, anim: 'back', face: true, goal: 'respiro' }); a.vxAfterBack = true; S.chains.respiro = (S.chains.respiro || 0) + 1; return; } }
  if (a.vxAfterBackThrow && !a.act) { a.vxAfterBackThrow = false; const g = Math.hypot(t.x - a.x, t.z - a.z) - (t.radius || .4) - a.T.radius;
    if (!a.cds.vxThrow && g >= 2.1 && sq.los(a.x, a.z, t.x, t.z) && sq.canAttack(a, 'melee', t.id)) { a.vxAfterBack = false; S.chains.arremesso = (S.chains.arremesso || 0) + 1; vxStartThrow(sq, a, t); return; } }
  if (a.vxCounter && !a.act && !a.cds.vxCounter && sq.canAttack(a, 'melee', t.id)) {
    a.vxCounter = false; a.cds.vxCounter = 2.4 * a.cdMul; a.cds.melee = 0;
    sq.startMelee(a, t, 'Mandibula_em_Cruz'); return;
  }
  if (a.vxAfterBack && !a.act) { a.vxAfterBack = false; const side = sq.rand() < .5 ? 1 : -1; chain(sq, a, 'passo', [{ f: .15, s: side, len: .9, face: true, iframes: true }], 'mv:Estocada_Gemea'); }
  const st = sq.study(t.id), k = Math.exp(-dt / 6); a.vxHeroDash = (a.vxHeroDash || 0) * k + (t.dashing && !a.vxSawDash ? 1 : 0); a.vxSawDash = !!t.dashing;
  a.vxPress = (a.vxPress || 0) * k + (t.attacking && Math.hypot(t.x - a.x, t.z - a.z) < 3.2 ? dt : 0);
  if (stepChain(sq, a, t)) return;
  if (a.act || a.react) return;
  if ((a.vxTacT = (a.vxTacT ?? .3) - dt) > 0) return; a.vxTacT = VX_TACTICS.every[0] + sq.rand() * (VX_TACTICS.every[1] - VX_TACTICS.every[0]);
  const T = VX_TACTICS, d = Math.hypot(t.x - a.x, t.z - a.z) || 1, gap = d - (t.radius || .4) - a.T.radius, see = sq.los(a.x, a.z, t.x, t.z), canMelee = sq.canAttack(a, 'melee', t.id);
  const toward = -((t.vx || 0) * (t.x - a.x) + (t.vz || 0) * (t.z - a.z)) / d, front = ((t.x - a.x) * Math.sin(a.yaw) + (t.z - a.z) * Math.cos(a.yaw)) / d, chainOk = !a.cds.vxChain && !a.cds.dodge && dashReady(sq, a), opts = [], side = sq.rand() < .5 ? 1 : -1;
  if (chainOk && see && canMelee && !a.cds.vxChase && gap >= T.chase.gap[0] && gap <= T.chase.gap[1]) opts.push(['avanco', .32 + (toward < -2 ? .25 : 0) + ph * .04]);
  if (chainOk && canMelee && !a.cds.vxFlank && gap >= T.flank.gap[0] && gap <= T.flank.gap[1] && (t.blocking || Math.hypot(t.vx || 0, t.vz || 0) < 1.2)) opts.push(['flanco', .24 + (t.blocking ? .3 : 0)]);
  if (canMelee && !a.cds.vxPasso && gap >= T.passo.gap[0] && gap <= T.passo.gap[1] && (toward > 1.2 || a.vxPress > .6 || a.hp < a.maxHp * .5)) opts.push(['passo', .3 + (toward > 2 ? .2 : 0)]);
  if (canMelee && !a.cds.mv_Chute_de_Ruptura && gap < .9) opts.push(['chute', .55]);
  if (!a.cds.guard && gap < 2.4 && t.attacking && front > .5) opts.push(['guarda', .34 + (a.vxPress > 1 ? .2 : 0)]);
  if (!a.cds.vxThrow && see && canMelee && gap >= VX_THROW.gap[0] && gap <= VX_THROW.gap[1]) opts.push(['arremesso', .32 + (toward < -2 ? .2 : 0) + (a.vxHeroDash > 1.2 ? .12 : 0) + (sq.time - (a.vxLastThrow ?? 0) > 13 ? .35 : 0)]);
  if (!a.cds.vxUp && see && canMelee && gap >= VX_BLOOM.gap[0] && gap <= VX_BLOOM.gap[1]) opts.push(['ascendente', .26 + ph * .05 + (sq.time - (a.vxLastTech ?? 0) > 12 ? .25 : 0)]);
  if (!opts.length) return;
  const top = Math.max(...opts.map(o => o[1])); if (sq.rand() > Math.min(.85, top)) return;
  let roll = sq.rand() * opts.reduce((x, o) => x + o[1], 0), goal = opts[0][0]; for (const o of opts) { roll -= o[1]; if (roll <= 0) { goal = o[0]; break; } }
  sq.event('vxTactic', { actor: a, goal, gap: +gap.toFixed(2) }); S.chains[goal] = (S.chains[goal] || 0) + 1;
  if (goal === 'avanco') { a.cds.vxChase = T.chase.cd * a.cdMul; const n = gap > 5.5 ? 2 : 1, steps = []; for (let i = 0; i < n; i++) steps.push({ f: .9, s: side * (i % 2 ? -.4 : .4), len: 1, face: true }); chain(sq, a, 'avanco', steps, 'melee'); return; }
  if (goal === 'flanco') { a.cds.vxFlank = T.flank.cd * a.cdMul; chain(sq, a, 'flanco', [{ f: .2, s: side, len: .85, face: true, iframes: true }], 'melee'); return; }
  if (goal === 'passo') { a.cds.vxPasso = T.passo.cd * a.cdMul; S.back++; sq.begin(a, { type: 'vxBack', dur: .75, anim: 'back', face: true, goal: 'passo' }); a.vxAfterBack = true; return; }
  if (goal === 'chute') { a.cds.melee = 0; sq.startMelee(a, t, 'Chute_de_Ruptura'); a.cds.mv_Chute_de_Ruptura = T.kick.cd * a.cdMul; return; }
  if (goal === 'guarda') { sq.begin(a, { type: 'block', dur: VX_GUARD.dur, anim: 'block', guard: true, goal: 'guarda' }); a.cds.guard = VX_GUARD.cd * a.cdMul; sq.event('guard', { actor: a }); return; }
  if (goal === 'arremesso') { vxStartThrow(sq, a, t); return; }
  if (goal === 'ascendente') { vxStartBloom(sq, a, t); return; }
}
