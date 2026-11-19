import { MOBILITY } from './combat-mobility3d.js';
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
/* CLAUDE combate/movimento: andar mais ágil (2,2 → 2,8 m/s, cadência do clipe 1,72× — passada rápida, sem patinar);
 * correr continua só com CORRER/Shift a 6,8 m/s. */
export const PROTA_LOCO = Object.freeze({ walk: 2.8, run: 6.8, walkNatural: 1.63, runNatural: 5.48, idleBelow: .3, guard: 1.6 });
/** Salto proporcional ao corpo (1,9 m): ~1,18 m de altura e ~0,65 s no ar (mesmo valor do PR #468, aplicado UMA vez:
 *  ápice v²/2g). O clipe Jump_Over_Obstacle_2 é esticado para o tempo real de voo (fase aérea = arco balístico). */
export const PROTA_JUMP = Object.freeze({ gravity: 22, impulse: 7.2, clip: 'Jump_Over_Obstacle_2', takeoff: .10, airFrom: .20, airTo: .52, land: .60, landEnd: .80, recover: .16 });
/** Dash da referência 3900: some em fumaça vertical na origem, atravessa invisível e reaparece adiante
 *  num rastro horizontal escuro que se fecha no corpo. Curto, imediato, com i-frames e recarga. */
/* Mod 315: recarga ÚNICA de 0,50 s contada desde a ativação (combat-mobility3d.MOBILITY.dashCooldown) — o jogo usa a mesma. */
export const PROTA_DASH = Object.freeze({ distance: 5.4, travel: .17, vanish: .03, reappear: .20, total: .34, iframes: .30, cooldown: MOBILITY.dashCooldown, recover: .14,
  /* Mod 327: chegada = amortecimento do pouso (quadril de frente, ±15°). Antes era a cauda do Quick_Step_and_Spin_Dodge
   * (.82–1.16 s), que começa no MEIO do giro com o quadril a −131° (postura −52°): o herói reaparecia de lado e girava. */
  arrive: Object.freeze({ clip: 'Jump_Over_Obstacle_2', start: .62, end: .86 }),
  /* Missão combate cinematográfico: o MESMO dash (botão, recarga, i-frames e fumaça) agora é VISÍVEL — o corpo desliza
   * baixo com o trecho de deslize do `slide_right` (quadril desce de 0,9 para 0,4 m e avança; antes não usado) e
   * levanta com o fim do mesmo clipe (quadril volta a 0,9 m e o tronco desgira de ~50° para ~5°), com silhuetas
   * escuras deixadas no caminho. Some/reaparece só em 1ª pessoa (câmera dentro do corpo). */
  pose: Object.freeze({ clip: 'slide_right', start: .06, end: .55 }),
  rise: Object.freeze({ clip: 'slide_right', start: 1.15, end: 1.65 }),
  ghostEvery: .055,
  /* Dash de aproximação: com um inimigo à frente do dash (cone 40°, até 9 m), o dash vai direto a ele e para na
   * distância de golpe (raio + 1,5 m); mais perto que 2,3 m vira um passo curto. Dash para o lado/trás: 5,4 m livres. */
  approach: Object.freeze({ range: 9, cone: .7, stop: 1.5, min: .8, max: 7.5 }),
  /* Esquiva perfeita: um golpe inimigo absorvido pelos i-frames do dash abre 0,8 s de contra-ataque (dano ×1,5). */
  counter: Object.freeze({ window: .8, damage: 1.5 }) });

/**
 * Dash de aproximação (puro, testável). `dir` = direção pedida (unitária). Retorna { dir, dist, target }:
 * com um alvo vivo dentro do cone/alcance, a direção vira a do alvo e a distância para no ponto de golpe
 * (sem entrar no corpo); sem alvo, a direção pedida e a distância padrão.
 */
export function dashApproach(from, dir, targets, { blocked = () => false, cfg = PROTA_DASH.approach, distance = PROTA_DASH.distance } = {}) {
  let best = null, score = Infinity;
  const yaw = Math.atan2(dir.x, dir.z);
  for (const t of targets || []) {
    if (!t || !t.alive) continue;
    const dx = t.x - from.x, dz = t.z - from.z, d = Math.hypot(dx, dz);
    if (d > cfg.range || d < 1e-3) continue;
    const a = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - yaw), Math.cos(Math.atan2(dx, dz) - yaw)));
    if (a > cfg.cone || blocked(from, t)) continue;
    const s = d + a * 4;
    if (s < score) { score = s; best = { t, d, dx, dz }; }
  }
  if (!best) return { dir: { x: dir.x, z: dir.z }, dist: distance, target: null };
  const { t, d, dx, dz } = best, room = d - ((t.radius || .5) + cfg.stop);
  // Já no alcance de golpe (sem espaço seguro ≥ cfg.min até a distância de parada): não há aproximação — o dash segue
  // livre na direção pedida, como sempre (dashSettle impede parar dentro de um corpo). Nunca força passo em direção ao alvo.
  if (room < cfg.min) return { dir: { x: dir.x, z: dir.z }, dist: distance, target: null };
  return { dir: { x: dx / d, z: dz / d }, dist: Math.min(cfg.max, room), target: t };
}

