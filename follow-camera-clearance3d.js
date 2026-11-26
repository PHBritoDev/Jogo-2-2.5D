const SHOULDER_ANGLES = Object.freeze([0.24, -0.24, 0.42, -0.42, 0.60, -0.60, 0.78, -0.78]);

/**
 * Procura um braço de câmera lateral que realmente libere o pilar do abrigo.
 * blockedAt(x,y,z) devolve o primeiro sólido naquele ponto; a varredura direta
 * continua até o fim para detectar um pilar mesmo quando uma árvore vem antes.
 */
export function chooseShelterCameraShoulder({
  target,
  offset,
  blockedAt,
  previous = 0,
  samples = 24,
  minGain = 0.45,
  minClearance,
} = {}) {
  if (!target || !offset || typeof blockedAt !== 'function') {
    throw new TypeError('target, offset e blockedAt são obrigatórios');
  }
  if (![target.x, target.y, target.z, offset.x, offset.y, offset.z].every(Number.isFinite)) {
    throw new TypeError('target e offset precisam conter coordenadas finitas');
  }

  const distance = Math.hypot(offset.x, offset.y, offset.z);
  if (distance < 0.25) return { angle: 0, direct: null, chosen: null, triggered: false, requiredClearance: 0 };
  const count = Math.max(4, Math.min(64, Math.floor(Number.isFinite(samples) ? samples : 24)));
  const requiredGain = Math.max(0, Number.isFinite(minGain) ? minGain : 0.45);
  const requiredClearance = Number.isFinite(minClearance)
    ? Math.max(0, Math.min(distance, minClearance))
    : Math.min(distance, Math.max(3.2, distance * 0.65));

  const trace = (angle, scanForPillar = false) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const ox = offset.x * c + offset.z * s;
    const oz = -offset.x * s + offset.z * c;
    let firstBlocker = null, triggerBlocker = null, clearance = distance;
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const blocker = blockedAt(target.x + ox * t, target.y + offset.y * t, target.z + oz * t);
      if (!blocker) continue;
      if (!firstBlocker) {
        firstBlocker = blocker;
        clearance = (i - 1) / count * distance;
      }
      if (blocker.name === 'abrigo-pilar' && !triggerBlocker) triggerBlocker = blocker;
      if (!scanForPillar) break;
    }
    return { angle, clearance, blocker: firstBlocker, triggerBlocker };
  };

  const direct = trace(0, true);
  if (!direct.triggerBlocker) {
    return { angle: 0, direct, chosen: direct, triggered: false, requiredClearance };
  }

  const candidates = SHOULDER_ANGLES.map(angle => trace(angle));
  let best = candidates[0];
  for (const candidate of candidates.slice(1)) {
    if (candidate.clearance > best.clearance + 1e-6) best = candidate;
  }

  // Histerese: mantém o ângulo anterior apenas se ele continuar acima do
  // clearance mínimo e praticamente tão livre quanto o melhor candidato.
  if (Number.isFinite(previous) && Math.abs(previous) > 0.02) {
    const sameSide = candidates
      .filter(candidate => Math.sign(candidate.angle) === Math.sign(previous))
      .sort((a, b) => Math.abs(a.angle - previous) - Math.abs(b.angle - previous))[0];
    if (sameSide && sameSide.clearance >= best.clearance - 0.25 &&
        sameSide.clearance >= requiredClearance) best = sameSide;
  }

  if (best.clearance - direct.clearance < requiredGain || best.clearance < requiredClearance) {
    return { angle: 0, direct, chosen: direct, triggered: true, requiredClearance };
  }
  return { angle: best.angle, direct, chosen: best, triggered: true, requiredClearance };
}
