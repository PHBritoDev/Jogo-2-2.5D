// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 336;
export const BUILD = 'mod336-bispos-fera-florescer';
export const DESCRIPTION = 'Mod 336: Fera dos Mil Olhos (Bispo 3), Florescer Abissal e combos do VÉRAXION (Bispo 4)';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
