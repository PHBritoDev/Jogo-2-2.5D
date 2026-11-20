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
/* Missão 20/11 — CAUSA dos golpes "desalinhados/invertidos": o Double_Combo_Attack começa com o quadril 1,2 m ATRÁS da
   origem (o clipe traz a raiz andando de z −1,20 até +0,14) e o modo "in-place" congela o 1º quadro → o corpo inteiro era
   desenhado 1,3 m atrás do ator durante a Sentença de Dois Tempos (golpe de abertura mais frequente) e o traço de dano ia
   junto. Agora todo clipe do corpo novo tem o quadril horizontal ancorado no ponto neutro do idle (Attack quadro 0). */
const VG_ROOTED = new WeakSet();
export function vgAnchorRoot(clips) {
  const ref = clips.find(c => c.name === 'Attack')?.tracks.find(t => /hips[^.]*\.position$/i.test(t.name)); if (!ref) return 0; const ax = ref.values[0], az = ref.values[2]; let n = 0;
  for (const c of clips) { if (VG_ROOTED.has(c)) continue; VG_ROOTED.add(c); const tr = c.tracks.find(t => /hips[^.]*\.position$/i.test(t.name)); if (!tr) continue; const v = tr.values, dx = ax - v[0], dz = az - v[2]; if (Math.abs(dx) + Math.abs(dz) < 1e-4) continue; for (let i = 0; i < v.length; i += 3) { v[i] += dx; v[i + 2] += dz; } n++; }
  return n;
}
export function vgSynthClips(T, clips) {
  vgAnchorRoot(clips); // antes de recortar as poses (a reação vem do Double_Combo)
  const by = n => clips.find(c => c.name === n), out = [], sub = (src, name, a, b) => { const s = by(src); if (!s) return; const c = T.AnimationUtils.subclip(s, name, a, b, 30);
    for (const tr of c.tracks) if (/hips[^.]*\.position$/i.test(tr.name)) { const v = tr.values, r = by('Attack').tracks.find(t => t.name === tr.name)?.values; if (r) for (let i = 0; i < v.length; i += 3) { v[i] = r[0]; v[i + 2] = r[2]; } } // pose recortada: quadril no neutro
    VG_ROOTED.add(c); out.push(c); };
  sub('Attack', 'VG_idle', 0, 6); sub('Attack', 'VG_guard', 6, 12); sub('Double_Combo_Attack', 'VG_hit', 44, 56);
  return out;
}

/* Golpes nativos. hits = quadro em que a CABEÇA DO MACHADO passa rápida pela frente do corpo (traço medido no próprio clipe,
   quadril ancorado, 30 Hz — tabela em docs/combate/MISSAO-VORGAZHEK-MACHADO-2026-11-20.md); rate = cadência própria;
   advance negativo = corta recuando. A Investida usa o 1º corte descendente frontal do Double_Combo (o Jump_Over tinha a
   lâmina às costas no quadro do "golpe"). */
