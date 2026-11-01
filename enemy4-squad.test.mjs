import test from 'node:test';
import assert from 'node:assert/strict';
import { Enemy1Squad, SKILLS } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';
import { E4 } from './enemy4-squad3d.js';
import { E3 } from './enemy3-squad3d.js';

const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, iframes: false, air: 0, ...o });
function world(o = {}) { const log = [], dmg = []; const sq = new Enemy1Squad({ seed: o.seed || 4, blocked: o.blocked || (() => false), ground: o.ground || (() => 0), meleeTrace: o.trace || (() => false), damageTarget: (id, n, info) => { dmg.push({ id, n, ...info }); return 'hit'; }, event: (type, d) => log.push({ type, ...d }) }); return { sq, log, dmg }; }
const run = (sq, secs, dt = 1 / 60, each) => { for (let i = 0; i < Math.round(secs / dt); i++) { if (each) each(i * dt); sq.update(dt); } };
const idle = a => { a.alert = 1e9; a.decideT = 1e9; return a; };
const cast = (sq, a, t, id) => { a.cds[id] = 0; sq.startCast(a, t, id); return () => sq.spells.find(s => s.type === id); };
const spawn = (sq, kind, z = 10) => sq.spawn([{ x: 0, z, yaw: Math.PI, kind }]).map(idle)[0];

test('Enemy4 e mini-chefe Enemy4 são espécies distintas do mini-chefe 3; chefe com quatro poderes e escala maior', () => {
  assert.deepEqual(E4.common.kit, ['sanctum', 'constellation', 'drill']); assert.deepEqual(E4.boss.kit, ['sanctum', 'constellation', 'drill', 'cage']);
  for (const k of E4.boss.kit) assert.ok(SKILLS[k], k);
  assert.ok(E4.boss.hp > E4.common.hp * 2.5 && E4.boss.height / E4.common.height >= 1.3 && E4.boss.sanctum.n >= 18 && E4.common.sanctum.n >= 10 && E4.boss.constellation.n >= 10);
  assert.notEqual(E4.boss, E3.boss); assert.deepEqual(BOSS_MOVES.e4boss.map(m => m.kind), ['e4boss', 'e4boss', 'e4boss']);
  const { sq, log } = world(); sq.setTargets([hero()]); sq.spawn([{ x: 9, z: 0, kind: 'e4' }, { x: -9, z: 2, kind: 'e4' }, { x: 0, z: 11, kind: 'e4' }]); run(sq, 24);
  const casts = log.filter(e => e.type === 'cast').map(e => e.skill); for (const k of E4.common.kit) assert.ok(casts.includes(k), k + ': ' + casts);
});

test('Santuário: marcas escalonadas (~4 s), fixas, separadas, teto de vivas; pilar dá dano uma vez; quem sai das marcas escapa', () => {
  const { sq, log, dmg } = world(); const h = hero(); sq.setTargets([h]); const a = spawn(sq, 'e4'); const T = a.T.sanctum;
  cast(sq, a, h, 'sanctum'); let maxLive = 0, minSep = 9, moved = 0; const pos = new Map();
  run(sq, 7, 1 / 60, () => { const s = sq.spells.find(x => x.type === 'sanctum'); if (!s) return; const hot = s.marks.filter(m => m.phase !== 'fade'); maxLive = Math.max(maxLive, hot.length);
    for (let i = 0; i < hot.length; i++) for (let j = i + 1; j < hot.length; j++) minSep = Math.min(minSep, Math.hypot(hot[i].x - hot[j].x, hot[i].z - hot[j].z));
    for (const m of s.marks) { const k = s.id + ':' + m.id, p = pos.get(k); if (p && (p[0] !== m.x || p[1] !== m.z)) moved++; pos.set(k, [m.x, m.z]); } });
  const marks = log.filter(e => e.type === 'sanctumMark'), pillars = log.filter(e => e.type === 'sanctumPillar');
  assert.ok(marks.length >= 6 && pillars.length === marks.length); assert.ok(maxLive <= T.maxLive); assert.ok(minSep >= T.sep - 1e-6); assert.equal(moved, 0, 'nunca re-aponta');
  for (const e of marks) assert.ok(e.mark.warn >= .9); const per = new Map(); for (const d of dmg) per.set(d.spell, (per.get(d.spell) || 0) + 1); assert.ok(dmg.length <= pillars.length);
  { const w = world({ seed: 9 }); const t = hero(); w.sq.setTargets([t]); const b = spawn(w.sq, 'e4'); cast(w.sq, b, t, 'sanctum');
    run(w.sq, 7, 1 / 60, () => { const s = w.sq.spells.find(x => x.type === 'sanctum'); if (!s) return; for (const m of s.marks) if ((m.phase === 'warn' || m.phase === 'charge') && Math.hypot(t.x - m.x, t.z - m.z) < m.r + 1.1) { const dx = t.x - m.x, dz = t.z - m.z, l = Math.hypot(dx, dz) || 1; t.x += dx / l * 5 / 60; t.z += dz / l * 5 / 60; } });
    assert.equal(w.dmg.length, 0, 'sempre há corredor seguro'); }
});

