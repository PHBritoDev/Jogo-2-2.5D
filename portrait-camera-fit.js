/** Enquadramento horizontal do duelo retrato: mantém o ator próximo dentro de uma margem segura. */
const MAX_PORTRAIT_BIAS = .42;
const SAFE_ACTOR_NDC = .72;
const RELEASE_START = 22;
const RELEASE_END = 28;

function smoothstep01(value) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

export function computePortraitCameraFit(separation, aspect, fov = 56) {
  const sep = Number.isFinite(separation) ? Math.max(0, separation) : 0;
  const ratio = Number.isFinite(aspect) ? Math.max(.1, aspect) : .375;
  const verticalFov = Number.isFinite(fov) ? Math.min(100, Math.max(20, fov)) : 56;
  const minDistance = Math.min(15, Math.max(10.8, 10.8 + Math.max(0, sep - 6) * .3));
  const half = sep * .5;
  const tanHalfHorizontal = Math.max(.01, Math.tan(verticalFov * Math.PI / 360) * ratio);
  let low = 0, high = MAX_PORTRAIT_BIAS;
  for (let i = 0; i < 12; i++) {
    const bias = (low + high) * .5;
    const nearDepth = minDistance - half * Math.cos(bias);
    const nearNdc = nearDepth > 0 ? half * Math.sin(bias) / (nearDepth * tanHalfHorizontal) : Infinity;
    if (nearNdc <= SAFE_ACTOR_NDC) low = bias;
    else high = bias;
  }
  const release = 1 - smoothstep01((sep - RELEASE_START) / (RELEASE_END - RELEASE_START));
  return {
    minDistance,
    parallaxBias: low * release,
    release,
    shoulder: .42 - .34 * release,
    focusBlend: .5 * release,
    idleMs: 1200 - 750 * release,
    deadZone: .35 - .31 * release,
    turnRate: 2 + 1.2 * release
  };
}
