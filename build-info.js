// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 339;
export const BUILD = 'mod339-floresta-regioes-ripple-vorgazhek';
export const DESCRIPTION = 'Mod 339: floresta de regiões distantes e ondulações de VORGAZHEK';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
