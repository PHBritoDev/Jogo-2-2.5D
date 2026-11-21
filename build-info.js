// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 335;
export const BUILD = 'mod335-ganancia-volume-3d-veraxion';
export const DESCRIPTION = 'Mod 335: refinamento tridimensional da criatura da Ganância + correções do VÉRAXION';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
