/**
 * MOD 210/212 — quando cada inimigo usa a ultimate (docs/roteiro/M8-POLIMENTO.md e M10-PODERES.md). Só regras.
 * Desde o Marco 10 toda família tem ultimate (powers3d.js); os limiares dependem do nível: chefes duas vezes
 * (60% e 25% da vida), elites uma (50%) e comuns uma (30%).
 */
import { kitFor, ultThresholds } from './powers3d.js';
export const ULTIMATES = {
  veraxion: { kind: 'void', name: 'BURACO NEGRO', at: [0.6, 0.25] },
  greed3: { kind: 'nova', name: 'SUPERNOVA DA GANÂNCIA', at: [0.72, 0.3] }
};
/** Ultimate deste perfil: { kind, name, at } (ou null). */
export function ultimateFor(profile) {
  if (ULTIMATES[profile]) return ULTIMATES[profile];
  const k = kitFor(profile); if (!k) return null;
  return { kind: k.ult.type, name: k.ult.name, at: ultThresholds(profile) };
}
/** Índice do próximo limiar já cruzado e ainda não usado (ou -1). `used` = quantas já saíram nesta luta. */
export function ultimateDue(profile, hpFrac, used = 0) {
  const u = ultimateFor(profile);
  if (!u || used >= u.at.length) return -1;
  return hpFrac < u.at[used] ? used : -1;
}
