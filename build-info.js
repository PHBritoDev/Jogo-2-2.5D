// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 321;
export const BUILD = 'mod321-jornada-cinzaria-vulcao-2be6d71';
export const DESCRIPTION = 'Mod 321: jornada Eldória–Cinzária, vale nostálgico, ponte do abismo, aurora, vulcão, guardas Enemy2 e teleporte ADM';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
