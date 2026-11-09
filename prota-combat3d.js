/**
 * Mod 302 — combate do PROTAGONISTA reconstruído (só o herói; inimigos e bispos não usam este módulo).
 * Puro JS, sem Three/DOM: parâmetros medidos nos clipes reais do Prota_otimizado_2K.glb e funções testáveis
 * de escolha de alvo, "motion warping" (aproximação curta e segura no startup) e volumes de energia.
 *
 * Medições (tools/combat/README e docs/combate/mod302-combate-protagonista.md):
 *  - Walking anda 1,63 m/s no chão (pé de apoio) e Running 5,48 m/s → a animação é sincronizada pela velocidade real.
 *  - Os golpes vêm de trechos dos clipes de arma com o PICO de velocidade da ponta da espada (empunhadura no eixo
 *    dos nós dos dedos, +X da mão): janela ativa = trecho com > 45 % do pico.
 */
export const PROTA_LOCO = Object.freeze({ walk: 2.2, run: 6.8, walkNatural: 1.63, runNatural: 5.48, idleBelow: .3, guard: 1.6 });
/** Salto proporcional ao corpo (1,9 m): ~0,6 m de altura e ~0,47 s no ar. Clipe Jump_Over_Obstacle_2 em 3 fases. */
export const PROTA_JUMP = Object.freeze({ gravity: 22, impulse: 5.2, clip: 'Jump_Over_Obstacle_2', takeoff: .10, airFrom: .20, airTo: .52, land: .60, landEnd: .80, recover: .16 });
/** Dash da referência 3900: some em fumaça vertical na origem, atravessa invisível e reaparece adiante
 *  num rastro horizontal escuro que se fecha no corpo. Curto, imediato, com i-frames e recarga. */
export const PROTA_DASH = Object.freeze({ distance: 5.4, travel: .13, vanish: .03, reappear: .20, total: .34, iframes: .30, cooldown: .48, recover: .14 });

