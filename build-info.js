// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 316;
export const BUILD = 'mod316-eldoria-luz-nostalgica-expansao';
export const DESCRIPTION = 'Mod 316: Eldória — luz nostálgica por hora e região, águas com ondulação, cachoeira, floresta e caverna expandidas, tochas só GLB, câmera da caverna, 1ª pessoa, travadas e Anjo-Guia novo (sobre a Mod 315)';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
