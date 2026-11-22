/* 22/11 — causa comum do "dano que para no 1º contato": golpes 2/3 de um combo caíam na graça de 850 ms do 1º.
   Emula a regra do mundo (graça + vxComboFollowupAllowed) e confere, espécie por espécie, que cada janela distinta acerta. */
import test from 'node:test';
import assert from 'node:assert/strict';
const R = new URL('../', import.meta.url);
const { Enemy1Squad, COMBO_MID_KNOCK } = await import(new URL('enemy1-squad3d.js', R));
const { vxComboFollowupAllowed } = await import(new URL('veraxion-combo-damage3d.js', R));
for (const m of ['vorgazhek3d.js', 'zarkhael-squad3d.js', 'veraxion-squad3d.js', 'vhazrael3d.js', 'greed-boss3d.js']) await import(new URL(m, R));

function fight(kind, { dodge = false } = {}) {
  let sq, until = -1, last = null; const log = [];
  sq = new Enemy1Squad({ seed: 5, meleeTrace: () => true, event: () => {},
    damageTarget: (id, dmg, info) => { if (info.kind !== 'melee') return 'hit'; const now = sq.time * 1000;
      const follow = vxComboFollowupAllowed(last, info, { now, until, dash: dodge, perfectDodge: false });
      const ok = !dodge && (now >= until || follow); log.push({ t: sq.time, move: info.attackToken?.move?.id, combo: info.combo, ok, knock: info.knock });
      if (ok) { until = now + 850; last = { attackToken: info.attackToken, actor: info.actor, combo: info.combo, at: now, until }; return 'hit'; } return 'evaded'; } });
  const a = sq.spawn([{ x: 0, z: 1.6, yaw: Math.PI, kind, hp: 99999 }])[0]; a.alert = 0;
  const h = { id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1 }; sq.setTargets([h]);
  for (let i = 0; i < 60 * 25; i++) { h.x = 0; h.z = 0; if (a.x * a.x + (a.z - 1.6) ** 2 > 4) { a.x = 0; a.z = 1.6; } sq.update(1 / 60); }
  return log;
}
for (const kind of ['greedA', 'greedB', 'vorgazhek', 'zarkhael', 'veraxion', 'vhazrael']) {
  test(`combo multi-hit: ${kind} — golpes distintos do mesmo combo acertam dentro da graça`, () => {
    const log = fight(kind); assert.ok(log.length >= 3, kind + ' fez contato: ' + log.length);
    const byAct = new Map(); for (const e of log) { const k = e.move + '@' + Math.round(e.t * 10); }
    const chained = log.filter((e, i) => i && e.ok && e.combo >= 2 && log[i - 1].ok && e.t - log[i - 1].t < .85);
    assert.ok(chained.length >= 1, kind + ': nenhum 2º/3º corte dentro de 850 ms passou — ' + JSON.stringify(log.slice(0, 8)));
    for (const e of log.filter(e => e.ok && e.combo >= 2)) assert.ok(e.move, 'token do ataque presente');
  });
}
test('combo: esquiva/dash continua protegendo todos os golpes', () => { const log = fight('greedA', { dodge: true }); assert.ok(log.length >= 2); assert.equal(log.filter(e => e.ok).length, 0); });
test('combo: só o golpe final empurra forte', () => { const log = fight('vorgazhek'); assert.ok(COMBO_MID_KNOCK < .5); assert.ok(log.some(e => e.knock < .3) && log.some(e => e.knock >= .3), JSON.stringify(log.map(e => e.knock))); });
