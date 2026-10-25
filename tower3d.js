/**
 * MOD 207 — Marco 5: a torre de VÉRAXION (Ato IV; docs/roteiro/M5-ATO4.md). Só dados e colisão.
 *  TOWER       onde a torre fica no mundo (a antiga Serra sem Ecos), a porta, a estrada e os pontos das cenas.
 *  TOWER_HALL  o interior de cada piso (área abaixo do mundo, tema "tower"): salão redondo com o portal no centro.
 */
export const TOWER = {
  base: { x: -36, z: -256 }, door: { x: -36, z: -244.4 }, radius: 11.8,
  bandits: [{ x: -9, z: -160 }, { x: -5, z: -163 }, { x: -12, z: -164 }],
  rivalMeet: { x: -22, z: -190 },
  rivalPath: [[-24, -198], [-29, -208], [-33, -220], [-35, -230]],
  view: { x: -35, z: -232 }
};
export const TOWER_HALL = {
  r: 13, spawn: { x: 0, z: 10, yaw: Math.PI }, center: { x: 0, z: -2 },
  foes: [{ x: -4, z: -4 }, { x: 4, z: -4 }, { x: -6, z: 0 }, { x: 6, z: 0 }],
  boss: { x: 0, z: -6 }, bath: { x: -6, z: -5 }, bed: { x: 6, z: -5 }, restSpot: { x: 0, z: -1 }
};
/** Chão do salão de um piso (o portal do centro não bloqueia). */
export function towerWalkable(x, z) { return Math.hypot(x, z) < TOWER_HALL.r - .8; }
/** Cor de cada piso (mais fria e mais escura à medida que sobe). */
export function floorTint(n) {
  const t = Math.max(0, Math.min(1, (n - 1) / 6));
  return [0.42 - t * .25, 0.4 - t * .22, 0.48 - t * .12];
}
