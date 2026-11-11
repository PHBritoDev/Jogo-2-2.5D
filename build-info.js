// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 315;
export const BUILD = 'mod315-cave-camera-no-procedural-torches';
export const DESCRIPTION = 'Mod 315: câmera da caverna corrigida e tochas exclusivamente 3D em Eldória';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
