/**
 * MOD 206 — Marco 4: lugares do Ato III (roteiro original, docs/roteiro/M4-ATO3.md). Só dados e colisão.
 *  SNOW_CITY   a cidade de neve no vale leste (coordenadas do mundo): casas, estalagem, lago congelado, guilhotina,
 *              a entrada da caverna de gelo e o vendedor de casacos na estrada.
 *  INN         o interior da estalagem (área abaixo do mundo, tema "inn"): salão, quarto e porão.
 *  ICE_CAVE    a caverna de gelo (tema "icecave"): túnel sinuoso até o fundo; o portal aparece atrás.
 *  DISTORTED   a dimensão distorcida (tema "distorted"): os controles ficam invertidos.
 * Coordenadas das áreas internas são locais (somadas ao centro da dimensão no jogo).
 */
export const SNOW_CITY = {
  center: { x: 150, z: -40 }, radius: 46, name: 'Invernália',
  plaza: { x: 148, z: -40 },
  inn: { x: 160, z: -27, yaw: Math.PI, door: { x: 160, z: -31.6 } },
  guillotine: { x: 146, z: -47, yaw: 0 },
  lake: { x: 177, z: -15, r: 9 },
  fisher: { x: 173.5, z: -14, yaw: Math.PI / 2 },
  villager: { x: 141, z: -34 },
  seller: { x: 97, z: -31 },
  cave: { x: 186, z: -70, yaw: -Math.PI * .75 },
  houses: [
    { k: 'CasaNeve', x: 133, z: -26, yaw: .5 }, { k: 'CasaNeveB', x: 126, z: -41, yaw: Math.PI / 2 }, { k: 'CasaNeve', x: 129, z: -56, yaw: 2.4 },
    { k: 'CasaNeveB', x: 143, z: -64, yaw: Math.PI }, { k: 'CasaNeve', x: 175, z: -31, yaw: -1.8 }, { k: 'CasaNeveB', x: 146, z: -19, yaw: 0 },
    { k: 'CasaNeve', x: 186, z: -44, yaw: -Math.PI / 2 }
  ],
  lanterns: [{ x: 144, z: -35 }, { x: 154, z: -35 }, { x: 144, z: -46 }, { x: 156, z: -33 }, { x: 138, z: -40 }],
  pines: [[120, -14], [118, -30], [116, -62], [124, -72], [160, -74], [172, -66], [192, -24], [190, -8], [164, -8], [134, -10], [196, -54]],
  // Moradores de casaco (passeiam de dia; à noite entram em casa).
  folk: [{ x: 139, z: -30 }, { x: 152, z: -50 }, { x: 160, z: -40 }, { x: 136, z: -48 }, { x: 168, z: -24 }],
  // Ataque à cidade (depois do porão): 4 Enemy3 de uma vez.
  raid: [{ x: 147, z: -36 }, { x: 151, z: -36 }, { x: 145, z: -40 }, { x: 153, z: -41 }],
  // Caminho do Anjo da guilhotina até a caverna.
  anjoPath: [[148, -43], [156, -44], [163, -52], [170, -58], [179, -63], [183, -66.8]],
  // MOD 217 — a boca da caverna ficava fora da área andável (o vale arredondado terminava antes dela): esta área
  // estende o chão até a entrada, sem tirar a montanha de trás do arco.
  caveApproach: { cx: 177, cz: -61, hx: 12.5, hz: 12.5, round: 6, wobble: 1.5, tint: [[.80, .84, .9], [.93, .95, .98]], tintStrength: .92 }
};

/** Dentro da cidade de neve (o frio só afeta aqui). */
export function inSnowCity(x, z) { return Math.hypot(x - SNOW_CITY.center.x, z - SNOW_CITY.center.z) < SNOW_CITY.radius; }

