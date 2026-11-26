// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 375;
export const BUILD = 'mod375-campo-da-ultima-guerra';
export const DESCRIPTION = 'Mod 375: abertura depois dos planetas com a marcha refinada, o Campo da Última Guerra e o mundo realmente pronto antes da entrada por toque';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
