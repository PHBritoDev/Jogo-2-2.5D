// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 365;
export const BUILD = 'mod365-invernalia-cache-vulcao';
export const DESCRIPTION = 'Mod 365: Invernália e Eldória integradas, cache da cena vulcânica alinhado à versão publicada';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
