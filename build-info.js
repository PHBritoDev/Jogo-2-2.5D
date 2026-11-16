// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 325;
export const BUILD = 'mod325-agua-aurora-vulcao-costuras-16bf2b8';
export const DESCRIPTION = 'Mod 325: costuras do terreno, água e cachoeiras, vulcão sólido e aurora animada';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
