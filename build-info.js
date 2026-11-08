// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 297;
export const BUILD = 'mod297-eldoria-cercas-escada';
export const DESCRIPTION = 'Mod 297: Eldória — mercado espaçado, cercas removidas, escada e visibilidade corrigidas · Bispo 3 Mod 296';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
