// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 352;
export const BUILD = 'mod352-ganancia-juizo-usura-cinema';
export const DESCRIPTION = 'Mod 352: Ganância III — Juízo da Usura cinematográfico';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