/**
 * Trecho do dash neste quadro: velocidade (1,55 − 1,1·u)·D/T integrada exatamente entre u0 e u1 (u = fração do tempo
 * de deslocamento). Antes a velocidade do início do quadro valia pelo quadro inteiro e o dash passava ~13 % da
 * distância a 30 FPS — e o de aproximação terminava dentro da distância de parada. Agora a soma é sempre D.
 */
export function dashStepLen(dist, remaining, dt, travel = PROTA_DASH.travel) {
  const F = (u) => 1.55 * u - .55 * u * u, c = (u) => Math.min(1, Math.max(0, u));
  return dist * (F(c(1 - (remaining - dt) / travel)) - F(c(1 - remaining / travel)));
}

/**
 * Mod 327 — onde o dash termina. `soft(x,z)`: o herói não pode PARAR ali (corpo, NPC, água funda + tudo de `hard`);
 * `hard(x,z)`: parede que o dash nunca atravessa. 1) segue em frente até sair de um corpo, sem cruzar parede;
 * 2) senão recua pelo PRÓPRIO trajeto varrido (pontos já validados, [x0,z0,x1,z1,…]); 3) por fim, a origem.
 * Nunca empurra às cegas para trás (antes recuava 2,8 m em linha reta e podia entrar numa parede lateral).
 */
export function dashSettle(p, dir, trail, from, soft, hard, step = .07) {
  for (let i = 0; i < 30 && soft(p.x, p.z); i++) { const nx = p.x + dir.x * step, nz = p.z + dir.z * step; if (hard(nx, nz)) break; p.x = nx; p.z = nz; }
  for (let i = trail.length - 2; i >= 0 && soft(p.x, p.z); i -= 2) { p.x = trail[i]; p.z = trail[i + 1]; }
  if (soft(p.x, p.z) && from && !hard(from.x, from.z)) { p.x = from.x; p.z = from.z; }
  return p;
}
/**
 * Combate de referência (esgrima em alta velocidade): o relógio do golpe corre mais rápido que o clipe original.
 * Janelas de dano, warp e cancelamento são medidas no MESMO relógio, então ficam proporcionais (nada some, só acelera).
 */