export const VG_MOVES = [
  { id: 'Eclipse_Duplo', clip: 'vg_double', label: 'Sentença de Dois Tempos', hits: [.62, 1.13], duration: 1.7, advance: 1.3, glide: true, weight: 1.2, opener: true, rate: 1.45 },
  { id: 'Orbita_Recuo', clip: 'vg_orbit', label: 'Órbita do Vazio', hits: [1.02, 1.93], duration: 2.45, advance: -1.6, glide: true, retreatCut: true, weight: .9, rate: 1.5 },
  { id: 'Orbita_Avanco', clip: 'vg_orbit', label: 'Órbita do Vazio — avanço', hits: [1.93, 2.97], duration: 3.35, advance: 1.9, glide: true, minPhase: 1, weight: .8, rate: 1.55 },
  { id: 'Fenda_Queda', clip: 'vg_heavy', label: 'Queda da Fenda', hits: [1.07], duration: 1.72, advance: .7, heavy: true, guardBreak: true, weight: .7, rate: 1.25, arc: true },
  { id: 'Giro_Eclipse', clip: 'vg_spin', label: 'Giro do Eclipse', hits: [.8, 1.6], duration: 2.0, advance: .3, spin: true, weight: .6, rate: 1.35 },
  { id: 'Sentenca_Tripla', clip: 'vg_triple', label: 'Sentença Tripla do Vazio', hits: [.68, 1.48, 2.17], duration: 2.8, advance: 1.5, glide: true, minPhase: 1, weight: 1, rate: 1.55, arc: true },
  { id: 'Investida_Corrompida', clip: 'vg_double', label: 'Investida Corrompida', hits: [.62], duration: 1.05, advance: 3, range: [2.6, 6.2], score: .9, cd: 5, fast: true, aim: true, rate: 1.25 }
];
BOSS_MOVES.vorgazhek = VG_MOVES.map(m => ({ ...m, patterns: ['diagonal'] }));
for (const m of BOSS_MOVES.vorgazhek) { m.kind = 'vorgazhek'; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = m.heavy ? 1.3 : m.fast ? .85 : m.hits.length > 2 ? .85 : 1; }

/** Empunhadura do Machado (constante, medida no GLB): a mão não tem dedos; o eixo Y do osso RightHand segue o antebraço e a
    haste fecha no punho ao longo de −Z da mão (único eixo que deixa a cabeça À FRENTE no contato da Queda, da Sentença e da
    Órbita — +Z invertia os cortes). O gume frontal (+X da arma) aponta para onde os nós dos dedos apontam (+Y da mão). */
export function vgGrip(T) { return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, -1), new T.Vector3(-1, 0, 0))); }
/**
 * Clipes dos golpes + traço de dano das DUAS lâminas e da haste, amostrado do MESMO clipe (30 Hz, espaço do ator, frente
 * +Z) no formato de bossTraceContact (vários segmentos por quadro). Também mede, por janela, o azimute da cabeça do
 * machado no quadro do contato (aimAz) — usado pela mira para que o arco VISÍVEL passe pelo herói.
 */
export function vgMoveClips(T, model, clone, clipFor, moves, grip, edges, aimPoint = [.06, .62, 0]) { // aimPoint: ponto da arma que mede a mira (cabeça do machado; na foice, a cabeça)
  const rig = clone(model); rig.position.set(0, model.position.y, 0); rig.rotation.set(0, 0, 0); rig.scale.copy(model.scale);
  const mixer = new T.AnimationMixer(rig); let hand = null; rig.traverse(o => { if (!hand && o.isBone && /^RightHand$/i.test(o.name)) hand = o; });
  const out = {}, p = new T.Vector3(), q = new T.Quaternion(), v = new T.Vector3(), segs = edges.map(e => e.map(x => new T.Vector3(...x)));
  for (const m of moves) {
    const src = clipFor(m.clip); if (!src || !hand) continue;
    const clip = src.clone(); clip.name = m.id; const frames = [], N = Math.ceil(m.duration * 30), D = Math.min(m.duration, clip.duration - 1e-3), az = [];
    mixer.stopAllAction(); mixer.clipAction(clip).play();
    const at = t => { mixer.setTime(t); rig.updateMatrixWorld(true); hand.getWorldPosition(p); hand.getWorldQuaternion(q).multiply(grip); };
    for (let i = 0; i <= N; i++) { at(D * i / N); frames.push(segs.map(sg => sg.map(x => v.copy(x).applyQuaternion(q).add(p).toArray()))); }
    const rr = []; for (const h of m.hits) { at(Math.min(D, h)); const c = v.fromArray(aimPoint).applyQuaternion(q).add(p); az.push(+Math.atan2(c.x, c.z).toFixed(3)); rr.push(+Math.hypot(c.x, c.z).toFixed(2)); }
    clip.combatTrace = { duration: m.duration, frames, aimAz: az, aimR: rr }; out[m.id] = clip; m.aimAz = az; m.aimR = rr;
  }
  mixer.stopAllAction(); mixer.uncacheRoot(rig); return out;
}

