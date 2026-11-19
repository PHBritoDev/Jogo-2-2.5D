// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 328;
export const BUILD = 'mod328-bispos-esgrima-15e06bf';
export const DESCRIPTION = 'Mod 328: treino de esgrima dos quatro Bispos sem magias, mantendo defesa e mobilidade';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
