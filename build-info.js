// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 299;
export const BUILD = 'mod299-eldoria-ponte-canopy';
export const DESCRIPTION = 'Mod 299: Eldória — corredor da ponte liberado e sombra das ancestrais otimizada';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
