/**
 * Escolhe o lado mais livre para um plano de dois atores.
 * Combina corredor de câmera, colisão horizontal e visibilidade 3D dos atores
 * (a última detecta coberturas de barracas que avançam além da pegada no chão).
 */
export function chooseStoryTwoShotSide({
  a, b, preferredSide = 1, distance = 4, blockedAt, visibleAt,
  cameraHeight = 3.5, targetHeight = 1.45, samples = 14
} = {}) {
  if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.z) ||
      !Number.isFinite(b.x) || !Number.isFinite(b.z)) {
    throw new TypeError('story two-shot requires finite actor positions');
  }
  if (typeof blockedAt !== 'function') throw new TypeError('story two-shot requires a collision query');
  if (visibleAt != null && typeof visibleAt !== 'function') throw new TypeError('story two-shot visibility must be a function');
  const side = preferredSide < 0 ? -1 : 1;
  const count = Math.max(2, Math.floor(Number.isFinite(samples) ? samples : 14));
  const arm = Math.max(0, Number.isFinite(distance) ? distance : 4);
  const lift = Math.max(1.6, Number.isFinite(cameraHeight) ? cameraHeight : 3.5);
  const look = Math.max(.8, Number.isFinite(targetHeight) ? targetHeight : 1.45);
  const baseY = ((Number.isFinite(a.y) ? a.y : 0) + (Number.isFinite(b.y) ? b.y : 0)) * .5;
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
  const visibilityHeights = [0.45, 0.9, 1.35, 1.7];
  const measureActorVisibility = (camera, actor) => {
    if (typeof visibleAt !== 'function') return null;
    const base = Number.isFinite(actor.y) ? actor.y : baseY;
    const clearSamples = visibilityHeights.reduce((sum, height) =>
      sum + (visibleAt(camera, { x: actor.x, y: base + height, z: actor.z }) ? 1 : 0), 0);
    return { visible: clearSamples >= 3, clearSamples, totalSamples: visibilityHeights.length };
  };
  const score = candidateSide => {
    const dx = b.x - a.x, dz = b.z - a.z, span = Math.hypot(dx, dz);
    if (span < 0.001) {
      const camera = { x: a.x, y: baseY + lift, z: a.z };
      const target = { x: a.x, y: baseY + look, z: a.z };
      const actorA = { x: a.x, y: Number.isFinite(a.y) ? a.y : baseY, z: a.z };
      const actorB = { x: b.x, y: Number.isFinite(b.y) ? b.y : baseY, z: b.z };
      const measured = [measureActorVisibility(camera, actorA), measureActorVisibility(camera, actorB)];
      const visibleActors = measured.every(Boolean) ? measured.map(v => v.visible) : [true, true];
      return { side: candidateSide, clearSamples: count - 1, blockedSample: null,
        visibleActors, actorVisibilitySamples: measured.every(Boolean) ? measured.map(v => v.clearSamples) : null,
        visibilityClearSamples: measured.every(Boolean) ? measured.reduce((sum, v) => sum + v.clearSamples, 0) : visibleActors.filter(Boolean).length,
        camera, target, cameraHeight: lift, targetHeight: look };
    }
    const ux = dx / span, uz = dz / span, rx = uz, rz = -ux;
    const mx = (a.x + b.x) * .5, mz = (a.z + b.z) * .5;
    const tx = mx + ux * .5, tz = mz + uz * .5;
    const cx = mx + rx * candidateSide * arm + ux * .6;
    const cz = mz + rz * candidateSide * arm + uz * .6;
    const camera = { x: cx, y: baseY + lift, z: cz };
    const target = { x: tx, y: baseY + look, z: tz };
    const corridor = trace({ x: tx, z: tz }, { x: cx, z: cz });
    // Não testar os últimos 0,65 m: a amostra termina antes do collider do próprio ator.
    const toA = trace({ x: cx, z: cz }, a, .65);
    const toB = trace({ x: cx, z: cz }, b, .65);
    const actorA = { x: a.x, y: Number.isFinite(a.y) ? a.y : baseY, z: a.z };
    const actorB = { x: b.x, y: Number.isFinite(b.y) ? b.y : baseY, z: b.z };
    const measured = [measureActorVisibility(camera, actorA), measureActorVisibility(camera, actorB)];
    const visibleActors = measured.every(Boolean)
      ? measured.map(v => v.visible)
      : [toA.blockedSample === null, toB.blockedSample === null];
    return {
      side: candidateSide,
      clearSamples: corridor.clearSamples,
      blockedSample: corridor.blockedSample,
      visibleActors,
      actorVisibilitySamples: measured.every(Boolean) ? measured.map(v => v.clearSamples) : null,
      visibilityClearSamples: measured.every(Boolean)
        ? measured.reduce((sum, v) => sum + v.clearSamples, 0)
        : toA.clearSamples + toB.clearSamples,
      camera, target, cameraHeight: lift, targetHeight: look
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
