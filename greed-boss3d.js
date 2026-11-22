/**
 * MISSÃO 21/11 — GANÂNCIA (Pecado da Dimensão V) no motor da esquadra, com os GLBs NOVOS e TRÊS FASES.
 *  I  · NewGanancia1.glb (12 clipes reais: Idle_14, baseball_pitching, Arise, Dead…) — par de foices ↔ lança + picareta.
 *  II · NewGanancia2.glb (18 clipes reais: Dive_Down_and_Land(_2), Upside_Down_Rope_Hang_1, Weapon_Combo_2…) — voo real,
 *       mergulho, pouso invertido no teto, duas foices autônomas enquanto luta e QUATRO mini-sóis.
 *  III· o MESMO corpo da fase II: cai, se ergue (Arise) e explode em energia; chifres ×2, asas maiores, par inferior de
 *       asas (GananciaAsas2.glb), arsenal telecinético das 4 armas em órbita, garras demoníacas e a BOCA do abismo.
 * Esta é a LÓGICA (determinística por dt, sem Three.js). Desenho/rig: greed-runtime3d.js; VFX: greed-vfx3d.js.
 *
 * Regras de dano (todas com ID próprio de ataque e teste varrido de segmento):
 *  • golpe corpo a corpo: um dano por janela de contato (motor + traço real do GLB), cada janela conta;
 *  • arma autônoma: cada golpe da coreografia tem janela própria (strike.id) e testa o gume do quadro anterior→atual;
 *  • lança: um acerto por arremesso, PERFURA o escudo (pierceShield), não pode ser rebatida; some em 5 s;
 *  • mini-sol: impacto direto OU explosão (nunca os dois do mesmo sol no mesmo alvo); cada sol é independente;
 *  • esfera do abismo: idem (impacto direto OU explosão), primeira aos ~34 s da fase III, depois 36 → 22 s com a vida.
 */
import { registerKind, E1 } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';
import { bladeContact } from './sword-rites3d.js';
import { vxAim } from './veraxion-squad3d.js';

export const GREED_BOSS_BUILD = '342-ganancia-tres-fases';
export const GK_FILE1 = './NewGanancia1.glb?v=mod342', GK_FILE2 = './NewGanancia2.glb?v=mod342', GK_WINGS = './GananciaAsas2.glb?v=mod342';
const COMMON_ROLES = { walk: 'Walking', run: 'Running', dash: 'Unarmed_Vault', attack: 'Double_Combo_Attack', attack2: 'Left_Slash', block: 'GK_guard', hit: 'GK_hit', cast: 'GK_cast', death: 'Dead', arise: 'Arise',
  gk_double: 'Double_Combo_Attack', gk_left: 'Left_Slash', gk_triple: 'Triple_Combo_Attack', gk_wc: 'Weapon_Combo', gk_wc1: 'Weapon_Combo_1' };
export const GK_ROLES_A = Object.freeze({ ...COMMON_ROLES, idle: 'GK_idle', gk_pitch: 'baseball_pitching' });
export const GK_ROLES_B = Object.freeze({ ...COMMON_ROLES, idle: 'GK_idle', gk_pitch: 'GK_pitch', gk_wc2: 'Weapon_Combo_2', gk_rslash: 'Right_Hand_Sword_Slash', gk_axe: 'Axe_Spin_Attack', gk_spin: 'Double_Blade_Spin',
  gk_fly: 'GK_fly', gk_dive: 'GK_dive', gk_land: 'GK_land', gk_hang: 'Upside_Down_Rope_Hang_1', gk_jump: 'GK_jump' });
export const GK_IN_PLACE = Object.freeze(['dash', 'attack', 'attack2', 'death', 'hit', 'arise', 'gk_double', 'gk_left', 'gk_triple', 'gk_wc', 'gk_wc1', 'gk_wc2', 'gk_pitch', 'gk_rslash', 'gk_axe', 'gk_spin', 'gk_dive', 'gk_land', 'gk_jump', 'gk_fly']);
export const GK_TIME = Object.freeze({ dash: { from: .05, speed: 1.35 } });
/** Ossos das asas da fase II (inspeção do GLB): bases nas costas e cadeias superiores; chifres e mandíbula. */
export const GK_BONES = Object.freeze({ wingR: ['Bone_059', 'Bone_050'], wingL: ['Bone_057', 'Bone_053'], wingBaseR: 'Bone_059', wingBaseL: 'Bone_057', horns: ['Bone_043', 'Bone_045'], jaw: 'Bone_047' });

const ROOTED = new WeakSet();
function anchorRoot(clips, refName) { // raiz única: quadril horizontal fixo no do clipe de referência (sem salto entre golpes)
  const ref = clips.find(c => c.name === refName)?.tracks.find(t => /hips[^.]*\.position$/i.test(t.name)); if (!ref) return; const ax = ref.values[0], az = ref.values[2];
  for (const c of clips) { if (ROOTED.has(c)) continue; ROOTED.add(c); const tr = c.tracks.find(t => /hips[^.]*\.position$/i.test(t.name)); if (!tr) continue; const v = tr.values, dx = ax - v[0], dz = az - v[2]; for (let i = 0; i < v.length; i += 3) { v[i] += dx; v[i + 2] += dz; } }
}
function synth(T, clips, specs, ref) {
  anchorRoot(clips, ref); const by = n => clips.find(c => c.name === n), out = [];
  for (const [name, src, a, b, flatY] of specs) { const s = by(src); if (!s) continue; const c = T.AnimationUtils.subclip(s, name, a, b, 30);
    if (flatY) for (const tr of c.tracks) if (/hips[^.]*\.position$/i.test(tr.name)) { const v = tr.values, y0 = v[1]; for (let i = 0; i < v.length; i += 3) v[i + 1] = Math.min(v[i + 1], y0 + .05) - (flatY === 'dive' ? 0 : 0); }
    ROOTED.add(c); out.push(c); }
  return out;
}
export function gkSynthA(T, clips) { return synth(T, clips, [['GK_idle', 'Idle_14', 0, 96], ['GK_guard', 'Weapon_Combo', 0, 6], ['GK_hit', 'Double_Combo_Attack', 52, 62], ['GK_cast', 'Idle_14', 129, 156]], 'Idle_14'); }
export function gkSynthB(T, clips) {
  // asas: sem trilhas (ficam 100 % procedurais — nenhum clipe do GLB as move; o runtime as anima por ossos)
  for (const c of clips) c.tracks = c.tracks.filter(t => !/^Bone_0(4[89]|5[0-9]|8[0-9]|9[0-2]|3[01])\./.test(t.name));
  return synth(T, clips, [['GK_idle', 'Arise', 48, 55], ['GK_guard', 'Weapon_Combo', 0, 6], ['GK_hit', 'Double_Combo_Attack', 52, 62], ['GK_cast', 'Arise', 40, 55], ['GK_pitch', 'Right_Hand_Sword_Slash', 0, 45],
    ['GK_fly', 'Dive_Down_and_Land_2', 0, 3], ['GK_dive', 'Dive_Down_and_Land_2', 2, 30, 'dive'], ['GK_land', 'Dive_Down_and_Land', 24, 48], ['GK_jump', 'Basic_Jump', 30, 60]], 'Walking');
}
/** Fase II: reparenta as cadeias de asa presas à cabeça/raiz para as bases nas costas (hierarquia coerente para bater). */
export function gkPrepareB(T, model) {
  const bone = {}; model.traverse(o => { if (o.isBone) bone[o.name] = o; }); model.updateMatrixWorld(true);
  const up = bone.UpperChest, bR = bone[GK_BONES.wingBaseR], bL = bone[GK_BONES.wingBaseL];
  if (up && bR && bR.parent !== up) up.attach(bR); if (bR && bone.Bone_050 && bone.Bone_050.parent !== bR) bR.attach(bone.Bone_050); if (bL && bone.Bone_053 && bone.Bone_053.parent !== bL) bL.attach(bone.Bone_053);
  return !!(bR && bL);
}

