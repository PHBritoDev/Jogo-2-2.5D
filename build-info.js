// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 343;
export const BUILD = 'mod343-ganancia-floresta-vorgazhek';
export const DESCRIPTION = 'Mod 343: Ganância em três fases, floresta densa e água de VORGAZHEK';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
