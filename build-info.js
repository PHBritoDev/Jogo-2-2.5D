// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 312;
export const BUILD = 'mod312-caverna-colisao-vegetacao-auditoria';
export const DESCRIPTION = 'Mod 312: correções de câmera e queda da caverna, escada ligada à ilha, tochas GLB, raízes e vegetação da floresta';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
