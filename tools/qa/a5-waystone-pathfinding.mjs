/**
 * A5 QA — verifica se uma reta pode ser seguida pelo controlador real.
 * updatePlayerMovement testa primeiro (nextX, currentZ) e depois
 * (acceptedX, nextZ). Testar apenas pontos diagonais pode aprovar um
 * atalho que o joystick não consegue percorrer junto a um obstáculo.
 */
export function isAxisSeparatedSegmentClear(a, b, blocked, maxStep = 0.12) {
  if (!a || !b || typeof blocked !== 'function' ||
      !Number.isFinite(a.x) || !Number.isFinite(a.z) ||
      !Number.isFinite(b.x) || !Number.isFinite(b.z) ||
      !Number.isFinite(maxStep) || maxStep <= 0) return false;

  const dx = b.x - a.x, dz = b.z - a.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 1e-9) return true;

  const count = Math.max(1, Math.ceil(distance / maxStep));
  let previousX = a.x, previousZ = a.z;
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    const nextX = a.x + dx * t;
    const nextZ = a.z + dz * t;

    // Espelha a ordem de colisão do jogo: deslocamento X, depois Z.
    if (Math.abs(nextX - previousX) > 1e-6 && blocked(nextX, previousZ)) return false;
    if (Math.abs(nextZ - previousZ) > 1e-6 && blocked(nextX, nextZ)) return false;

    previousX = nextX;
    previousZ = nextZ;
  }
  return true;
}

/**
 * Classifica oito entradas radiais do abrigo usando a altura real do terreno e
 * a cota do primeiro anel caminhável. O teste ainda precisa confirmar o lado
 * escolhido com o joystick e a superfície de apoio do jogador.
 */
export function rankShelterApproaches({
  center, radius, deckY, sample, stepUp = 0.55, angles = 8,
  outerOffset = 0.55, innerOffset = 0.12, sampleStep = 0.15,
  walkLimit = -5.5
} = {}) {
  if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.z) ||
      !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(deckY) ||
      typeof sample !== 'function' || !Number.isFinite(stepUp) || stepUp < 0 ||
      !Number.isSafeInteger(angles) || angles < 4 || angles > 32 ||
      !Number.isFinite(outerOffset) || outerOffset < 0 ||
      !Number.isFinite(innerOffset) || innerOffset < 0 ||
      !Number.isFinite(sampleStep) || sampleStep <= 0 ||
      !Number.isFinite(walkLimit)) return [];

  const offsets = [];
  for (let d = outerOffset; d > -innerOffset + 1e-9; d -= sampleStep) offsets.push(d);
  offsets.push(-innerOffset);

  return Array.from({ length: angles }, (_, index) => {
    const angle = index * Math.PI * 2 / angles;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const points = offsets.map(offset => {
      const x = center.x + dx * (radius + offset);
      const z = center.z + dz * (radius + offset);
      let raw;
      try { raw = sample({ x, z, radius: radius + offset, angle, index }); }
      catch (_) { raw = null; }
      const height = typeof raw === 'number' ? raw : raw?.height;
      const edge = typeof raw === 'object' && raw ? raw.edge : NaN;
      const water = typeof raw === 'object' && raw
        ? raw.water === true || (typeof raw.water === 'number' && raw.water > 0)
        : false;
      return {
        radius: +(radius + offset).toFixed(3),
        x: +x.toFixed(3), z: +z.toFixed(3),
        height: Number.isFinite(height) ? +height.toFixed(3) : null,
        edge: Number.isFinite(edge) ? +edge.toFixed(3) : null,
        water
      };
    });
    const finite = points.every(point => Number.isFinite(point.height) && Number.isFinite(point.edge));
    const wet = points.some(point => point.water);
    const outside = points.some(point => !Number.isFinite(point.edge) || point.edge >= walkLimit);
    const groundY = finite ? points[points.length - 1].height : null;
    const maxApproachGroundY = finite ? Math.max(...points.map(point => point.height)) : null;
    const rise = finite ? deckY - groundY : null;
    const ok = finite && !wet && !outside && rise <= stepUp + 1e-6;
    const reason = !finite ? 'non-finite-sample'
      : wet ? 'water'
      : outside ? 'outside-walkable-area'
      : rise > stepUp + 1e-6 ? 'step-exceeds-limit'
      : null;
    return {
      index, angle: +angle.toFixed(6),
      staging: {
        x: +(center.x + dx * (radius + outerOffset)).toFixed(3),
        z: +(center.z + dz * (radius + outerOffset)).toFixed(3)
      },
      entry: {
        x: +(center.x + dx * (radius - innerOffset)).toFixed(3),
        z: +(center.z + dz * (radius - innerOffset)).toFixed(3)
      },
      deckY: +deckY.toFixed(3), groundY: groundY === null ? null : +groundY.toFixed(3),
      maxApproachGroundY: maxApproachGroundY === null ? null : +maxApproachGroundY.toFixed(3),
      rise: rise === null ? null : +rise.toFixed(3), stepUp, ok, reason, samples: points
    };
  });
}
