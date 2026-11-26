// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 374;
export const BUILD = 'mod374-marcha-dos-pecados';
export const DESCRIPTION = 'Mod 374: abertura cinematográfica do carregamento com a marcha dos cinco pecados, progresso real e entrada por toque';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