/* ---------------- mira por golpe ---------------- */
export const VG_AIM = Object.freeze({ lock: .17, turn: 9, between: 5.5, max: 1.25, warp: 1.6, warpSpeed: 4.5 });
const wrap = x => Math.atan2(Math.sin(x), Math.cos(x));
/** Durante o preparo de cada corte o corpo gira para que a cabeça do machado (azimute medido no clipe) chegue no herói;
    trava ~0,17 s (tempo do clipe) antes do contato e não segue o alvo dentro da janela. Também registra o resultado de cada
    janela (meleeMiss com o motivo) — o motor só emite meleeHit. */
export function vgAim(sq, a, act, t, dt) {
  const m = act.move; if (!m) return; const S = a.vgStats;
  for (let n = 0; n < m.hits.length; n++) { const h = m.hits[n];
    if (act.t >= h - .1 && !(act.vgOpen || (act.vgOpen = new Set())).has(n)) { act.vgOpen.add(n); if (t) { const d = Math.hypot(t.x - a.x, t.z - a.z), err = wrap(Math.atan2(t.x - a.x, t.z - a.z) - a.yaw - (m.aimAz?.[n] || 0)); act.vgErr = act.vgErr || []; act.vgErr[n] = [+(err * 57.3).toFixed(1), +d.toFixed(2)]; } }
    if (act.t > h + .11 && !(act.vgShut || (act.vgShut = new Set())).has(n)) { act.vgShut.add(n); if (!act.contacts.has(n)) { const e = act.vgErr?.[n] || [0, 0], why = !t ? 'sem-alvo' : t.iframes ? 'esquiva' : !sq.los(a.x, a.z, t.x, t.z) ? 'obstaculo' : e[1] - (t.radius || .4) > 3.2 ? 'longe' : Math.abs(e[0]) > 40 ? 'angulo' : 'fora-do-arco';
        if (S) { S.miss = (S.miss || 0) + 1; (S.why || (S.why = {}))[why] = (S.why[why] || 0) + 1; } sq.event('meleeMiss', { actor: a, n: n + 1, move: m.id, why, err: e[0], dist: e[1] }); } else if (S) S.hit = (S.hit || 0) + 1;
      if (S) { const L = S.aim || (S.aim = []); if (L.length < 240) L.push([m.id, n + 1, ...(act.vgErr?.[n] || [0, 0]), act.contacts.has(n) ? 1 : 0, +sq.time.toFixed(2)]); } } }
  if (!t) return; const n = m.hits.findIndex(h => act.t < h + .11); if (n < 0) return; // recuperação: não gira
  const h = m.hits[n]; if (act.t >= h - VG_AIM.lock) return; // travado: o arco não persegue o herói
  // magnetismo curto até o alcance REAL do corte (raio da cabeça do machado no quadro do contato): o recuo do 1º acerto não
  // deixa mais o 2º/3º corte no vazio; limitado por golpe, para antes da cápsula e anda com colisão (nunca atravessa parede)
  if (!m.retreatCut && m.aimR) { const d = Math.hypot(t.x - a.x, t.z - a.z), want = (m.aimR[n] || 1.3) + (t.radius || .4) * .6, room = d - (t.radius || .4) - a.T.radius - .05, used = act.vgWarp || 0;
    if (d > want && room > 0 && used < VG_AIM.warp) { const st = Math.min(d - want, room, VG_AIM.warpSpeed * dt, VG_AIM.warp - used); sq.move(a, (t.x - a.x) / d * st, (t.z - a.z) / d * st); act.vgWarp = used + st; } }
  const mx = m.aimMax ?? VG_AIM.max, az = Math.max(-mx, Math.min(mx, m.aimAz?.[n] || 0)), want = Math.atan2(t.x - a.x, t.z - a.z) - az, k = (n === 0 ? VG_AIM.turn : VG_AIM.between) * dt;
  const d = wrap(want - a.yaw); a.yaw = wrap(a.yaw + Math.max(-k, Math.min(k, d)));
}

