// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 324;
export const BUILD = 'mod324-integracao-agentes-a1-a2-a4-a5-4417e10';
export const DESCRIPTION = 'Mod 324: revisão dos agentes — progressão segura, impactos aéreos, bestiário, iluminação e teste de cache';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