/** Trechos [início, fim] dos clipes (segundos) e janelas relativas ao trecho. hit: physical | energy | hybrid. */
export const PROTA_MOVES = Object.freeze({
  ground: [
    { name: 'Fenda diagonal', clip: 'Weapon_Combo', start: .52, end: 1.08, open: .19, close: .36, hit: 'physical', dmg: 1, warp: { max: 2.6 }, aim: { r: 1.4, ang: .52 }, hitstop: .05, ref: '3896 0:02 corte diagonal com corpo inteiro' },
    { name: 'Lua horizontal', clip: 'Triple_Combo_Attack', start: 1.10, end: 1.76, open: .22, close: .46, hit: 'energy', dmg: .95, warp: { max: 1.4 }, aim: { r: 1.9, ang: -.61 }, hitstop: .045,
      energy: { kind: 'sector', at: .38, span: 2.6, roll: 0, r0: .9, r1: 7.2, speed: 26, band: 1.0, half: .55, life: .42 }, ref: '3896 0:05 · 3895 arco horizontal que alcança à média distância' },
    { name: 'Ascensão', clip: 'Triple_Combo_Attack', start: 1.95, end: 2.45, open: .10, close: .33, hit: 'hybrid', dmg: 1.12, launcher: true, warp: { max: 2.2 }, aim: { r: 1.5, ang: 1.22 }, hitstop: .06,
      energy: { kind: 'wave', at: .24, roll: Math.PI / 2, radius: 1.3, speed: 15, range: 4.6, band: .7, life: .4 }, ref: '3897 0:04 golpe que lança e alcança o alvo aéreo' },
    { name: 'Estocada', clip: 'Weapon_Combo_1', start: .88, end: 1.45, open: .15, close: .36, hit: 'physical', dmg: 1.18, warp: { max: 3.6 }, aim: { r: 1.8, ang: .61 }, hitstop: .06, ref: '3895 0:08 investida que persegue' },
    { name: 'Sentença giratória', clip: '_360_Power_Spin_Jump', start: .70, end: 1.80, open: .40, close: .56, hit: 'hybrid', dmg: 1.55, finisher: true, warp: { max: 2.4 }, aim: { r: 1.6, ang: -.44 }, hitstop: .09, shake: .07,
      energy: { kind: 'sector', at: .78, span: Math.PI * 2, roll: 0, r0: 1, r1: 5.6, speed: 18, band: 1.1, half: .7, life: .45 }, ref: '3899 0:06 finalizador com explosão e anel' },
  ],
  run: { name: 'Estocada em corrida', clip: 'Weapon_Combo_1', start: .88, end: 1.45, open: .12, close: .34, hit: 'physical', dmg: 1.05, warp: { max: 3.4 }, aim: { r: 1.8, ang: .61 }, hitstop: .05 },
  dash: { name: 'Corte do retorno', clip: 'Skill_03', start: .35, end: 1.30, open: .20, close: .34, hit: 'hybrid', dmg: 1.1, warp: { max: 1.6 }, aim: { r: 2.2, ang: 0 }, hitstop: .055,
    energy: { kind: 'wave', at: .84, roll: 1.1, radius: 1.5, speed: 22, range: 8.5, band: .8, life: .5 }, ref: '3898 0:03 onda que sai da lâmina após a esquiva' },
  air: { name: 'Arco aéreo', clip: 'Weapon_Combo_2', start: 2.60, end: 3.15, open: .10, close: .40, hit: 'hybrid', dmg: .9, warp: { max: 1.2 }, aim: { r: 1.6, ang: -1.22 }, hitstop: .045,
    energy: { kind: 'sector', at: .26, span: 2.2, roll: -.35, r0: .8, r1: 4.2, speed: 20, band: .9, half: .6, life: .32 } },
  plunge: { name: 'Queda do julgamento', clip: 'Weapon_Combo_1', start: .30, end: .95, open: .17, close: .46, hit: 'hybrid', dmg: 1.4, warp: { max: 1 }, aim: { r: 1.8, ang: -.52 }, hitstop: .07, shake: .06,
    energy: { kind: 'sector', at: .30, span: Math.PI * 2, roll: 0, r0: .8, r1: 3.6, speed: 16, band: 1, half: .5, life: .35 } },
});
export function protaMove(mode = 'ground', step = 0) { const m = PROTA_MOVES[mode] || PROTA_MOVES.ground; return Array.isArray(m) ? m[step % m.length] : m; }
/** Definição usada pelo SwordRites (api.moveset): janelas startup/ativo/follow-through/recuperação e buffer. */
export function protaMoveDef(mode = 'ground', step = 0) {
  const list = PROTA_MOVES[mode] || PROTA_MOVES.ground, count = Array.isArray(list) ? list.length : 1, i = step % count, m = Array.isArray(list) ? list[i] : list;
  const duration = m.end - m.start;
  return { ...m, id: `Prota302_${PROTA_MOVES[mode] ? mode : 'ground'}_${i}`, step: i, count, duration, multiplier: m.dmg,
    buffer: Math.max(.05, m.open * .5), cancelAt: Math.min(duration - .04, m.close + .13), chain: .5, drive: true,
    pattern: m.launcher ? 'rise' : m.finisher ? 'finish' : mode === 'plunge' ? 'plunge' : 'slash' };
}
/** Segmentos (clipe, início, fim) de todos os golpes, para recortar os AnimationClips uma vez no carregamento. */
export function protaSegments() {
  const out = [];
  for (const [mode, list] of Object.entries(PROTA_MOVES)) (Array.isArray(list) ? list : [list]).forEach((m, i) => out.push({ id: `Prota302_${mode}_${i}`, clip: m.clip, start: m.start, end: m.end }));
  out.push({ id: 'Prota302_jump', clip: PROTA_JUMP.clip, start: PROTA_JUMP.takeoff, end: PROTA_JUMP.airTo, vertical: true });
  out.push({ id: 'Prota302_land', clip: PROTA_JUMP.clip, start: PROTA_JUMP.land, end: PROTA_JUMP.landEnd, vertical: true });
  out.push({ id: 'Prota302_arrive', clip: 'Quick_Step_and_Spin_Dodge', start: .82, end: 1.16, vertical: true });
  return out;
}
export function moveDuration(m) { return m.end - m.start; }

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Escolha de alvo: cone em volta da direção pedida (joystick, ou o rosto do herói), distância, altura, linha de visão
 * e um bônus para o alvo atual (sem trocar de alvo a cada golpe). Sem alvo válido → null (o golpe sai manual).
 */
export function pickTarget(from, yaw, targets, { blocked = () => false, range = 8.5, cone = 1.15, current = null, height = 3 } = {}) {
  let best = null, score = Infinity;
  for (const t of targets) {
    if (!t || !t.alive) continue;
    const dx = t.x - from.x, dz = t.z - from.z, d = Math.hypot(dx, dz), a = Math.abs(wrap(Math.atan2(dx, dz) - yaw));
    if (d > range || a > cone || Math.abs((t.y - (t.height || 1.7) * .5) - from.y) > height) continue;
    if (blocked(from, t)) continue;
    const s = d * .55 + a * 2.2 - (current && t.id === current ? 1.6 : 0) - (t.threat || 0) * .4;
    if (s < score) { score = s; best = t; }
  }
  return best;
}

