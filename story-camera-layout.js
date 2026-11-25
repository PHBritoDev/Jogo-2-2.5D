/**
 * Escolhe o lado mais livre para um plano de dois atores.
 * Além do corredor da câmera, verifica a linha de visão até cada ator para
 * evitar que uma barraca fique entre a lente e o vendedor.
 */
export function chooseStoryTwoShotSide({ a, b, preferredSide = 1, distance = 4, blockedAt, samples = 14 } = {}) {
  if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.z) ||
      !Number.isFinite(b.x) || !Number.isFinite(b.z)) {
    throw new TypeError('story two-shot requires finite actor positions');
  }
  if (typeof blockedAt !== 'function') throw new TypeError('story two-shot requires a collision query');
  const side = preferredSide < 0 ? -1 : 1;
  const count = Math.max(2, Math.floor(Number.isFinite(samples) ? samples : 14));
  const arm = Math.max(0, Number.isFinite(distance) ? distance : 4);
  const trace = (from, to, skipEnd = 0) => {
    const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
    if (length < 0.001) return { clearSamples: 0, blockedSample: null };
    const end = skipEnd > 0
      ? Math.max(2, Math.floor(count * (1 - Math.min(.3, skipEnd / length))))
      : count;
    let clearSamples = 0, blockedSample = null;
    for (let i = 2; i <= end; i++) {
      const f = i / count;
      if (blockedAt(from.x + dx * f, from.z + dz * f)) { blockedSample = i; break; }
      clearSamples++;
    }
    return { clearSamples, blockedSample };
  };
  const score = candidateSide => {
    const dx = b.x - a.x, dz = b.z - a.z, span = Math.hypot(dx, dz);
    if (span < 0.001) {
      return { side: candidateSide, clearSamples: count - 1, blockedSample: null,
        visibleActors: [true, true], visibilityClearSamples: 0 };
    }
    const ux = dx / span, uz = dz / span, rx = uz, rz = -ux;
    const mx = (a.x + b.x) * .5, mz = (a.z + b.z) * .5;
    const tx = mx + ux * .5, tz = mz + uz * .5;
    const cx = mx + rx * candidateSide * arm + ux * .6;
    const cz = mz + rz * candidateSide * arm + uz * .6;
    const corridor = trace({ x: tx, z: tz }, { x: cx, z: cz });
    // Não testar os últimos 0,65 m: a amostra termina antes do collider do próprio ator.
    const toA = trace({ x: cx, z: cz }, a, .65);
    const toB = trace({ x: cx, z: cz }, b, .65);
    const visibleActors = [toA.blockedSample === null, toB.blockedSample === null];
    return {
      side: candidateSide,
      clearSamples: corridor.clearSamples,
      blockedSample: corridor.blockedSample,
      visibleActors,
      visibilityClearSamples: toA.clearSamples + toB.clearSamples,
      camera: { x: cx, z: cz },
      target: { x: tx, z: tz }
    };
  };
  const isClear = candidate => candidate.blockedSample === null && candidate.visibleActors.every(Boolean);
  const preferred = score(side);
  if (isClear(preferred)) return preferred;
  const alternate = score(-side);
  if (isClear(alternate)) return alternate;
  const rank = candidate => candidate.visibleActors.filter(Boolean).length * (count * 2 + 1) +
    candidate.clearSamples + candidate.visibilityClearSamples;
  return rank(alternate) > rank(preferred) ? alternate : preferred;
}