/* ---------------- golpes (instantes medidos no pico de velocidade da ponta, por mão) ---------------- */
const MA = [
  { id: 'Ceifa_Gemea', clip: 'gk_double', label: 'Ceifa Gêmea', hits: [.7, 1.2], hands: ['R', 'R'], duration: 1.65, advance: 1.2, glide: true, weight: 1, rate: 1.4 },
  { id: 'Tributo_Triplo', clip: 'gk_triple', label: 'Tributo Triplo', hits: [.77, 1.53, 2.23], hands: ['R', 'R', 'R'], duration: 2.55, advance: 1.3, glide: true, weight: 1.1, rate: 1.5 },
  { id: 'Usura_Cruzada', clip: 'gk_wc', label: 'Usura Cruzada', hits: [.77, 1.3, 2.37], hands: ['R', 'R', 'R'], duration: 2.7, advance: 1.1, glide: true, weight: 1, rate: 1.5 },
  { id: 'Pendulo_do_Ouro', clip: 'gk_wc1', label: 'Pêndulo do Ouro', hits: [.67, 1.67, 2.47], hands: ['R', 'L', 'R'], duration: 2.8, advance: 1.2, glide: true, weight: .9, rate: 1.45 },
  { id: 'Corte_Avaro', clip: 'gk_left', label: 'Corte Avaro', hits: [.87, 1.37], hands: ['R', 'R'], duration: 1.8, advance: .7, weight: .8, rate: 1.35 }
];
const MB = [
  ...MA.map(m => ({ ...m })),
  { id: 'Juizo_Quadruplo', clip: 'gk_wc2', label: 'Juízo Quádruplo', hits: [1.17, 2.0, 2.17, 3.0], hands: ['R', 'R', 'R', 'R'], duration: 3.35, advance: 1.4, glide: true, weight: .9, rate: 1.55, minPhase: 1 },
  { id: 'Rodopio_Asas', clip: 'gk_spin', label: 'Rodopio das Asas', hits: [.83, 1.37, 1.7], hands: ['R', 'L', 'R'], duration: 2.1, advance: .5, spin: true, weight: .8, rate: 1.35, aimMax: 2.2 },
  { id: 'Machado_do_Dizimo', clip: 'gk_axe', label: 'Machado do Dízimo', hits: [.97, 1.17], hands: ['R', 'R'], duration: 1.6, advance: .8, weight: .8, rate: 1.3 },
  { id: 'Talho_Relampago', clip: 'gk_rslash', label: 'Talho Relâmpago', hits: [.7], hands: ['R'], duration: 1.15, advance: 1.6, fast: true, weight: .7, rate: 1.2 }
];
for (const m of MA) m.kindKey = 'greedA'; for (const m of MB) m.kindKey = 'greedB';
BOSS_MOVES.greedA = MA; BOSS_MOVES.greedB = MB;
for (const [k, list] of [['greedA', MA], ['greedB', MB]]) for (const m of list) { m.kind = k; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = 1.05; }
export const GK_MOVES_A = MA, GK_MOVES_B = MB;

/* ---------------- números (frações da vida do herói ~500–650; nada de one-shot) ---------------- */
export const GK = Object.freeze({
  dash: { speed: 13.5, time: .22, cd: .6, minStart: .6 },
  scythe: { life: 10, speed: 11, maxSpeed: 7.8, accel: 20, keep: 1.35, windup: .34, strikeDur: .3, recoil: .38, dmg: 9, reach: 1.45, clashR: 2.3, clashCd: .6, stun: .9, repel: 9 },
  spear: { speed: 18, turn: 1.7, life: 5, radius: .55, dmg: 22, gap: [3.5, 16], cd: 9, release: 1.15 },
  throw: { release: 1.15, gap: [2, 12], cd: 8, phase2Release: .7, p1Dur: 1.6, p1Speed: 1.45 }, // 22/11: arremesso da fase I 45% mais rápido (o vídeo de 9 s mostrava ritmo lento)
  fly: { alt: 4.4, ceilMargin: 2.2, rise: 6, cruise: [1.4, 2.4], radius: 7, speed: 6.5, diveSpeed: 15, hang: 3.6, cd: 12, minCeil: 7.5, maxCeil: 18 },
  suns: { n: 4, form: .45, hold: .35, gap: .36, speed: 11.5, radius: .55, boom: 2.3, direct: 14, area: 8, cd: 14 },
  abyss: { first: [32, 38], slow: 25, fast: 20, charge: 3.3, speed: 9.5, radius: 1, boom: 3.2, direct: 24, area: 12 },
  tele: { duel: [6, 8], orbitR: 1.7 },
  phase: { fall: 2.6, arise: 1.9, revive: { die: 2.6, hold: .7, rise: 1.83, burst: .5 } }
});
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrap = x => Math.atan2(Math.sin(x), Math.cos(x)), ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const SETS = { scythes: { R: 'B', L: 'A' }, spearblade: { R: 'C', L: 'D' } };

/* ---------------- estado por chefe ---------------- */
function gkInit(sq, a) {
  if (a.gk) return a.gk;
  const g = a.gk = { phase: a.kind === 'greedA' ? 1 : 2, set: 'scythes', hands: { ...SETS.scythes }, away: {}, ents: [], spear: null, suns: [], sphere: null, abyssT: null, nextId: 1,
    stats: { combos: 0, throws: 0, spears: 0, spearHit: 0, spearPierce: 0, flights: 0, dives: 0, hangs: 0, suns: 0, sunHit: 0, sunArea: 0, scytheHit: 0, scytheBlock: 0, clash: 0, falls: 0, abyss: 0, abyssHit: 0, tele: 0, swaps: 0 }, swapT: 0 };
  a.vgStats = g.stats; return g;
}
function setHands(a, set) { const g = a.gk; g.set = set; for (const h of ['R', 'L']) { const k = SETS[set][h]; g.hands[h] = g.away[k] ? null : k; } }
/** Se uma arma sai da mão, o chefe materializa na mão o PAR alternativo (o que não estiver em campo). */
function resummon(sq, a) {
  const g = a.gk; if (g.phase >= 3) { g.hands.R = g.hands.L = null; return; }
  const want = g.away.A || g.away.B ? 'spearblade' : g.away.C || g.away.D ? 'scythes' : g.set;
  if (want !== g.set || !g.hands.R || !g.hands.L) { const before = JSON.stringify(g.hands); setHands(a, want); if (JSON.stringify(g.hands) !== before) { g.stats.swaps++; sq.event('gkSwap', { actor: a, hands: { ...g.hands } }); } }
}
/** Vida zerada nas fases I e II: em vez de morrer, começa a transição (o motor não mata porque a vida volta a 1). */
export function gkHoldDeath(sq, a) { const g = gkInit(sq, a); if (g.phase >= 3 || (a.act && a.act.type === 'gkPhase')) return false; if (a.kind === 'greedA') startPhaseOut(sq, a); else startRevive(sq, a); return false; }

/* ---------------- armas autônomas (foices; na fase III, as quatro) ---------------- */
const CHOREO = { // golpes por arma: eixo da haste (ângulo no plano vertical), varredura (de→para, rad) e altura
  A: [{ sweep: [-1.6, 1.5], tilt: .25, h: 1.25 }, { sweep: [1.2, -1.4], tilt: -.6, h: .9 }, { sweep: [-2.6, 2.6], tilt: 0, h: 1.1, spin: true }],
  B: [{ sweep: [2.2, -.2], tilt: 1.2, h: 1.7 }, { sweep: [-1.4, 1.3], tilt: -.2, h: .75 }, { sweep: [1.7, -1.7], tilt: .05, h: 1.55 }],
  C: [{ thrust: 1.6, h: 1.2 }, { thrust: 1.9, h: 1.05 }, { sweep: [-1.2, 1.2], tilt: .1, h: 1.1 }],
  D: [{ sweep: [1.4, -.9], tilt: .8, h: 1.5 }, { sweep: [-1.4, .9], tilt: .8, h: 1.5 }, { sweep: [0, 0], tilt: 1.45, h: 2.1, slam: true }]
};
function launchBlade(sq, a, key, t, side, mode = 'outbound') {
  const g = a.gk, S = GK.scythe, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fx;
  const e = { id: g.nextId++, key, owner: a.id, mode, t: 0, life: mode === 'tele' ? GK.tele.duel[0] + sq.rand() * (GK.tele.duel[1] - GK.tele.duel[0]) : S.life,
    x: a.x + rx * side * .6, y: a.y + 1.5, z: a.z + rz * side * .6, vx: (rx * side * .85 + fx * .55) * S.speed, vz: (rz * side * .85 + fz * .55) * S.speed, spin: 0, yaw: a.yaw,
    wx: 0, wz: 0, side, strike: null, cool: .2, combo: 0, stun: 0, clashCd: 0, base: null, tip: null, hits: 0, ax: [0, 1, 0], nrm: [1, 0, 0] };
  e.wx = e.x; e.wz = e.z; g.ents.push(e); g.away[key] = true; sq.event('gkBlade', { actor: a, ent: e, phase: 'launch' }); return e;
}
/** Segmento do gume no mundo a partir da pose da arma (centro W, eixo da haste e alcance). */
/** esquiva real (dash/esquiva perfeita) anula; a graça pós-acerto (iframes sem `evading`) vai ao resolvedor do jogo, que libera fontes independentes */
const evades = tg => !!tg.iframes && tg.evading !== false;
function bladeSeg(e) { const L = e.key === 'C' ? 1.55 : 1.35, c = e.key === 'C' ? .2 : .35, o = { base: { x: e.x + e.ax[0] * c, y: e.y + e.ax[1] * c, z: e.z + e.ax[2] * c }, tip: { x: e.x + e.ax[0] * L, y: e.y + e.ax[1] * L, z: e.z + e.ax[2] * L } };
  if (e.key === 'C') return o; // gume da lâmina/picareta: sai do topo da haste no eixo X do modelo (= haste × normal), como no runtime
  const [ax, ay, az] = e.ax, [nx, ny, nz] = e.nrm, X = [ay * nz - az * ny, az * nx - ax * nz, ax * ny - ay * nx], l = Math.hypot(...X) || 1, E = .8, h = L - .12;
  o.eb = { x: e.x + ax * h, y: e.y + ay * h, z: e.z + az * h }; o.et = { x: o.eb.x + X[0] / l * E, y: o.eb.y + X[1] / l * E, z: o.eb.z + X[2] / l * E }; return o; }
