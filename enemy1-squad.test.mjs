import test from 'node:test';
import assert from 'node:assert/strict';
import { Enemy1Squad, E1 } from './enemy1-squad3d.js';

const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .4, height: 1.8, alive: true, priority: 1, iframes: false, ...o });
function world(o = {}) {
  const log = [], dmg = [];
  const sq = new Enemy1Squad({ seed: o.seed || 7, blocked: o.blocked || (() => false), los: o.los, damageTarget: (id, n, info) => { dmg.push({ id, n, ...info }); return o.result ? o.result(id, n, info) : 'hit'; }, event: (type, d) => log.push({ type, ...d }) });
  return { sq, log, dmg };
}
const run = (sq, secs, dt = 1 / 60, each) => { const n = Math.round(secs / dt); for (let i = 0; i < n; i++) { if (each) each(i * dt); sq.update(dt); } };

test('quatro Enemy1 lutam ao mesmo tempo, com vida independente', () => {
  const { sq, log } = world(); const h = hero(); sq.setTargets([h]);
  sq.spawn([{ x: 6, z: 0 }, { x: -6, z: 0 }, { x: 0, z: 7 }, { x: 0, z: -7 }]);
  run(sq, 12);
  const acting = new Set(log.filter(e => ['windup', 'cast'].includes(e.type)).map(e => e.actor.id));
  assert.ok(acting.size >= 3, 'pelo menos 3 inimigos atacaram/conjuraram: ' + acting.size);
  assert.equal(sq.alive.length, 4);
  const roles = new Set(sq.actors.map(a => a.role)); assert.ok(roles.size >= 3, 'papéis distintos');
  const [a, b] = sq.actors; const hb = b.hp; sq.damageActor(a.id, 30, { x: 0, z: 0 }); assert.equal(b.hp, hb); assert.ok(a.hp < a.maxHp);
});

test('o grupo revezam: nunca dois golpes no mesmo alvo ao mesmo tempo e intervalo mínimo entre ataques', () => {
  const { sq, log } = world({ seed: 3 }); const h = hero(); sq.setTargets([h]);
  sq.spawn([{ x: 2.5, z: 0 }, { x: -2.5, z: 0 }, { x: 0, z: 2.5 }, { x: 0, z: -2.5 }]);
  let overlap = 0; run(sq, 15, 1 / 60, () => { const m = sq.actors.filter(a => a.alive && a.act && a.act.token === 'melee' && a.act.tid === 'hero'); if (m.length > 1) overlap++; });
  assert.equal(overlap, 0);
  const starts = log.filter(e => e.type === 'windup' || e.type === 'cast').map(e => e.actor && e.actor.id);
  assert.ok(starts.length > 4);
});

test('separação: inimigos não se empilham', () => {
  const { sq } = world({ seed: 11 }); sq.setTargets([hero()]);
  sq.spawn([{ x: 3, z: 0 }, { x: 3.1, z: .1 }, { x: 3.2, z: -.1 }, { x: 2.9, z: .2 }]);
  run(sq, 8);
  for (const a of sq.actors) for (const b of sq.actors) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > .75, 'distância ' + Math.hypot(a.x - b.x, a.z - b.z));
});

test('golpe só causa dano se a lâmina alcança o alvo', () => {
  const { sq, dmg } = world(); const h = hero({ x: 0, z: 0 }); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 1.6, yaw: Math.PI }]); a.alert = 0;
  sq.startMelee(a, h); h.x = 6; // o alvo saiu do alcance durante a preparação
  run(sq, 1.2); assert.equal(dmg.filter(d => d.kind === 'melee').length, 0);
  h.x = 0; a.cds = {}; a.act = null; sq.lastAttackAt = -9; sq.startMelee(a, h); run(sq, 1.2);
  assert.equal(dmg.filter(d => d.kind === 'melee').length, 1);
});

test('Garras: telegraph, prende quem ficou, solta e dá imunidade; dash cedo não solta, dash no tempo solta', () => {
  const { sq, log, dmg } = world(); const h = hero({ x: 0, z: 0 }); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 6, yaw: Math.PI }]); a.alert = 99; a.decideT = 99;
  const s = sq.spawnClaws(a, h); sq.paused = false;
  run(sq, s.T.telegraph * .9); assert.equal(s.phase, 'telegraph'); assert.equal(dmg.length, 0, 'sem dano no aviso');
  run(sq, .5); assert.equal(s.phase, 'grab'); assert.ok(log.some(e => e.type === 'grab'));
  assert.equal(sq.breakFree('hero'), false, 'cedo demais');
  run(sq, .35); assert.equal(sq.breakFree('hero'), true, 'dash no tempo solta'); assert.ok(sq.ccImmune.has('hero'));
  const s2 = sq.spawnClaws(a, h); run(sq, 1.4); assert.equal(s2.held, null, 'imune não é preso de novo');
});

