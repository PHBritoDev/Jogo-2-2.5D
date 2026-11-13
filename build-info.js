// ÚNICO lugar para atualizar identidade/cache da build publicada.
// NÃO editar HTML, loader ou mundo 3D apenas para trocar número de versão.
export const MOD = 317;
export const BUILD = 'mod317-prologo-imersao-eldoria-viva';
export const DESCRIPTION = 'Mod 317: prólogo jogável de Eldória — guardiões do céu, despertar no chão, asas do Anjo-Guia, Teren sentado e carroça vinda da garganta, cinco bandidos juntos, vendedores atrás do balcão e abrigos rituais (sobre a Mod 316)';
export function syncBuildMarker(marker) {
  if (!marker) return;
  marker.textContent = String(MOD);
  marker.setAttribute('aria-label', 'Modificação ' + MOD);
  marker.title = DESCRIPTION;
}
