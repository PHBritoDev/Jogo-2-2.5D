// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 309;
export const BUILD = 'mod309-crianca-npc';
export const DESCRIPTION = 'Mod 309: NPC infantil masculino animado na vila de Eldória, mantendo todas as melhorias anteriores';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
