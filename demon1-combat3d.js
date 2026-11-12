/**
 * Mod 315 — repertório do Demônio1 (Enemy1 comum): GARRAS, nunca espada. Lógica pura.
 *
 * Os golpes usam os clipes REAIS do Demonio1.glb, recortados por trecho. As janelas de dano saem do pico de velocidade
 * de mãos/pés medido no próprio clipe (SevenSinsDebug3D.enemyClipProbe, 20 amostras/s):
 *   Left_Hook_from_Guard 1,00 s — mão esquerda a 13 m/s em 0,33 s;
 *   Weapon_Combo_2 4,50 s — mão direita 9,6 m/s em 2,00 s e 7,4 m/s em 3,00 s (sem arma: com as garras vira rasgo);
 *   Roundhouse_Kick 2,67 s — braços girando 0,95–1,05 s e chute 1,50 s;
 *   Sweep_Kick 4,03 s — as duas mãos a 11–12 m/s em 0,92 s, quadril desce a 0,48 m (rasteira) e perna 14 m/s em 1,20 s;
 *   Run_Jump_and_Roll 3,43 s — impulso 0,9–1,2 s (quadril sobe a 1,58 m).
 * t = tempo do jogo desde o início do golpe; tempo do clipe = from + t·speed.
 */
export const DEMON1_MOVES = Object.freeze({
  gancho: { id: 'gancho', label: 'Garra em gancho', role: 'attack', from: .12, speed: 1.15, dur: .78, lunge: 1.5, reach: 2.35, hits: [{ t: .18, hand: 'L', arc: .3, dmg: 9, low: false }] },
  rasgo: { id: 'rasgo', label: 'Rasgo duplo', role: 'combo', from: 1.65, speed: 1.25, dur: 1.28, lunge: 1.1, reach: 2.4, hits: [{ t: .28, hand: 'R', arc: .25, dmg: 8 }, { t: 1.08, hand: 'R', arc: .25, dmg: 9, wave: { kind: 'wave', roll: -.7, radius: 1.25, speed: 16, range: 5, band: .7, life: .4, dmg: 7 } }] },
  giro: { id: 'giro', label: 'Garra circular', role: 'attack2', from: .55, speed: 1.3, dur: .95, lunge: .6, reach: 2.3, hits: [{ t: .35, hand: 'B', arc: -1, dmg: 9 }, { t: .73, hand: 'F', arc: .35, dmg: 11 }] },
  varrida: { id: 'varrida', label: 'Varrida rasteira', role: 'sweep', from: .45, speed: 1.3, dur: 1.2, lunge: .9, reach: 2.3, hits: [{ t: .36, hand: 'B', arc: .2, dmg: 8 }, { t: .58, hand: 'F', arc: -.2, dmg: 10, low: true }] },
});
/** Sequências combinadas (a IA escolhe pela situação; cada passo ainda respeita alcance, recarga e ficha de ataque). */
export const DEMON1_COMBOS = Object.freeze({
  pressao: ['gancho', 'rasgo'],
  giro: ['gancho', 'giro'],
  rasteira: ['varrida'],
  castigo: ['giro'],
});
/** Salto predatório: salto do chão → segundo salto no ar → dash aéreo até a posição ATUAL do alvo → garra descendente. */
export const DEMON1_LEAP = Object.freeze({ min: 3.6, max: 8.5, crouch: .16, v1: 11.5, v2: 8.7, second: .36, dash: .3, dashSpeed: 11, fall: -14, maxAir: 2.1, gravity: 18, strike: { r: 1.7, dmg: 14, arc: -.2 }, recover: .42, cd: 6.5, role: 'jump', from: .72, speed: 1.05 });
/** Escudo do Demônio1 e quando vale defender. */
export const DEMON1_SHIELD = Object.freeze({ react: .2, chanceVsCast: .55, chanceVsMelee: .3, minGap: 1.2, maxGap: 9 });

/** Pose de um golpe nativo no tempo t: fase e índice do próximo impacto. */
export function nativePhase(m, t) {
  const first = m.hits[0].t, last = m.hits[m.hits.length - 1].t;
  return t < first - .1 ? 'windup' : t <= last + .12 ? 'active' : 'recovery';
}
/** Acerto de garra: distância real até a borda do alvo, arco (arc<0 = qualquer direção), altura (golpe baixo só no chão). */
export function clawReaches(a, t, hit, reach) {
  const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz), fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
  const dot = d > 1e-4 ? (dx * fx + dz * fz) / d : 1, dy = (t.y || 0) - (a.y || 0);
  if (d - (t.radius || .45) > reach) return false;
  if (hit.arc > -1 && dot < hit.arc) return false;
  if (hit.low ? dy > .55 : Math.abs(dy) > 1.35) return false;
  return true;
}
