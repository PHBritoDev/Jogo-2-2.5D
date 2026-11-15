// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 318;
export const BUILD = 'mod318-renascimento-caverna-eldoria-c5';
export const DESCRIPTION = 'Mod 318: caverna de Eldória C1–C5 — galeria alta, mirante, nicho com relíquias, fenda da serra bidirecional e correções de navegação, câmera e luzes (sobre o Mod 317)';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
