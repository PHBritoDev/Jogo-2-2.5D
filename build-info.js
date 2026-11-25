// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 362;
export const BUILD = 'mod362-invernalia-raizes-eldoria';
export const DESCRIPTION = 'Mod 362: jornada de Invernália integrada e raízes das árvores ancestrais alinhadas à passarela de Eldória';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