test('Constelação: preparação, disparo um a um com mira travada, detona no primeiro impacto (herói/chão/parede), uma vez', () => {
  const { sq, log, dmg } = world(); const h = hero(); sq.setTargets([h]); const a = spawn(sq, 'e4'); const T = a.T.constellation;
  cast(sq, a, h, 'constellation'); run(sq, T.release + T.prep - .05); assert.ok(!log.some(e => e.type === 'orbShot'));
  const shots = []; run(sq, 6, 1 / 60, tt => { const n = log.filter(e => e.type === 'orbShot').length; if (n > shots.length) shots.push(tt); });
  assert.equal(shots.length, T.n); for (let i = 1; i < shots.length; i++) assert.ok(shots[i] - shots[i - 1] >= T.cadence - .03, 'um a um');
  const booms = log.filter(e => e.type === 'orbBoom'); assert.equal(new Set(booms.map(e => e.orb.i)).size, booms.length, 'nunca explode duas vezes');
  assert.ok(dmg.length >= 1 && dmg.every(d => d.kind === 'constellation'));
  const w = world({ blocked: (x, z) => z > 5 && z < 6 }); const t = hero(); w.sq.setTargets([t]); const b = spawn(w.sq, 'e4', 12); cast(w.sq, b, t, 'constellation'); run(w.sq, 6);
  assert.equal(w.dmg.length, 0); assert.ok(w.log.some(e => e.type === 'orbBoom' && e.why === 'wall'));
  const st = world(); const t2 = hero(); st.sq.setTargets([t2]); const c = spawn(st.sq, 'e4'); cast(st.sq, c, t2, 'constellation'); run(st.sq, .6); st.sq.stagger(c, .3, false); run(st.sq, 4);
  assert.equal(st.dmg.length, 0, 'atordoar na preparação desfaz as esferas'); assert.ok(!st.sq.spells.length);
});

test('Perfurador: frontal contra alvo previsível, subterrâneo contra quem cruza de lado; marcas fixas; teto de acertos; i-frames', () => {
  const pick = vx => { const { sq, log } = world({ seed: 2 }); const h = hero({ vx }); sq.setTargets([h]); const a = spawn(sq, 'e4'); cast(sq, a, h, 'drill'); run(sq, .5); return log.find(e => e.type === 'drill').mode; };
  let front = 0, under = 0; for (let s = 1; s <= 12; s++) { const w = world({ seed: s }); const h = hero(); w.sq.setTargets([h]); const a = spawn(w.sq, 'e4'); cast(w.sq, a, h, 'drill'); run(w.sq, .5); if (w.log.find(e => e.type === 'drill').mode === 'front') front++;
    const v = world({ seed: s }); const h2 = hero({ vx: 4 }); v.sq.setTargets([h2]); const b = spawn(v.sq, 'e4'); cast(v.sq, b, h2, 'drill'); run(v.sq, .5); if (v.log.find(e => e.type === 'drill').mode === 'under') under++; }
  assert.ok(front >= 7 && under >= 7, front + '/' + under); void pick;
  for (const vx of [0, 4]) { const { sq, dmg } = world({ seed: 3 }); const h = hero({ vx }); sq.setTargets([h]); const a = spawn(sq, 'e4'); cast(sq, a, h, 'drill'); run(sq, 4); assert.ok(dmg.length <= a.T.drill.maxHits); }
  { const { sq, dmg } = world(); const h = hero({ iframes: true }); sq.setTargets([h]); const a = spawn(sq, 'e4'); cast(sq, a, h, 'drill'); run(sq, 4); assert.equal(dmg.length, 0); }
  { const { sq, log } = world({ seed: 5 }); const h = hero({ vx: 5 }); sq.setTargets([h]); const a = spawn(sq, 'e4'); for (let i = 0; i < 20 && sq.spells.length === 0; i++) { cast(sq, a, h, 'drill'); run(sq, .45); }
    const s = sq.spells.find(x => x.type === 'drill'); if (s && s.mode === 'under') { const snap = s.drills.map(d => [d.id, d.x, d.z]); run(sq, .3); for (const [id, x, z] of snap) { const d = s.drills.find(q => q.id === id); if (d) assert.deepEqual([d.x, d.z], [x, z]); } } void log; }
});

