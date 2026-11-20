// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 332;
export const BUILD = 'mod332-duelos-bispos-juizo-integrados';
export const DESCRIPTION = 'Mod 332: VHAZRAEL e VORGAZHEK integrados, Juízo celestial e correções dos agentes';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