function stepBlades(sq, a, dt, t) {
  const g = a.gk, S = GK.scythe; if (!g.ents.length) return;
  for (const e of g.ents) { if (e.mode === 'gone') continue; e.t += dt; e.clashCd = Math.max(0, e.clashCd - dt);
    const tgt = t && t.alive !== false ? t : null;
    if (e.mode === 'orbit') { // fase III: formação em volta do chefe, com inércia e sem atravessar o corpo
      const i = ['A', 'B', 'C', 'D'].indexOf(e.key), ang = a.yaw + Math.PI + (i - 1.5) * .7 + Math.sin(sq.time * .8 + i) * .08, R = GK.tele.orbitR + (i % 2) * .35;
      const px = a.x + Math.sin(ang) * R, pz = a.z + Math.cos(ang) * R, py = a.y + 1.9 + (i % 2) * .45 + Math.sin(sq.time * 1.6 + i * 1.7) * .12, k = 1 - Math.exp(-dt * 6);
      e.x += (px - e.x) * k; e.z += (pz - e.z) * k; e.y += (py - e.y) * k; e.ax = [Math.sin(ang) * .2, .97, Math.cos(ang) * .2]; e.nrm = [Math.cos(ang), 0, -Math.sin(ang)]; e.strike = null; continue; }
    if (e.mode === 'fall') { e.vy = (e.vy ?? 0) - 14 * dt; e.y += e.vy * dt; e.x += e.vx * dt; e.z += e.vz * dt; e.vx *= .96; e.vz *= .96; const gy = sq.ground(e.x, e.z) + .15;
      if (e.y <= gy) { e.y = gy; e.vx = e.vz = e.vy = 0; if (!e.landed) { e.landed = true; sq.event('gkBlade', { actor: a, ent: e, phase: 'land' }); } }
      e.ax = [Math.sin(e.yaw) * .8, e.landed ? .2 : .6, Math.cos(e.yaw) * .8]; if (e.t > e.fallAt + 1.4) { e.mode = 'gone'; sq.event('gkBlade', { actor: a, ent: e, phase: 'gone' }); } continue; }
    if (e.mode === 'return') { const k = 1 - Math.exp(-dt * 5), tx = a.x, tz = a.z, ty = a.y + 1.8; e.x += (tx - e.x) * k; e.z += (tz - e.z) * k; e.y += (ty - e.y) * k;
      if (Math.hypot(tx - e.x, tz - e.z) < .6) { e.mode = g.phase >= 3 ? 'orbit' : 'gone'; if (e.mode === 'gone') sq.event('gkBlade', { actor: a, ent: e, phase: 'gone' }); } continue; }
    if (e.t >= e.life) { // fim do tempo: cai fisicamente (fases I–II) ou volta à órbita (fase III telecinética)
      if (e.mode === 'tele') { e.mode = 'return'; sq.event('gkBlade', { actor: a, ent: e, phase: 'return' }); continue; }
      e.mode = 'fall'; e.fallAt = e.t; e.vy = 1.5; e.strike = null; g.stats.falls++; sq.event('gkBlade', { actor: a, ent: e, phase: 'fall' }); continue; }
    if (e.stun > 0) { e.stun -= dt; e.x += e.vx * dt; e.z += e.vz * dt; e.vx *= Math.exp(-dt * 3); e.vz *= Math.exp(-dt * 3); e.y += (a.y + 1.3 - e.y) * Math.min(1, dt * 2); e.ax = [Math.sin(e.t * 9), .3, Math.cos(e.t * 9)]; continue; }
    if (!tgt) continue;
    const dx = tgt.x - e.wx, dz = tgt.z - e.wz, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    if (e.mode === 'outbound') { // arremesso lateral/oblíquo que curva até o herói, girando
      const ax = ux * S.accel * 1.4 - e.vx * .6, az = uz * S.accel * 1.4 - e.vz * .6; e.vx += ax * dt; e.vz += az * dt; const sp = Math.hypot(e.vx, e.vz), mx = S.speed; if (sp > mx) { e.vx *= mx / sp; e.vz *= mx / sp; }
      const nx = e.wx + e.vx * dt, nz = e.wz + e.vz * dt; if (sq.blocked(nx, nz)) { e.vx *= -.4; e.vz *= -.4; } else { e.wx = nx; e.wz = nz; }
      e.spin += dt * 16; e.ax = [Math.cos(e.spin) * Math.cos(e.yaw), .15, Math.cos(e.spin) * -Math.sin(e.yaw)]; e.x = e.wx; e.z = e.wz; e.y += (sq.ground(e.x, e.z) + 1.3 - e.y) * Math.min(1, dt * 3);
      if (d < 4 || e.t > 1.6) { e.mode = e.key && a.gk.phase >= 3 ? 'tele' : 'duel'; if (e.mode === 'tele') e.life = e.t + (e.life - e.t); sq.event('gkBlade', { actor: a, ent: e, phase: 'duel' }); }
      continue; }
    // DUELO: empunhador invisível W mantém distância, desliza de lado e executa golpes com janelas próprias
    const want = e.strike ? S.keep * .85 : S.keep + (e.cool > 0 ? .4 : 0), side = e.side, err = d - want;
    let ax = ux * clamp(err, -1.5, 1.5) * S.accel - e.vx * 3, az = uz * clamp(err, -1.5, 1.5) * S.accel - e.vz * 3;
    if (!e.strike) { ax += -uz * side * 4; az += ux * side * 4; }
    e.vx += ax * dt; e.vz += az * dt; const sp = Math.hypot(e.vx, e.vz); if (sp > S.maxSpeed) { e.vx *= S.maxSpeed / sp; e.vz *= S.maxSpeed / sp; }
    const nx = e.wx + e.vx * dt, nz = e.wz + e.vz * dt; if (!sq.blocked(nx, nz)) { e.wx = nx; e.wz = nz; } else { e.vx = e.vz = 0; }
    if ((e.cool -= dt) <= 0 && !e.strike && d < S.keep + 1.2) { const list = CHOREO[e.key], c = list[e.combo++ % list.length]; e.strike = { id: g.nextId++, c, t: 0, hit: new Set(), face: Math.atan2(ux, uz) }; sq.event('gkBlade', { actor: a, ent: e, phase: 'windup', strike: e.strike }); }
    const face = e.strike ? e.strike.face : Math.atan2(ux, uz), fx = Math.sin(face), fz = Math.cos(face), rx = fz, rz = -fx;
    let hy = 1.25, ang = -.6, tilt = .3, reach = 0;
    if (e.strike) { const s = e.strike, c = s.c; s.t += dt; const w = S.windup, u = (s.t - w) / S.strikeDur;
      if (c.thrust) { reach = s.t < w ? -.45 * ease(s.t / w) : u < 1 ? -.45 + (c.thrust + .45) * ease(u * 1.4) : c.thrust * (1 - ease((u - 1) * 1.5)); ang = 0; tilt = 1.5; hy = c.h; }
      else { ang = s.t < w ? c.sweep[0] * ease(s.t / w) : u < 1 ? c.sweep[0] + (c.sweep[1] - c.sweep[0]) * ease(u) : c.sweep[1]; tilt = c.tilt; hy = c.h; if (c.slam) { hy = u < 1 ? c.h - 1.6 * ease(u) : .5; } }
      if (s.t >= w + S.strikeDur + S.recoil) { e.strike = null; e.cool = .25 + sq.rand() * .45; if (e.combo % 3 === 0) { e.cool += .5; e.side = -e.side; } } }
    // pose: centro W + eixo da haste (no plano da varredura), à frente do empunhador
    const sx = Math.sin(ang), cx = Math.cos(ang), lx = (fx * cx + rx * sx), lz = (fz * cx + rz * sx), ct = Math.cos(tilt), st = Math.sin(tilt);
    e.ax = [lx * st, ct, lz * st]; const tl = Math.hypot(...e.ax); e.ax = e.ax.map(v => v / tl); e.nrm = [-lz, 0, lx];
    if (e.strike && e.strike.c.thrust) e.ax = [fx, .05, fz];
    e.x = e.wx + fx * (.25 + reach) - e.ax[0] * .2; e.z = e.wz + fz * (.25 + reach) - e.ax[2] * .2; e.y += (sq.ground(e.x, e.z) + hy - e.y) * Math.min(1, dt * 10);
    // contato varrido (quadro anterior → atual) só na janela do golpe
    const seg = bladeSeg(e), s = e.strike, open = s && s.t >= S.windup - .02 && s.t <= S.windup + S.strikeDur + .04;
    if (open && e.base && !s.hit.has(tgt.id)) { const cap = { ...tgt, y: (tgt.y || 0) + (tgt.height || 1.8) * .5 };
      if ((bladeContact(e.base, e.tip, seg.base, seg.tip, cap, (tgt.radius || .4) + .1) || (e.eb && seg.eb && bladeContact(e.eb, e.et, seg.eb, seg.et, cap, (tgt.radius || .4) + .1))) && sq.los(e.wx, e.wz, tgt.x, tgt.z)) { s.hit.add(tgt.id);
        if (evades(tgt)) sq.event('evaded', { spell: { type: 'gkBlade' }, target: tgt.id });
        else { const r = sq.damageTarget(tgt.id, S.dmg, { kind: 'gkBlade', actor: a.id, x: e.wx, z: e.wz, knock: .35, combo: 1, gkSrc: 'blade' + e.id, attackToken: s, weapon: e.key });
          if (r === 'blocked') g.stats.scytheBlock++; else if (r === 'hit') g.stats.scytheHit++; sq.event('gkBlade', { actor: a, ent: e, phase: 'hit', result: r, x: tgt.x, z: tgt.z }); } } }
    // CHOQUE de lâminas: herói golpeando de frente na janela do golpe (ou do preparo) rebate a arma (lança não — regra própria)
    if (s && tgt.attacking && !e.clashCd && e.key !== 'C' && d < S.clashR && s.t < S.windup + S.strikeDur) { const fdot = -(ux * Math.sin(tgt.yaw ?? 0) + uz * Math.cos(tgt.yaw ?? 0));
      if (tgt.yaw === undefined || fdot > .2) { e.strike = null; e.stun = S.stun; e.vx = -ux * S.repel; e.vz = -uz * S.repel; e.clashCd = S.clashCd; g.stats.clash++; sq.event('gkBlade', { actor: a, ent: e, phase: 'clash', x: e.x, y: e.y, z: e.z }); } }
    e.base = seg.base; e.tip = seg.tip; e.eb = seg.eb; e.et = seg.et; }
  // armas que acabaram: liberam a mão (a fase I/II re-materializa o par)
  for (const e of g.ents) if (e.mode === 'gone' && g.away[e.key]) { g.away[e.key] = false; sq.event('gkBlade', { actor: a, ent: e, phase: 'free' }); }
  g.ents = g.ents.filter(e => e.mode !== 'gone'); resummon(sq, a);
}

