// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 364;
export const BUILD = 'mod364-invernalia-espada';
export const DESCRIPTION = 'Mod 364: Invernália, Eldória e efeitos de espada com atualização de partículas ativas';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
