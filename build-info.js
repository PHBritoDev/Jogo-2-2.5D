// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 361;
export const BUILD = 'mod361-integracao-invernalia';
export const DESCRIPTION = 'Mod 361: jornada de Invernália, missões opcionais, câmera de duelo e impactos de espada';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
