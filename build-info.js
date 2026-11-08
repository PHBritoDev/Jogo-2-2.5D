// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 300;
export const BUILD = 'mod300-veraxion-corredor';
export const DESCRIPTION = 'Mod 300: Dimensão de Véraxion — corredor torcido, portas e reflexos';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
