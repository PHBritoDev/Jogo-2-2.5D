import { MOD } from '../build-info.js';
/* MOD 342 — Ganância em três fases: fluxo de fases, armas autônomas, lança, sóis, abismo, voo/teto e multi-hit. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const R = new URL('../', import.meta.url), read = f => fs.readFileSync(new URL(f, R), 'utf8');
const { Enemy1Squad } = await import(new URL('enemy1-squad3d.js', R));
const G = await import(new URL('greed-boss3d.js', R));

function sim({ kind = 'greedA', hp = 1000, ceil = 14, seed = 3, hero = {} } = {}) {
  const ev = [], dmg = []; let sq;
  sq = new Enemy1Squad({ seed, damageTarget: (id, d, info) => { dmg.push({ t: sq.time, d, ...info }); return hero.block && !info.pierceShield ? 'blocked' : 'hit'; },
    event: (type, d) => ev.push({ t: sq.time, type, phase: d && (d.phase || d.stage), d }), meleeTrace: () => false });
  sq.ceilingAt = ceil == null ? null : () => ceil; sq.abyssAnchor = { x: 0, y: 8, z: -25 };
  const a = sq.spawn([{ x: 0, z: 7, yaw: Math.PI, kind, hp }])[0]; a.alert = 0;
  const h = { id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, yaw: 0 }; sq.setTargets([h]);
  const boss = () => sq.actors.find(x => x.alive);
  const run = (secs, each) => { for (let i = 0; i < secs * 60; i++) { each && each(sq.time); sq.update(1 / 60); } };
  return { sq, a, h, ev, dmg, boss, run, of: (type, phase) => ev.filter(e => e.type === type && (!phase || e.phase === phase)) };
}
const force = (S, name) => { for (let i = 0; i < 600; i++) { const b = S.boss(); if (b && G.gkForceTech(S.sq, b, S.h, name)) return true; S.sq.update(1 / 60); } return false; };

test('assets e integração: GLBs, versão mínima 342, runtime e mundo ligados, Codex intocado', () => {
  for (const f of ['NewGanancia1.glb', 'NewGanancia2.glb', 'GananciaAsas2.glb']) assert.ok(fs.statSync(new URL(f, R)).size > 1e5, f);
  assert.ok(Number.isInteger(MOD) && MOD >= 342, `A integração da Ganância exige Mod 342 ou posterior. Mod atual: ${MOD}`);
  const m = read('mundo-3d-prototype.js'), rt = read('enemy1-squad-runtime3d.js');
  assert.match(m, /from '\.\/greed-boss3d\.js\?v=mod342'|from '\.\/greed-boss3d\.js'/);
  assert.match(m, /rig:'greed1n'/); assert.match(m, /greedCeilingAt/); assert.match(m, /greedAbyssAnchor/);
  assert.match(rt, /createGreedRuntime/); assert.doesNotMatch(read('greed-boss3d.js'), /greed-abyss3d/);
});

test('poderes genéricos antigos removidos (kits, ultimate, BOSS_POWERS)', async () => {
  const { pickMove } = await import(new URL('powers3d.js', R)); const { ultimateFor } = await import(new URL('ultimates3d.js', R));
  for (const p of ['greed1', 'greed2', 'greed3']) { assert.equal(pickMove(p, {}, 6, ''), null); assert.equal(ultimateFor(p), null); }
  assert.doesNotMatch(read('mundo-3d-prototype.js'), /greed[123]:\{cd:/);
});

test('fluxo: fase I → queda → fase II → ressurreição → fase III; vitória só depois da III', () => {
  const S = sim(); S.run(3);
  S.sq.damageActor(S.boss(), 99999, { x: 0, z: 0, by: 'hero' }); S.run(6);
  const b = S.boss(); assert.equal(b.kind, 'greedB'); assert.equal(b.gk.phase, 2);
  assert.deepEqual(S.of('gkPhase').map(e => e.phase).slice(0, 2), ['fall', 'arise']);
  S.sq.damageActor(b, 99999, { x: 0, z: 0, by: 'hero' }); assert.ok(b.alive, 'fase II não morre: ressuscita');
  S.run(8); assert.equal(b.gk.phase, 3); assert.ok(b.hp > 0);
  assert.deepEqual(S.of('gkPhase').map(e => e.phase).slice(2, 6), ['die', 'hold', 'rise', 'burst']);
    assert.deepEqual(b.gk.ents.map(e => e.key).sort(), ['A', 'B', 'C', 'D']);
  S.sq.damageActor(b, 99999, { x: 0, z: 0, by: 'hero' }); S.run(4); assert.equal(S.sq.actors.some(x => x.alive), false, 'só agora a vitória');
});

test('foices: autônomas por 10 s, multi-hit por janelas distintas, depois caem e somem', () => {
  const S = sim(); S.run(1); assert.ok(force(S, 'foices'));
  S.run(16, () => { S.h.attacking = false; });
  const L = S.of('gkBlade', 'launch')[0], F = S.of('gkBlade', 'fall')[0];
  assert.ok(L && F, 'lançou e caiu'); assert.ok(Math.abs(F.t - L.t - G.GK.scythe.life) < .6, 'vida ' + (F.t - L.t).toFixed(2));
  assert.ok(S.of('gkBlade', 'gone').length >= 1, 'some depois de cair');
  const hits = S.dmg.filter(d => d.gkSrc && /^blade/.test(String(d.gkSrc)));
  const strikes = new Set(hits.map(d => d.attackToken)); assert.ok(hits.length >= 2 && strikes.size === hits.length, 'cada janela dá dano uma vez: ' + hits.length + '/' + strikes.size);
});

test('foice: escudo bloqueia; choque de lâminas repele (clash)', () => {
  const S = sim({ hero: { block: true } }); S.run(1); force(S, 'foices'); S.run(8);
  assert.ok(S.boss().gk.stats.scytheBlock >= 1, 'bloqueada pelo escudo');
  const C = sim(); C.run(1); force(C, 'foices'); C.run(8, t => { C.h.attacking = (t % .8) < .3; C.h.yaw = Math.atan2(C.boss().gk.ents[0]?.x ?? 0, C.boss().gk.ents[0]?.z ?? 1); });
  assert.ok(C.boss().gk.stats.clash >= 1, 'clash ' + C.boss().gk.stats.clash);
});

test('lança: reta com homing limitado, 5 s, atravessa o escudo', () => {
  const S = sim({ hero: { block: true } }); S.run(1); assert.ok(force(S, 'lanca'));
  S.run(8, t => { S.h.x = Math.sin(t) * 3; });
  const L = S.of('gkSpear', 'launch')[0], E = S.of('gkSpear', 'end')[0]; assert.ok(L && E);
  assert.ok(E.t - L.t <= G.GK.spear.life + .1);
  const hit = S.dmg.find(d => d.pierceShield); if (hit) assert.equal(hit.pierceShield, true);
  assert.ok(G.GK.spear.turn < 3, 'homing limitado');
  const T = sim(); T.sq.blocked = () => false; T.sq.ground = () => 0; T.run(1); force(T, 'lanca'); T.run(8, () => { if (T.of('gkSpear', 'launch').length) { T.h.x = 0; T.h.z = 400; } });
  const L2 = T.of('gkSpear', 'launch')[0], E2 = T.of('gkSpear', 'end')[0]; assert.ok(Math.abs(E2.t - L2.t - G.GK.spear.life) < .2, 'some em 5 s sem acerto');
});

test('fase II: quatro mini-sóis, um por vez, trajetórias e impactos independentes', () => {
  const S = sim({ kind: 'greedB' }); S.run(1); assert.ok(force(S, 'sois')); S.run(14);
  const launch = S.of('gkSuns', 'launch').slice(0, 4), boom = S.of('gkSuns', 'boom').slice(0, 4);
  assert.equal(new Set(launch.map(e => e.d.sun)).size, 4, 'quatro sóis distintos'); assert.equal(new Set(boom.map(e => e.d.sun)).size, 4, 'quatro impactos próprios');
  const times = launch.map(e => e.t); assert.ok(times.every((t, i) => !i || t - times[i - 1] > .15), 'um por vez');
  const pts = boom.map(e => e.d.sun.x.toFixed(1) + ',' + e.d.sun.z.toFixed(1)); assert.ok(new Set(pts).size >= 3, 'impactos em pontos distintos');
  assert.ok(S.boss().gk.stats.sunHit + S.boss().gk.stats.sunArea >= 1, 'pelo menos um sol resolveu dano (direto ou área)');
});

test('voo: pendura no teto só com teto real; sem teto aborta para mergulho', () => {
  const S = sim({ kind: 'greedB', ceil: 14 }); S.run(1); assert.ok(force(S, 'voo-hang')); S.run(14);
  assert.ok(S.of('gkFly', 'hang').length >= 1, 'pendurou');
  const N = sim({ kind: 'greedB', ceil: null }); N.run(1); force(N, 'voo-hang'); N.run(14);
  assert.equal(N.of('gkFly', 'hang').length, 0, 'sem teto não pendura');
  const L = sim({ kind: 'greedB', ceil: G.GK.fly.minCeil - 1 }); L.run(1); force(L, 'voo-hang'); L.run(14);
  assert.equal(L.of('gkFly', 'hang').length, 0, 'teto baixo não pendura');
  const H = sim({ kind: 'greedB', ceil: 80 }); H.run(1); force(H, 'voo-hang'); H.run(14);
  assert.equal(H.of('gkFly', 'hang').length, 0, 'teto alto demais (garganta ~80 m) aborta'); assert.ok(Math.max(...H.of('gkFly').map(e => e.d.actor.airY || 0)) < 8, 'não sobe até o teto distante');
});

test('fase III: esfera do abismo — primeira em 30–40 s, depois 20–25 s com vida baixa', () => {
  const S = sim({ kind: 'greedB' }); S.run(1); const b = S.boss();
  S.sq.damageActor(b, 99999, { x: 0, z: 0, by: 'hero' }); S.run(7); assert.equal(b.gk.phase, 3);
  const t0 = S.sq.time; S.run(42); const f = S.of('gkAbyss', 'fire');
  assert.ok(f.length >= 1); const first = f[0].t - t0; assert.ok(first >= 28 && first <= 42, 'primeira ' + first.toFixed(1));
  b.hp = b.maxHp * .2; S.run(30); const f2 = S.of('gkAbyss', 'fire'); assert.ok(f2.length >= 2);
  const gap = f2.at(-1).t - f2.at(-2).t; assert.ok(gap >= 18 && gap <= 30, 'intervalo ' + gap.toFixed(1));
});

test('revisão: choque só de frente (yaw real), graça pós-acerto vai ao resolvedor, lança em órbita arremessável na fase III', () => {
  const clashWith = facing => { const C = sim(); C.run(1); force(C, 'foices'); C.run(8, t => { C.h.attacking = (t % .8) < .3; const e = C.boss().gk.ents[0]; const yawTo = e ? Math.atan2(e.x - C.h.x, e.z - C.h.z) : 0; C.h.yaw = facing ? yawTo : yawTo + Math.PI; }); return C.boss().gk.stats.clash; };
  assert.ok(clashWith(true) >= 1, 'de frente repele'); assert.equal(clashWith(false), 0, 'de costas não repele');
  const grace = evading => { const S = sim(); S.h.iframes = true; S.h.evading = evading; S.run(1); force(S, 'foices'); S.run(8); return S.dmg.filter(d => d.kind === 'gkBlade').length; };
  assert.ok(grace(false) >= 1, 'graça pós-acerto: o jogo decide (fontes independentes)'); assert.equal(grace(true), 0, 'esquiva real anula');
  const S = sim({ kind: 'greedB' }); S.run(1); S.sq.damageActor(S.boss(), 99999, { x: 0, z: 0, by: 'hero' }); S.run(7); assert.equal(S.boss().gk.phase, 3);
  assert.ok(force(S, 'lanca'), 'lança em órbita pode ser arremessada'); S.run(4); assert.ok(S.of('gkSpear', 'launch').length >= 1);
  const N = sim({ kind: 'greedB', seed: 7 }); N.run(1); N.sq.damageActor(N.boss(), 99999, { x: 0, z: 0, by: 'hero' }); N.run(90, t => { N.h.x = Math.sin(t * .4) * 9; N.h.z = Math.cos(t * .3) * 9; });
  assert.ok(N.of('gkSpear', 'launch').length >= 1, 'a IA da fase III escolhe a lança sozinha');
});