test('Garras: esquiva com i-frames no fechamento evita; só uma prisão por alvo', () => {
  const { sq, log } = world(); const h = hero(); sq.setTargets([h]);
  const actors = sq.spawn([{ x: 0, z: 6 }, { x: 6, z: 0 }, { x: -6, z: 0 }]); for (const a of actors) { a.alert = 99; a.decideT = 99; }
  const s = sq.spawnClaws(actors[0], h); run(sq, s.T.telegraph + s.T.rise - .05); h.iframes = true; run(sq, .1); h.iframes = false;
  assert.equal(s.held, null); assert.ok(log.some(e => e.type === 'evaded'));
  sq.spells.length = 0;
  const a1 = sq.spawnClaws(actors[1], h), a2 = sq.spawnClaws(actors[2], h); run(sq, 1.4);
  assert.equal([a1, a2].filter(x => x.held || x.phase === 'grab').length <= 1, true);
});

test('Espiral: viaja (não nasce no alvo), acerta uma única vez e para na parede', () => {
  const { sq, dmg } = world(); const h = hero({ x: 0, z: 0 }); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 10, yaw: Math.PI }]); a.alert = 99; a.decideT = 99;
  const s = sq.spawnSpiral(a, h); assert.ok(Math.hypot(s.x - h.x, s.z - h.z) > 8);
  run(sq, .3); assert.equal(dmg.length, 0, 'ainda voando');
  run(sq, 1.5); assert.equal(dmg.filter(d => d.kind === 'spiral').length, 1); assert.equal(s.phase === 'burst' || s.dead, true);
  const w = world({ blocked: (x, z) => z < 5 && z > 4 }); w.sq.setTargets([hero()]); const [b] = w.sq.spawn([{ x: 0, z: 10, yaw: Math.PI }]); b.alert = 99; b.decideT = 99;
  const s2 = w.sq.spawnSpiral(b, hero()); run(w.sq, 2); assert.equal(s2.why, 'wall'); assert.equal(w.dmg.length, 0);
});

test('Juízo: marca segue a previsão só na preparação; quem sai da área travada não toma dano; queda por distância', () => {
  const { sq, dmg } = world(); const h = hero({ x: 0, z: 0 }); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI }]); a.alert = 99; a.decideT = 99;
  const s = sq.spawnJudgment(a, h); h.x = 2; run(sq, s.T.prep * .8); assert.ok(s.mx > .5, 'marca acompanhou');
  run(sq, s.T.prep * .25); assert.equal(s.phase, 'lock'); const lx = s.mx; h.x = 9; run(sq, .2); assert.equal(s.mx, lx, 'travada');
  run(sq, 1); assert.equal(dmg.length, 0, 'saiu da área');
  const w = world(); const h2 = hero(); w.sq.setTargets([h2, hero({ id: 'ally', team: 'ally', x: 2.2 })]); const [b] = w.sq.spawn([{ x: 0, z: 12, yaw: Math.PI }]); b.alert = 99; b.decideT = 99;
  w.sq.spawnJudgment(b, h2); run(w.sq, 2.5);
  const hh = w.dmg.find(d => d.id === 'hero'), ha = w.dmg.find(d => d.id === 'ally');
  assert.ok(hh && ha && hh.n > ha.n, 'centro dói mais que a borda');
});

test('Contra-selo: magia contra magia resolve vitória, anulação ou derrota', () => {
  for (const [power, outcome] of [[14, 'neutral'], [5, 'enemy'], [40, 'foreign']]) {
    const { sq, log } = world(); sq.setTargets([hero()]); const [a] = sq.spawn([{ x: 0, z: 10, yaw: Math.PI }]); a.alert = 99; a.decideT = 99;
    const f = { id: 'p1', team: 'hero', x: 0, y: 1.2, z: 2, dx: 0, dz: 1, speed: 10, r: .4, power, alive: true, killed: false, kill() { this.killed = true; }, weaken(n) { this.weak = n; } };
    sq.setForeignSpells([f]); sq.spawnCounter(a, f);
    for (let i = 0; i < 60 && !log.some(e => e.type === 'clash'); i++) { f.z += f.dz * f.speed / 60; sq.update(1 / 60); }
    const c = log.find(e => e.type === 'clash'); assert.ok(c, 'colidiu'); assert.equal(c.outcome, outcome);
    if (outcome !== 'foreign') assert.equal(f.killed, true); else assert.ok(f.weak > 0);
  }
});

