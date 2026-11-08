// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 301;
export const BUILD = 'mod301-protagonista-combate-aereo';
export const DESCRIPTION = 'Mod 301: Combate aéreo, combos e protagonista · Dimensão de Véraxion';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
