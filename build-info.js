// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 366;
export const BUILD = 'mod366-invernalia-lava';
export const DESCRIPTION = 'Mod 366: Invernália e Eldória integradas, reflexo dinâmico da lava de Cinzária';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
