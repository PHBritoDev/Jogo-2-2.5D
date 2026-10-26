/**
 * MOD 210 — Marco 8: quando cada chefe usa a ultimate (docs/roteiro/M8-POLIMENTO.md). Só regras, sem Three.js.
 * VÉRAXION abre o BURACO NEGRO e a forma final da Ganância solta a SUPERNOVA, cada uma duas vezes por luta,
 * ao cruzar os limiares de vida (fração da vida máxima), na ordem.
 */
export const ULTIMATES = {
  veraxion: { kind: 'void', name: 'BURACO NEGRO', at: [0.6, 0.25] },
  greed3: { kind: 'nova', name: 'SUPERNOVA DA GANÂNCIA', at: [0.72, 0.3] }
};
/** Índice do próximo limiar já cruzado e ainda não usado (ou -1). `used` = quantas já saíram nesta luta. */
export function ultimateDue(profile, hpFrac, used = 0) {
  const u = ULTIMATES[profile];
  if (!u || used >= u.at.length) return -1;
  return hpFrac < u.at[used] ? used : -1;
}
