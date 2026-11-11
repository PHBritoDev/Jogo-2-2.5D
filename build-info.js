// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 314;
export const BUILD = 'mod314-forest-cull-dynamicbuffers-torches-3d';
export const DESCRIPTION = 'Mod 314: desempenho da floresta de Eldória e tochas GLB no distrito, sem modelos genéricos';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
