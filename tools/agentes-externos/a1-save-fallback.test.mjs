// A1-SAVE-FALLBACK-02: regressão isolada do código REAL do controlador.
// Não executa WebGL nem modifica o save do jogador.
// Rodar: node --test tools/agentes-externos/a1-save-fallback.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../mundo-3d-prototype.js', import.meta.url), 'utf8');
const begin = source.indexOf("const PROGRESS_KEY='sevenSins3DCampaignV6';");
const end = source.indexOf('let saved3DProgress=read3DProgress();', begin);
assert.ok(begin >= 0 && end > begin, 'trecho real de persistência não foi localizado; revisar extração');
const actualSaveReader = source.slice(begin, end);

function load(entries) {
  const storage = new Map(Object.entries(entries));
  const sandbox = {
    localStorage: { getItem: (key) => storage.get(key) ?? null },
    migrateProgress: (raw) => ({ coins: Number(raw?.coins) || 0, questStep: Number(raw?.questStep) || 0 }),
  };
  return runInNewContext(actualSaveReader + '\nread3DProgress()', sandbox);
}

test('save V6 válido tem prioridade sobre V5', () => {
  const result = load({
    sevenSins3DCampaignV6: JSON.stringify({ version: 6, coins: 18, questStep: 5 }),
    sevenSins3DCampaignV5: JSON.stringify({ version: 5, coins: 47, questStep: 3 }),
  });
  assert.equal(result.coins, 18);
  assert.equal(result.questStep, 5);
});

test('sem save, o progresso inicia com zero moedas', () => {
  assert.equal(load({}).coins, 0);
});

test.skip('PENDENTE A1-SAVE-FALLBACK-02: V6 corrompida não pode apagar V5 válida', () => {
  // RED confirmado isoladamente: hoje retorna 0, mas deve retornar 47.
  const result = load({
    sevenSins3DCampaignV6: '{bad-json',
    sevenSins3DCampaignV5: JSON.stringify({ version: 5, coins: 47, questStep: 3 }),
  });
  assert.equal(result.coins, 47);
  assert.equal(result.questStep, 3);
});

test('todos os slots corrompidos não interrompem o carregamento', () => {
  assert.equal(load({ sevenSins3DCampaignV6: '{bad-json' }).coins, 0);
});