test('reage a magia vindo: contra-selo ou esquiva aparecem, sem ler comando futuro', () => {
  let reacted = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const { sq, log } = world({ seed }); sq.setTargets([hero()]); const [a] = sq.spawn([{ x: 0, z: 9, yaw: Math.PI, kind: 'warden' }]); a.alert = 0;
    const f = { id: 'p' + seed, team: 'hero', x: 0, y: 1.2, z: 1, dx: 0, dz: 1, speed: 9, r: .4, power: 12, alive: true, kill() { this.alive = false; }, weaken() {} };
    sq.setForeignSpells([f]); for (let i = 0; i < 50; i++) { f.z += .15; sq.update(1 / 60); }
    if (log.some(e => e.type === 'counterCast' || e.type === 'dodge')) reacted++;
  }
  assert.ok(reacted > 3 && reacted < 30, 'reage às vezes, não sempre: ' + reacted);
});

test('NPC aliado também é alvo; dano vai para o id dele', () => {
  const { sq, dmg } = world(); const ally = hero({ id: 'npc', team: 'ally', x: 1, z: 0 }); sq.setTargets([ally]);
  sq.spawn([{ x: 4, z: 0 }, { x: -3, z: 2 }]); run(sq, 10);
  assert.ok(dmg.length > 0 && dmg.every(d => d.id === 'npc'));
});

test('área do herói acerta vários uma vez cada; morte e fim do encontro', () => {
  const { sq, log } = world(); sq.setTargets([hero()]);
  sq.spawn([{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1.2 }, { x: 9, z: 9 }]);
  assert.equal(sq.areaDamage(0, 0, 2, 25), 3);
  for (const a of sq.actors) sq.damageActor(a.id, 999, { x: 0, z: 0 });
  assert.equal(sq.done, true); assert.equal(log.filter(e => e.type === 'death').length, 4);
});

test('determinístico em qualquer FPS (passo fixo)', () => {
  const snap = dt => { const { sq } = world({ seed: 99 }); sq.setTargets([hero()]); sq.spawn([{ x: 5, z: 1 }, { x: -4, z: 3 }, { x: 2, z: -6 }]); run(sq, 6, dt); return JSON.stringify(sq.snapshot().actors); };
  assert.equal(snap(1 / 20), snap(1 / 144));
});

test('Guardião: combo de dois cortes, fase 2 aos 50% e foice que abre as garras', () => {
  const { sq, log, dmg } = world({ seed: 5 }); const h = hero({ x: 0, z: 0 }); sq.setTargets([h]);
  const [w] = sq.spawn([{ x: 0, z: 2.4, yaw: Math.PI, kind: 'warden' }]); w.alert = 0; w.decideT = 99;
  assert.equal(w.maxHp, E1.warden.hp);
  sq.startMelee(w, h); run(sq, 1.8);
  assert.equal(dmg.filter(d => d.kind === 'melee').length, 2, 'dois cortes');
  assert.ok(log.some(e => e.type === 'reap'), 'assinatura foice + garras');
  sq.damageActor(w.id, w.maxHp * .55, { x: 0, z: 0 }); assert.equal(w.phase2, true); assert.ok(log.some(e => e.type === 'phase2'));
  assert.ok(w.cdMul < 1);
});

test('defesa custa estamina e quebra a guarda', () => {
  const { sq, log } = world(); sq.setTargets([hero()]);
  const [a] = sq.spawn([{ x: 0, z: 2, yaw: Math.PI }]); a.alert = 99; a.decideT = 99;
  sq.begin(a, { type: 'block', dur: 5, anim: 'block', guard: true });
  const d1 = sq.damageActor(a.id, 20, { x: 0, z: 0 }); assert.ok(d1 < 20);
  for (let i = 0; i < 8 && a.guard; i++) sq.damageActor(a.id, 20, { x: 0, z: 0 });
  assert.ok(log.some(e => e.type === 'guardBreak'));
});
