// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 296;
export const BUILD = 'mod296-bispo3-olhos';
export const DESCRIPTION = 'Eldória reconstruída (Mod 292) · Dimensão viva de Zar’khael (Mod 296)';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
