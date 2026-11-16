// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 323;
export const BUILD = 'mod323-jornada-arte-fisica-cinzaria-2e6f2eb';
export const DESCRIPTION = 'Mod 323: reconstrução da jornada, vale e cachoeiras, aurora no céu, ponte, vulcão, Cinzária e moradores Meshy';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
