import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapState, serializeMapState, revealAround, isRevealed, discoverPois, canFastTravel, MAP_POIS, WAYSTONES } from './map3d.js';

test('névoa começa fechada e abre ao redor do jogador', () => {
  const s = createMapState();
  assert.equal(isRevealed(s, 0, 4), false);
  assert.ok(revealAround(s, 0, 4) > 10);
  assert.equal(isRevealed(s, 0, 4), true);
  assert.equal(isRevealed(s, 44, -119), false, 'portal distante continua encoberto');
  assert.equal(revealAround(s, 0, 4), 0, 'revelar de novo não conta duas vezes');
});

test('progresso do mapa sobrevive à serialização', () => {
  const s = createMapState();
  revealAround(s, -12, -44); s.pois.add('vila'); s.waystones.add('abrigo-vila');
  const back = createMapState(JSON.parse(JSON.stringify(serializeMapState(s))));
  assert.deepEqual([...back.cells], [...s.cells]);
  assert.ok(back.pois.has('vila') && back.waystones.has('abrigo-vila'));
  const junk = createMapState({ cells: '###', pois: ['inventado'], waystones: ['x'] });
  assert.equal(junk.pois.size, 0); assert.equal(junk.waystones.size, 0);
});

test('locais secretos não aparecem antes de serem achados no jogo', () => {
  const s = createMapState();
  const ruin = MAP_POIS.find(p => p.id === 'ruina');
  assert.equal(discoverPois(s, ruin.x, ruin.z).some(p => p.id === 'ruina'), false);
  assert.ok(discoverPois(s, ruin.x, ruin.z, { secretsFound: { ruina: true } }).some(p => p.id === 'ruina'));
});

test('viagem rápida bloqueada em combate, cena, escolta e queda', () => {
  assert.equal(canFastTravel({}).ok, true);
  for (const key of ['inCombat', 'inDialogue', 'inCinematic', 'escorting', 'falling', 'dead']) assert.equal(canFastTravel({ [key]: true }).ok, false, key);
  assert.ok(WAYSTONES.length >= 2);
});
