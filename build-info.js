// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 308;
export const BUILD = 'mod308-vorgazhek-gaze-polish';
export const DESCRIPTION = 'Mod 308: olhos e piscadas aprimorados na Dimensão II, mantendo as melhorias da Eldória da Mod 307';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
