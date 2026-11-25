// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 363;
export const BUILD = 'mod363-invernalia-floresta';
export const DESCRIPTION = 'Mod 363: Invernália e Eldória integradas, distribuição florestal de alta qualidade recalibrada';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