export const PROTA_SPEED = Object.freeze({ ground: 1.38, run: 1.32, dash: 1.34, air: 1.28, plunge: 1.18 });
/** Trechos [início, fim] dos clipes (segundos) e janelas relativas ao trecho. hit: physical | energy | hybrid. */
export const PROTA_MOVES = Object.freeze({
  ground: [
    { name: 'Fenda diagonal', clip: 'Weapon_Combo', start: .52, end: 1.08, open: .19, close: .36, hit: 'hybrid', dmg: 1, warp: { max: 3.2, speed: 18 }, aim: { r: 1.4, ang: .52 }, hitstop: .05,
      energy: { kind: 'wave', at: .27, roll: .85, radius: 1.7, speed: 17, range: 6.5, band: .8, life: .5, falloff: true }, ref: '7e4b2554 0:01 crescente que nasce na lâmina num corte ascendente de corpo inteiro' },
    { name: 'Lua horizontal', clip: 'Triple_Combo_Attack', start: 1.10, end: 1.76, open: .22, close: .46, hit: 'energy', dmg: .95, warp: { max: 1.4 }, aim: { r: 1.9, ang: -.61 }, hitstop: .045,
      energy: { kind: 'sector', at: .38, span: 2.6, roll: 0, r0: .9, r1: 7.2, speed: 26, band: 1.0, half: .55, life: .42 }, ref: 'acf4e763 0:02–0:03 arco horizontal largo que alcança o inimigo à média distância · 7e4b2554 0:05' },
    { name: 'Ascensão', clip: 'Triple_Combo_Attack', start: 1.95, end: 2.45, open: .10, close: .33, hit: 'hybrid', dmg: 1.12, launcher: true, warp: { max: 2.2 }, aim: { r: 1.5, ang: 1.22 }, hitstop: .06,
      energy: { kind: 'wave', at: .24, roll: Math.PI / 2, radius: 1.3, speed: 15, range: 4.6, band: .7, life: .4 }, ref: 'acf4e763 0:04 e 0:08 corte vertical em crescente · 0240a0f0 0:06 lançamento' },
    { name: 'Estocada', clip: 'Weapon_Combo_1', start: .88, end: 1.45, open: .15, close: .36, hit: 'hybrid', dmg: 1.18, warp: { max: 3.6 }, aim: { r: 1.8, ang: .61 }, hitstop: .06,
      energy: { kind: 'wave', at: .24, roll: .2, radius: 1.15, speed: 22, range: 6.5, band: .65, life: .4, falloff: true }, ref: '0240a0f0 0:10–0:12 investida curta com faíscas no contato · acf4e763 0:07 perseguição' },
    { name: 'Sentença giratória', clip: '_360_Power_Spin_Jump', start: .70, end: 1.80, open: .40, close: .56, hit: 'hybrid', dmg: 1.55, finisher: true, speed: 1.22, warp: { max: 2.4 }, aim: { r: 1.6, ang: -.44 }, hitstop: .09, shake: .07,
      energy: { kind: 'sector', at: .78, span: Math.PI * 2, roll: 0, r0: 1, r1: 5.6, speed: 18, band: 1.1, half: .7, life: .45 }, ref: '9dacd64c 0:24 corte circular em espiral · 523a21e1 0:00 e 0:08 explosão de finalizador' },
  ],
  run: { name: 'Estocada em corrida', clip: 'Weapon_Combo_1', start: .88, end: 1.45, open: .15, close: .36, hit: 'hybrid', dmg: 1.05, warp: { max: 3.6, speed: 24 }, aim: { r: 1.8, ang: .61 }, hitstop: .05,
    energy: { kind: 'wave', at: .24, roll: -.35, radius: 1.4, speed: 24, range: 7.5, band: .7, life: .42, falloff: true } },
  dash: { name: 'Corte do retorno', clip: 'Skill_03', start: .35, end: 1.30, open: .20, close: .34, hit: 'hybrid', dmg: 1.1, warp: { max: 1.6 }, aim: { r: 2.2, ang: 0 }, hitstop: .055,
    energy: { kind: 'wave', at: .84, roll: 1.1, radius: 1.5, speed: 22, range: 8.5, band: .8, life: .5 }, ref: '9dacd64c 0:03 crescente lançado logo após o deslocamento · 0:07' },
  air: { name: 'Arco aéreo', clip: 'Weapon_Combo_2', start: 2.60, end: 3.15, open: .10, close: .40, hit: 'hybrid', dmg: .9, warp: { max: 1.2 }, aim: { r: 1.6, ang: -1.22 }, hitstop: .045,
    energy: { kind: 'sector', at: .26, span: 2.2, roll: -.35, r0: .8, r1: 4.2, speed: 20, band: .9, half: .6, life: .32 }, ref: 'acf4e763 0:23 arcos no ar' },
  plunge: { name: 'Queda do julgamento', clip: 'Weapon_Combo_1', start: .30, end: .95, open: .17, close: .46, hit: 'hybrid', dmg: 1.4, warp: { max: 1 }, aim: { r: 1.8, ang: -.52 }, hitstop: .07, shake: .06,
    energy: { kind: 'sector', at: .30, span: Math.PI * 2, roll: 0, r0: .8, r1: 3.6, speed: 16, band: 1, half: .5, life: .35 }, ref: '0240a0f0 0:03 impacto no chão com estouro · acf4e763 0:22' },
});
export function protaMove(mode = 'ground', step = 0) { const m = PROTA_MOVES[mode] || PROTA_MOVES.ground; return Array.isArray(m) ? m[step % m.length] : m; }
/** CLAUDE combate (P4): alcance do rastro visível além da ponta da espada (m). */
export const BASIC_TRAIL = .3;
/** Definição usada pelo SwordRites (api.moveset): janelas startup/ativo/follow-through/recuperação e buffer. */
export function protaMoveDef(mode = 'ground', step = 0) {
  const list = PROTA_MOVES[mode] || PROTA_MOVES.ground, count = Array.isArray(list) ? list.length : 1, i = step % count, m = Array.isArray(list) ? list[i] : list;
  const duration = m.end - m.start;
  /* CLAUDE combate (P4): golpe BÁSICO = lâmina + rastro colado a ela. A onda/setor projetado (energy) saiu da trilha
   * normal — o dano vem da varredura da lâmina estendida até a borda do rastro visível (trail, m além da ponta),
   * uma vez por janela. Os dados antigos ficam em `projected` só como referência das habilidades futuras. */
  return { ...m, energy: null, projected: m.energy || null, hit: 'physical', trail: BASIC_TRAIL, id: `Prota302_${PROTA_MOVES[mode] ? mode : 'ground'}_${i}`, step: i, count, duration, multiplier: m.dmg,
    speed: m.speed || PROTA_SPEED[mode] || PROTA_SPEED.ground, buffer: Math.max(.05, m.open * .5), cancelAt: Math.min(duration - .04, Math.max(m.close + .13, m.energy ? m.energy.at + .06 : 0)), chain: .5, drive: true,
    pattern: m.launcher ? 'rise' : m.finisher ? 'finish' : mode === 'plunge' ? 'plunge' : 'slash' };
}
/** Segmentos (clipe, início, fim) de todos os golpes, para recortar os AnimationClips uma vez no carregamento. */
export function protaSegments() {
  const out = [];
  for (const [mode, list] of Object.entries(PROTA_MOVES)) (Array.isArray(list) ? list : [list]).forEach((m, i) => out.push({ id: `Prota302_${mode}_${i}`, clip: m.clip, start: m.start, end: m.end }));
  out.push({ id: 'Prota302_jump', clip: PROTA_JUMP.clip, start: PROTA_JUMP.takeoff, end: PROTA_JUMP.airTo, vertical: true });
  out.push({ id: 'Prota302_land', clip: PROTA_JUMP.clip, start: PROTA_JUMP.land, end: PROTA_JUMP.landEnd, vertical: true });
  out.push({ id: 'Prota302_arrive', clip: PROTA_DASH.arrive.clip, start: PROTA_DASH.arrive.start, end: PROTA_DASH.arrive.end, vertical: true });
  out.push({ id: 'Prota302_dash', clip: PROTA_DASH.pose.clip, start: PROTA_DASH.pose.start, end: PROTA_DASH.pose.end, vertical: true });
  /* lock-on: recuar de frente para o inimigo com o Walk_Backward (antes sem uso), no lugar do andar invertido */
  out.push({ id: 'Prota302_back', clip: 'Walk_Backward', start: 0, end: .87 });
  out.push({ id: 'Prota302_rise', clip: PROTA_DASH.rise.clip, start: PROTA_DASH.rise.start, end: PROTA_DASH.rise.end, vertical: true });
  return out;
}
export function moveDuration(m) { return m.end - m.start; }
/** Mod 315: a onda vale menos longe do herói (alcance não vira dano grátis): 100 % até 2,5 m, 60 % a partir de 7,5 m. */
export function energyFalloff(spec, dist) { return spec && spec.falloff ? 1 - .4 * Math.max(0, Math.min(1, (dist - 2.5) / 5)) : 1; }

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
 * Missão 19/11 — direção do GOLPE separada da direção do ANALÓGICO (bug reproduzido pelo criador: inimigo bem à frente,
 * analógico levemente para trás/lado + GOLPE → o herói golpeava para trás e perdia o alvo).
 *  1. Mira travada (lock-on) válida → ela.
 *  2. Inimigo válido (vivo, linha de visão, mesmo piso) a até `assist` m → o golpe é dele. O analógico só translada
 *     (passo lateral/recuo durante o golpe); ruído ou toque leve nunca vira o herói de costas para o alvo.
 *  3. Troca manual: analógico FIRME (≥ `flick`) apontando a ≤ 35° de OUTRO inimigo a até `range` m → muda para ele.
 *  4. Sem ninguém em `assist`: o mais bem pontuado até `range` (distância, centro da câmera, frente do herói, alvo
 *     atual e alvo golpeado há pouco — com histerese); com analógico firme, cone de 57° na direção pedida.
 *  5. Ninguém → golpe livre na direção do analógico (escolha deliberada de mirar no vazio).
 * `stick` = {x, z, mag} no MUNDO (já relativo à câmera); mag < `dead` conta como sem entrada.
 */
