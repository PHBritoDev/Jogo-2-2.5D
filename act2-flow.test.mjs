import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain } from './world3d-terrain.js';
import { ACT2, DISTRICT, DISTRICT_PASS, PASS_RADIUS, DISTRICT_SPOTS, DISTRICT_CANAL, act2Presentation, collectLedger, afterVorgazhek, bossPhase, vorgazhekIntroLines } from './act2-flow.js';

test('cada passo do Ato II tem objetivo e o chefe usa o nome canônico', () => {
  for (let s = ACT2.start; s <= ACT2.done; s++) assert.ok(act2Presentation(s), 'passo ' + s);
  assert.match(act2Presentation(ACT2.boss).title, /VORGAZHEK/);
  assert.match(vorgazhekIntroLines()[0].text, /Ouro compra riquezas/);
});

test('livros-caixa só contam no passo certo e uma vez cada', () => {
  let r = collectLedger([], 0, ACT2.travel);
  assert.equal(r.found.length, 0);
  r = collectLedger([], 0, ACT2.ledgers); r = collectLedger(r.found, 0, ACT2.ledgers);
  assert.equal(r.found.length, 1);
  r = collectLedger(r.found, 1, ACT2.ledgers); r = collectLedger(r.found, 2, ACT2.ledgers);
  assert.equal(r.advanced, true);
});

test('vitória paga uma vez; fúria na metade da vida', () => {
  assert.equal(afterVorgazhek({}).coinsGained, ACT2.reward);
  assert.equal(afterVorgazhek({ vorgazhekRewardClaimed: true }).coinsGained, 0);
  assert.equal(afterVorgazhek({ bishopsDefeated: 1 }).bishopsDefeated, 2);
  assert.equal(bossPhase(ACT2.bossHp, ACT2.bossHp), 1);
  assert.equal(bossPhase(ACT2.bossHp * .4, ACT2.bossHp), 2);
});

test('o distrito, a garganta e os pontos da missão são alcançáveis a pé', () => {
  const t = createTerrain({ extraAreas: [DISTRICT], passes: [{ points: DISTRICT_PASS, r: PASS_RADIUS }], channels: [{ points: DISTRICT_CANAL, width: 3.2, depth: 1.8, level: -.6 }] });
  const spots = [DISTRICT_SPOTS.gate, DISTRICT_SPOTS.plaza, DISTRICT_SPOTS.family, DISTRICT_SPOTS.seal, DISTRICT_SPOTS.arena, ...DISTRICT_SPOTS.ledgers];
  for (const p of spots) assert.ok(t.walkable(p.x, p.z), 'inalcançável: ' + p.x + ',' + p.z);
  // Caminha da vila até a praça pela garganta sem atravessar montanha.
  const path = [[-12, -44], ...DISTRICT_PASS, [DISTRICT_SPOTS.plaza.x, DISTRICT_SPOTS.plaza.z]];
  for (let i = 0; i < path.length - 1; i++) for (let k = 0; k <= 20; k++) {
    const x = path[i][0] + (path[i + 1][0] - path[i][0]) * k / 20, z = path[i][1] + (path[i + 1][1] - path[i][1]) * k / 20;
    assert.ok(t.walkable(x, z), 'trecho bloqueado em ' + x.toFixed(1) + ',' + z.toFixed(1));
  }
});
