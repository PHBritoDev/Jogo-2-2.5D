/**
 * MOD 204 — Marco 2: o esgoto do Ato I (roteiro: túnel com água pingando e rastros de sangue, a sala dos
 * cinco Seguidores, o buraco, a cela mais abaixo, dois caminhos e o "lugar estranho" com o portal de Valério).
 * Só dados e geometria plana: o mundo monta o cenário (dimension-arenas3d.js, tema "sewer") e usa walkable()
 * para colisão. Coordenadas locais, com o centro da sala dos Seguidores em (0, 0) e o chão em y = 0.
 */
export const SEWER = {
  tunnel: { from: { x: 0, z: 46 }, to: { x: 0, z: 9 }, r: 2.6 },
  feeding: { x: 0, z: 0, r: 9 },
  hole: { x: 0, z: -6.4, r: 1.7 },
  cell: { x: 40, z: -24, r: 9.5 },
  cage: { x: 40, z: -24 },
  hordePath: { from: { x: 49, z: -24 }, to: { x: 66, z: -24 }, r: 2.4 },
  emptyPath: { from: { x: 40, z: -33 }, to: { x: 40, z: -60 }, r: 2.3 },
  strange: { x: 40, z: -75, r: 15 },
  portal: { x: 40, z: -87 },
  warden: { x: 40, z: -79 },
  feedingSpots: [{ x: -2.6, z: -1.2 }, { x: 2.4, z: -1.8 }, { x: -1.2, z: 1.6 }, { x: 1.6, z: 1.4 }, { x: 0.2, z: -3.2 }],
  carcass: { x: 0, z: -0.6 },
  checkpoints: {
    entrance: { x: 0, z: 42, yaw: Math.PI },
    feeding: { x: 0, z: 11, yaw: Math.PI },
    cell: { x: 40, z: -22, yaw: Math.PI },
    path: { x: 40, z: -37, yaw: Math.PI },
    portal: { x: 40, z: -64, yaw: Math.PI }
  }
};

function distToSegment(x, z, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / l2));
  return Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
}

/** Pode pisar aqui? (túnel, salas e o caminho vazio; o buraco e o caminho da horda ficam de fora). */
export function sewerWalkable(x, z, opts = {}) {
  const s = SEWER;
  if (Math.hypot(x - s.hole.x, z - s.hole.z) < s.hole.r + .35) return false;
  if (distToSegment(x, z, s.tunnel.from, s.tunnel.to) < s.tunnel.r) return true;
  for (const room of [s.feeding, s.cell, s.strange]) if (Math.hypot(x - room.x, z - room.z) < room.r - .6) return true;
  if (distToSegment(x, z, s.emptyPath.from, s.emptyPath.to) < s.emptyPath.r) return true;
  if (opts.portalOpen && Math.hypot(x - s.portal.x, z - s.portal.z) < 3) return true;
  return false;
}

/** Ponto de volta (morte / reentrada) conforme a etapa do Ato I. */
export function sewerCheckpoint(questStep, act1Sub) {
  const c = SEWER.checkpoints;
  if (questStep >= 6) return c.portal;
  if (questStep === 5) return c.path;
  if (questStep === 4 && act1Sub >= 3) return c.feeding;
  if (questStep === 4 && act1Sub === 2) return c.entrance;
  return c.entrance;
}

/** Em que trecho do esgoto o jogador está (para câmera, luz e gatilhos). */
export function sewerZone(x, z) {
  const s = SEWER;
  if (Math.hypot(x - s.strange.x, z - s.strange.z) < s.strange.r + 2) return 'strange';
  if (distToSegment(x, z, s.emptyPath.from, s.emptyPath.to) < s.emptyPath.r + 1) return 'path';
  if (Math.hypot(x - s.cell.x, z - s.cell.z) < s.cell.r + 1) return 'cell';
  if (Math.hypot(x - s.feeding.x, z - s.feeding.z) < s.feeding.r + 1) return 'feeding';
  return 'tunnel';
}