export const ATTACK_AIM = Object.freeze({ assist: 4.6, range: 9, dead: .35, flick: .7, flickCone: .62, height: 3, recentHit: 2.5 });
export function chooseAttackTarget(from, { heroYaw = 0, camYaw = null, stick = null, cands = [], lockedId = null, currentId = null, lastHitId = null, lastHitAge = 99, blocked = () => false, cfg = ATTACK_AIM } = {}) {
  const ok = [];
  for (const t of cands) {
    if (!t || !t.alive) continue;
    const dx = t.x - from.x, dz = t.z - from.z, d = Math.hypot(dx, dz);
    if (d > cfg.range || Math.abs((t.y - (t.height || 1.7) * .5) - from.y) > cfg.height || blocked(from, t)) continue;
    ok.push({ t, d, yaw: Math.atan2(dx, dz) });
  }
  const mag = stick ? Math.min(1, stick.mag ?? Math.hypot(stick.x, stick.z)) : 0, input = mag >= cfg.dead, firm = mag >= cfg.flick;
  const sYaw = input ? Math.atan2(stick.x, stick.z) : heroYaw;
  if (lockedId != null) { const L = ok.find(o => o.t.id === lockedId); if (L) return { target: L.t, why: 'lock', input, stickYaw: sYaw }; }
  // troca deliberada: analógico firme mirando outro inimigo
  if (firm) { let best = null, bs = Infinity; for (const o of ok) { const off = Math.abs(wrap(o.yaw - sYaw)); if (off > cfg.flickCone) continue; const sc = o.d * .5 + off * 2; if (sc < bs) { bs = sc; best = o; } }
    if (best && best.t.id !== currentId) return { target: best.t, why: 'flick', input, stickYaw: sYaw }; }
  const near = ok.filter(o => o.d <= cfg.assist + (o.t.radius || .5));
  const pool = near.length ? near : firm ? ok.filter(o => Math.abs(wrap(o.yaw - sYaw)) <= 1) : ok;
  let best = null, bs = Infinity;
  for (const o of pool) {
    const camOff = camYaw == null ? 0 : Math.abs(wrap(o.yaw - camYaw)), faceOff = Math.abs(wrap(o.yaw - heroYaw));
    const sc = o.d * .55 + camOff * .8 + faceOff * .5 - (o.t.id === currentId ? 1.6 : 0) - (o.t.id === lastHitId && lastHitAge < cfg.recentHit ? .8 : 0) - (o.t.threat || 0) * .4;
    if (sc < bs) { bs = sc; best = o; }
  }
  return best ? { target: best.t, why: near.length ? 'assist' : 'auto', input, stickYaw: sYaw } : { target: null, why: 'free', input, stickYaw: sYaw };
}
/**
 * Translação do analógico DURANTE o golpe com alvo válido: o tronco/lâmina seguem no alvo e o stick vira passo lateral
 * ou recuo (nunca giro). Devolve a velocidade (m/s) e quanto do avanço automático (warp) ainda vale: puxar para trás
 * cancela a aproximação; empurrar para o alvo mantém tudo.
 */
