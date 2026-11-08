import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('./eldoria-mature-forest.js', import.meta.url), 'utf8');
test('faixas dos LODs medio e distante nao se sobrepoem', () => {
  // PR #421 passou os limiares para variáveis (nearLimit/midLimit): a continuidade vale por construção.
  const vars = source.match(/const midLimit = lowSpec \? (\d+) : (\d+);/);
  if (vars) {
    assert.match(source, /registerCull\(far,[^;]*?,\s*0,\s*midLimit\)/, 'copa distante começa no fim do LOD médio');
    assert.match(source, /registerCull\(mid,\s*midLimit,\s*0,\s*nearLimit\)/, 'LOD médio termina em midLimit');
    return;
  }
  const far = source.match(/registerCull\(far,\s*150,\s*0,\s*lowSpec\s*\?\s*(\d+)\s*:\s*(\d+)\)/);
  const mid = source.match(/registerCull\(mid,\s*lowSpec\s*\?\s*(\d+)\s*:\s*(\d+),\s*0,\s*24\)/);
  assert.ok(far, 'registrar limite inferior da copa distante');
  assert.ok(mid, 'registrar limite superior do modelo medio');
  assert.equal(Number(far[1]), Number(mid[1]), 'limiar lowSpec deve ser continuo');
  assert.equal(Number(far[2]), Number(mid[2]), 'limiar de qualidade normal deve ser continuo');
});
