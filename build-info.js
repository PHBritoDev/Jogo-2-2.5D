// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 320;
export const BUILD = 'mod320-vhazrael-duelo-extincao-orbital-integracao-agentes';
export const DESCRIPTION = 'Mod 320: VHAZRAEL renovado com modelo, espada, VFX e Extinção Orbital por contato; integra melhorias de A1, A3, A4 e A5 em progressão, terreno, iluminação e saves';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
