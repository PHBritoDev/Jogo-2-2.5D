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
