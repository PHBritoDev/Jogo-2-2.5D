/**
 * MOD 208 — Marco 6: o Coliseu da Ascensão (Ato V; docs/roteiro/M6-ATO5.md). Só dados e colisão.
 * Fica a leste da torre de VÉRAXION, num vale novo ligado à serra por uma passagem longa (viagem de verdade).
 * O modelo (Coliseu.glb, Blender) tem a arena no centro (raio 16), o muro do pódio (16–18), a arquibancada (18–33)
 * e a muralha (33–36); o portão aberto fica virado para oeste (de onde se chega).
 */
export const COLOSSEUM_REGION = { cx: 150, cz: -215, hx: 50, hz: 46, tint: [[.33, .22, .18], [.42, .28, .22]], tintStrength: .75 };
export const COLOSSEUM_PASS = [[8, -242], [36, -238], [64, -230], [92, -222], [106, -218]];
export const COLOSSEUM = {
  center: { x: 150, z: -215 }, yaw: Math.PI / 2, arena: 16, podium: 18, seatOut: 33, wall: 36,
  gate: { x: 108, z: -215 }, gateInner: { x: 133.5, z: -215 }, spawn: { x: 140, z: -215 },
  foe: { x: 156, z: -215 }, waiting: [{ x: 160, z: -221 }, { x: 160, z: -209 }, { x: 163, z: -215 }],
  exit: { x: 104, z: -215 }, judge: { x: 150, z: -248 }
};
/** Pontos de colisão (círculos) do muro do pódio e da muralha, com a passagem do portão oeste livre. */
export function colosseumColliders() {
  const C = COLOSSEUM, out = [], gateAngle = Math.PI; // oeste
  const free = a => Math.abs(((a - gateAngle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) < .19;
  for (let i = 0; i < 56; i++) { const a = i / 56 * Math.PI * 2; if (free(a)) continue; out.push({ x: C.center.x + Math.cos(a) * 17, z: C.center.z + Math.sin(a) * 17, r: 1.3 }); }
  for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2; if (free(a)) continue; out.push({ x: C.center.x + Math.cos(a) * 34.5, z: C.center.z + Math.sin(a) * 34.5, r: 1.7 }); }
  // Paredes do corredor do portão (arquibancada cortada dos dois lados).
  for (let r = 18; r <= 36; r += 1.6) for (const s of [-1, 1]) out.push({ x: C.center.x - r, z: C.center.z + s * 3.6, r: 1 });
  return out;
}
/** Dentro da arena (onde os rounds acontecem)? */
export function inArena(x, z) { return Math.hypot(x - COLOSSEUM.center.x, z - COLOSSEUM.center.z) < COLOSSEUM.arena - .5; }
