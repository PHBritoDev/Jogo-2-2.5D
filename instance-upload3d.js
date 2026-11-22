/**
 * Upload parcial de InstancedBufferAttribute no Three r160.
 * `needsUpdate` sozinho reenvia o Float32Array inteiro (capim reserva 18000
 * matrizes). r160 honra `addUpdateRange` / `updateRanges`; `updateRange` é
 * legado e, se preenchido junto, o renderer envia os dois.
 * Contagem em elementos do array, não em instâncias. Count ≤ 0 não marca.
 */
export function markInstanceUpload(attr, start, count) {
  if (!attr || !(count > 0)) return false;
  const startI = start | 0, countI = count | 0;
  if (typeof attr.addUpdateRange === 'function') {
    if (typeof attr.clearUpdateRanges === 'function') attr.clearUpdateRanges();
    attr.addUpdateRange(startI, countI);
  } else if (attr.updateRange) {
    attr.updateRange.offset = startI;
    attr.updateRange.count = countI;
  }
  attr.needsUpdate = true;
  return true;
}

/**
 * Empacota blocos de instâncias (capim/flores de um tile) com prioridade
 * dos mais próximos quando passam da capacidade. Abaixo da capacidade a
 * ordem é estável por id: andar sem trocar o conjunto de blocos não
 * reescreve nem reenvia o buffer.
 * previous: [{id, count}] da última vez. blocks: [{id, count, distance}].
 */
export function diffInstanceBlocks(previous, blocks, capacity) {
  const sorted = [];
  for (const b of blocks) {
    const count = b.count | 0;
    if (count > 0 && b.id != null) sorted.push({ id: String(b.id), count, distance: +b.distance || 0 });
  }
  sorted.sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const packed = [];
  let used = 0;
  for (const b of sorted) {
    if (used >= capacity) break;
    const count = Math.min(b.count, capacity - used);
    if (count <= 0) break;
    packed.push({ id: b.id, count });
    used += count;
  }
  const clipped = packed.length !== sorted.length || packed.some((p, i) => p.count !== sorted[i].count);
  const order = clipped ? packed : packed.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const prev = previous || [];
  const changed = order.length !== prev.length || order.some((p, i) => !prev[i] || prev[i].id !== p.id || prev[i].count !== p.count);
  return { order, used, changed, clipped };
}
