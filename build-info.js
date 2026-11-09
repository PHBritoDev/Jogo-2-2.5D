// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 305;
export const BUILD = 'mod305-floresta-serra-fps';
export const DESCRIPTION = 'Mod 305: Eldória — mata contínua até a serra, gaiolas na nova clareira e orçamento de luzes para FPS';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
