const SHOULDER_ANGLES = Object.freeze([0.24, -0.24]);

/**
 * Escolhe um pequeno desvio lateral somente quando o raio atual da câmera é
 * bloqueado por um pilar real de abrigo. Outros sólidos continuam sob o
 * tratamento normal do controlador de câmera.
 *
 * \`blockedAt(x, y, z)\` recebe um ponto do raio e devolve o collider atingido
 * (ou null). O offset é o vetor câmera-alvo antes do desvio.
 */
export function chooseShelterCameraShoulder({
  target,
  offset,
  blockedAt,
  previous = 0,
  samples = 16,
  minGain = 0.45,
} = {}) {
  if (!target || !offset || typeof blockedAt !== 'function') {
    throw new TypeError('target, offset e blockedAt são obrigatórios');
  }
  if (![target.x, target.y, target.z, offset.x, offset.y, offset.z].every(Number.isFinite)) {
    throw new TypeError('target e offset precisam conter coordenadas finitas');
  }

  const distance = Math.hypot(offset.x, offset.y, offset.z);
  if (distance < 0.25) return { angle: 0, direct: null, chosen: null };
  const count = Math.max(4, Math.min(64, Math.floor(Number.isFinite(samples) ? samples : 16)));
  const requiredGain = Math.max(0, Number.isFinite(minGain) ? minGain : 0.45);

  const trace = angle => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const ox = offset.x * c + offset.z * s;
    const oz = -offset.x * s + offset.z * c;
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const blocker = blockedAt(target.x + ox * t, target.y + offset.y * t, target.z + oz * t);
      if (blocker) return { angle, clearance: (i - 1) / count * distance, blocker };
    }
    return { angle, clearance: distance, blocker: null };
  };

  const direct = trace(0);
  if (direct.blocker?.name !== 'abrigo-pilar') return { angle: 0, direct, chosen: direct };

  const candidates = SHOULDER_ANGLES.map(trace);
  let best = candidates[0];
  for (const candidate of candidates.slice(1)) {
    if (candidate.clearance > best.clearance + 1e-6) best = candidate;
  }

  // Mantém o lado já escolhido quando a diferença de folga é irrelevante,
  // evitando oscilações se a amostragem alternar um ponto de colisão.
  if (Number.isFinite(previous) && Math.abs(previous) > 0.02) {
    const sameSide = candidates.find(candidate => Math.sign(candidate.angle) === Math.sign(previous));
    if (sameSide && sameSide.clearance >= best.clearance - 0.25) best = sameSide;
  }

  if (best.clearance - direct.clearance < requiredGain) {
    return { angle: 0, direct, chosen: direct };
  }
  return { angle: best.angle, direct, chosen: best };
}
