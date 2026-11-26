// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 372;
export const BUILD = 'mod372-eldoria-camera-missoes-prado';
export const DESCRIPTION = 'Mod 372: câmera acima da água, acertos de espada, objetivos de Eldória e prado legível na estrada';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
