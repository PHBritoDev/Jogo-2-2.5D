// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 304;
export const BUILD = 'mod304-auto-fps-graphics';
export const DESCRIPTION = 'Mod 304: Auto FPS adaptativo e perfis gráficos baixo, médio, alto e máximo';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
