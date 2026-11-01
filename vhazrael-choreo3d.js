/**
 * MOD 249 — coreografia compartilhada da Ruptura do Trono do VHAZRAEL (pose do corpo/espada no runtime e o arco do corte
 * no VFX usam a MESMA curva, então o pilar, o rastro do golpe e a lâmina nunca se descolam).
 */
const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
/* MOD 249 — coreografia da Ruptura do Trono (VHAZRAEL) por quadros-chave no espaço do bispo [frente, cima, direita]:
   braço direito (superior, antebraço), braço esquerdo, direção da LÂMINA e inclinação do peito (+ = para a frente).
   Pés e quadril ficam no Idle: só braços, peito e espada se movem, então o corpo não gira, não deita e não flutua. */
const LOW = [[.45, -.75, .35], [.65, -.6, .05], [.45, -.75, -.35], [.6, -.62, -.08], [.3, -.95, .12], 0];
const UP = [[.1, .96, .26], [.06, .98, -.22], [.1, .96, -.26], [.06, .98, .22], [.03, 1, 0], -.1];
const THRONE_KEYS = [
  [0, ...LOW],
  [.8, [.42, .55, .4], [.25, .92, -.2], [.42, .55, -.4], [.25, .92, .2], [.25, .97, 0], -.04], // a espada sobe pela frente
  [1.65, ...UP],
  [4.45, [.08, .97, .24], [.04, .99, -.2], [.08, .97, -.24], [.04, .99, .2], [.02, 1, 0], -.14], // carga: firme, um pouco para trás
  [4.76, [-.2, .95, .26], [-.32, .92, -.18], [-.2, .95, -.26], [-.32, .92, .18], [-.5, .87, 0], -.2], // preparo: lâmina para trás
  [5.15, [1, .2, .24], [1, -.02, -.16], [1, .2, -.24], [1, -.02, .16], [1, -.06, 0], .16], // CORTE
  [5.62, [.85, -.38, .24], [.8, -.58, -.12], [.85, -.38, -.24], [.8, -.58, .12], [.72, -.69, 0], .18], // follow-through baixo
  [8.1, [.85, -.4, .24], [.8, -.6, -.12], [.85, -.4, -.24], [.8, -.6, .12], [.72, -.69, 0], .14],
  [9.0, ...LOW]
];
export const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** Pose da Ruptura no instante age (s): { rua, rla, lua, lla, blade, lean }. O golpe (preparo → corte) acelera; o resto é suave. */
export function thronePose(age) {
  const K = THRONE_KEYS; let i = 0; while (i < K.length - 2 && age >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], u = Math.max(0, Math.min(1, (age - a[0]) / (b[0] - a[0]))), k = b[0] === 5.15 ? u * u * u : sm(u);
  return { rua: mix3(a[1], b[1], k), rla: mix3(a[2], b[2], k), lua: mix3(a[3], b[3], k), lla: mix3(a[4], b[4], k), blade: mix3(a[5], b[5], k), lean: a[6] + (b[6] - a[6]) * k };
}
