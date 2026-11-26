// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 371;
export const BUILD = 'mod371-eldoria-camera-missoes';
export const DESCRIPTION = 'Mod 371: câmera acima da água, acertos de espada e objetivos de Eldória';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
