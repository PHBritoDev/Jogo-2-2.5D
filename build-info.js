// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 311;
export const BUILD = 'mod311-caverna-ascensao';
export const DESCRIPTION = 'Mod 311: Eldória — fronteira montanhosa da serra com caverna, portal-vórtice, escadaria da Dimensão e arena do deserto negro';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
