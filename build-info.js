// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 303;
export const BUILD = 'mod303-eldoria-floresta-tropical-otimizada';
export const DESCRIPTION = 'Mod 303: Eldória com 2 barracas, 2 casas removidas e floresta tropical densa otimizada';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
