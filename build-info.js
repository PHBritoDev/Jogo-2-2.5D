// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 305;
export const BUILD = 'mod305-vorgazhek-abyss';
export const DESCRIPTION = 'Mod 305: inclui a dimensão II de VORGAZHEK com águas negras e observadores, preservando Auto FPS e melhorias anteriores';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
