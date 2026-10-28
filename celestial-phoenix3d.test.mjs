import test from 'node:test'; import assert from 'node:assert/strict';
import { CelestialPhoenix, PHOENIX, PHOENIX_TOTAL } from './celestial-phoenix3d.js'; import { SKILLS, canCast, unlockedSkills } from './skills3d.js';
const target = () => ({ id: 1, alive: true, x: 0, y: 0, z: 9, radius: .6, height: 2 });
function run(fps = 60, options = {}, t = target()) {
  const hits = [], events = [], holds = [], s = new CelestialPhoenix({ ...options, hit: (d, id, k) => hits.push([d, id, k]), event: k => events.push(k) });
  s.start({ x: 0, y: 0, z: 0 }, t, 0);
  for (let i = 0; i < fps * 20; i++) { s.update(1 / fps, t); if (s.hold.active) holds.push({ ...s.hold, phase: s.phase }); }
  return { s, hits, events, holds };
}
test('MOD 229: FSM completa na ordem pedida', () => {
  const r = run();
  const order = ['cast', 'form', 'flight', 'capture', 'burst', 'orbit', 'ascend', 'dive', 'impact', 'burn', 'fade', 'cancel'];
  assert.deepEqual(r.events.filter(e => order.includes(e)), order);
  assert(!r.s.active);
});
test('MOD 229: o tornado não explode no primeiro toque — prende o alvo por 3 s com ticks antes da explosão', () => {
  const r = run();
  const kinds = r.hits.map(h => h[2]);
  assert.deepEqual(kinds, [...Array(6).fill('cyclone'), 'burst', 'strike', ...Array(3).fill('burn')]);
  assert.equal(r.hits.reduce((n, h) => n + h[0], 0), PHOENIX_TOTAL); assert.equal(PHOENIX_TOTAL, 77);
  const cap = r.holds.filter(h => h.phase === 'capture');
  assert(cap.length >= 60 * 2.9, 'captura dura ~3 s');
  assert(cap.some(h => h.y > 1.2), 'o alvo é levantado no ciclone');
  const angles = new Set(cap.map(h => Math.round(Math.atan2(h.z, h.x) * 2)));
  assert(angles.size > 8, 'o alvo gira em espiral');
});
test('MOD 229: a fênix dá exatamente 2 voltas, sobe ao ápice e mergulha', () => {
  const t = target(), s = new CelestialPhoenix(); s.start({ x: 0, y: 0, z: 0 }, t, 0);
  let maxY = 0, lastOrbit = 0;
  for (let i = 0; i < 2400 && s.active; i++) { s.update(1 / 120, t); if (s.phase === 'orbit') lastOrbit = s.angle; if (s.phase === 'ascend' || s.phase === 'dive') maxY = Math.max(maxY, s.bird.y); }
  assert.equal(s.angle, Math.PI * 2 * 2); assert(lastOrbit > Math.PI * 3.9);
  assert(maxY >= t.y + PHOENIX.apex - .1, 'sobe bem alto antes do mergulho');
});
test('fixed-step damage invariant at 10/30/60/120 fps', () => { const base = run().hits; for (const fps of [10, 30, 120]) assert.deepEqual(run(fps).hits, base); });
test('solid wall prevents contact and all subsequent damage', () => { assert.equal(run(10, { blocked: p => p.z > 4 }).hits.length, 0); });
test('no target goes forward and dissipates', () => { const s = new CelestialPhoenix(); s.start({ x: 0, y: 0, z: 0 }, null); s.update(10, null); assert(!s.active); });
test('MOD 229: morte, ID reciclado e troca de cena no meio da captura soltam o alvo sem dano fantasma', () => {
  for (const kind of ['dead', 'id', 'scene']) {
    const hits = [], s = new CelestialPhoenix({ hit: d => hits.push(d) }), t = target(); s.start({ x: 0, y: 0, z: 0 }, t);
    for (let i = 0; i < 1200 && s.phase !== 'capture'; i++) s.update(1 / 120, t);
    s.update(.6, t); assert(s.hold.active); const before = hits.length;
    if (kind === 'dead') t.alive = false; if (kind === 'id') t.id++; s.update(.5, t, { valid: kind !== 'scene' });
    assert(!s.active); assert(!s.hold.active, 'alvo solto'); assert.equal(hits.length, before);
  }
});
test('MOD 229: chefe resiste ao controle — dano inteiro, sem levitar', () => {
  const r = run(60, {}, { ...target(), resist: true });
  assert.equal(r.hits.reduce((n, h) => n + h[0], 0), 77);
  assert(r.holds.every(h => h.y < .1 && Math.hypot(h.x, h.z) < 1e-6 && h.resist));
});
test('pause freezes and active cast cannot stack or refresh burn', () => { const s = new CelestialPhoenix(), t = target(); s.start({ x: 0, y: 0, z: 0 }, t); s.update(10, t, { paused: true }); assert.equal(s.time, 0); assert(!s.start({ x: 0, y: 0, z: 0 }, t)); });
test('purchase mana and cooldown gate Skill3, others unchanged', () => { assert.equal(SKILLS.magic.cooldown, 1800); assert.equal(SKILLS.magic2.cooldown, 5200); assert(!canCast('magic3', { unlocked: unlockedSkills(), mana: 100 }).ok); const unlocked = unlockedSkills({ owned: ['magic3'] }); assert(canCast('magic3', { unlocked, mana: 45 }).ok); assert(!canCast('magic3', { unlocked, mana: 44 }).ok); assert(!canCast('magic3', { unlocked, mana: 100, now: 1000, cooldownUntil: { magic3: 12000 } }).ok); });
test('large targets use outside orbit and burn follows movement', () => { const t = { ...target(), radius: 3, height: 7 }, s = new CelestialPhoenix(); s.start({ x: 0, y: 0, z: 0 }, t); for (let i = 0; i < 3000 && s.phase !== 'orbit'; i++) s.update(.01, t); s.update(.4, t); assert(Math.hypot(s.bird.x - t.x, s.bird.z - t.z) > t.radius); for (let i = 0; i < 3000 && s.phase !== 'burn'; i++) s.update(.01, t); assert.equal(s.phase, 'burn'); t.x = 5; s.update(.02, t); assert.equal(s.aim.x, 5); });
test('close enemy does not overlap initial spawn; restart has no residual ticks', () => { const t = { ...target(), z: 2 }, s = new CelestialPhoenix(); s.start({ x: 0, y: 0, z: 0 }, t); assert(Math.hypot(s.p.x - t.x, s.p.z - t.z) > 1.5); s.cancel(); assert(s.start({ x: 0, y: 0, z: 0 }, target())); assert.equal(s.ticks, 0); assert.equal(s.angle, 0); assert(!s.hold.active); });
