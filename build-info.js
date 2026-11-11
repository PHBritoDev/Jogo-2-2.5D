// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 316;
export const BUILD = 'mod316-tochas-3d-unicas-camera-caverna';
export const DESCRIPTION = 'Mod 316: Eldória só com tochas GLB originais, sem postes procedurais; câmera e altura real na caverna';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
