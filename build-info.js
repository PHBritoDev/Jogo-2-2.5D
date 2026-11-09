// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 302;
export const BUILD = 'mod302-combate-protagonista';
export const DESCRIPTION = 'Mod 302: Combate do protagonista reconstruído (espada branca, dash de sombra, golpes de energia) · Eldória';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
