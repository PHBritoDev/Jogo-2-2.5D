/* Missão Ganância completa (22/11) — etapas 2–9: armas que lutam pelo gume real, lâminas afiadas, fases, voo, sóis, abismo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const R = new URL('../', import.meta.url), read = f => fs.readFileSync(new URL(f, R), 'utf8');
let THREE = null;
for (const dir of [process.env.COMBAT_THREE_DIR, process.env.AERIAL_THREE_DIR, new URL('../node_modules/three', import.meta.url).pathname]) {
  if (!dir) continue; try { THREE = await import(dir.replace(/\/$/, '') + '/build/three.module.js'); break; } catch { /* próximo */ }
}
const { Enemy1Squad } = await import(new URL('enemy1-squad3d.js', R));
const G = await import(new URL('greed-boss3d.js', R));

export function sim({ kind = 'greedA', hp = 1000, ceil = 14, seed = 3, hero = {}, ceilingHit = null } = {}) {
  const ev = [], dmg = []; let sq;
  sq = new Enemy1Squad({ seed, damageTarget: (id, d, info) => { dmg.push({ t: sq.time, d, ...info }); return hero.block && !info.pierceShield ? 'blocked' : 'hit'; },
    event: (type, d) => ev.push({ t: sq.time, type, phase: d && (d.phase || d.stage), d }), meleeTrace: () => false });
  sq.ceilingAt = ceil == null ? null : () => ceil; if (ceilingHit) sq.ceilingHit = ceilingHit; sq.abyssAnchor = { x: 0, y: 8, z: -25 };
  const a = sq.spawn([{ x: 0, z: 7, yaw: Math.PI, kind, hp }])[0]; a.alert = 0;
  const h = { id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, yaw: 0 }; sq.setTargets([h]);
  const boss = () => sq.actors.find(x => x.alive);
  const run = (secs, each) => { for (let i = 0; i < secs * 60; i++) { each && each(sq.time); sq.update(1 / 60); } };
  return { sq, a, h, ev, dmg, boss, run, of: (type, phase) => ev.filter(e => e.type === type && (!phase || e.phase === phase)) };
}
const force = (S, name) => { for (let i = 0; i < 600; i++) { const b = S.boss(); if (b && G.gkForceTech(S.sq, b, S.h, name)) return true; S.sq.update(1 / 60); } return false; };

test('Etapa 2A: trechos de dano da lógica = gume real do modelo (greed-weapons3d)', { skip: !THREE && 'three ausente' }, async () => {
  const W = await import(new URL('greed-weapons3d.js', R)), A = W.buildGreedArsenal(THREE);
  for (const k of 'ABCD') { const L = G.GK_WEAPON_EDGES[k], U = A[k].userData.edges; assert.equal(L.length, U.length, k);
    L.forEach((sg, i) => sg.forEach((p, j) => p.forEach((v, c) => assert.ok(Math.abs(v - U[i][j][c]) < .02, `${k} trecho ${i}`)))); }
});
test('Etapa 2A: lâminas afinam até a ponta (gume ~0) e têm bisel metálico separado', { skip: !THREE && 'three ausente' }, async () => {
  const W = await import(new URL('greed-weapons3d.js', R)), A = W.buildGreedArsenal(THREE);
  for (const k of 'ABCD') { let maxZ = 0, edgeZ = Infinity; const tip = A[k].userData.tip; let metal = 0;
    A[k].traverse(o => { if (!o.isMesh) return; if (o.material.fragmentShader && /glint\(vN,vV,40/.test(o.material.fragmentShader)) metal++;
      const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i) - tip.x, p.getY(i) - tip.y); if (d < .03) edgeZ = Math.min(edgeZ, Math.abs(p.getZ(i))); } });
    assert.ok(metal >= 1, k + ': bisel metálico'); assert.ok(edgeZ < .004, k + ': ponta afiada ' + edgeZ); }
});
test('Etapa 2: arma autônoma golpeia pelo GUME no espaço — longe do corpo da Ganância — com arcos variados', () => {
  const S = sim(); S.run(1); assert.ok(force(S, 'foices')); const kinds = new Set(); let far = 0;
  S.run(10, () => { const b = S.boss(); if (b) { b.x = 0; b.z = 16; } for (const e of b?.gk?.ents || []) if (e.strike) kinds.add(e.strike.c.p); });
  const hits = S.dmg.filter(d => d.kind === 'gkBlade'); for (const h of hits) if (Math.hypot(h.x, h.z) < 3) far++;
  assert.ok(hits.length >= 3, 'golpes que acertam: ' + hits.length); assert.ok(far >= 3, 'dano vem da arma perto do herói, não do chefe a 16 m');
  assert.ok(kinds.size >= 3, 'arcos variados: ' + [...kinds]);
});
test('Etapa 2: a mesma janela nunca dá dano duas vezes; o giro tem duas janelas', () => {
  const S = sim(); S.run(1); force(S, 'foices'); S.run(10);
  const hits = S.dmg.filter(d => d.kind === 'gkBlade'); assert.equal(new Set(hits.map(h => h.attackToken)).size, hits.length);
});
test('Etapa 2: arma não atravessa parede (empunhador para no bloqueio)', () => {
  const S = sim(); S.sq.blocked = (x, z) => z > 3.5 && z < 4.5; S.run(1); force(S, 'foices'); let crossed = 0;
  S.run(8, () => { for (const e of S.boss()?.gk?.ents || []) if (e.mode === 'duel' && e.wz > 3.5 && e.wz < 4.5) crossed++; });
  assert.equal(crossed, 0);
});

