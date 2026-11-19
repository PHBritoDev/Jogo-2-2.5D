// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 326;
export const BUILD = 'mod326-ganancia-abismo-organico';
export const DESCRIPTION = 'Mod 326: abismo orgânico e garganta colossal na dimensão da Ganância';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
