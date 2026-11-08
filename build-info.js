// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 298;
export const BUILD = 'mod298-eldoria-agua-fps-qa';
export const DESCRIPTION = 'Mod 298: Eldória — água rasa caminhável, últimas gotas, mata e desempenho';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
