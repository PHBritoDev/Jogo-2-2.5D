// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 322;
export const BUILD = 'mod322-menu-dimensoes-jornada-68a967b';
export const DESCRIPTION = 'Mod 322: laboratório limpo com dimensões 1–4, Ganância e início do Vale do Entardecer para percorrer a nova jornada';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
