/**
 * MOD 205 — Marco 3: o interior do "vulcão falso" do Ato II (roteiro: caveiras e ossos pelo chão, o laboratório com
 * mortos e acorrentados, a porta escondida da sala do ouro, a galeria dos cinco Enemy2 e a sala secreta com o trono,
 * duas estátuas e o mini-chefe; depois dele, o portal de VORGAZHEK). Só dados e colisão; o cenário é o tema "volcano".
 * Coordenadas locais (centro do laboratório em 0,0; chão em y = 0).
 */
export const VOLCANO = {
  tunnel: { from: { x: 0, z: 44 }, to: { x: 0, z: 10 }, r: 2.8 },
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
    entrance: { x: 0, z: 40, yaw: Math.PI },
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
  for (const s of [v.tunnel, v.goldPath, v.deepPath, v.thronePath]) if (distToSegment(x, z, s.from, s.to) < s.r) return true;
  for (const room of [v.lab, v.gold, v.hall, v.throne]) if (Math.hypot(x - room.x, z - room.z) < room.r - .6) return true;
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
