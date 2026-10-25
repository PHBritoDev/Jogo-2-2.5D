/**
 * MOD 209 — Marco 7: o deserto ritual do Ato VI (docs/roteiro/M7-ATO6.md). Só dados e colisão.
 * Fica entre o coliseu e a cidade de neve ("não muito longe daqui"), ligado ao coliseu por uma passagem ao norte.
 * A estátua gigante (DesertoKit.glb) segura a esfera com os quatro encaixes dos fragmentos espaciais.
 */
export const DESERT_REGION = { cx: 152, cz: -124, hx: 44, hz: 22, tint: [[.76, .62, .42], [.86, .72, .5]], tintStrength: .95 };
export const DESERT_PASS = [[106, -200], [106, -182], [112, -164], [120, -150]];
export const DESERT = {
  statue: { x: 152, z: -128, yaw: Math.PI, r: 14.5 },
  offer: { x: 152, z: -144.5 },           // onde o herói fica para colocar os fragmentos (de frente para a esfera)
  orb: { x: 152, y: 20.8, z: -134.8 },    // a esfera, no mundo (altura relativa ao chão)
  mystery: { x: 186, z: -112 },           // o portal misterioso
  angels: { x: 120, z: -112, yaw: Math.PI / 2 }, // o portal dos anjos (fim do ato)
  sandraStop: { x: 146, z: -148 },
  dunes: 34, rocks: 10, cacti: 14, bones: 4
};
export function inDesert(x, z) { return Math.abs(x - DESERT_REGION.cx) < DESERT_REGION.hx && Math.abs(z - DESERT_REGION.cz) < DESERT_REGION.hz; }
/** Quantos fragmentos espaciais o herói carrega em cada ponto do Ato VI. */
export function fragmentsHeld(step, sub) {
  if (step < 27) return 4;
  if (step === 27) return sub <= 1 ? 4 : 0;
  if (step === 28) return Math.max(0, Math.min(4, sub));
  if (step === 29) return sub === 0 ? 4 : 0;
  return 0;
}
