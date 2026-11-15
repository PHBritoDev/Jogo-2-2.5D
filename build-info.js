// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 319;
export const BUILD = 'mod319-npcs-vivos-cabelos-precalculados';
export const DESCRIPTION = 'Mod 319: NPCs vivos de Eldória com cabelos pré-calculados para evitar travamentos no carregamento; inclui melhorias de aparência, rotinas e ferramentas de teste sobre o Mod 318';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