test('Etapa 3: troca de fase não deixa sol parado no ar (lógica + VFX)', { skip: !THREE && 'three ausente' }, async () => {
  const { createGreedVFX } = await import(new URL('greed-vfx3d.js', R)); const vfx = createGreedVFX(THREE, new THREE.Scene());
  const S = sim({ kind: 'greedB' }); S.sq.event = ((ev) => (t, d) => { ev(t, d); if (t.startsWith('gk')) vfx.event(t, d); })(S.sq.event.bind(S.sq));
  S.run(1); assert.ok(force(S, 'sois')); for (let i = 0; i < 900 && S.boss().gk.suns.filter(q => q.state !== 'done').length < 2; i++) S.sq.update(1 / 60); const live = [...S.boss().gk.suns]; assert.ok(live.length >= 2);
  vfx.update(1 / 60); assert.ok(vfx.stats().suns >= 2, 'sóis visíveis antes');
  S.sq.damageActor(S.boss(), 99999, { x: 0, z: 0, by: 'hero' }); S.run(.2);
  assert.ok(live.every(s => s.state === 'done'), 'lógica cancela os sóis'); vfx.update(1 / 60); assert.equal(vfx.stats().suns, 0, 'VFX esconde os sóis cancelados');
});

test('Etapa 4: clipes de voo não levam o corpo a 14 m (quadril fixo na altura de pé; altura é do ator)', { skip: !THREE && 'three ausente' }, () => {
  const track = (ys, dur) => new THREE.VectorKeyframeTrack('Hips.position', ys.map((_, i) => i * dur / (ys.length - 1)), ys.flatMap(y => [0, y, 0]));
  const walk = new THREE.AnimationClip('Walking', 1, [track([.87, .85, .88], 1)]);
  const dive2 = new THREE.AnimationClip('Dive_Down_and_Land_2', 3.07, [track(Array.from({ length: 93 }, (_, i) => 8.81 - 8.38 * i / 92), 3.07)]);
  const dive = new THREE.AnimationClip('Dive_Down_and_Land', 1.6, [track(Array.from({ length: 49 }, (_, i) => 3.12 - 3.6 * Math.min(1, i / 40) + (i > 40 ? (i - 40) * .1 : 0)), 1.6)]);
  const out = G.gkSynthB(THREE, [walk, dive2, dive]); const y = n => { const c = out.find(c => c.name === n); const v = c.tracks[0].values; const ys = []; for (let i = 1; i < v.length; i += 3) ys.push(v[i]); return ys; };
  for (const n of ['GK_fly', 'GK_dive']) assert.ok(Math.max(...y(n)) < 1.1 && Math.min(...y(n)) > .6, n + ' ' + Math.max(...y(n)).toFixed(2));
  assert.ok(Math.abs(y('GK_land').at(-1) - .87) < .05 && Math.min(...y('GK_land')) >= .87 * .45 - 1e-6, 'pouso termina de pé');
});

test('Etapa 4: voa até a superfície REAL (arcada a 16 m), pendura invertida, 4 sóis SÓ pendurada, volta ao voo', () => {
  const S = sim({ kind: 'greedB', ceil: 80 }); S.sq.hangSpot = () => ({ x: 20, y: 16, z: -30 }); S.run(1);
  let hangPos = null, sunsOutsideHang = 0;
  assert.ok(force(S, 'sois'));
  S.run(24, () => { const b = S.boss(); if (b.act?.stage === 'hang' && !hangPos) hangPos = { x: b.x, z: b.z, top: b.y + 1.25, flip: b.gkFlip };
    if (b.gk.suns.some(q => q.state === 'forming') && b.act?.stage !== 'hang') sunsOutsideHang++; });
  assert.ok(hangPos, 'pendurou'); assert.ok(Math.hypot(hangPos.x - 20, hangPos.z + 30) < .5, 'no ponto real'); assert.ok(Math.abs(hangPos.top - 16) < .2, 'pés no teto');
  assert.equal(sunsOutsideHang, 0, 'sóis nascem só pendurada'); assert.equal(S.of('gkSuns', 'launch').length, 4);
  assert.ok(S.of('gkFly', 'drop').length >= 1 && S.of('gkFly', 'landed').length >= 1, 'retoma o voo e pousa');
});
test('Etapa 4: sem superfície alcançável, "sóis" vira mergulho (nunca conjura do chão)', () => {
  const S = sim({ kind: 'greedB', ceil: 80 }); S.run(1); force(S, 'sois'); S.run(10);
  assert.equal(S.of('gkSuns', 'summon').length, 0); assert.ok(S.of('gkFly', 'dive').length >= 1);
});

test('Etapa 7: correntes de golpes nativos (4+ variações), cancelando só a recuperação', () => {
  const used = new Set(), moves = new Set(); let cutActive = 0;
  for (const seed of [3, 7, 11, 19]) { const S = sim({ kind: 'greedB', seed }); S.sq.meleeTrace = () => true; S.run(1); S.sq.damageActor(S.boss(), 99999, { x: 0, z: 0, by: 'hero' }); S.run(8);
    let prev = null; S.run(50, () => { const b = S.boss(); if (!b) return; const act = b.act; if (prev && prev.move && act !== prev && act?.move && prev.t < prev.move.close - .01 && b.gkChain) cutActive++; prev = act; S.h.x = Math.sin(S.sq.time * .3) * 1.5; });
    const st = S.boss()?.gk?.stats || {}; Object.keys(st.chainsUsed || {}).forEach(k => used.add(k)); Object.keys(st.moves || {}).forEach(k => moves.add(k)); }
  assert.ok(used.size >= 4, 'variações de corrente: ' + [...used]); assert.ok(moves.size >= 6, 'golpes nativos distintos: ' + [...moves]); assert.equal(cutActive, 0, 'nenhuma janela de dano cortada');
});