/* ---------------- lança solar ---------------- */
function launchSpear(sq, a, t) {
  const g = a.gk, P = GK.spear, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fx;
  const sp = { id: g.nextId++, x: a.x + fx * .9 + rx * .35, y: a.y + 1.75, z: a.z + fz * .9 + rz * .35, t: 0, alive: true, hit: false, yaw: 0, pitch: 0 };
  const ty = t ? (t.y || 0) + (t.height || 1.8) * .55 : sp.y, dx = (t ? t.x : sp.x + fx) - sp.x, dz = (t ? t.z : sp.z + fz) - sp.z, d = Math.hypot(dx, dz) || 1;
  sp.dx = dx / d; sp.dz = dz / d; sp.dy = clamp((ty - sp.y) / d, -.4, .4); sp.yaw = Math.atan2(sp.dx, sp.dz); g.spear = sp; g.away.C = true; g.hands.R = null; g.stats.spears++;
  sq.event('gkSpear', { actor: a, spear: sp, phase: 'launch' }); resummon(sq, a);
}
function stepSpear(sq, a, dt, t) {
  const g = a.gk, sp = g.spear, P = GK.spear; if (!sp) return;
  if (!sp.alive) { sp.dead = (sp.dead || 0) + dt; if (sp.dead > .9) { g.spear = null; g.away.C = false; if (g.phase >= 3 && !g.ents.some(e => e.key === 'C')) launchBlade(sq, a, 'C', null, 1, 'orbit'); resummon(sq, a); } return; }
  sp.t += dt; const tgt = t && t.alive !== false ? t : null;
  if (tgt && sp.t > .12) { const want = Math.atan2(tgt.x - sp.x, tgt.z - sp.z), cur = Math.atan2(sp.dx, sp.dz), d = clamp(wrap(want - cur), -P.turn * dt, P.turn * dt), n = cur + d; sp.dx = Math.sin(n); sp.dz = Math.cos(n); // rota corrigida com curva limitada
    const ty = (tgt.y || 0) + (tgt.height || 1.8) * .55; sp.dy += clamp((ty - sp.y) / Math.max(1, Math.hypot(tgt.x - sp.x, tgt.z - sp.z)) - sp.dy, -dt, dt); }
  const st = P.speed * dt, n = Math.max(1, Math.ceil(st / .3)); let end = null;
  for (let i = 0; i < n && !end; i++) { const px = sp.x, py = sp.y, pz = sp.z; sp.x += sp.dx * st / n; sp.y += sp.dy * st / n; sp.z += sp.dz * st / n;
    if (sq.blocked(sp.x, sp.z)) { end = 'wall'; break; }
    const gy = sq.ground(sp.x, sp.z); if (sp.y < gy + .35) { if (sp.dy < -.35) { end = 'wall'; break; } sp.y = gy + .35; sp.dy = Math.max(0, sp.dy); } // raso: nivela e segue reta (só crava se mergulhar)
    for (const tg of sq.enemyTargets()) { if (!tg.alive) continue; const cap = { ...tg, y: (tg.y || 0) + (tg.height || 1.8) * .5 };
      if (!bladeContact({ x: px, y: py, z: pz }, { x: px + sp.dx * .9, y: py + sp.dy * .9, z: pz + sp.dz * .9 }, { x: sp.x, y: sp.y, z: sp.z }, { x: sp.x + sp.dx * .9, y: sp.y + sp.dy * .9, z: sp.z + sp.dz * .9 }, cap, (tg.radius || .4) + P.radius * .5)) continue;
      if (evades(tg)) { if (!sp.evaded) { sp.evaded = true; sq.event('evaded', { spell: { type: 'gkSpear' }, target: tg.id }); } continue; }
      const r = sq.damageTarget(tg.id, P.dmg, { kind: 'gkSpear', actor: a.id, x: sp.x, z: sp.z, knock: .9, combo: 1, pierceShield: true, gkSrc: 'spear' + sp.id });
      if (r === 'hit' || r === 'blocked') { g.stats.spearHit++; if (r === 'blocked') g.stats.spearPierce++; } end = 'hit'; sp.target = tg.id; break; } }
  if (!end && sp.t >= P.life) end = 'timeout';
  if (end) { sp.alive = false; sp.end = end; sq.event('gkSpear', { actor: a, spear: sp, phase: 'end', end }); }
}