export const ATTACK_STRAFE = Object.freeze({ lateral: 2.6, back: 2.3, activeK: .45 });
export function attackStrafe(stick, toTarget, phase = 'windup', cfg = ATTACK_STRAFE, dead = ATTACK_AIM.dead) {
  const mag = stick ? Math.min(1, stick.mag ?? Math.hypot(stick.x, stick.z)) : 0;
  if (mag < dead || !toTarget) return { vx: 0, vz: 0, warpK: 1 };
  const l = Math.hypot(toTarget.x, toTarget.z) || 1, fx = toTarget.x / l, fz = toTarget.z / l, sl = Math.hypot(stick.x, stick.z) || 1, sx = stick.x / sl, sz = stick.z / sl;
  const along = sx * fx + sz * fz; if (along > .5) return { vx: 0, vz: 0, warpK: 1 }; // para o alvo: o golpe já avança
  // toque leve (< flick): o golpe ainda chega no alvo e o herói só desliza um pouco; analógico FIRME para trás = recuar de verdade (sem avanço)
  const firm = mag >= ATTACK_AIM.flick, side = sx * -fz + sz * fx, k = (phase === 'active' ? cfg.activeK : 1) * (firm ? mag : mag * .4);
  const lat = side * cfg.lateral * k, back = Math.min(0, along) * cfg.back * k;
  return { vx: -fz * lat + fx * back, vz: fx * lat + fz * back, warpK: firm && along < -.3 ? 0 : 1 };
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
  const left = Math.max(dt, window - a.t + dt), step = Math.min(budget, need * dt / left, (def.warp.speed || 14) * dt);
  a.warped += step; if (away) a.backed = (a.backed || 0) + step;
  return { dx: nx / need * step, dz: nz / need * step, yaw };
}

/* Mod 315: volumes de energia (setor/onda) moram em combat-energy3d.js — interface compartilhada com as garras do Demônio1. */
export { makeEnergy, energyStep, energyTouches } from './combat-energy3d.js';
