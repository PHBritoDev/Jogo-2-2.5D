import test from 'node:test';
import assert from 'node:assert/strict';
import { FINALE, GAUNTLET, SIN_FORMS, nextGauntlet, nextSinForm, finaleAfterDeath, finaleReward, finaleTalkLines, epilogueLines } from './finale-flow.js';

test('quatro guardiões em ordem, depois três formas do Pecado', () => {
  assert.deepEqual(GAUNTLET.map(g => g.rig), ['bishop1', 'bishop2', 'bishop3', 'bishop4']);
  assert.deepEqual(SIN_FORMS.map(f => f.rig), ['greed1', 'greed2', 'greed3']);
  let i = 0, r; do { r = nextGauntlet(i); i = r.index; } while (!r.done);
  assert.equal(i, 4);
  assert.equal(nextSinForm(1).done, false); assert.equal(nextSinForm(2).done, true);
  for (let k = 1; k < SIN_FORMS.length; k++) assert.ok(SIN_FORMS[k].hp > SIN_FORMS[k - 1].hp);
});

test('morte recomeça o arco do primeiro guardião; recompensa final é única', () => {
  assert.deepEqual(finaleAfterDeath({}), { questStep: FINALE.gauntlet, gauntletIndex: 0, sinForm: 0, inVoid: false });
  assert.equal(finaleReward(false).coins, FINALE.reward.coins);
  assert.equal(finaleReward(true).coins, 0);
});

test('a regra de recomeço é anunciada antes e o Anjo revela o nome no epílogo', () => {
  assert.ok(finaleTalkLines().some(l => /recomeçamos desde o primeiro guardião/.test(l.text)));
  assert.ok(epilogueLines('Ana').some(l => /Auren/.test(l.text)));
});
