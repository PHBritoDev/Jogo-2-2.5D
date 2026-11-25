// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 367;
export const BUILD = 'mod367-vale-camera-combate';
export const DESCRIPTION = 'Mod 367: clareiras do Vale, visão entre troncos, objetivo de Téo e efeitos de combate';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