/* ---------------- quatro mini-sóis ---------------- */
function startSuns(sq, a, t) {
  const g = a.gk, U = GK.suns, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fx; g.stats.suns++; g.sunWave = (g.sunWave || 0) + 1;
  for (let i = 0; i < U.n; i++) { const off = (i - 1.5) * 1.15, up = 1.3 + (i % 2) * .65 + Math.abs(off) * .12;
    g.suns.push({ id: g.nextId++, wave: g.sunWave, i, state: 'forming', t: -i * U.form, x: a.x + fx * 1.6 + rx * off, y: a.y + up + (a.airY ? 0 : .5), z: a.z + fz * 1.6 + rz * off, ox: fx * 1.6 + rx * off, oy: up, oz: fz * 1.6 + rz * off,
      launchAt: U.n * U.form + U.hold + i * U.gap + sq.rand() * .12, vx: 0, vy: 0, vz: 0, hit: new Set(), r: 0 }); }
  sq.event('gkSuns', { actor: a, phase: 'summon', suns: g.suns });
}
function stepSuns(sq, a, dt, t) {
  const g = a.gk, U = GK.suns; if (!g.suns.length) return; const tgt = t && t.alive !== false ? t : null;
  for (const s of g.suns) { if (s.state === 'done') continue; s.t += dt;
    if (s.state === 'forming') { s.r = clamp(s.t / U.form, 0, 1); s.x = a.x + s.ox; s.y = a.y + s.oy + (a.airY || 0) * 0 + .4; s.z = a.z + s.oz; if (s.t >= U.form) { s.state = 'hold'; sq.event('gkSuns', { actor: a, phase: 'formed', sun: s }); } continue; }
    if (s.state === 'hold') { s.x = a.x + s.ox; s.z = a.z + s.oz; s.y = a.y + s.oy + .4 + Math.sin(sq.time * 3 + s.i) * .06; const since = s.t + s.i * U.form;
      if (since >= s.launchAt && tgt) { // predição moderada + separação: cada sol mira um ponto próprio ao redor do herói
        const lead = .45 + s.i * .08, px = tgt.x + (tgt.vx || 0) * lead, pz = tgt.z + (tgt.vz || 0) * lead, ang = s.i * Math.PI / 2 + sq.rand() * .6, spread = s.i === 0 ? 0 : .9 + sq.rand() * .7;
        const gx = px + Math.sin(ang) * spread, gz = pz + Math.cos(ang) * spread, gy = sq.ground(gx, gz) + .35, dx = gx - s.x, dy = gy - s.y, dz = gz - s.z, d = Math.hypot(dx, dy, dz) || 1;
        s.vx = dx / d * U.speed; s.vy = dy / d * U.speed; s.vz = dz / d * U.speed; s.state = 'fly'; s.ft = 0; sq.event('gkSuns', { actor: a, phase: 'launch', sun: s }); }
      continue; }
    if (s.state === 'fly') { s.ft += dt; const steps = Math.max(1, Math.ceil(U.speed * dt / .3)); let boom = null;
      for (let k = 0; k < steps && !boom; k++) { s.x += s.vx * dt / steps; s.y += s.vy * dt / steps; s.z += s.vz * dt / steps;
        if (sq.blocked(s.x, s.z) || s.y <= sq.ground(s.x, s.z) + .3) { boom = 'ground'; break; }
        for (const tg of sq.enemyTargets()) { if (!tg.alive) continue; const cy = (tg.y || 0) + (tg.height || 1.8) * .5, dd = Math.hypot(tg.x - s.x, (cy - s.y) * .6, tg.z - s.z);
          if (dd > U.radius + (tg.radius || .4)) continue; if (evades(tg)) { sq.event('evaded', { spell: { type: 'gkSun' }, target: tg.id }); continue; }
          s.hit.add(tg.id); const r = sq.damageTarget(tg.id, U.direct, { kind: 'gkSun', actor: a.id, x: s.x, z: s.z, knock: .7, combo: 1, gkSrc: 'sun' + s.id }); if (r === 'hit') g.stats.sunHit++; boom = 'hero'; break; } }
      if (!boom && s.ft > 3) boom = 'air';
      if (boom) { s.state = 'done'; // explosão: área só em quem NÃO levou o impacto direto deste mesmo sol
        for (const tg of sq.enemyTargets()) { if (!tg.alive || s.hit.has(tg.id)) continue; if (Math.hypot(tg.x - s.x, tg.z - s.z) > U.boom + (tg.radius || .4) || Math.abs((tg.y || 0) - s.y) > 2.5) continue; if (!sq.los(s.x, s.z, tg.x, tg.z)) continue;
          if (evades(tg)) continue; const r = sq.damageTarget(tg.id, U.area, { kind: 'gkSunArea', actor: a.id, x: s.x, z: s.z, knock: .5, area: true, gkSrc: 'sunA' + s.id }); if (r === 'hit') g.stats.sunArea++; }
        sq.event('gkSuns', { actor: a, phase: 'boom', sun: s, where: boom, gy: sq.ground(s.x, s.z) }); } } }
  if (g.suns.every(s => s.state === 'done')) g.suns = [];
}

/* ---------------- esfera do abismo (fase III) ---------------- */
function stepAbyss(sq, a, dt, t) {
  const g = a.gk, B = GK.abyss; if (g.phase < 3 || !sq.abyssAnchor) return; const anc = sq.abyssAnchor, tgt = t && t.alive !== false ? t : null;
  if (g.abyssT === null) g.abyssT = B.first[0] + sq.rand() * (B.first[1] - B.first[0]);
  const s = g.sphere;
  if (!s) { g.abyssT -= dt; if (g.abyssT <= 0 && tgt) { g.sphere = { id: g.nextId++, state: 'charge', t: 0, x: anc.x, y: anc.y, z: anc.z, k: 0, hit: new Set(), power: 1 - a.hp / a.maxHp }; g.stats.abyss++; sq.event('gkAbyss', { actor: a, phase: 'charge', sphere: g.sphere }); } return; }
  s.t += dt;
  if (s.state === 'charge') { s.k = clamp(s.t / B.charge, 0, 1); if (s.t >= B.charge && tgt) { const lead = .5, px = tgt.x + (tgt.vx || 0) * lead, pz = tgt.z + (tgt.vz || 0) * lead, py = (tgt.y || 0) + 1, dx = px - s.x, dy = py - s.y, dz = pz - s.z, d = Math.hypot(dx, dy, dz) || 1;
      s.vx = dx / d * B.speed; s.vy = dy / d * B.speed; s.vz = dz / d * B.speed; s.state = 'fly'; s.ft = 0; sq.event('gkAbyss', { actor: a, phase: 'fire', sphere: s }); } return; }
  if (s.state === 'fly') { s.ft += dt; const steps = Math.max(1, Math.ceil(B.speed * dt / .3)); let boom = null;
    for (let k = 0; k < steps && !boom; k++) { s.x += s.vx * dt / steps; s.y += s.vy * dt / steps; s.z += s.vz * dt / steps;
      if (s.y <= sq.ground(s.x, s.z) + .4) { boom = 'ground'; break; }
      for (const tg of sq.enemyTargets()) { if (!tg.alive) continue; const cy = (tg.y || 0) + (tg.height || 1.8) * .5; if (Math.hypot(tg.x - s.x, (cy - s.y) * .6, tg.z - s.z) > B.radius + (tg.radius || .4)) continue;
        if (evades(tg)) { sq.event('evaded', { spell: { type: 'gkAbyss' }, target: tg.id }); continue; } s.hit.add(tg.id); const r = sq.damageTarget(tg.id, B.direct, { kind: 'gkAbyss', actor: a.id, x: s.x, z: s.z, knock: 1, gkSrc: 'aby' + s.id }); if (r === 'hit') g.stats.abyssHit++; boom = 'hero'; break; } }
    if (!boom && s.ft > 6) boom = 'air';
    if (boom) { for (const tg of sq.enemyTargets()) { if (!tg.alive || s.hit.has(tg.id) || evades(tg)) continue; if (Math.hypot(tg.x - s.x, tg.z - s.z) > B.boom + (tg.radius || .4)) continue; sq.damageTarget(tg.id, B.area, { kind: 'gkAbyssArea', actor: a.id, x: s.x, z: s.z, knock: .8, area: true, gkSrc: 'abyA' + s.id }); }
      s.state = 'boom'; s.bt = 0; sq.event('gkAbyss', { actor: a, phase: 'boom', sphere: s, where: boom, gy: sq.ground(s.x, s.z) });
      g.abyssT = Math.max(4, B.slow + (B.fast - B.slow) * clamp((1 - a.hp / a.maxHp) / .7, 0, 1) - s.t); /* disparo→disparo: 25 s → 20 s conforme a vida cai */ /* depois da 1ª: 25 s → 20 s conforme a vida cai */ } return; }
  if (s.state === 'boom') { s.bt += dt; if (s.bt > 1.2) g.sphere = null; }
}

