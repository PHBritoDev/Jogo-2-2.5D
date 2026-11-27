// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 376;
export const BUILD = 'mod376-menu-original-e-boot';
export const DESCRIPTION = 'Mod 376: menu original das galáxias restaurado como tela de planetas, boot visível sem tela preta e abertura só depois de ENTRAR';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
