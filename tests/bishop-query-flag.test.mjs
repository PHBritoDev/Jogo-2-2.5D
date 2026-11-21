import test from 'node:test';
import assert from 'node:assert/strict';

// Each query parameter must be interpreted by its value, not only its presence.
// A cache-busting query on the import URL causes the module to be reevaluated.
async function mode(query, n) {
  globalThis.window = { location: { search: query } };
  const m = await import('../combat-melee-test-mode.js?bishop-param-test=' + n);
  return m.BISHOP_DUEL_ONLY;
}
test('modo novo de Bispos nao e desativado por flags =0', async () => {
  try {
    assert.equal(await mode('', 1), true);
    assert.equal(await mode('?bisposComPoderes=0', 2), true);
    assert.equal(await mode('?fullCombatQA=0', 3), true);
    assert.equal(await mode('?bisposComPoderes=1', 4), false);
    assert.equal(await mode('?fullCombatQA=1', 5), false);
  } finally { delete globalThis.window; }
});