/* ---------------- voo (fases II–III) ---------------- */
function startFlight(sq, a, t, plan) {
  const g = a.gk, F = GK.fly, ceil = sq.ceilingAt ? sq.ceilingAt(a.x, a.z) : null, alt = Math.min(F.alt, ceil ? ceil - (a.y) - F.ceilMargin : F.alt);
  if (alt < 2.6) return false; g.stats.flights++;
  sq.begin(a, { type: 'gkFly', dur: 30, anim: 'gk_jump', token: 'melee', tid: t && t.id, face: true, stage: 'takeoff', st: 0, alt, plan, cruise: F.cruise[0] + sq.rand() * (F.cruise[1] - F.cruise[0]), dives: 0, orbitDir: sq.rand() < .5 ? -1 : 1 });
  a.cds.gkFly = F.cd * a.cdMul; sq.event('gkFly', { actor: a, phase: 'takeoff' }); return true;
}
function flyAnim(sq, a, role) { if (a.anim.role !== role) a.anim = { role, once: role !== 'gk_fly' && role !== 'gk_hang', speed: 1, rev: a.anim.rev + 1 }; }
function stepFlight(sq, a, dt, t) {
  const act = a.act, F = GK.fly, g = a.gk; act.st += dt; const tgt = t && t.alive !== false ? t : null;
  const air = h => { a.airY = Math.max(0, h); a.airV = 0; a.y = sq.ground(a.x, a.z) + a.airY; };
  const glide = (tx, tz, sp) => { const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz); if (d < .05) return d; const st = Math.min(d, sp * dt), nx = a.x + dx / d * st, nz = a.z + dz / d * st; if (!sq.blocked(nx, nz)) { a.x = nx; a.z = nz; } a.yaw = wrap(a.yaw + clamp(wrap(Math.atan2(dx, dz) - a.yaw), -6 * dt, 6 * dt)); return d; };
  g.wing = { mode: 'flap', k: 1 };
  if (act.stage === 'takeoff') { air(act.alt * ease(act.st / .7)); if (act.st >= .7) { act.stage = 'cruise'; act.st = 0; flyAnim(sq, a, 'gk_fly'); sq.event('gkFly', { actor: a, phase: 'cruise' }); } return; }
  if (act.stage === 'cruise') { air(act.alt + Math.sin(sq.time * 2.2) * .25); act.face = false;
    if (tgt) { const ang = Math.atan2(a.x - tgt.x, a.z - tgt.z) + act.orbitDir * F.speed / F.radius * dt; glide(tgt.x + Math.sin(ang) * F.radius, tgt.z + Math.cos(ang) * F.radius, F.speed); a.yaw = wrap(a.yaw + clamp(wrap(Math.atan2(tgt.x - a.x, tgt.z - a.z) - a.yaw), -5 * dt, 5 * dt)); }
    if (act.st >= act.cruise) { act.st = 0;
      if (act.plan === 'hang' && sq.ceilingAt) { const c = sq.ceilingAt(a.x, a.z); if (c && c - a.y > 3 && c - sq.ground(a.x, a.z) >= F.minCeil && c - sq.ground(a.x, a.z) <= F.maxCeil) { /* teto real e alcançável (a garganta da arena tem ~80 m: aborta) */ act.stage = 'toCeil'; act.ceil = c; sq.event('gkFly', { actor: a, phase: 'toCeil', ceil: c }); return; } act.plan = 'suns'; }
      if (act.plan === 'suns') { act.stage = 'cast'; startSuns(sq, a, tgt); sq.event('gkFly', { actor: a, phase: 'castAir' }); return; }
      act.stage = 'dive'; act.lock = tgt ? { x: tgt.x + (tgt.vx || 0) * .3, z: tgt.z + (tgt.vz || 0) * .3 } : { x: a.x, z: a.z }; act.from = { x: a.x, z: a.z, h: a.airY }; act.hitDone = false; flyAnim(sq, a, 'gk_dive'); g.stats.dives++; sq.event('gkFly', { actor: a, phase: 'dive', lock: act.lock }); }
    return; }
  if (act.stage === 'toCeil') { const want = act.ceil - sq.ground(a.x, a.z) - 1.25; a.gkCeil = act.ceil; a.airY += Math.min(F.rise * dt, want - a.airY); air(a.airY); if (want - a.airY < .05) { act.stage = 'hang'; act.st = 0; act.flip = 0; flyAnim(sq, a, 'gk_hang'); g.stats.hangs++; sq.event('gkFly', { actor: a, phase: 'hang', ceil: act.ceil }); } return; }
  if (act.stage === 'hang') { g.wing = { mode: 'fold', k: 1 }; a.gkFlip = clamp(act.st / .45, 0, 1); if (tgt) a.yaw = wrap(a.yaw + clamp(wrap(Math.atan2(tgt.x - a.x, tgt.z - a.z) - a.yaw), -3 * dt, 3 * dt));
    if (!act.sunsCast && act.st > .6) { act.sunsCast = true; startSuns(sq, a, tgt); }
    if (act.st >= F.hang && !g.suns.length) { act.stage = 'drop'; act.st = 0; flyAnim(sq, a, 'gk_fly'); sq.event('gkFly', { actor: a, phase: 'drop' }); } return; }
  if (act.stage === 'drop') { a.gkFlip = 1 - clamp(act.st / .4, 0, 1); a.airY = Math.max(act.alt, a.airY - 8 * dt); air(a.airY); if (act.st > .5) { act.stage = 'cruise'; act.st = 0; act.plan = 'dive'; act.cruise = .6; } return; }
  if (act.stage === 'cast') { air(act.alt + Math.sin(sq.time * 2.2) * .15); g.wing = { mode: 'hover', k: 1 }; if (tgt) a.yaw = wrap(a.yaw + clamp(wrap(Math.atan2(tgt.x - a.x, tgt.z - a.z) - a.yaw), -4 * dt, 4 * dt));
    if (act.st > 1.2 && !g.suns.length) { act.stage = 'land'; act.st = 0; flyAnim(sq, a, 'gk_land'); } return; }
  if (act.stage === 'dive') { // mergulho: trajetória reta até o ponto travado, corte na chegada, recua
    const u = clamp(act.st / .62, 0, 1), k = ease(u); a.x = act.from.x + (act.lock.x - act.from.x) * k * .92; a.z = act.from.z + (act.lock.z - act.from.z) * k * .92; if (sq.blocked(a.x, a.z)) { a.x = act.from.x; a.z = act.from.z; act.st = .62; }
    air(act.from.h * (1 - k * k)); g.wing = { mode: 'dive', k: 1 };
    if (!act.hitDone && u >= .86 && tgt) { act.hitDone = true; const d = Math.hypot(tgt.x - a.x, tgt.z - a.z) - (tgt.radius || .4);
      if (d < 2.1 && Math.abs((tgt.y || 0) - a.y) < 1.6) { if (evades(tgt)) sq.event('evaded', { spell: { type: 'gkDive' }, target: tgt.id }); else { const r = sq.damageTarget(tgt.id, 18, { kind: 'melee', actor: a.id, x: a.x, z: a.z, knock: 1.1, combo: 1, gkSrc: 'dive' + act.dives }); sq.event('meleeHit', { actor: a, target: tgt.id, result: r, n: 1, move: 'mergulho' }); } } sq.event('gkFly', { actor: a, phase: 'impact' }); }
    if (u >= 1) { act.dives++; if (act.dives < 2 && sq.rand() < .32) { act.stage = 'takeoff'; act.st = .25; act.cruise = .5; flyAnim(sq, a, 'gk_jump'); } else { act.stage = 'land'; act.st = 0; flyAnim(sq, a, 'gk_land'); } } return; }
  if (act.stage === 'land') { a.airY = Math.max(0, a.airY - 9 * dt); air(a.airY); g.wing = { mode: 'brake', k: 1 - clamp(act.st / .8, 0, 1) }; if (a.airY <= 0 && act.st > .55) { a.gkFlip = 0; g.wing = { mode: 'fold', k: 0 }; act.t = act.dur; sq.event('gkFly', { actor: a, phase: 'landed' }); } }
}

/* ---------------- transições de fase ---------------- */
function startPhaseOut(sq, a) { // fase I → II: cai (Dead), dissolve e dá lugar ao corpo alado
  a.pendingDeath = false; a.hp = 1; vanishAll(sq, a); sq.begin(a, { type: 'gkPhase', dur: GK.phase.fall, anim: 'death', iframes: true, armor: true, stage: 'fall', face: false }); a.gkFalling = true;
  sq.event('gkPhase', { actor: a, from: 1, to: 2, stage: 'fall' });
}
function startRevive(sq, a) { // fase II → III: morte real, pausa, levante lento, explosão no próprio corpo
  a.pendingDeath = false; a.hp = 1; vanishAll(sq, a, true); a.airY = 0; a.gkFlip = 0; sq.begin(a, { type: 'gkPhase', dur: 99, anim: 'death', iframes: true, armor: true, stage: 'die', st: 0, face: false });
  sq.event('gkPhase', { actor: a, from: 2, to: 3, stage: 'die' });
}
function vanishAll(sq, a, keep) { const g = a.gk; for (const e of g.ents) if (e.mode !== 'gone' && e.mode !== 'fall') { e.mode = keep ? 'return' : 'fall'; e.fallAt = e.t; e.vy = 1; } if (g.spear && g.spear.alive) { g.spear.alive = false; g.spear.end = 'phase'; sq.event('gkSpear', { actor: a, spear: g.spear, phase: 'end', end: 'phase' }); } for (const s of g.suns) s.state = 'done'; g.suns = []; }
function stepPhase(sq, a, dt) {
  const act = a.act, P = GK.phase, R = P.revive; act.st = (act.st || 0) + dt;
  if (a.kind === 'greedA') { if (act.t >= P.fall - .05 && !act.spawned) { act.spawned = true; const hp = a.gkNextHp || Math.round(a.maxHp * 1.15);
      const [b] = sq.spawn([{ x: a.x, z: a.z, yaw: a.yaw, kind: 'greedB', hp }]); b.alert = 0; b.gk = null; gkInit(sq, b); b.gk.phase = 2; b.targetId = a.targetId;
      sq.begin(b, { type: 'gkPhase', dur: P.arise, anim: 'arise', iframes: true, armor: true, stage: 'arise', face: true });
      sq.event('gkPhase', { actor: b, from: 1, to: 2, stage: 'arise', prev: a }); a.gkFalling = false; sq.kill(a); } return; }
  if (act.stage === 'die' && act.st >= R.die) { act.stage = 'hold'; act.st = 0; sq.event('gkPhase', { actor: a, from: 2, to: 3, stage: 'hold' }); return; }
  if (act.stage === 'hold' && act.st >= R.hold) { act.stage = 'rise'; act.st = 0; a.anim = { role: 'arise', once: true, speed: 1, rev: a.anim.rev + 1 }; sq.event('gkPhase', { actor: a, from: 2, to: 3, stage: 'rise' }); return; }
  if (act.stage === 'rise' && act.st >= R.rise) { act.stage = 'burst'; act.st = 0; const g = a.gk; g.phase = 3; a.maxHp = a.hp = Math.round(a.gkBaseHp * 1.25); a.vzPhase = 3; a.cdMul = .8;
    g.hands.R = g.hands.L = null; g.ents = g.ents.filter(e => e.mode !== 'fall'); for (const k of ['A', 'B', 'C', 'D']) if (!g.ents.some(e => e.key === k)) { const e = launchBlade(sq, a, k, null, 1, 'orbit'); e.x = a.x; e.y = a.y + 1.5; e.z = a.z; }
    sq.event('gkPhase', { actor: a, from: 2, to: 3, stage: 'burst' }); return; }
  if (act.stage === 'burst' && act.st >= R.burst) { act.t = act.dur; sq.event('gkPhase', { actor: a, from: 2, to: 3, stage: 'done' }); }
}

