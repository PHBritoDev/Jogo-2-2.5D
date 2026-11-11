// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 313;
export const BUILD = 'mod313-eldoria-caverna-camera-raizes-auditoria-webgl';
export const DESCRIPTION = 'Mod 313: câmera e movimento da caverna, colisões e queda na escadaria, raízes e vegetação de Eldória, QA WebGL';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
