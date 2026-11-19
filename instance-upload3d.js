/**
 * Upload parcial de atributos instanciados no Three r160.
 * Sem faixa, bufferSubData manda o array inteiro (capacidade máxima), não só
 * as instâncias visíveis. addUpdateRange(start, count) conta elementos do
 * typed array — para matrizes, instâncias * 16.
 * https://threejs.org/manual/#en/optimize-lots-of-objects
 */
export function uploadUsedElements(attribute, elements) {
  if (!attribute || typeof attribute.addUpdateRange !== 'function' || typeof attribute.clearUpdateRanges !== 'function') return false;
  const count = Number.isFinite(elements) ? Math.max(0, Math.floor(elements)) : 0;
  attribute.clearUpdateRanges();
  attribute.addUpdateRange(0, count);
  attribute.needsUpdate = true;
  return true;
}