test('Jaula do mini-chefe: anel parcial com duas rotas de fuga, lentidão só ao ser atingido; mordida no ponto travado; cancelável', () => {
  const { sq, log, dmg } = world(); const h = hero({ vz: -3 }); sq.setTargets([h]); const b = spawn(sq, 'e4boss', 9); const T = b.T.cage;
  cast(sq, b, h, 'cage'); run(sq, T.release + .05); const s = sq.spells.find(x => x.type === 'cage');
  assert.equal(s.chains.length, T.chains); const angs = s.chains.map(c => c.ang).sort((p, q) => Math.sin(p - q));
  for (const g of s.gaps) assert.ok(s.chains.every(c => Math.abs(Math.atan2(Math.sin(c.ang - g), Math.cos(c.ang - g))) > .5), 'rota de fuga aberta'); void angs;
  run(sq, T.biteAt + .1); const bx = s.bx, bz = s.bz; h.x = 0; h.z = 0; run(sq, .3); assert.deepEqual([s.bx, s.bz], [bx, bz], 'mordida travada');
  run(sq, 2); assert.ok(log.some(e => e.type === 'biteSnap')); assert.ok(dmg.filter(d => d.kind === 'bite').length <= 1); assert.ok(dmg.every(d => d.kind !== 'cageChain' || d.slow <= 1.2));
  const w = world(); const t = hero({ vz: -3 }); w.sq.setTargets([t]); const c = spawn(w.sq, 'e4boss', 9); cast(w.sq, c, t, 'cage'); run(w.sq, .8); w.sq.damageActor(c, 99999, {}); run(w.sq, 3);
  assert.ok(!w.log.some(e => e.type === 'biteSnap')); assert.ok(!w.sq.spells.length);
  const e4 = world(); const t3 = hero({ vz: -3 }); e4.sq.setTargets([t3]); spawn(e4.sq, 'e4'); assert.equal(SKILLS.cage.score(e4.sq, e4.sq.actors[0], t3, { see: true, d: 9 }) !== null, true); assert.ok(!E4.common.kit.includes('cage'), 'exclusiva do mini-chefe');
});

test('Espada-Mandíbula: três golpes com contato só pela trajetória real, um por janela, sem atravessar o alvo', () => {
  for (const m of BOSS_MOVES.e4boss) for (const fps of [20, 60, 120]) {
    const { sq, dmg } = world({ trace: () => true }); const t = hero({ z: 2.4 }); sq.setTargets([t]); const a = sq.spawn([{ x: 0, z: 0, kind: 'e4boss' }]).map(idle)[0];
    sq.startMelee(a, t, m.id); for (let i = 0; i < Math.ceil((m.duration + .1) * fps); i++) sq.update(1 / fps);
    assert.equal(dmg.filter(d => d.kind === 'melee').length, m.hits.length, m.id + '@' + fps); assert.ok(a.z < t.z - t.radius); assert.ok(m.recovery > .3);
  }
  const { sq, dmg } = world({ trace: () => false }); const t = hero({ z: 2 }); sq.setTargets([t]); const a = sq.spawn([{ x: 0, z: 0, kind: 'e4boss' }]).map(idle)[0]; sq.startMelee(a, t, 'Mandibula_Varredura'); run(sq, 2.2); assert.equal(dmg.length, 0);
});

test('Determinismo e limpeza do Enemy4: mesmo combate a 30/60/144 FPS, nada preso depois de ciclos', () => {
  const sig = fps => { const { sq, log } = world({ seed: 31 }); sq.setTargets([hero()]); sq.spawn([{ x: 8, z: 0, kind: 'e4' }, { x: -8, z: 5, kind: 'e4boss' }]); for (let i = 0; i < 18 * fps; i++) sq.update(1 / fps); return log.filter(e => e.type === 'cast').map(e => e.skill).join(','); };
  assert.equal(sig(30), sig(60)); assert.equal(sig(60), sig(144));
  const { sq } = world(); const h = hero({ vz: -2 }); sq.setTargets([h]); const b = spawn(sq, 'e4boss', 9);
  for (const id of ['sanctum', 'constellation', 'drill', 'cage', 'sanctum', 'drill']) { b.act = null; cast(sq, b, h, id); run(sq, 8); } assert.equal(sq.spells.length, 0);
});
