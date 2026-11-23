// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 351;
export const BUILD = 'mod351-cinzaria-tres-biomas';
export const DESCRIPTION = 'Mod 351: Santuário, Bosque e Abismo do vulcão de Cinzária';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