/* ---------------- Ascensão da Maré Abissal (salto ofensivo) ---------------- */
/** prep no chão erguendo o machado e concentrando o núcleo → salto alto (≈3 m) → ponto de pouso estimado pela posição/
    velocidade VISÍVEIS do herói e TRAVADO 0,22 s após decolar (um ajuste limitado) → dash aéreo curto só se faltar
    distância → corte descendente com a lâmina de energia longa ANTES do pouso (um único teste de dano) → impacto →
    recuperação longa (janela de punição). Distinto do salto evasivo do Atravessamento Aéreo. */
export const VG_RISE = Object.freeze({ gap: [3.2, 9.5], cd: 9.5, prep: .52, v: 11.6, gravity: 23, hang: .12, lockAt: .22, redirect: 2.2, lead: .3, front: 1.25, maxH: 9.5,
  airDash: { from: 6.2, time: .14, speed: 13 }, cutY: 1.75, cut: .2, hitAt: .09, reach: 3.1, arc: .62, dmg: 22, recover: .82 });
export function vgStartRise(sq, a, t) {
  const R = VG_RISE; a.cds.leap = Math.max(a.cds.leap || 0, 2.5); a.cds.vgRise = R.cd * a.cdMul; a.cds.melee = Math.max(a.cds.melee || 0, .8); a.vgChain = null;
  sq.begin(a, { type: 'leap', rise: true, dur: 6, anim: 'vg_heavy', animSpeed: (.8 - .3) / R.prep, animFrom: .3, token: 'melee', tid: t.id, phase: 'prep', face: true, glow: 0, iframes: false });
  sq.event('vgRise', { actor: a, phase: 'prep', target: t.id }); if (a.vgStats) a.vgStats.rise = (a.vgStats.rise || 0) + 1;
}
function riseAim(sq, a, act, t, R) { // ponto de pouso: frente do herói (distância de corte), com antecipação curta pela velocidade visível
  const px = t.x + (t.vx || 0) * R.lead, pz = t.z + (t.vz || 0) * R.lead, dx = px - a.x, dz = pz - a.z, d = Math.hypot(dx, dz) || 1, k = Math.max(0, Math.min(R.maxH, d - R.front)) / d;
  return { x: a.x + dx * k, z: a.z + dz * k };
}
export function vgStepRise(sq, a, act, t, dt) {
  const R = VG_RISE; act.air = (act.air || 0);
  if (act.phase === 'prep') { act.glow = Math.min(1, act.t / R.prep) * .8; act.face = true;
    if (act.t >= R.prep) { act.phase = 'rise'; act.face = false; act.armor = true; a.airV = R.v; a.jumps = 1; act.mark = t ? riseAim(sq, a, act, t, R) : { x: a.x, z: a.z }; act.mark0 = { ...act.mark };
      a.anim = { role: 'jump', once: true, speed: 1.15, from: 1.2, rev: a.anim.rev + 1 }; sq.event('jump', { actor: a, n: 1 }); sq.event('vgRise', { actor: a, phase: 'rise', mark: act.mark }); }
    return; }
  if (act.phase === 'land') { act.glow = Math.max(0, (act.glow || 0) - dt * 3); if (act.t >= act.landAt + R.recover) act.t = act.dur; return; }
  act.air += dt; const apex = a.airV > 0 && a.airV - R.gravity * dt <= 0; a.airV -= R.gravity * dt * (Math.abs(a.airV) < 2.2 ? .45 : 1); // pairar curto no ápice
  if (!act.locked && act.air >= R.lockAt && t) { const m = riseAim(sq, a, act, t, R), dx = m.x - act.mark0.x, dz = m.z - act.mark0.z, l = Math.hypot(dx, dz), k = l > R.redirect ? R.redirect / l : 1; act.mark = { x: act.mark0.x + dx * k, z: act.mark0.z + dz * k }; act.locked = true; sq.event('vgRise', { actor: a, phase: 'lock', mark: act.mark }); }
  const mx = act.mark.x - a.x, mz = act.mark.z - a.z, ml = Math.hypot(mx, mz), left = Math.max(.12, (a.airV + Math.sqrt(Math.max(0, a.airV * a.airV + 2 * R.gravity * a.airY))) / R.gravity);
  if (ml > .05) { a.yaw = wrap(a.yaw + wrap(Math.atan2(mx, mz) - a.yaw) * Math.min(1, dt * 10)); }
  if (act.locked && !act.dashed && apex && ml > R.airDash.from) { act.dashed = true; act.dashT = R.airDash.time; sq.event('airDash', { actor: a, rise: true }); }
  let sp = Math.min(ml / left, 9.5); if (act.dashT > 0) { act.dashT -= dt; sp = Math.max(sp, R.airDash.speed); }
  if (ml > .05) sq.move(a, mx / ml * Math.min(ml, sp * dt), mz / ml * Math.min(ml, sp * dt));
  a.airY = Math.max(0, a.airY + a.airV * dt); a.y = sq.ground(a.x, a.z) + a.airY;
  act.glow = Math.min(1, .8 + act.air * .4);
  // corte descendente ANTES do pouso (um único teste de dano, no quadro do golpe)
  if (!act.cut && a.airV < 0 && a.airY <= R.cutY) { act.cut = 0; a.anim = { role: 'vg_heavy', once: true, speed: 1.5, from: .9, rev: a.anim.rev + 1 }; sq.event('vgRise', { actor: a, phase: 'cut' }); }
  if (act.cut !== undefined && act.cut !== false) { act.cut += dt;
    if (!act.struck && act.cut >= R.hitAt) { act.struck = true; let res = 'miss', why = 'longe';
      if (t) { const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz), f = d > 1e-3 ? (dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw)) / d : 1, edge = d - (t.radius || .4);
        why = edge > R.reach ? 'longe' : f < R.arc ? 'angulo' : Math.abs((t.y || 0) - a.y) > 2.6 ? 'altura' : !sq.los(a.x, a.z, t.x, t.z) ? 'obstaculo' : '';
        if (!why) { res = sq.damageTarget(t.id, R.dmg, { kind: 'melee', actor: a.id, x: a.x, z: a.z, knock: 1.4, combo: 1 }); if (res === 'hit') act.landed = true; sq.event('meleeHit', { actor: a, target: t.id, result: res, n: 1, move: 'mare' }); } }
      if (res === 'miss') sq.event('meleeMiss', { actor: a, n: 1, move: 'mare', why }); if (a.vgStats) a.vgStats[res === 'hit' ? 'riseHit' : 'riseMiss'] = (a.vgStats[res === 'hit' ? 'riseHit' : 'riseMiss'] || 0) + 1; } }
  if ((a.airY <= 0 && a.airV < 0) || act.air > 2.6) { a.airY = 0; a.airV = 0; a.jumps = 0; a.y = sq.ground(a.x, a.z); act.phase = 'land'; act.landAt = act.t; act.armor = false; act.glow = .6;
    sq.event('vgRise', { actor: a, phase: 'land', x: a.x, y: a.y, z: a.z, yaw: a.yaw, landed: !!act.landed, drift: +Math.hypot(a.x - act.mark.x, a.z - act.mark.z).toFixed(2) }); }
}

