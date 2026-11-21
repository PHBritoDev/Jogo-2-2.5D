// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 334;
export const BUILD = 'mod334-veraxion-combos-adm';
export const DESCRIPTION = 'Mod 334: VÉRAXION, dano dos combos, ataques variados e botões ADM';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
