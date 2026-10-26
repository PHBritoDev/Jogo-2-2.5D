import test from 'node:test';
import assert from 'node:assert/strict';
import { ULTIMATES, ultimateDue, ultimateFor } from './ultimates3d.js';

test('VÉRAXION usa o Buraco Negro e a forma final da Ganância usa a Supernova', () => {
  assert.equal(ULTIMATES.veraxion.kind, 'void');
  assert.equal(ULTIMATES.greed3.kind, 'nova');
  assert.equal(ultimateFor('fallen4').kind, 'void');
  assert.equal(ultimateFor('greed1').kind, 'gate');
  assert.equal(ultimateFor('valerio').kind, 'reaper');
  assert.equal(ultimateDue('rival', 0.1, 0), -1);
});

test('cada ultimate sai uma vez por limiar, na ordem; comuns e elites só uma vez', () => {
  assert.equal(ultimateDue('veraxion', 0.9, 0), -1);
  assert.equal(ultimateDue('veraxion', 0.59, 0), 0);
  assert.equal(ultimateDue('veraxion', 0.4, 1), -1);
  assert.equal(ultimateDue('veraxion', 0.2, 1), 1);
  assert.equal(ultimateDue('veraxion', 0.05, 2), -1);
  assert.equal(ultimateDue('greed3', 0.7, 0), 0);
  assert.equal(ultimateDue('captor', 0.4, 0), -1);
  assert.equal(ultimateDue('captor', 0.2, 0), 0);
  assert.equal(ultimateDue('captor', 0.1, 1), -1);
  assert.equal(ultimateDue('elite2', 0.45, 0), 0);
  for (const u of Object.values(ULTIMATES)) for (let i = 1; i < u.at.length; i++) assert.ok(u.at[i] < u.at[i - 1]);
});
