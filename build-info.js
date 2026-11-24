// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 359;
export const BUILD = 'mod359-espada-occlusion-vorgazhek-water-sheen';
export const DESCRIPTION = 'Mod 359: otimização de colisão da espada e reflexo rasante da água de VORGAZHEK';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
