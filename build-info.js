// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 315;
export const BUILD = 'mod315-combate-cinematografico-escudo';
export const DESCRIPTION = 'Mod 316: apenas tochas GLB autorais, sem fogo triangular procedural; câmera 1p sem arrasto';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
