// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 346;
export const BUILD = 'mod346-agents-combat-forest-qa';
export const DESCRIPTION = 'Mod 346: melhorias A2/A3 e QA da arena VORGAZHEK';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
