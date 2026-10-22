import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain } from './world3d-terrain.js';
import { DISTRICT, DISTRICT_PASS, PASS_RADIUS } from './act2-flow.js';
import { ACT3, ACT4, EXTRA_REGIONS, EXTRA_PASSES, stepDef, latePresentation, collectItem, bossRewardOnce, COLISEUM, coliseumPayout } from './acts34-flow.js';

test('passos 14–26 contínuos, cada um com objetivo; nomes canônicos dos Bispos', () => {
  for (let s = 14; s <= 26; s++) assert.ok(latePresentation(s), 'passo ' + s);
  assert.equal(stepDef(20).act, ACT4);
  assert.match(ACT3.bishop, /ZAR'KHAEL/);
  assert.match(ACT4.bishop, /VÉRAXION/);
  const boss3 = ACT3.steps.find(s => s.type === 'boss');
  assert.match(boss3.intro()[0].text, /Sobreviveste aos meus irmãos/);
});

test('coleta e recompensa de chefe acontecem uma vez', () => {
  const def = stepDef(18).def;
  let r = collectItem([], 0, 17, def); assert.equal(r.found.length, 0);
  r = collectItem([], 0, 18, def); r = collectItem(r.found, 0, 18, def); assert.equal(r.found.length, 1);
  r = collectItem(r.found, 1, 18, def); r = collectItem(r.found, 2, 18, def); assert.equal(r.advanced, true);
  const boss = stepDef(19).def;
  assert.equal(bossRewardOnce(false, boss).coins, boss.reward.coins);
  assert.equal(bossRewardOnce(true, boss).coins, 0);
});

test('coliseu escala inimigos e respeita o teto diário', () => {
  assert.equal(COLISEUM.enemyFor(0), 'enemy3'); assert.equal(COLISEUM.enemyFor(9), 'enemy4');
  assert.ok(COLISEUM.hpFor(9) > COLISEUM.hpFor(0));
  assert.equal(coliseumPayout(9, COLISEUM.dailyCap), 0);
  assert.ok(coliseumPayout(0, 0) > 0);
});

test('vales dos Atos III e IV e todos os pontos de missão são alcançáveis a pé', () => {
  const t = createTerrain({ extraAreas: [DISTRICT, ...EXTRA_REGIONS], passes: [{ points: DISTRICT_PASS, r: PASS_RADIUS }, ...EXTRA_PASSES.map(points => ({ points, r: PASS_RADIUS }))] });
  for (const act of [ACT3, ACT4]) for (const s of act.steps) {
    const pts = [s.at, ...(s.spots || []), ...(s.items || [])].filter(Boolean);
    if (s.step === 19) pts.push(COLISEUM.spot);
    for (const p of pts) assert.ok(t.walkable(p.x, p.z), 'passo ' + s.step + ' inalcançável em ' + p.x + ',' + p.z);
  }
  for (const pass of EXTRA_PASSES) for (let i = 0; i < pass.length - 1; i++) for (let k = 0; k <= 10; k++) {
    const x = pass[i][0] + (pass[i + 1][0] - pass[i][0]) * k / 10, z = pass[i][1] + (pass[i + 1][1] - pass[i][1]) * k / 10;
    assert.ok(t.walkable(x, z), 'passagem fechada em ' + x.toFixed(1) + ',' + z.toFixed(1));
  }
});
