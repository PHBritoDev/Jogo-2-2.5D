// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 340;
export const BUILD = 'mod340-crepusculo-a7';
export const DESCRIPTION = 'Mod 340: floresta, ondulações de VORGAZHEK e crepúsculo cinematográfico A7';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