/* ---------------- escolha de golpe e cérebro ---------------- */
export function gkPickMove(sq, a, t, pool) {
  if (!pool.length) return null; const hist = a.gkHist || (a.gkHist = []), last = hist.at(-1), list = pool.filter(m => m.id !== last && (!m.minPhase || (a.gk?.phase || 1) - 1 >= m.minPhase)), use = list.length ? list : pool;
  let best = null, bs = -1e9; for (const m of use) { let w = m.weight || 1; if (hist.includes(m.id)) w -= .6; if (m.hits.length > 2) w += .2 * ((a.gk?.phase || 1) - 1); w += (sq.rand() - .5) * .6; if (w > bs) { bs = w; best = m; } }
  return best;
}
function dashTo(sq, a, t, f, s, len = 1) { const d = Math.hypot(t.x - a.x, t.z - a.z) || 1, ux = (t.x - a.x) / d, uz = (t.z - a.z) / d; let dx = f * ux + s * uz, dz = f * uz - s * ux; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const reach = GK.dash.speed * GK.dash.time * len; if (sq.blocked(a.x + dx * reach, a.z + dz * reach)) return false;
  sq.begin(a, { type: 'dodge', dur: GK.dash.time * len, anim: 'dash', animFrom: GK_TIME.dash.from, animSpeed: GK_TIME.dash.speed, dx, dz, iframes: s !== 0, face: true, chain: f > 0 ? 'melee' : undefined, token: f > 0 ? 'melee' : undefined, tid: t.id });
  a.cds.dodge = GK.dash.minStart; a.gkLastDash = sq.time; return true; }
