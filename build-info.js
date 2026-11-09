// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 306;
export const BUILD = 'mod306-vorgazhek-water-refine';
export const DESCRIPTION = 'Mod 306: água fluida e observadores distantes da Dimensão II, preservando melhorias anteriores';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
