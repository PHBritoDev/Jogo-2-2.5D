/**
 * MOD 205 — Marco 3: o interior do "vulcão falso" do Ato II (roteiro: caveiras e ossos pelo chão, o laboratório com
 * mortos e acorrentados, a porta escondida da sala do ouro, a galeria dos cinco Enemy2 e a sala secreta com o trono,
 * duas estátuas e o mini-chefe; depois dele, o portal de VORGAZHEK). Só dados e colisão; o cenário é o tema "volcano".
 * Coordenadas locais (centro do laboratório em 0,0; chão em y = 0).
 */
export const VOLCANO = {
  // MOD 217 — entrada mais funda: túnel longo, a cela das correntes no meio (os primeiros sinais) e só então o laboratório.
  // MOD 326-B — chegada pelo pé do cone: túnel sinuoso que esquenta e escurece e o SALÃO DE MAGMA (lago de lava em cota
  // baixa, colunas de basalto, uma calçada de rocha com patamar no meio e respiradouros de lava que queimam quem pisar).
  approach: [{ from: { x: 0, z: 176 }, to: { x: -7, z: 156 }, r: 2.6 }, { from: { x: -7, z: 156 }, to: { x: 0, z: 134 }, r: 2.8 }],
  magma: { x: 0, z: 112, r: 22, lava: -2.6, causeway: { from: { x: 0, z: 134 }, to: { x: 0, z: 86 }, r: 2.4 }, landing: { x: 0, z: 112, r: 5.2 },
    vents: [{ x: 3.0, z: 110.3, r: 1.15, seed: 2.2 }, { x: -2.9, z: 114.2, r: .95, seed: 5.1 }] },
  tunnel: { from: { x: 0, z: 88 }, to: { x: 0, z: 10 }, r: 2.8 },
  cells: { x: 0, z: 50, r: 7.5 },
  victims: [{ x: -6.4, z: -3.4, pose: 'kneel', yaw: 1.2 }, { x: 6.2, z: -3.8, pose: 'kneel', yaw: -1.25 }, { x: -3.6, z: -7.2, pose: 'lie', yaw: .5 }, { x: 4.4, z: 5.4, pose: 'kneel', yaw: -2.4 }],
  lab: { x: 0, z: 0, r: 10 },
  goldPath: { from: { x: -9.6, z: 0 }, to: { x: -24, z: 0 }, r: 2.2 },
  door: { x: -22.4, z: 0 },
  gold: { x: -31, z: 0, r: 7 },
  deepPath: { from: { x: 0, z: -9.6 }, to: { x: 0, z: -35 }, r: 2.6 },
  hall: { x: 0, z: -46, r: 11 },
  thronePath: { from: { x: 0, z: -56 }, to: { x: 0, z: -68 }, r: 2.8 },
  throne: { x: 0, z: -82, r: 14 },
  seat: { x: 0, z: -93 },
  miniboss: { x: 0, z: -84 },
  portal: { x: 0, z: -90 },
  circle: { x: 0, z: -1 },
  labSpots: [{ x: -4, z: -5 }, { x: 4.5, z: -4 }, { x: 0, z: -7.4 }],
  hallSpots: [{ x: -6, z: -42 }, { x: 6, z: -42 }, { x: -7, z: -50 }, { x: 7, z: -50 }, { x: 0, z: -54 }],
  checkpoints: {
    entrance: { x: 0, z: 172, yaw: Math.PI }, // MOD 326-B: a entrada agora fica no começo do túnel de chegada
    lab: { x: 0, z: 9, yaw: Math.PI },
    hall: { x: 0, z: -34, yaw: Math.PI },
    throne: { x: 0, z: -68, yaw: Math.PI }
  }
};

function distToSegment(x, z, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / l2));
  return Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
}

/** Chão firme? A porta da sala do ouro fecha a passagem até ser aberta com a chave. */
export function volcanoWalkable(x, z, opts = {}) {
  const v = VOLCANO;
  if (!opts.doorOpen && x < v.door.x + .9) return false;
  for (const s of [...v.approach, v.magma.causeway, v.tunnel, v.goldPath, v.deepPath, v.thronePath]) if (distToSegment(x, z, s.from, s.to) < s.r) return true;
  if (Math.hypot(x - v.magma.landing.x, z - v.magma.landing.z) < v.magma.landing.r - .4) return true;
  for (const room of [v.lab, v.cells, v.gold, v.hall, v.throne]) if (Math.hypot(x - room.x, z - room.z) < room.r - .6) return true;
  return false;
}

/** Ponto de volta conforme a sub-etapa dentro do vulcão. */
export function volcanoCheckpoint(sub) {
  const c = VOLCANO.checkpoints;
  if (sub >= 4) return c.throne;
  if (sub >= 3) return c.hall;
  if (sub >= 1) return c.lab;
  return c.entrance;
}
