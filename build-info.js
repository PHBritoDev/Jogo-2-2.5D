// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 314;
export const BUILD = 'mod314-combate-cinematografico-escudo';
export const DESCRIPTION = 'Mod 314: Eldória — combate cinematográfico da espada inicial e do Demônio1, escudo hexagonal, dash 0,5 s e salto duplo';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