/** Guarda da Fenda: escudo próprio (vidro de vazio índigo com fissuras ciano) — curto, recarga real, rompe com golpe pesado. */
export const VG_SHIELD = Object.freeze({ id: 'vorgazhek', duration: 1.6, cooldown: 7.5, durability: 110, mitigation: .72, drain: 1, areaDrain: .5, areaTick: .3, breakAt: 36, radiusK: .6, skin: 'fenda',
  colors: { core: 0x05061a, edge: 0x5fe8ff, glow: 0x2a1a7a, crack: 0xe8fbff } });
/** Dash curto e rápido; o que muda é a SEQUÊNCIA (1–3 passos com objetivo), não a recarga. */
export const VG_DASH = Object.freeze({ speed: 15, time: .17, cd: .5, minStart: .5, budget: 5, window: 3, lockout: 1.2, gap: .07 }); // 20/11: início a início ≥ 0,5 s (regra do criador para os Bispos)
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
  brain: vorgBrain, pickMove: vorgPickMove, moveAim: vgAim, stepRise: vgStepRise
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
export const VG_TACTICS = Object.freeze({ every: [.3, .5], echo: { chance: .55, cd: 1.6 },
  eclipse: { gap: [2, 8], cd: 3.4 }, twilight: { cd: 3.2 }, aerial: { gap: [2.5, 7.5], cd: 6.5 }, charge: { gap: [4.2, 12], cd: 6, run: .55 }, fissure: { cd: 2.2 } });
