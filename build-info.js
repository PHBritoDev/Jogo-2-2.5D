// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 370;
export const BUILD = 'mod370-trilhas-agua-combate';
export const DESCRIPTION = 'Mod 370: cipós fora das trilhas, água adaptativa e acertos da espada';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