/** Interior da estalagem: três cômodos separados (o jogo leva o herói de um ao outro com a tela escura). */
export const INN = {
  hall: { x: 0, z: 0, hx: 6, hz: 4.5 },
  room: { x: 0, z: -20, hx: 3, hz: 3 },
  cellar: { x: 0, z: -40, hx: 6, hz: 4.5 },
  counter: { x: 0, z: -1.2 }, keeper: { x: 0, z: -2.2 }, door: { x: 0, z: 4 }, stairsUp: { x: 5, z: -3.6 },
  bed: { x: 1.6, z: -21.6 }, cellarStairs: { x: -5.2, z: -43.5 }, chains: { x: 0, z: -44.2 },
  cellarFoes: [{ x: -2.5, z: -37.2 }, { x: 2.5, z: -37.2 }, { x: 0, z: -36.4 }], keeperCellar: { x: 1.2, z: -38.6 },
  spawn: { hall: { x: 0, z: 3, yaw: Math.PI }, room: { x: -1.5, z: -18.5, yaw: Math.PI }, cellar: { x: 0, z: -43.4, yaw: 0 } }
};
export function innWalkable(x, z) {
  for (const r of [INN.hall, INN.room, INN.cellar]) if (Math.abs(x - r.x) < r.hx - .5 && Math.abs(z - r.z) < r.hz - .5) {
    if (r === INN.hall && Math.abs(x - INN.counter.x) < 1.9 && Math.abs(z - INN.counter.z) < .7) return false;
    if (r === INN.room && Math.abs(x - INN.bed.x) < .75 && Math.abs(z - INN.bed.z) < 1.2) return false;
    return true;
  }
  return false;
}

/** Caverna de gelo: túnel sinuoso (pontos do eixo) e o salão do fundo. */
export const ICE_CAVE = {
  path: [{ x: 0, z: 40 }, { x: 4, z: 26 }, { x: -3, z: 12 }, { x: 3, z: -2 }, { x: -2, z: -16 }, { x: 0, z: -28 }],
  r: 3.6,
  end: { x: 0, z: -40, r: 11 },
  portal: { x: -1, z: -20 },
  spawn: { x: 0, z: 36, yaw: Math.PI },
  stop: { x: 0, z: -44 }
};
function distToSegment(x, z, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / l2));
  return Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
}
export function iceCaveWalkable(x, z) {
  const p = ICE_CAVE.path;
  for (let i = 0; i < p.length - 1; i++) if (distToSegment(x, z, p[i], p[i + 1]) < ICE_CAVE.r - .6) return true;
  return Math.hypot(x - ICE_CAVE.end.x, z - ICE_CAVE.end.z) < ICE_CAVE.end.r - .6;
}

/** Dimensão distorcida: uma plataforma larga; os controles ficam invertidos lá dentro. */
export const DISTORTED = {
  floor: { x: 0, z: 0, r: 22 },
  spawn: { x: 0, z: 16, yaw: Math.PI },
  foes: [{ x: -5, z: -4 }, { x: 5, z: -4 }],
  miniboss: { x: 0, z: -8 },
  portal: { x: 0, z: -18 }
};
export function distortedWalkable(x, z) { return Math.hypot(x - DISTORTED.floor.x, z - DISTORTED.floor.z) < DISTORTED.floor.r - .8; }

/** Controles invertidos: frente vira trás e esquerda vira direita (roteiro). */
export function invertAxes(ax, az, on) { return on ? { x: -ax, z: -az } : { x: ax, z: az }; }

/** Frio da cidade de neve sem casaco (roteiro: −15% agilidade, −10% recuperação de mana, 0,1 de dano por segundo). */
export const COLD = { speed: .85, mana: .9, dps: .1 };
/** Casaco equipado (roteiro: +10% recuperação de mana, +15 de vida, proteção contra o frio). */
export const COAT = { price: 25, hp: 15, mana: 1.1 };
export function climate(inCity, coatOn) {
  if (coatOn) return { cold: false, speed: 1, mana: COAT.mana, dps: 0 };
  if (inCity) return { cold: true, speed: COLD.speed, mana: COLD.mana, dps: COLD.dps };
  return { cold: false, speed: 1, mana: 1, dps: 0 };
}