export const vgPhaseOf = (hp, max) => { const k = hp / Math.max(1, max); return k > .7 ? 0 : k > .4 ? 1 : k > .15 ? 2 : 3; };

/** Executa a sequência de dashes (cada passo com direção recalculada ao começar; para se o terreno bloquear). */
function vgStepChain(sq, a, t, dt) {
  const c = a.vgChain; if (!c || !c.steps.length || a.act) return false;
  a.decideT = Math.max(a.decideT || 0, .15); a.react = null; // missão 20/11: o motor não "rouba" o intervalo entre passos (decisão/reação genérica cortava a sequência no 1º dash)
  if ((c.wait -= dt) > 0 || sq.time - (a.vgLastDashStart ?? -9) < VG_DASH.minStart) return true; // respiro entre passos; nunca dois inícios de dash a menos de 0,5 s
  const s = c.steps.shift(), d = Math.hypot(t.x - a.x, t.z - a.z) || 1, ux = (t.x - a.x) / d, uz = (t.z - a.z) / d;
  const dir = side => { let dx = s.f * ux + side * uz, dz = s.f * uz - side * ux; const l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  const reach = VG_DASH.speed * VG_DASH.time * (s.len || 1), free = ([x, z]) => !sq.blocked(a.x + x * reach, a.z + z * reach) && !sq.blocked(a.x + x * reach * .5, a.z + z * reach * .5);
  let [dx, dz] = dir(s.s); if (!free([dx, dz]) && s.s) [dx, dz] = dir(-s.s); // lado bloqueado: espelha o passo
  if (!free([dx, dz])) { c.steps.length = 0; c.cut = true; } // terreno não livre dos dois lados: encerra sem atravessar
  else {
    // nunca entra no corpo do herói: o passo para antes da cápsula
    const along = dx * (t.x - a.x) + dz * (t.z - a.z), perp = Math.abs(dx * (t.z - a.z) - dz * (t.x - a.x)), room = (t.radius || .4) + a.T.radius + .35;
    const len = along > 0 && perp < room ? clamp((along - room) / reach, .25, s.len || 1) : (s.len || 1);
    const last = !c.steps.length;
    sq.begin(a, { type: 'dodge', dur: VG_DASH.time * len, anim: 'dash', dx, dz, iframes: !!s.iframes, face: !!s.face, chain: last && c.then === 'melee' ? 'melee' : undefined, token: last && c.then === 'melee' ? 'melee' : undefined, tid: t.id, goal: c.goal + ':' + (c.n - c.steps.length) });
    a.vgDashes = (a.vgDashes || 0) + 1; c.wait = VG_DASH.gap; c.done = (c.done || 0) + 1;
  }
  if (!c.steps.length) { const then = c.then; a.vgChain = null; const S = a.vgStats; if (S) { const k = Math.min(3, c.done || 0); S.seq = S.seq || { 0: 0, 1: 0, 2: 0, 3: 0 }; S.seq[k]++; } sq.event('vgChainEnd', { actor: a, goal: c.goal, n: c.n, done: c.done || 0, cut: !!c.cut });
    if (then === 'leap' && sq.canAttack(a, 'melee', t.id)) a.vgLeapNext = true; if (then === 'rise' && !a.cds.vgRise) a.vgRiseNext = true; }
  return true;
}
function chain(sq, a, goal, steps, then) { a.vgChain = { goal, steps, n: steps.length, then, wait: 0 }; sq.event('vgChain', { actor: a, goal, n: steps.length }); }

export function vorgBrain(sq, a, dt, t) {
  if (!a.ownT) { a.T = { ...a.T, block: { ...a.T.block }, dodge: { ...a.T.dodge } }; a.ownT = true; a.vgStats = { dash: 0, chains: {}, shield: 0, leap: 0, combos: 0, rise: 0, seq: { 0: 0, 1: 0, 2: 0, 3: 0 } }; }
  const ph = vgPhaseOf(a.hp, a.maxHp); if (ph !== a.vgPhase) { const was = a.vgPhase; a.vgPhase = ph; a.vzPhase = ph; if (was !== undefined) sq.event('vgPhase', { actor: a, phase: ph }); }
  a.cdMul = Math.min(a.cdMul || 1, [1, .92, .82, .72][ph]);
  // orçamento de dash (contado pelos atos de dash iniciados)
  const S = a.vgStats; if (a.act && a.act !== a._vgAct) { a._vgAct = a.act; if (a.act.type === 'dodge') { S.dash++; (a.vgDashAt || (a.vgDashAt = [])).push(sq.time); S.minDashGap = Math.min(S.minDashGap ?? 9, +(sq.time - (a.vgLastDashStart ?? -9)).toFixed(3)); a.vgLastDashStart = sq.time; a.cds.dodge = Math.max(a.cds.dodge || 0, VG_DASH.minStart); const g = S.groups || (S.groups = { 1: 0, 2: 0, 3: 0, 4: 0 }); if (sq.time - (a._vgDashT ?? -9) < VG_DASH.minStart + .3) { a._vgRun++; } else a._vgRun = 1; a._vgDashT = sq.time; if (a._vgRun > 1) g[Math.min(4, a._vgRun - 1)]--; g[Math.min(4, a._vgRun)]++; } if (a.act.type === 'leap' && !a.act.rise) S.leap++; if (a.act.type === 'melee') S.combos++; }
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
  if (a.vgRiseNext && !a.act) { a.vgRiseNext = false; if (sq.canAttack(a, 'melee', t.id)) { vgStartRise(sq, a, t); return; } }
  // Eco do Eclipse: a esquiva REATIVA do motor (1 dash) vira sequência — mais 1–2 passos com objetivo (flanco e corte, ou recuo e volta)
  if (a.act && a.act.type === 'dodge' && !a.act.goal && !a.act.vgEcho && !a.vgChain) { a.act.vgEcho = true; const gap0 = Math.hypot(t.x - a.x, t.z - a.z) - (t.radius || .4) - a.T.radius;
    if (!a.cds.vgEcho && a.vgDashAt.length < VG_DASH.budget - 2 && sq.rand() < VG_TACTICS.echo.chance) { a.cds.vgEcho = VG_TACTICS.echo.cd * a.cdMul; const sd = sq.rand() < .5 ? 1 : -1, two = sq.rand() < .45;
      const steps = gap0 < 2.4 ? [{ f: -.35, s: sd * .95, len: .9, face: true }].concat(two ? [{ f: .75, s: -sd * .6, len: .85, face: false, iframes: true }] : []) : [{ f: .8, s: sd * .5, len: 1, face: true }].concat(two ? [{ f: .6, s: -sd * .8, len: .85, face: false, iframes: true }] : []);
      chain(sq, a, 'eco', steps, two || gap0 >= 2.4 ? 'melee' : undefined); (a.vgStats.chains.eco = (a.vgStats.chains.eco || 0) + 1); } }
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
  // Ascensão da Maré Abissal: herói a média/longa distância (nunca colado), ou fugindo em dash → salto ofensivo
  if (!a.cds.vgRise && !a.airY && see && canMelee && gap >= VG_RISE.gap[0] && gap <= VG_RISE.gap[1]) opts.push(['mare', .3 + P * .05 + (a.vgHeroDash > 1 ? .18 : 0) + (st.dist > 5 ? .1 : 0)]);
  // Investida Corrompida: corrida intencional → estocada (de longe)
  if (!a.cds.vgCharge && see && canMelee && gap >= T.charge.gap[0] && gap <= T.charge.gap[1]) opts.push(['investida', .3 + (st.dist > 6 ? .15 : 0)]);
  // Guarda da Fenda: pressão frontal → guarda curta (ou escudo) e devolve com a Órbita recuando
  if (!a.cds.vgFissure && !a.cds.guard && gap < 1.8 && t.attacking) opts.push(['fenda', .26 + (a.hp < a.maxHp * .5 ? .1 : 0)]);
  if (!opts.length) return;
  const top = Math.max(...opts.map(o => o[1])); if (sq.rand() > Math.min(.85, top)) return;
  let roll = sq.rand() * opts.reduce((x, o) => x + o[1], 0), goal = opts[0][0]; for (const o of opts) { roll -= o[1]; if (roll <= 0) { goal = o[0]; break; } }
  sq.event('vzTactic', { actor: a, goal, gap: +gap.toFixed(2) }); (S.chains[goal] = (S.chains[goal] || 0) + 1);
  if (goal === 'eclipse') { a.cds.vgEclipse = T.eclipse.cd * a.cdMul; a.cds.vgChain = .3; const n = gap > 5 ? (sq.rand() < .45 ? 3 : 2) : (sq.rand() < .3 ? 1 : 2), steps = []; // missão 20/11: sequência é a regra, dash isolado é exceção
    const flee = -(((t.vx || 0) * (t.x - a.x) + (t.vz || 0) * (t.z - a.z)) / d) < -2.5; if (flee && gap > 4) steps.length = 0;
    for (let i = 0; i < (flee && gap > 4 ? 2 : n - 1); i++) steps.push({ f: .85, s: side * (i % 2 ? -.45 : .45), len: 1, face: true });
    steps.push({ f: .55, s: side * .85, len: .9, face: false, iframes: true }); chain(sq, a, 'eclipse', steps, 'melee'); return; }
  if (goal === 'crepusculo') { a.cds.vgTwilight = T.twilight.cd * a.cdMul; a.cds.vgChain = .3; const n = sq.rand() < .45 ? 3 : 2, steps = [{ f: -.9, s: side * .35, len: 1, iframes: true, face: true }, { f: -.25, s: side * .95, len: .9, face: true }];
    if (n === 3) steps.push({ f: .6, s: -side * .7, len: .8, face: true }); chain(sq, a, 'crepusculo', steps, n === 3 ? 'melee' : undefined); return; }
  if (goal === 'aereo') { a.cds.vgAerial = T.aerial.cd * a.cdMul; chain(sq, a, 'aereo', [{ f: .2, s: side, len: .7, face: true }], 'leap'); return; }
  if (goal === 'mare') { if (chainOk && gap > 6.8 && sq.rand() < .4) { chain(sq, a, 'mare', [{ f: .9, s: side * .3, len: 1, face: true }], 'rise'); return; } vgStartRise(sq, a, t); return; }
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
