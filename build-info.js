// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 327;
export const BUILD = 'mod327-ganancia-arcada-fossil';
export const DESCRIPTION = 'Mod 327: arcada fóssil, mandíbula e passarela mineral na dimensão da Ganância';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
