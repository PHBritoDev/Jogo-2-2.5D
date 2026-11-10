// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 310;
export const BUILD = 'mod310-crianca-npc-optimized';
export const DESCRIPTION = 'Mod 310: NPC infantil otimizado de 13,50 MB para 5,84 MB, preservando animações e melhorias anteriores';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