/**
 * "Motion warping" (alinhamento do golpe): cada golpe tem um ponto de contato medido no próprio clipe (`aim`:
 * distância e ângulo do alvo, no quadro do herói no início do trecho, já contando o root motion). Durante o startup
 * o herói gira (até 12 rad/s) e desliza no máximo `warp.max` metros para pôr o alvo nesse ponto — curto, com teto de
 * 14 m/s, nunca teleporte. Devolve o passo do quadro; o jogo aplica com colisão. `acc` = root motion já aplicado.
 */
export function warpStep(a, def, from, target, dt, acc = { x: 0, z: 0 }) {
  if (!def.warp || !target || !target.alive) return { dx: 0, dz: 0, yaw: a.yaw };
  const aim = def.aim || { r: (target.radius || .5) + .9, ang: 0 };
  const tx = target.x - from.x, tz = target.z - from.z, d = Math.hypot(tx, tz) || 1e-6;
  const want = Math.atan2(tx, tz) - aim.ang, turn = wrap(want - a.yaw);
  const yaw = a.t <= def.close ? a.yaw + Math.max(-dt * 12, Math.min(dt * 12, turn)) : a.yaw;
  const window = def.open > 0 ? def.open : .2;
  if (a.t > window || Math.abs(turn) > 1.9) return { dx: 0, dz: 0, yaw };
  // onde a cápsula deveria estar agora: alvo a `aim.r` na direção atual, mais o root motion já percorrido
  const cx = target.x - tx / d * aim.r + (acc.x || 0), cz = target.z - tz / d * aim.r + (acc.z || 0);
  let nx = cx - from.x, nz = cz - from.z; const need = Math.hypot(nx, nz);
  a.warped = a.warped || 0;
  const away = (nx * tx + nz * tz) < 0, budget = Math.min(need, def.warp.max - a.warped, away ? Math.max(0, .5 - (a.backed || 0)) : Infinity);
  if (budget <= 1e-4) return { dx: 0, dz: 0, yaw };
  const left = Math.max(dt, window - a.t + dt), step = Math.min(budget, need * dt / left, 14 * dt);
  a.warped += step; if (away) a.backed = (a.backed || 0) + step;
  return { dx: nx / need * step, dz: nz / need * step, yaw };
}

/** Cria o volume de energia de um golpe na direção do herói (setor que se expande ou onda que viaja). */
export function makeEnergy(spec, from, yaw, height = 1.05) {
  return { ...spec, x: from.x, y: from.y + height, z: from.z, yaw, age: 0, radius: spec.kind === 'sector' ? spec.r0 : 0, travel: 0, done: false };
}
/** Avança o volume; devolve true quando a frente da energia alcança o corpo do alvo (dano neste quadro). */
export function energyStep(e, dt, target, { blocked = () => false } = {}) {
  e.age += dt;
  if (e.kind === 'sector') e.radius = Math.min(e.r1, e.radius + e.speed * dt);
  else e.travel = Math.min(e.range, e.travel + e.speed * dt);
  if (e.age >= e.life || (e.kind === 'sector' ? e.radius >= e.r1 : e.travel >= e.range)) e.done = true;
  if (!target || !target.alive) return false;
  return energyTouches(e, target, blocked);
}
export function energyTouches(e, target, blocked = () => false) {
  const r = target.radius || .5, h = target.height || 1.7, ty = target.y;
  if (e.kind === 'sector') {
    const dx = target.x - e.x, dz = target.z - e.z, d = Math.hypot(dx, dz);
    // banda radial da frente do setor (a energia já passou ou ainda não chegou → não acerta)
    if (d + r < e.radius - e.band || d - r > e.radius) return false;
    const a = Math.abs(wrap(Math.atan2(dx, dz) - e.yaw));
    if (e.span < Math.PI * 2 - 1e-3 && a > e.span / 2 + Math.atan2(r, Math.max(.3, d))) return false;
    // altura do disco inclinado (roll) no ponto do alvo
    const side = dx * Math.cos(e.yaw) - dz * Math.sin(e.yaw), planeY = e.y + Math.tan(e.roll || 0) * side;
    if (Math.abs(ty - planeY) > (e.half || .55) + h * .5) return false;
  } else {
    const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), cx = e.x + fx * e.travel, cz = e.z + fz * e.travel;
    const dx = target.x - cx, dz = target.z - cz, along = dx * fx + dz * fz, side = dx * fz - dz * fx, dy = ty - e.y;
    // crescente inclinado pelo roll: largura no plano do arco, espessura fina na direção do avanço
    const across = side * Math.cos(e.roll) + dy * Math.sin(e.roll);
    if (Math.abs(along) > e.band * .5 + r) return false;
    if (Math.abs(across) > e.radius + r) return false;
    if (Math.abs(-side * Math.sin(e.roll) + dy * Math.cos(e.roll)) > .5 + h * .45) return false;
  }
  return !blocked({ x: e.x, y: e.y, z: e.z }, { x: target.x, y: ty, z: target.z });
}