export const GK_TACTICS = Object.freeze({ every: [.28, .5] });
export function gkBrain(sq, a, dt, t) {
  const g = gkInit(sq, a); if (a.gkBaseHp === undefined) a.gkBaseHp = a.maxHp;
  stepBlades(sq, a, dt, t); stepSpear(sq, a, dt, t); stepSuns(sq, a, dt, t); stepAbyss(sq, a, dt, t);
  if (a.pendingDeath && !(a.act && a.act.type === 'gkPhase')) { if (a.kind === 'greedA') startPhaseOut(sq, a); else startRevive(sq, a); return; }
  if (a.act && a.act.type === 'gkPhase') { stepPhase(sq, a, dt); return; }
  if (a.act && a.act.type === 'gkFly') { stepFlight(sq, a, dt, t); return; }
  if (a.act && a.act.type === 'gkThrow') { stepThrow(sq, a, dt, t); return; }
  if (a.act && a.act.type === 'gkSunsCast') { if (!a.act.cast && a.act.t >= .35) { a.act.cast = true; startSuns(sq, a, t); } return; }
  if (!a.act && a.airY > 0) { a.airY = Math.max(0, a.airY - 6 * dt); a.y = sq.ground(a.x, a.z) + a.airY; }
  g.wing = g.wing && g.wing.mode !== 'fold' ? { mode: 'fold', k: Math.max(0, (g.wing.k || 0) - dt * 2) } : (g.wing || { mode: 'fold', k: 0 });
  if (a.act && a.act.type === 'melee') { const m = a.act.move; if (m && a.act !== a._gkAct) { a._gkAct = a.act; g.stats.combos++; (a.gkHist || (a.gkHist = [])).push(m.id); if (a.gkHist.length > 3) a.gkHist.shift(); a.cds.melee = Math.min(a.cds.melee || 0, (m.duration / (m.rate || 1) + .12) * a.cdMul); } }
  if (!t || a.alert > 0 || a.act || a.react) return;
  if ((a.gkTacT = (a.gkTacT ?? .3) - dt) > 0) return; a.gkTacT = GK_TACTICS.every[0] + sq.rand() * (GK_TACTICS.every[1] - GK_TACTICS.every[0]);
  const d = Math.hypot(t.x - a.x, t.z - a.z), gap = d - (t.radius || .4) - a.T.radius, see = sq.los(a.x, a.z, t.x, t.z), can = sq.canAttack(a, 'melee', t.id), ph = g.phase, opts = [];
  const toward = -((t.vx || 0) * (t.x - a.x) + (t.vz || 0) * (t.z - a.z)) / (d || 1), side = sq.rand() < .5 ? 1 : -1, hpk = a.hp / a.maxHp;
  const freeScythes = ['A', 'B'].filter(k => !g.away[k] && (g.hands.R === k || g.hands.L === k)), clock = sq.time - (g.lastTech ?? -4) > 7 ? .55 : 0; // relógio de técnica: nada de só combos colados
  if (ph < 3 && can && see && !a.cds.gkThrow && freeScythes.length && gap >= (clock ? .2 : GK.throw.gap[0]) && gap <= GK.throw.gap[1]) opts.push(['foices', .42 + (toward < -1.5 ? .25 : 0) + clock]);
  if (can && see && !a.cds.gkSpear && !g.spear && (!g.away.C || (ph >= 3 && g.ents.some(e => e.key === 'C' && e.mode === 'orbit'))) && (g.hands.R === 'C' || (ph >= 3 && g.ents.some(e => e.key === 'C' && e.mode === 'orbit'))) && gap >= (clock ? 1.6 : GK.spear.gap[0]) && gap <= GK.spear.gap[1]) opts.push(['lanca', .4 + (toward < -1.5 ? .3 : 0) + (t.blocking ? .3 : 0) + clock * .8]);
  if (ph >= 2 && !a.cds.gkFly && can) opts.push(['voo', .34 + (gap > 6 ? .2 : 0) + (ph >= 3 ? .1 : 0) + clock]);
  if (ph >= 2 && !a.cds.gkSuns && can && see && gap > (clock ? 1.2 : 3) && gap < 16 && !g.suns.length) opts.push(['sois', .3 + clock * .7]);
  if (ph >= 3 && !a.cds.gkTele) { const orb = g.ents.filter(e => e.mode === 'orbit'), duel = g.ents.filter(e => e.mode === 'tele' || e.mode === 'outbound').length, budget = hpk > .6 ? 2 : hpk > .3 ? 3 : 4;
    if (orb.length && duel < budget) opts.push(['telecinese', .5 + (gap > 3 ? .2 : 0)]); }
  if (!a.cds.dodge && sq.time - (a.gkLastDash ?? -9) >= GK.dash.minStart) { if (gap > 3.2 && gap < 10) opts.push(['avanco', .36 + (toward < -1 ? .25 : 0)]); if (gap < 1.6 && t.attacking) opts.push(['recuo', .3]); if (gap < 3 && gap > .6) opts.push(['flanco', .22]); }
  if (ph < 3 && !g.away.A && !g.away.B && !g.away.C && !g.away.D && sq.time - g.swapT > 11) opts.push(['troca', .22]);
  if (!opts.length) return;
  const top = Math.max(...opts.map(o => o[1])); if (sq.rand() > Math.min(.9, top + .1)) return;
  let roll = sq.rand() * opts.reduce((x, o) => x + o[1], 0), goal = opts[0][0]; for (const o of opts) { roll -= o[1]; if (roll <= 0) { goal = o[0]; break; } }
  sq.event('gkTactic', { actor: a, goal, gap: +gap.toFixed(2) }); g.stats[goal] = (g.stats[goal] || 0) + 1;
  if (goal === 'foices') { g.lastTech = sq.time; a.cds.gkThrow = GK.throw.cd * a.cdMul; sq.begin(a, { type: 'gkThrow', dur: ph >= 2 ? 1.25 : GK.throw.p1Dur, animSpeed: ph >= 2 ? 1 : GK.throw.p1Speed, anim: 'gk_pitch', token: 'melee', tid: t.id, face: true, keys: ph >= 2 ? freeScythes : [freeScythes[0]], what: 'blades', release: ph >= 2 ? GK.throw.phase2Release : GK.throw.release, rate: 1 }); return; }
  if (goal === 'lanca') { g.lastTech = sq.time; a.cds.gkSpear = GK.spear.cd * a.cdMul; if (ph >= 3 && !g.hands.R) { const e = g.ents.find(x => x.key === 'C'); if (e) e.mode = 'gone'; } sq.begin(a, { type: 'gkThrow', dur: ph >= 2 ? 1.25 : GK.throw.p1Dur, animSpeed: ph >= 2 ? 1 : GK.throw.p1Speed, anim: 'gk_pitch', token: 'melee', tid: t.id, face: true, what: 'spear', release: ph >= 2 ? GK.throw.phase2Release : GK.spear.release }); return; }
  if (goal === 'voo') { if (!startFlight(sq, a, t, sq.rand() < .45 ? 'hang' : sq.rand() < .5 ? 'suns' : 'dive')) a.cds.gkFly = 3; else g.lastTech = sq.time; return; }
  if (goal === 'sois') { g.lastTech = sq.time; a.cds.gkSuns = GK.suns.cd * a.cdMul; sq.begin(a, { type: 'gkSunsCast', dur: 2.4, anim: 'cast', face: true, tid: t.id }); return; }
  if (goal === 'telecinese') { const orb = g.ents.filter(e => e.mode === 'orbit'), n = Math.min(orb.length, 1 + Math.floor(sq.rand() * (hpk > .5 ? 2 : 3))); for (let i = 0; i < n; i++) { const e = orb[i]; e.mode = 'outbound'; e.t = 0; e.life = GK.tele.duel[0] + sq.rand() * 2; e.wx = e.x; e.wz = e.z; e.side = i % 2 ? -1 : 1; const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw); e.vx = (fz * e.side + fx * .5) * 9; e.vz = (-fx * e.side + fz * .5) * 9; } a.cds.gkTele = (4 + sq.rand() * 2) * a.cdMul; g.stats.tele++; sq.event('gkTele', { actor: a, n }); return; }
  if (goal === 'avanco') { dashTo(sq, a, t, .9, side * .35); return; }
  if (goal === 'flanco') { dashTo(sq, a, t, .15, side, .85); return; }
  if (goal === 'recuo') { dashTo(sq, a, t, -1, side * .3, .8); return; }
  if (goal === 'troca') { g.swapT = sq.time; setHands(a, g.set === 'scythes' ? 'spearblade' : 'scythes'); g.stats.swaps++; sq.event('gkSwap', { actor: a, hands: { ...g.hands } }); sq.begin(a, { type: 'block', dur: .45, anim: 'cast', guard: false }); return; }
}
function stepThrow(sq, a, dt, t) {
  const act = a.act, g = a.gk; if (act.released) return; if (act.t < act.release) return; act.released = true;
  if (act.what === 'spear') { launchSpear(sq, a, t); return; }
  act.keys.forEach((k, i) => { g.hands[g.hands.R === k ? 'R' : 'L'] = null; launchBlade(sq, a, k, t, i ? -1 : 1); }); g.stats.throws++; resummon(sq, a);
}
/** QA (ADM/teste): força uma técnica — nunca usado pela IA. */
export function gkForceTech(sq, a, t, name) {
  const g = gkInit(sq, a); if (!t || (a.act && a.act.type !== 'melee')) return false; a.act = null;
  if (name === 'foices') { const k = ['A', 'B'].filter(x => !g.away[x]); if (!k.length) return false; if (g.phase < 3) setHands(a, 'scythes'); sq.begin(a, { type: 'gkThrow', dur: g.phase >= 2 ? 1.25 : GK.throw.p1Dur, animSpeed: g.phase >= 2 ? 1 : GK.throw.p1Speed, anim: 'gk_pitch', token: 'melee', tid: t.id, face: true, keys: g.phase >= 2 ? k : [k[0]], what: 'blades', release: g.phase >= 2 ? GK.throw.phase2Release : GK.throw.release }); return true; }
  if (name === 'lanca') { if (g.spear || (g.away.C && !(g.phase >= 3 && g.ents.some(e => e.key === 'C' && e.mode === 'orbit')))) return false; if (g.phase < 3) setHands(a, 'spearblade'); else { const e = g.ents.find(x => x.key === 'C'); if (e) e.mode = 'gone'; } sq.begin(a, { type: 'gkThrow', dur: g.phase >= 2 ? 1.25 : GK.throw.p1Dur, animSpeed: g.phase >= 2 ? 1 : GK.throw.p1Speed, anim: 'gk_pitch', token: 'melee', tid: t.id, face: true, what: 'spear', release: g.phase >= 2 ? GK.throw.phase2Release : GK.spear.release }); return true; }
  if (name.startsWith('voo')) return g.phase >= 2 && startFlight(sq, a, t, name.split('-')[1] || 'dive');
  if (name === 'sois') { if (g.phase < 2 || g.suns.length) return false; sq.begin(a, { type: 'gkSunsCast', dur: 2.4, anim: 'cast', face: true, tid: t.id }); return true; }
  if (name === 'telecinese') { if (g.phase < 3) return false; const orb = g.ents.filter(e => e.mode === 'orbit'); orb.forEach((e, i) => { e.mode = 'outbound'; e.t = 0; e.life = 7; e.wx = e.x; e.wz = e.z; e.side = i % 2 ? -1 : 1; e.vx = 0; e.vz = 0; }); return orb.length > 0; }
  if (name === 'abismo') { g.abyssT = 0; return g.phase >= 3; }
  return false;
}
export function gkStateOf(a) { const g = a && a.gk; if (!g) return null; return { kind: a.kind, phase: g.phase, hp: a.hp, maxHp: a.maxHp, act: a.act && (a.act.type + (a.act.stage ? ':' + a.act.stage : '') + (a.act.move ? ':' + a.act.move.id : '')), hands: { ...g.hands }, ents: g.ents.map(e => e.key + ':' + e.mode), spear: g.spear && (g.spear.alive ? 'fly' : g.spear.end), suns: g.suns.map(s => s.state), sphere: g.sphere && g.sphere.state, sp: g.sphere && [+g.sphere.x.toFixed(2), +g.sphere.y.toFixed(2), +g.sphere.z.toFixed(2)], airY: +(a.airY || 0).toFixed(2), x: +a.x.toFixed(2), z: +a.z.toFixed(2), stats: g.stats }; }
/** Cancelamento (saída da dimensão, morte): armas e projéteis somem, nada fica preso no ar. */
export function gkCancel(sq, a) { const g = a.gk; if (!g) return; g.ents = []; g.away = {}; g.spear = null; g.suns = []; g.sphere = null; a.airY = 0; a.gkFlip = 0; }

const BASE = { ...E1.common, radius: .5, height: 2.2, poise: 80, flinch: 99, stamina: 180, sight: 44, leash: 70, boss: true, pref: [1.4, 2.6], phase2: -1, furyCd: .82, staggerArmor: 2,
  speed: { walk: 2.9, run: 6.4, strafe: 3.3, back: 2.4, turn: 10 }, melee: { max: 3, reach: 2.8, arc: .1, windup: .4, hits: [.4], dur: 1, dmg: 13, cd: 1, knock: .45 }, aimWarp: { warp: 2, warpSpeed: 7 },
  dash: { speed: GK.dash.speed, time: GK.dash.time, cd: GK.dash.cd }, block: { chance: .14, dur: .5, cd: 3.4, cost: 14, reduce: .8 }, dodge: { chance: .24, cd: GK.dash.cd },
  counter: { ...E1.common.counter, chance: 0, cd: 99 }, leap: null, shield: null, decide: [.14, .24], gap: .36, kit: [], interrupt: true, feint: null, maxBig: 1,
  brain: gkBrain, pickMove: gkPickMove, moveAim: vxAim, holdDeath: gkHoldDeath };
export const GREED = Object.freeze({ A: registerKind('greedA', { ...BASE, hp: 2300 }), B: registerKind('greedB', { ...BASE, hp: 2600, melee: { ...BASE.melee, dmg: 14 } }) });
