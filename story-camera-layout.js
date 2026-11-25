/**
 * Escolhe o lado mais livre para um plano de dois atores.
 * Usa a mesma amostragem 2D de storyCam (i=2..14), uma única vez ao iniciar a cena.
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
  const score = candidateSide => {
    const dx = b.x - a.x, dz = b.z - a.z, span = Math.hypot(dx, dz);
    if (span < 0.001) return { side: candidateSide, clearSamples: count - 1, blockedSample: null };
    const ux = dx / span, uz = dz / span, rx = uz, rz = -ux;
    const mx = (a.x + b.x) * .5, mz = (a.z + b.z) * .5;
    const tx = mx + ux * .5, tz = mz + uz * .5;
    const cx = mx + rx * candidateSide * arm + ux * .6;
    const cz = mz + rz * candidateSide * arm + uz * .6;
    const vx = cx - tx, vz = cz - tz;
    let clearSamples = 0, blockedSample = null;
    for (let i = 2; i <= count; i++) {
      const f = i / count;
      if (blockedAt(tx + vx * f, tz + vz * f)) { blockedSample = i; break; }
      clearSamples++;
    }
    return { side: candidateSide, clearSamples, blockedSample, camera: { x: cx, z: cz }, target: { x: tx, z: tz } };
  };
  const preferred = score(side);
  if (preferred.blockedSample === null) return preferred;
  const alternate = score(-side);
  if (alternate.blockedSample === null) return alternate;
  return alternate.clearSamples > preferred.clearSamples ? alternate : preferred;
}
