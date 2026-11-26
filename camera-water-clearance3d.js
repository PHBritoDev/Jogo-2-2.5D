/** Water depth is the positive height of the water sheet above the terrain. */
export function cameraAboveWaterSurfaceY(cameraY, groundY, waterDepth, clearance = 0.4) {
  if (!Number.isFinite(cameraY) || !Number.isFinite(groundY) ||
      !Number.isFinite(waterDepth) || waterDepth <= 0.05 || waterDepth > 5) return cameraY;
  const margin = Number.isFinite(clearance) ? Math.max(0, Math.min(1, clearance)) : 0.4;
  const surfaceY = groundY + waterDepth;
  if (!Number.isFinite(surfaceY)) return cameraY;
  return Math.max(cameraY, surfaceY + margin);
}
