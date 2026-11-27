export const SHELTER_CAMERA_PREFERRED_DISTANCE = 4.0;

const SHOULDER_ANGLES = Object.freeze([0.24, -0.24, 0.42, -0.42, 0.60, -0.60, 0.78, -0.78]);

/** Busca um braço lateral livre e, quando informado, uma linha de visão limpa do herói. */
export function chooseShelterCameraShoulder({
  target, offset, blockedAt, visibleAt, previous = 0, samples = 24, minGain = 0.45, minClearance,
} = {}) {
  if (!target || !offset || typeof blockedAt !== 'function') throw new TypeError('target, offset e blockedAt são obrigatórios');
  if (![target.x, target.y, target.z, offset.x, offset.y, offset.z].every(Number.isFinite)) {
    throw new TypeError('target e offset precisam conter coordenadas finitas');
  }
  const distance = Math.hypot(offset.x, offset.y, offset.z);
  if (distance < 0.25) return { angle: 0, direct: null, chosen: null, triggered: false, requiredClearance: 0, visibilityFailed: false };
  const count = Math.max(4, Math.min(64, Math.floor(Number.isFinite(samples) ? samples : 24)));
  const requiredGain = Math.max(0, Number.isFinite(minGain) ? minGain : 0.45);
  const requiredClearance = Number.isFinite(minClearance)
    ? Math.max(0, Math.min(distance, minClearance))
    : Math.min(distance, Math.max(3.2, distance * 0.65));
  const trace = (angle, scanForPillar = false) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const ox = offset.x * c + offset.z * s, oz = -offset.x * s + offset.z * c;
    let firstBlocker = null, triggerBlocker = null, clearance = distance;
    for (let i = 1; i <= count; i++) {
      const t = i / count, blocker = blockedAt(target.x + ox * t, target.y + offset.y * t, target.z + oz * t);
      if (!blocker) continue;
      if (!firstBlocker) { firstBlocker = blocker; clearance = (i - 1) / count * distance; }
      if (blocker.name === 'abrigo-pilar' && !triggerBlocker) triggerBlocker = blocker;
      if (!scanForPillar) break;
    }
    return { angle, clearance, blocker: firstBlocker, triggerBlocker,
      camera: { x: target.x + ox, y: target.y + offset.y, z: target.z + oz } };
  };
  const direct = trace(0, true);
  if (!direct.triggerBlocker) return { angle: 0, direct, chosen: direct, triggered: false, requiredClearance, visibilityFailed: false };
  const eligible = SHOULDER_ANGLES.map(angle => trace(angle))
    .filter(c => c.clearance - direct.clearance >= requiredGain && c.clearance >= requiredClearance)
    .sort((a, b) => b.clearance - a.clearance);
  const canSeeHero = candidate => {
    if (typeof candidate.visible === 'boolean') return candidate.visible;
    candidate.visible = typeof visibleAt !== 'function' || visibleAt(candidate.camera, candidate) !== false;
    return candidate.visible;
  };
  let best = null;
  // Histerese só preserva o lado anterior se ele continuar livre e visível.
  if (Number.isFinite(previous) && Math.abs(previous) > 0.02 && eligible.length) {
    const sameSide = eligible.filter(c => Math.sign(c.angle) === Math.sign(previous))
      .sort((a, b) => Math.abs(a.angle - previous) - Math.abs(b.angle - previous))[0];
    if (sameSide && sameSide.clearance >= eligible[0].clearance - 0.25 && canSeeHero(sameSide)) best = sameSide;
  }
  if (!best) for (const candidate of eligible) { if (canSeeHero(candidate)) { best = candidate; break; } }
  if (!best) return { angle: 0, direct, chosen: direct, triggered: true, requiredClearance,
    visibilityFailed: typeof visibleAt === 'function' };
  return { angle: best.angle, direct, chosen: best, triggered: true, requiredClearance, visibilityFailed: false };
}
